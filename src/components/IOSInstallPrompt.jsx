import { useState, useEffect } from 'react'
import { FiShare, FiX, FiPlusSquare, FiDownload } from 'react-icons/fi'
import { isAppStandalone, isIOSDevice, promptNativeInstall, hasNativeInstallPrompt, openInstallGuide } from '../services/install'

export default function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  const [hasNative, setHasNative] = useState(false)
  const isIOS = isIOSDevice()

  useEffect(() => {
    if (isAppStandalone()) return

    const dismissedAt = localStorage.getItem('movieplayer_pwa_dismissed')
    const recentlyDismissed = dismissedAt && Date.now() - Number(dismissedAt) < 3 * 864e5

    if (!recentlyDismissed) {
      setHasNative(hasNativeInstallPrompt())
      const timer = setTimeout(() => setShowPrompt(true), 1200)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = (e) => {
    e.stopPropagation()
    localStorage.setItem('movieplayer_pwa_dismissed', String(Date.now()))
    setShowPrompt(false)
  }

  const handleAction = async (e) => {
    e.stopPropagation()
    if (hasNativeInstallPrompt()) {
      const outcome = await promptNativeInstall()
      if (outcome === 'accepted') {
        setShowPrompt(false)
      }
    } else {
      openInstallGuide()
    }
  }

  if (!showPrompt || isAppStandalone()) return null


  return (
    <div className="ios-pwa-banner" onClick={openInstallGuide}>
      <div className="ios-pwa-content">
        <div className="ios-pwa-icon-box">
          {hasNative ? <FiDiownload size={22} color="#e50914" /> : <FiPlusSquare size={22} color="#e50914" />}
        </div>
        <div className="ios-pwa-text">
          <strong>{isIOS ? 'Install on your iPhone / iPad' : 'Install MoviePlayer App'}</strong>
          <span>
            {isIOS ? (
              <>
                Tap <FiShare style={{ verticalAlign: 'middle', margin: '0 2px' }} /> then choose <strong>&ldquo;Add to Home Screen&rdquo;</strong>
              </>
            ) : hasNative ? (
              'Add to home screen for the full-screen Netflix experience.'
            ) : (
              'Tap here to see how to add this app to your Home Screen.'
            )}
          </span>
        </div>


        {hasNative && (
          <button className="ios-pwa-install-action" onClick={handleAction}>
            Install
          </button>
        )}

        <button className="ios-pwa-close" onClick={handleDismiss} aria-label="Dismiss">
          <FiX size={18} />
        </button>
      </div>
    </div>
  )
}
