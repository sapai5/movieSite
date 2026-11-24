// MoviePlayer desktop app: loads the live site in a window with ad blocking.
//
// Layers of protection, from broadest to most specific:
//  1. Network ad blocking: EasyList + EasyPrivacy (+ a few extra rules) via
//     @ghostery/adblocker-electron. Ad/tracker requests never leave the app;
//     cosmetic filters hide leftover ad boxes.
//  2. Popups: every window.open / target=_blank from any frame is denied.
//  3. Redirects: the app window can only ever show our own site.
//  4. Player hijacks: the video player iframe can only navigate within the
//     player providers' domains, so ads can't replace the player.
//  5. Permissions: notifications, location, etc. are refused (ad spam vector).
//  6. Downloads and external-app links (ms-store:, intent:, etc.) are refused.
//
// Why no <iframe sandbox> attribute: VidLink checks for it and replaces the
// player with "Please Disable Sandbox". Layers 2, 3, 4 and 6 enforce what
// the sandbox would (no popups, no top navigation, no downloads, no external
// protocols) from the main process, where the player can't detect or undo it.

const { app, BrowserWindow, Menu, session } = require('electron')
const fs = require('node:fs')
const path = require('node:path')
const { ElectronBlocker } = require('@ghostery/adblocker-electron')

const APP_URL = process.env.MOVIEPLAYER_URL || 'https://movie-site-iota-three.vercel.app'
const APP_ORIGIN = new URL(APP_URL).origin

// Hosts the video player iframe is allowed to show (plus our own origin, used
// for the "not available, switching server" fallback page).
const PLAYER_HOSTS = ['vidlink.pro', 'vidrift.net', 'vidrift.in']

// Extra rules on top of the public lists (uBlock/AdBlock filter syntax)
const EXTRA_FILTERS = [
  '||brightadnetwork.com^', // VidLink's pop-under / direct-link ad server
]

const ENGINE_CACHE = () => path.join(app.getPath('userData'), 'adblock-engine.bin')
const ENGINE_MAX_AGE_MS = 3 * 24 * 60 * 60 * 1000

const SMOKE_TEST = process.argv.includes('--smoke-test')
const stats = { blockedRequests: 0, blockedHosts: new Map(), popupsDenied: 0, navigationsBlocked: 0 }

const hostOf = (url) => {
  try { return new URL(url).hostname } catch { return '' }
}
const isHostIn = (host, list) => list.some((h) => host === h || host.endsWith('.' + h))
const isOwnSite = (url) => {
  try { return new URL(url).origin === APP_ORIGIN } catch { return false }
}

// ---------- 1. Network ad blocking ----------

async function loadBlocker() {
  const cachePath = ENGINE_CACHE()
  let cached = null
  try {
    const st = fs.statSync(cachePath)
    cached = { buf: fs.readFileSync(cachePath), fresh: Date.now() - st.mtimeMs < ENGINE_MAX_AGE_MS }
  } catch { /* no cache yet */ }

  let blocker = null
  if (cached?.fresh) {
    try { blocker = ElectronBlocker.deserialize(new Uint8Array(cached.buf)) } catch { blocker = null }
  }
  if (!blocker) {
    try {
      blocker = await ElectronBlocker.fromPrebuiltAdsAndTracking(fetch)
      fs.mkdirSync(path.dirname(cachePath), { recursive: true })
      fs.writeFileSync(cachePath, Buffer.from(blocker.serialize()))
    } catch (err) {
      // Offline: fall back to an older copy of the lists if we have one
      console.warn('[adblock] could not download filter lists:', err.message)
      if (cached) {
        try { blocker = ElectronBlocker.deserialize(new Uint8Array(cached.buf)) } catch { blocker = null }
      }
    }
  }
  if (!blocker) blocker = ElectronBlocker.empty()

  blocker.updateFromDiff({ added: EXTRA_FILTERS })

  blocker.on('request-blocked', (request) => {
    stats.blockedRequests++
    const h = hostOf(request.url)
    stats.blockedHosts.set(h, (stats.blockedHosts.get(h) || 0) + 1)
  })
  return blocker
}

// ---------- 2-4. Popups, redirects, player hijacks ----------

function lockDownContents(contents) {
  // 2. No popups or new windows, from the page or any iframe inside it
  contents.setWindowOpenHandler(({ url }) => {
    stats.popupsDenied++
    if (SMOKE_TEST) console.log('[popup denied]', url)
    return { action: 'deny' }
  })

  // 3 + 4 + 6. Navigation rules for every frame, the main page and the player iframe
  contents.on('will-frame-navigate', (event) => {
    const { url, isMainFrame, frame } = event
    const scheme = url.split(':', 1)[0].toLowerCase()
    if (!SAFE_SCHEMES.has(scheme)) {
      // e.g. ms-windows-store:, intent:, mailto: from an ad, in any frame
      event.preventDefault()
      stats.navigationsBlocked++
      if (SMOKE_TEST) console.log('[external protocol blocked]', url)
      return
    }
    if (scheme === 'about' || scheme === 'data' || scheme === 'blob') return

    if (isMainFrame) {
      if (isOwnSite(url)) return
      event.preventDefault()
      stats.navigationsBlocked++
      if (SMOKE_TEST) console.log('[redirect blocked]', url)
      return
    }

    // Only police the player iframe (a direct child of our page). Frames the
    // player creates inside itself are covered by the network blocker.
    const isPlayerFrame = frame && frame.parent && frame.parent.parent === null
    if (!isPlayerFrame) return
    if (isOwnSite(url) || isHostIn(hostOf(url), PLAYER_HOSTS)) return
    event.preventDefault()
    stats.navigationsBlocked++
    if (SMOKE_TEST) console.log('[player hijack blocked]', url)
  })

  // Same rules for server-side (HTTP 3xx) redirects
  contents.on('will-redirect', (event) => {
    const { url, isMainFrame, frame } = event
    const isPlayerFrame = !isMainFrame && frame && frame.parent && frame.parent.parent === null
    const allowed = isMainFrame
      ? isOwnSite(url)
      : !isPlayerFrame || isOwnSite(url) || isHostIn(hostOf(url), PLAYER_HOSTS)
    if (!allowed) {
      event.preventDefault()
      stats.navigationsBlocked++
      if (SMOKE_TEST) console.log('[redirect blocked]', url)
    }
  })
}

const SAFE_SCHEMES = new Set(['http', 'https', 'about', 'data', 'blob'])

// ---------- 5. Permissions ----------

const ALLOWED_PERMISSIONS = new Set(['fullscreen', 'clipboard-sanitized-write', 'pointerLock'])

function lockDownSession(ses) {
  ses.setPermissionRequestHandler((_wc, permission, callback) => callback(ALLOWED_PERMISSIONS.has(permission)))
  ses.setPermissionCheckHandler((_wc, permission) => ALLOWED_PERMISSIONS.has(permission))
  // 6. No downloads (ads push fake "player update" .exe files)
  ses.on('will-download', (event, item) => {
    stats.downloadsBlocked = (stats.downloadsBlocked || 0) + 1
    if (SMOKE_TEST) console.log('[download blocked]', item.getURL())
    event.preventDefault()
  })
}

// ---------- Window ----------

const BOUNDS_FILE = () => path.join(app.getPath('userData'), 'window-bounds.json')

function loadBounds() {
  try { return JSON.parse(fs.readFileSync(BOUNDS_FILE(), 'utf8')) } catch { return { width: 1400, height: 900 } }
}

function saveBounds(win) {
  try {
    if (win.isFullScreen() || win.isMinimized()) return
    fs.writeFileSync(BOUNDS_FILE(), JSON.stringify({ ...win.getBounds(), maximized: win.isMaximized() }))
  } catch { /* ignore */ }
}

function createWindow() {
  const bounds = loadBounds()
  const win = new BrowserWindow({
    ...bounds,
    minWidth: 480,
    minHeight: 360,
    backgroundColor: '#141414',
    title: 'MoviePlayer',
    autoHideMenuBar: true,
    show: false,
    icon: path.join(__dirname, 'build', 'icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      spellcheck: false,
    },
  })

  if (bounds.maximized) win.maximize()
  win.once('ready-to-show', () => win.show())
  win.on('close', () => saveBounds(win))

  // Keyboard shortcuts (there's no menu bar on Windows/Linux)
  win.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return
    const ctrl = input.control || input.meta
    if (input.key === 'F11') {
      win.setFullScreen(!win.isFullScreen())
    } else if (input.key === 'Escape' && win.isFullScreen()) {
      win.setFullScreen(false)
    } else if ((ctrl && input.key.toLowerCase() === 'r') || input.key === 'F5') {
      win.webContents.reload()
    } else if (input.alt && input.key === 'ArrowLeft') {
      if (win.webContents.navigationHistory.canGoBack()) win.webContents.navigationHistory.goBack()
    } else if (input.alt && input.key === 'ArrowRight') {
      if (win.webContents.navigationHistory.canGoForward()) win.webContents.navigationHistory.goForward()
    } else if (ctrl && input.shift && input.key.toLowerCase() === 'i') {
      win.webContents.toggleDevTools()
    } else {
      return
    }
    event.preventDefault()
  })

  // Mouse back/forward buttons
  win.on('app-command', (_e, cmd) => {
    const h = win.webContents.navigationHistory
    if (cmd === 'browser-backward' && h.canGoBack()) h.goBack()
    if (cmd === 'browser-forward' && h.canGoForward()) h.goForward()
  })

  // Friendly page if the site can't be reached
  win.webContents.on('did-fail-load', (_e, code, desc, url, isMainFrame) => {
    if (!isMainFrame || code === -3) return // -3 = aborted (e.g. a blocked redirect)
    const html = `<body style="background:#141414;color:#ddd;font:15px system-ui;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;text-align:center">
      <div><h2 style="color:#e50914">Can't reach MoviePlayer</h2><p>${desc} (${code})</p>
      <p>Check your internet connection, then press Ctrl+R to retry.</p></div></body>`
    win.webContents.loadURL('data:text/html;charset=utf-8,' + encodeURIComponent(html))
  })

  return win
}

// ---------- Smoke test (npm run test:smoke) ----------

async function runSmokeTest(win) {
  const target = process.env.SMOKE_PATH || '/watch/movie/550'
  const waitMs = Number(process.env.SMOKE_WAIT_MS || 30000)
  const out = process.env.SMOKE_SHOT || path.join(app.getPath('temp'), 'movieplayer-smoke.png')
  await win.loadURL(APP_ORIGIN + target)
  await new Promise((r) => setTimeout(r, waitMs))

  // Probe: popups and top-level redirects attempted by page scripts must fail
  const probe = await win.webContents.executeJavaScript(`(() => {
    const w = window.open('https://example.com/ad', '_blank')
    return { popupOpened: !!w, url: location.href }
  })()`)
  const img = await win.webContents.capturePage()
  fs.writeFileSync(out, img.toPNG())

  // Attack each guard the way an ad would, then check nothing moved
  const playerBefore = win.webContents.mainFrame.frames[0]?.url || ''
  await win.webContents.executeJavaScript(`(() => {
    const f = document.querySelector('iframe')
    if (f) f.src = 'https://example.com/ad-landing'            // player hijack
    const a = document.createElement('a')
    a.href = 'data:application/octet-stream;base64,TVo='; a.download = 'player-update.exe'
    document.body.appendChild(a); a.click()                      // forced download
    location.href = 'ms-windows-store://home'                    // external app
    setTimeout(() => { location.href = 'https://example.com/redirect' }, 300) // top redirect
  })()`)
  await new Promise((r) => setTimeout(r, 4000))
  const guards = {
    pageStillOurs: isOwnSite(win.webContents.getURL()),
    playerBefore,
    playerAfter: win.webContents.mainFrame.frames[0]?.url || '(none)',
  }

  console.log(JSON.stringify({
    url: probe.url,
    guards,
    popupOpenedFromPage: probe.popupOpened,
    blockedRequests: stats.blockedRequests,
    topBlockedHosts: [...stats.blockedHosts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15),
    popupsDenied: stats.popupsDenied,
    navigationsBlocked: stats.navigationsBlocked,
    downloadsBlocked: stats.downloadsBlocked || 0,
    screenshot: out,
  }, null, 2))
  app.quit()
}

// ---------- Boot ----------

if (!SMOKE_TEST && !app.requestSingleInstanceLock()) {
  app.quit()
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows()
    if (win) { if (win.isMinimized()) win.restore(); win.focus() }
  })

  app.on('web-contents-created', (_e, contents) => lockDownContents(contents))

  app.whenReady().then(async () => {
    if (process.platform === 'darwin') {
      Menu.setApplicationMenu(Menu.buildFromTemplate([
        { role: 'appMenu' }, { role: 'editMenu' }, { role: 'viewMenu' }, { role: 'windowMenu' },
      ]))
    } else {
      Menu.setApplicationMenu(null)
    }

    const ses = session.defaultSession
    lockDownSession(ses)
    const blocker = await loadBlocker()
    blocker.enableBlockingInSession(ses)

    const win = createWindow()
    if (SMOKE_TEST) {
      runSmokeTest(win).catch((err) => { console.error(err); app.exit(1) })
    } else {
      win.loadURL(APP_URL)
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow().loadURL(APP_URL)
    })
  })

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
  })
}
