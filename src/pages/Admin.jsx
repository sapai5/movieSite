import { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  FiShield,
  FiLock,
  FiUserPlus,
  FiCopy,
  FiCheck,
  FiTrash2,
  FiToggleLeft,
  FiToggleRight,
  FiExternalLink,
  FiLogOut,
  FiKey,
  FiUsers,
  FiEye,
  FiEyeOff,
  FiCheckCircle,
} from 'react-icons/fi'
import {
  isAdminAuthenticated,
  loginAdmin,
  logoutAdmin,
  getWhitelist,
  addWhitelistUser,
  toggleUserStatus,
  deleteWhitelistUser,
  isProtectionEnabled,
  setProtectionEnabled,
  setAdminPassword,
  authorizeUser,
} from '../services/auth'

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(() => isAdminAuthenticated())
  const [adminPassInput, setAdminPassInput] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loginError, setLoginError] = useState('')

  // Whitelist State
  const [whitelist, setWhitelist] = useState(() => getWhitelist())
  const [protectionOn, setProtectionOn] = useState(() => isProtectionEnabled())

  // New User Form State
  const [newLabel, setNewLabel] = useState('')
  const [customToken, setCustomToken] = useState('')
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')

  // Change Password State
  const [newAdminPass, setNewAdminPass] = useState('')
  const [showNewPass, setShowNewPass] = useState(false)
  const [passChangeMsg, setPassChangeMsg] = useState('')
  const [copiedId, setCopiedId] = useState(null)
  const [browserAccessMsg, setBrowserAccessMsg] = useState('')

  const refreshWhitelist = () => {
    setWhitelist(getWhitelist())
  }

  const handleAdminLogin = (e) => {
    e.preventDefault()
    setLoginError('')
    if (loginAdmin(adminPassInput)) {
      setAuthenticated(true)
      setAdminPassInput('')
      refreshWhitelist()
    } else {
      setLoginError('Incorrect master admin password.')
    }
  }

  const handleAdminLogout = () => {
    logoutAdmin()
    setAuthenticated(false)
  }

  const handleToggleProtection = () => {
    const next = !protectionOn
    setProtectionEnabled(next)
    setProtectionOn(next)
  }

  const handleAddUser = (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')
    try {
      const added = addWhitelistUser(newLabel, customToken)
      setNewLabel('')
      setCustomToken('')
      refreshWhitelist()
      setFormSuccess(`Whitelisted "${added.label}" with token: ${added.token}`)
    } catch (err) {
      setFormError(err.message)
    }
  }

  const handleToggleStatus = (id) => {
    const updated = toggleUserStatus(id)
    setWhitelist(updated)
  }

  const handleDelete = (id, label) => {
    if (window.confirm(`Revoke and remove "${label}" from whitelist?`)) {
      const updated = deleteWhitelistUser(id)
      setWhitelist(updated)
    }
  }

  const handleCopyInviteLink = (token, id) => {
    const origin = window.location.origin
    const inviteUrl = `${origin}/?invite=${encodeURIComponent(token)}`
    navigator.clipboard.writeText(inviteUrl)
    setCopiedId(id)
    setTimeout(() => setCopiedId(null), 2500)
  }

  const handleGrantThisBrowser = (token) => {
    authorizeUser(token)
    setBrowserAccessMsg(`Access cookie and storage set for this browser!`)
    setTimeout(() => setBrowserAccessMsg(''), 4000)
  }

  const handleChangePassword = (e) => {
    e.preventDefault()
    setPassChangeMsg('')
    try {
      setAdminPassword(newAdminPass)
      setNewAdminPass('')
      setPassChangeMsg('Admin master password updated successfully!')
      setTimeout(() => setPassChangeMsg(''), 4000)
    } catch (err) {
      setPassChangeMsg(`Error: ${err.message}`)
    }
  }

  // --- Login Screen ---
  if (!authenticated) {
    return (
      <div className="admin-login-container">
        <div className="admin-login-card">
          <div className="admin-login-header">
            <div className="gate-brand">MOVIEPLAYER</div>
            <div className="admin-shield-icon">
              <FiShield size={32} />
            </div>
            <h1>Admin Control Panel</h1>
            <p>Enter the administrator master password to manage whitelist and site access.</p>
          </div>

          <form onSubmit={handleAdminLogin} className="gate-form">
            <div className="gate-input-wrapper">
              <FiLock className="gate-input-icon" />
              <input
                type={showPassword ? 'text' : 'password'}
                className="gate-input"
                placeholder="Enter administrator password..."
                value={adminPassInput}
                onChange={(e) => setAdminPassInput(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                className="toggle-pass-visibility-btn"
                onClick={() => setShowPassword(!showPassword)}
                tabIndex={-1}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>

            {loginError && <div className="gate-alert error">{loginError}</div>}

            <button type="submit" className="gate-submit-btn">
              Login to Admin Console
            </button>
          </form>

          <div className="admin-login-footer">
            <Link to="/" className="back-to-site-link">
              &larr; Return to main site
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // --- Admin Dashboard Screen ---
  const activeCount = whitelist.filter((u) => u.active).length

  return (
    <div className="admin-dashboard-page">
      {/* Top Navbar */}
      <header className="admin-navbar">
        <div className="admin-nav-left">
          <Link to="/" className="navbar-brand">MOVIEPLAYER</Link>
          <span className="admin-badge-pill"><FiShield size={12} /> Admin Center</span>
        </div>
        <div className="admin-nav-right">
          <Link to="/" className="btn-admin-link">
            <FiExternalLink /> View Site
          </Link>
          <button className="btn-admin-logout" onClick={handleAdminLogout}>
            <FiLogOut /> Logout
          </button>
        </div>
      </header>

      <main className="admin-main">
        {browserAccessMsg && (
          <div className="admin-toast success">
            <FiCheckCircle /> {browserAccessMsg}
          </div>
        )}

        {/* Protection Status Banner */}
        <section className="admin-summary-grid">
          <div className="admin-stat-card">
            <div className="stat-label">Site Gatekeeper</div>
            <div className="stat-value-row">
              <span className={`status-pill ${protectionOn ? 'enabled' : 'disabled'}`}>
                {protectionOn ? 'STRICT ACCESS ON' : 'PUBLIC ACCESS (OFF)'}
              </span>
              <button className="toggle-protection-btn" onClick={handleToggleProtection}>
                {protectionOn ? <FiToggleRight size={28} color="#e50914" /> : <FiToggleLeft size={28} color="#888" />}
              </button>
            </div>
            <p className="stat-desc">
              {protectionOn
                ? 'Only whitelisted users with a valid cookie or storage token can view the site.'
                : 'Anyone can browse without passkeys. Whitelist cookies remain valid.'}
            </p>
          </div>

          <div className="admin-stat-card">
            <div className="stat-label">Authorized Members</div>
            <div className="stat-value">{activeCount} / {whitelist.length}</div>
            <p className="stat-desc">Active authorized passkeys currently granted site access.</p>
          </div>

          <div className="admin-stat-card">
            <div className="stat-label">Cookie &amp; Storage Engine</div>
            <div className="stat-value-badge">365-Day Persistence</div>
            <p className="stat-desc">Access links automatically set long-lived cookies and localStorage keys.</p>
          </div>
        </section>

        {/* Add User Section */}
        <section className="admin-card">
          <div className="admin-card-header">
            <h2><FiUserPlus /> Whitelist a New User</h2>
            <p>Create an access passkey or generate an instant one-click invite link.</p>
          </div>

          <form onSubmit={handleAddUser} className="admin-create-form">
            <div className="form-group">
              <label>User Label / Identifier</label>
              <input
                type="text"
                placeholder="e.g. Sahil, Bedroom AppleTV, Guest - John"
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Custom Passkey (Optional)</label>
              <input
                type="text"
                placeholder="Leave blank to auto-generate (e.g. MP-9K2L-7X8M)"
                value={customToken}
                onChange={(e) => setCustomToken(e.target.value)}
              />
            </div>

            <button type="submit" className="btn-add-whitelist">
              <FiKey /> Whitelist User
            </button>
          </form>

          {formError && <div className="gate-alert error" style={{ marginTop: '14px' }}>{formError}</div>}
          {formSuccess && <div className="gate-alert success" style={{ marginTop: '14px' }}><FiCheck /> {formSuccess}</div>}
        </section>

        {/* Whitelist Table Section */}
        <section className="admin-card">
          <div className="admin-card-header">
            <h2><FiUsers /> Whitelisted Members &amp; Tokens</h2>
            <p>Manage access status or copy auto-login links for authorized users.</p>
          </div>

          {whitelist.length === 0 ? (
            <p style={{ color: '#888', padding: '24px 0' }}>No whitelisted users yet.</p>
          ) : (
            <div className="whitelist-table-wrapper">
              <table className="whitelist-table">
                <thead>
                  <tr>
                    <th>User Label</th>
                    <th>Passkey / Token</th>
                    <th>Status</th>
                    <th>Created</th>
                    <th>One-Click Invite Link</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {whitelist.map((item) => (
                    <tr key={item.id} className={!item.active ? 'row-inactive' : ''}>
                      <td className="col-label">
                        <strong>{item.label}</strong>
                      </td>
                      <td className="col-token">
                        <code className="token-code">{item.token}</code>
                      </td>
                      <td className="col-status">
                        <button
                          className={`status-chip ${item.active ? 'active' : 'revoked'}`}
                          onClick={() => handleToggleStatus(item.id)}
                          title="Click to toggle active/revoked"
                        >
                          {item.active ? 'ACTIVE' : 'REVOKED'}
                        </button>
                      </td>
                      <td className="col-date">
                        {new Date(item.createdAt).toLocaleDateString()}
                      </td>
                      <td className="col-link">
                        <button
                          className="btn-copy-link"
                          onClick={() => handleCopyInviteLink(item.token, item.id)}
                          title="Copies: http://.../?invite=TOKEN"
                        >
                          {copiedId === item.id ? (
                            <>
                              <FiCheck color="#4cd964" /> Copied Link!
                            </>
                          ) : (
                            <>
                              <FiCopy /> Copy Invite URL
                            </>
                          )}
                        </button>
                      </td>
                      <td className="col-actions">
                        <button
                          className="btn-action-grant"
                          onClick={() => handleGrantThisBrowser(item.token)}
                          title="Authorizes this specific browser window with this token"
                        >
                          Use on this Browser
                        </button>
                        <button
                          className="btn-action-delete"
                          onClick={() => handleDelete(item.id, item.label)}
                          title="Revoke and Delete"
                        >
                          <FiTrash2 />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>

        {/* Change Admin Password */}
        <section className="admin-card security-card">
          <div className="admin-card-header">
            <h2><FiLock /> Admin Security Settings</h2>
            <p>Update the master admin password required to access this /admin route.</p>
          </div>

          <form onSubmit={handleChangePassword} className="admin-create-form">
            <div className="form-group">
              <label>New Admin Password</label>
              <div className="gate-input-wrapper">
                <input
                  type={showNewPass ? 'text' : 'password'}
                  placeholder="Minimum 4 characters"
                  value={newAdminPass}
                  onChange={(e) => setNewAdminPass(e.target.value)}
                  required
                />
                <button
                  type="button"
                  className="toggle-pass-visibility-btn"
                  onClick={() => setShowNewPass(!showNewPass)}
                  tabIndex={-1}
                  title={showNewPass ? 'Hide password' : 'Show password'}
                >
                  {showNewPass ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                </button>
              </div>
            </div>
            <button type="submit" className="btn-update-pass">
              Update Password
            </button>
          </form>

          {passChangeMsg && (
            <div className={`gate-alert ${passChangeMsg.startsWith('Error') ? 'error' : 'success'}`} style={{ marginTop: '14px' }}>
              {passChangeMsg}
            </div>
          )}
        </section>
      </main>
    </div>
  )
}