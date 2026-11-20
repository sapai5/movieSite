import { useState, useEffect } from 'react'
import { FiShare, FiX, FiPlusSquare } from 'react-icons/fi'

export default function IOSInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)

  useEffect(() => {
    // Detect iOS devices (iPhone, iPad, iPod)
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream
    // Check if running in standalone mode (already installed as PWA)
    const isStandalone = window.navigator.standalone === true || window.matchMedia('(display-mode: standalone)').matches

    // Check if dismissed recently
    const dismissedAt = localStorage.getItem('movieplayer_ios_pwa_dismissed')
    const recentlyDismissed = dismissedAt && Date.now() - Number(dismissedAt) < 7 * 864e5

    if (isIOS && !isStandalone && !recentlyDismissed) {
      // Delay prompt slightly for better user onboarding
      const timer = setTimeout(() => setShowPrompt(true), 3500)
      return () => clearTimeout(timer)
    }
  }, [])

  const handleDismiss = () => {
    localStorage.setItem('movieplayer_ios_pwa_dismissed', String(Date.now()))
    setShowPrompt(false)
  }

  if (!showPrompt) return null

  return (
    <div className="ios-pwa-banner">
      <div className="ios-pwa-content">
        <div className="ios-pwa-icon-box">
          <FiPlusSquare size={22} color="#e50914" />
        </div>
        <div className="ios-pwa-text">
          <strong>Install on your iPhone</strong>
          <span>
            Tap <FiShare style={{ verticalAlign: 'middle', margin: '0 2px' }} /> then choose <strong>&ldquo;Add to Home Screen&rdquo;</strong> for the full app experience.
          </span>
        </div>
        <button className="ios-pwa-close" onClick={handleDismiss} aria-label="Dismiss">
          <FiX size={18} />
        </button>
      </div>
    </div>
  )
}