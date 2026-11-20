import { useState } from 'react'
import { Link } from 'react-router-dom'
import { FiShield, FiKey, FiCopy, FiCheck, FiExternalLink, FiCheckCircle } from 'react-icons/fi'
import { generateToken, verifyToken } from '../services/auth'

// Access tokens live in the ACCESS_TOKENS environment variable on Vercel
// (Project → Settings → Environment Variables), so they work on every device.
// This page only helps generate tokens and invite links; it stores nothing.

export default function Admin() {
  const [token, setToken] = useState(() => generateToken())
  const [copied, setCopied] = useState('')
  const [checkInput, setCheckInput] = useState('')
  const [checkResult, setCheckResult] = useState(null)

  const inviteUrl = `${window.location.origin}/?invite=${encodeURIComponent(token)}`

  const copy = async (text, key) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(key)
      setTimeout(() => setCopied(''), 2500)
    } catch {
      /* clipboard unavailable */
    }
  }

  const handleCheck = async (e) => {
    e.preventDefault()
    setCheckResult('checking')
    const valid = await verifyToken(checkInput)
    setCheckResult(valid === null ? 'error' : valid ? 'valid' : 'invalid')
  }

  return (
    <div className="admin-dashboard-page">
      <header className="admin-navbar">
        <div className="admin-nav-left">
          <Link to="/" className="navbar-brand">MOVIEPLAYER</Link>
          <span className="admin-badge-pill"><FiShield size={12} /> Access Tokens</span>
        </div>
        <div className="admin-nav-right">
          <Link to="/" className="btn-admin-link">
            <FiExternalLink /> View Site
          </Link>
        </div>
      </header>

      <main className="admin-main">
        <section className="admin-card">
          <div className="admin-card-header">
            <h2><FiKey /> Create an access token</h2>
            <p>
              Tokens are checked on the server against the <code>ACCESS_TOKENS</code> environment
              variable in Vercel. To give someone access, add their token there (comma-separated),
              then redeploy. To revoke access, remove it and redeploy.
            </p>
          </div>

          <div className="admin-create-form">
            <div className="form-group">
              <label>New token</label>
              <input type="text" value={token} readOnly />
            </div>
            <button type="button" className="btn-add-whitelist" onClick={() => setToken(generateToken())}>
              <FiKey /> Generate another
            </button>
          </div>

          <div className="admin-create-form" style={{ marginTop: '14px' }}>
            <button type="button" className="btn-copy-link" onClick={() => copy(token, 'token')}>
              {copied === 'token' ? <><FiCheck color="#4cd964" /> Copied token</> : <><FiCopy /> Copy token</>}
            </button>
            <button type="button" className="btn-copy-link" onClick={() => copy(inviteUrl, 'link')}>
              {copied === 'link' ? <><FiCheck color="#4cd964" /> Copied invite link</> : <><FiCopy /> Copy invite link</>}
            </button>
          </div>
        </section>

        <section className="admin-card">
          <div className="admin-card-header">
            <h2><FiCheckCircle /> Check a token</h2>
            <p>Confirm a token is live on the server (after you have added it and redeployed).</p>
          </div>

          <form onSubmit={handleCheck} className="admin-create-form">
            <div className="form-group">
              <label>Token</label>
              <input
                type="text"
                placeholder="MP-XXXX-XXXX"
                value={checkInput}
                onChange={(e) => { setCheckInput(e.target.value); setCheckResult(null) }}
                required
              />
            </div>
            <button type="submit" className="btn-update-pass">Check</button>
          </form>

          {checkResult === 'valid' && <div className="gate-alert success" style={{ marginTop: '14px' }}><FiCheck /> Valid: this token unlocks the site.</div>}
          {checkResult === 'invalid' && <div className="gate-alert error" style={{ marginTop: '14px' }}>Not valid: it isn&apos;t in ACCESS_TOKENS (or you haven&apos;t redeployed yet).</div>}
          {checkResult === 'error' && <div className="gate-alert error" style={{ marginTop: '14px' }}>Could not reach /api/verify.</div>}
        </section>
      </main>
    </div>
  )
}
