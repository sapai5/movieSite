// Allow script execution and provider-origin storage needed by streaming players.
// All other sandbox capabilities stay blocked in strict mode, including popups.
export const STRICT_SANDBOX = 'allow-scripts allow-same-origin'
export const COMPATIBLE_VIDRIFT_SANDBOX = `${STRICT_SANDBOX} allow-forms allow-presentation allow-orientation-lock allow-pointer-lock allow-popups`
const denied = ['camera', 'microphone', 'geolocation', 'display-capture', 'clipboard-read', 'clipboard-write', 'payment', 'usb', 'serial', 'hid', 'bluetooth', 'midi', 'accelerometer', 'gyroscope', 'magnetometer', 'xr-spatial-tracking', 'screen-wake-lock', 'publickey-credentials-get']
export const PLAYER_PERMISSIONS = [
  "autoplay 'src'", "encrypted-media 'src'", "fullscreen 'src'", "picture-in-picture 'src'",
  ...denied.map((feature) => `${feature} 'none'`),
].join('; ')

export function playerSandbox(server, strict) {
  return strict ? STRICT_SANDBOX : server === 'vidrift' ? COMPATIBLE_VIDRIFT_SANDBOX : undefined
}

export function playerMessage(event, frame, server) {
  const origin = server === 'vidlink' ? 'https://vidlink.pro' : 'https://embed.vidrift.net'
  if (!frame || event.source !== frame.contentWindow || event.origin !== origin) return null
  let data = event.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  if (server === 'vidlink' && data.type === 'PLAYER_EVENT') data = data.data
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const kind = data.type || data.event
  // VidRift reports each of its sources (e.g. "animedub", "anime", "orion") and
  // which one is playing. When every one has failed the title is unavailable.
  if (server === 'vidrift' && kind === 'vidrift:providers') {
    const list = (Array.isArray(data.providers) ? data.providers : [])
      .filter((p) => p && typeof p.value === 'string' && /^[a-z0-9_-]{1,32}$/i.test(p.value))
      .map((p) => ({ value: p.value, state: typeof p.state === 'string' ? p.state : '' }))
    if (!list.length) return null
    return {
      sources: list,
      current: typeof data.current === 'string' ? data.current : null,
      unavailable: list.every((p) => p.state === 'failed'),
    }
  }
  // Full player state, sent after vidrift:get-state and again whenever it changes.
  if (server === 'vidrift' && kind === 'vidrift:state') {
    const state = cleanState(data)
    return state ? { state } : null
  }
  if (server === 'vidrift' && kind === 'vidrift:command-error') {
    return { commandError: { command: shortText(data.command), field: shortText(data.field), reason: shortText(data.reason) } }
  }
  const progress = ['vidrift:timeupdate', 'vidrift:progress', 'timeupdate'].includes(kind)
  const playing = ['vidrift:unpaused', 'vidrift:play', 'play'].includes(kind)
  const paused = ['vidrift:paused', 'vidrift:pause', 'vidrift:ended', 'pause', 'ended'].includes(kind)
  if (!progress && !playing && !paused) return null
  const valid = (value, minimum) => typeof value === 'number' && Number.isFinite(value) && value >= minimum && value <= 604800
  const time = data.currentTime ?? data.time ?? data.seconds
  const duration = data.duration ?? data.total
  return { progress, playing, paused, time: valid(time, 0) ? time : null, duration: valid(duration, 1) ? duration : null }
}

// ── VidRift state sanitising ───────────────────────────────────────────────
// The state drives our own settings menu, so only well-typed, bounded values
// get through; labels are rendered as React text (never HTML).
const shortText = (value, max = 40) => (typeof value === 'string' ? value.slice(0, max) : null)
const finite = (value, min, max, fallback) => (typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max ? value : fallback)
const options = (list, max = 120) => (Array.isArray(list) ? list : [])
  .filter((o) => o && (typeof o.value === 'string' || typeof o.value === 'number') && typeof o.label === 'string')
  .slice(0, max)
  .map((o) => ({ value: String(o.value).slice(0, 40), label: o.label.slice(0, 60), ...(typeof o.state === 'string' ? { state: o.state.slice(0, 20) } : {}) }))

function cleanState(d) {
  const style = d.subtitleStyle && typeof d.subtitleStyle === 'object' ? d.subtitleStyle : {}
  return {
    server: shortText(d.server),
    servers: options(d.servers, 20),
    quality: d.quality == null ? null : String(d.quality).slice(0, 20),
    qualities: options(d.qualities, 20),
    audio: d.audio == null ? null : String(d.audio).slice(0, 10),
    audios: options(d.audios, 20),
    subtitle: shortText(d.subtitle),
    subtitles: options(d.subtitles, 150),
    subtitleStyle: {
      size: finite(style.size, 50, 200, 100),
      color: typeof style.color === 'string' && /^#[0-9a-f]{6}$/i.test(style.color) ? style.color : '#ffffff',
      background: style.background === 'box' ? 'box' : 'shadow',
      position: finite(style.position, 0, 40, 0),
    },
    subtitleOffset: finite(d.subtitleOffset, -600, 600, 0),
    speed: finite(d.speed, 0.25, 4, 1),
  }
}
