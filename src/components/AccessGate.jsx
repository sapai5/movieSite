import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { FiLock, FiKey, FiArrowRight, FiCheckCircle, FiSmartphone } from 'react-icons/fi'
import { authorizeUser, checkStoredAuthorization, getUserStoredToken } from '../services/auth'
import { openInstallGuide, isAppStandalone } from '../services/install'

export default function AccessGate({ children }) {
  const [searchParams, setSearchParams] = useSearchParams()
  // 'checking' | 'authorized' | 'locked'
  const [status, setStatus] = useState(() => (getUserStoredToken() ? 'checking' : 'locked'))
  const [tokenInput, setTokenInput] = useState('')
  const [error, setError] = useState('')
  const [successMsg, setSuccessMsg] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [standalone, setStandalone] = useState(() => isAppStandalone())

  useEffect(() => {
    setStandalone(isAppStandalone())
  }, [])

  // Verify any saved token with the server on load
  useEffect(() => {
    let cancelled = false
    if (!getUserStoredToken()) return
    checkStoredAuthorization().then((ok) => {
      if (!cancelled) setStatus(ok ? 'authorized' : 'locked')
    })
    return () => { cancelled = true }
  }, [])

  // Check URL query parameters for auto-invite tokens (?invite=... or ?token=...)
  useEffect(() => {
    const inviteParam = searchParams.get('invite') || searchParams.get('token')
    if (!inviteParam) return
    let cancelled = false
    authorizeUser(inviteParam).then((res) => {
      if (cancelled) return
      if (res.success) {
        setSuccessMsg('Access token accepted! Unlocking...')
        setStatus('authorized')
      } else {
        setError(res.message || 'The invite link token is invalid or deactivated.')
      }
      // Clean query params from URL
      const next = new URLSearchParams(searchParams)
      next.delete('invite')
      next.delete('token')
      setSearchParams(next, { replace: true })
    })
    return () => { cancelled = true }
  }, [searchParams, setSearchParams])

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (submitting) return
    setError('')
    setSuccessMsg('')
    if (!tokenInput.trim()) {
      setError('Please enter your authorized passkey.')
      return
    }

    setSubmitting(true)
    const res = await authorizeUser(tokenInput.trim())
    setSubmitting(false)
    if (res.success) {
      setSuccessMsg('Passkey verified! Unlocking...')
      setTimeout(() => {
        setStatus('authorized')
      }, 400)
    } else {
      setError(res.message || 'Access denied: Token not found in whitelist.')
    }
  }

  if (status === 'authorized') {
    return children
  }

  if (status === 'checking') {
    return <div className="access-gate-container" />
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

          <button type="submit" className="gate-submit-btn" disabled={submitting}>
            {submitting ? 'Checking...' : <>Unlock Site <FiArrowRight /></>}
          </button>
        </form>


        <div className="gate-footer">
          {!standalone && (
            <button type="button" className="gate-install-btn" onClick={openInstallGuide}>
              <FiSmartphone size={15} /> Add to Home Screen / Install App
            </button>
          )}

        </div>
      </div>
    </div>
  )
}
