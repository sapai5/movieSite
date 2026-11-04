import { useState, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { FiLock, FiKey, FiArrowRight, FiShield, FiCheckCircle } from 'react-icons/fi'
import { isUserAuthorized, authorizeUser, isProtectionEnabled } from '../services/auth'

export default function AccessGate({ children }) {
  const [searchParams, setSearchParams] = useSearchParams()
  const [authorized, setAuthorized] = useState(() => isUserAuthorized())
  const [tokenInput, setTokenInput] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')

  // Check URL query parameters for auto-invite tokens (?invite=... or ?token=...)
  useEffect(() => {
    const inviteParam = searchParams.get('invite') || searchParams.get('token')
    if (inviteParam) {
      const res = authorizeUser(inviteParam)
      if (res.success) {
        setAuthorized(true)
        setSuccessMsg('Access token accepted! Unlocking...')
        // Clean query params from URL
        searchParams.delete('invite')
        searchParams.delete('token')
        setSearchParams(searchParams, { replace: true })
      } else {
        setError(res.message || 'The invite link token is invalid or deactivated.')
      }
    }
  }, [searchParams, setSearchParams])

  // Re-check authorization when window gains focus or storage changes
  useEffect(() => {
    const handleStorage = () => setAuthorized(isUserAuthorized())
    window.addEventListener('storage', handleStorage)
    window.addEventListener('focus', handleStorage)
    return () => {
      window.removeEventListener('storage', handleStorage)
      window.removeEventListener('focus', handleStorage)
    }
  }, [])

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')
    setSuccessMsg('')
    if (!tokenInput.trim()) {
      setError('Please enter your authorized passkey.')
      return
    }

    const res = authorizeUser(tokenInput.trim())
    if (res.success) {
      setSuccessMsg('Passkey verified! Unlocking...')
      setTimeout(() => {
        setAuthorized(true)
      }, 400)
    } else {
      setError(res.message || 'Access denied: Token not found in whitelist.')
    }
  }

  // If protection is disabled or user has valid cookie/local storage
  if (authorized || !isProtectionEnabled()) {
    return children
  }

  return (
    <div className="access-gate-container">
      <div className="access-gate-card">
        <div className="gate-header">
          <div className="gate-brand">MOVIEPLAYER</div>
          <div className="gate-icon-badge">
            <FiLock size={28} />
          </div>
          <h1 className="gate-title">Restricted Access</h1>
          <p className="gate-subtitle">
            This streaming portal is private. Please enter your authorized passkey or invite token to continue.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="gate-form">
          <div className="gate-input-wrapper">
            <FiKey className="gate-input-icon" />
            <input
              type="text"
              className="gate-input"
              placeholder="Enter your passkey or invite token"
              value={tokenInput}
              onChange={(e) => setTokenInput(e.target.value)}
              autoFocus
            />
          </div>

          {error && <div className="gate-alert error">{error}</div>}
          {successMsg && <div className="gate-alert success"><FiCheckCircle /> {successMsg}</div>}

          <button type="submit" className="gate-submit-btn">
            Unlock Site <FiArrowRight />
          </button>
        </form>

        <div className="gate-footer">
          <div className="gate-admin-link-row">
            <Link to="/admin" className="gate-admin-link">
              <FiShield size={14} /> Administrator Portal (/admin)
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}