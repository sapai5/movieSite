import { state, useEffect } from 'react'
import { FiX, FiShare, FiPlusSquare, FiDownload, FiCheckCircle, FiSmartphone, FiMonitor } from 'react-icons/fi'
import { isAppStandalone, isIOSDevice, promptNativeInstall, hasNativeInstallPrompt } from '../services/install'

export default function InstallModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [canNativePrompt, setCanNativePrompt] = useState(false)
  const isStandalone = isAppStandalone()
  const isIOS = isIOSDevice()

  useEffect(() => {
    const handleOpen = () => {
      setCanNativePrompt(hasNativeInstallPrompt())
      setIsOpen(true)
    }
    window.addEventListener('open-pwa-install-modal', handleOpen)
    return () => window.removeEventListener('open-pwa-install-modal', handleOpen)
  }, [])

  if (!isOpen) return null

  const handleInstallClick = async () => {
    if (canNativePrompt) {
      const outcome = await promptNativeInstall()
      if (outcome === 'accepted') {
        setIsOpen(false)
      }
    }
  }

  return (
    <div className="install-modal-backdrop" onClick={() => setIsOpen(false)}>
      <div className="install-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="install-modal-close" onClick={() => setIsOpen(false)} aria-label="Close">
          <FiX size={20} />
        </button>

        <div className="install-modal-header">
          <div className="install-modal-icon">
            <FiSmartphone size={28} color="#e50914" />
          </div>
          <h2>Install MoviePlayer</h2>
          <p>Get a full-screen, native app experience on your phone, tablet, or computer.</p>
        </div>

        {isStandalone ? (
          <div className="install-already-banner">
            <FiCheckCircle size={24} color="#46d369" />
            <div>
              <strong>Already Installed!</strong>
              <p>You are currently running MoviePlayer in standalone app mode.</p>
            </div>
          </div>
        ) : canNativePrompt ? (
          <div className="install-native-box">
            <p>Your browser is ready to install MoviePlayer as an app with 1 click:</p>
            <button className="install-primary-btn" onClick={handleInstallClick}>
              <FiDiownload size={18} /> Install App Now
            </button>
          </div>
        ) : isIOS ? (
          <div className="install-steps-list">
            <div className="install-step-item">
              <span className="step-num">1</span>
              <div className="step-text">
                Tap the <strong>Share</strong> button <FiShare className="step-icon" /> at the bottom of Safari.
              </div>
            </div>
            <div className="install-step-item">
              <span className="step-num">2</span>
              <div className="step-text">
                Scroll down the share sheet and tap <strong>&ldquo;Add to Home Screen&rdquo;</strong> <FiPlusSquare className="step-icon" />.
              </div>
            </div>
            <div className="install-step-item">
              <span className="step-num">3</span>
              <div className="step-text">
                Tap <strong>Add</strong> in the top-right corner. MoviePlayer will appear on your home screen like a regular app!
              </div>
            </div>
          </div>
        ) : (
          <div className="install-desktop-guide">
            <div className="guide-row">
              <FiMonitor size={20} color="#e50914" />
              <div>
                <strong>Chrome / Edge / Brave:</strong>
                <p>Click the <strong>Install</strong> icon on the right side of your browser URL bar, or open the browser menu (\u22EE) and select <em>&ldquo;Install MoviePlayer...&rdquo;</em></p>
              </div>
            </div>
            <div className="guide-row">
              <FiSmartphone size={20} color="#e50914" />
              <div>
                <strong>Android:</strong>
                <p>Tap the 3 dots (\u22EE) in Chrome and select <em>&ldquo;Add to Home screen&rdquo;</em> or <em>&ldquo;Install app&rdquo;</em>.</p>
              </div>
            </div>
          </div>
        )}

        <div className="install-modal-footer">
          <button className="install-done-btn" onClick={() => setIsOpen(false)}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
