// Universal PWA Install Service
let deferredPrompt = null
const listeners = new Set()

export function isAppStandalone() {
  if (typeof window === 'undefined') return false
  return (
    window.navigator.standalone === true ||
    window.matchMedia('(display-mode: standalone)').matches
  )
}

export function isIOSDevice() {
  if (typeof navigator === 'undefined') return false
  return (
    (/iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)) &&
    !window.MSStream
  )
}

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferredPrompt = e
    listeners.forEach((cb) => cb(true))
  })

  window.addEventListener('appinstalled', () => {
    deferredPrompt = null
    listeners.forEach((cb) => cb(false))
  })
}

export function subscribeInstallState(callback) {
  listeners.add(callback)
  callback(Boolean(deferredPrompt))
  return () => listeners.delete(callback)
}

export async function promptNativeInstall() {
  if (deferredPrompt) {
    try {
      deferredPrompt.prompt()
      const choice = await deferredPrompt.userChoice
      if (choice.outcome === 'accepted') {
        deferredPrompt = null
        listeners.forEach((cb) => cb(false))
      }
      return choice.outcome
    } catch (e) {
      console.warn('Install prompt error:', e)
    }
  }
  return null
}

export function hasNativeInstallPrompt() {
  return Boolean(deferredPrompt)
}

export function openInstallGuide() {
  window.dispatchEvent(new CustomEvent('open-pwa-install-modal'))
}