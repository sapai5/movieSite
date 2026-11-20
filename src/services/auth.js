// Authentication Service
// Tokens are verified server-side by /api/verify against the ACCESS_TOKENS env var,
// so a token works on every device (laptop, phone, etc.).

const USER_TOKEN_KEY = 'movieplayer_user_token'
const COOKIE_NAME = 'movieplayer_token'

// --- Cookie Helpers ---
export function setCookie(name, value, days = 365) {
  const expires = new Date(Date.now() + days * 864e5).toUTCString()
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax`
}

export function getCookie(name) {
  const match = document.cookie.match(new RegExp('(?:^|; )' + encodeURIComponent(name) + '=([^;]*)'))
  return match ? decodeURIComponent(match[1]) : null
}

export function deleteCookie(name) {
  document.cookie = `${encodeURIComponent(name)}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
}

function safeGet(key) {
  try { return localStorage.getItem(key) } catch { return null }
}
function safeSet(key, value) {
  try { localStorage.setItem(key, value) } catch { /* ignore */ }
}
function safeRemove(key) {
  try { localStorage.removeItem(key) } catch { /* ignore */ }
}

export function generateToken(prefix = 'MP') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = new Uint32Array(8)
  crypto.getRandomValues(bytes)
  const pick = (n) => chars.charAt(n % chars.length)
  const part1 = Array.from(bytes.slice(0, 4), pick).join('')
  const part2 = Array.from(bytes.slice(4), pick).join('')
  return `${prefix}-${part1}-${part2}`
}

// --- User Authorization ---
export function getUserStoredToken() {
  return safeGet(USER_TOKEN_KEY) || getCookie(COOKIE_NAME)
}

// Returns true / false, or null if the server couldn't be reached.
export async function verifyToken(token) {
  if (!token || !token.trim()) return false
  try {
    const res = await fetch('/api/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.trim() }),
    })
    if (res.status === 200 || res.status === 401) {
      const data = await res.json()
      return Boolean(data.valid)
    }
    return null
  } catch {
    return null
  }
}

function storeToken(token) {
  const clean = token.trim().toUpperCase()
  safeSet(USER_TOKEN_KEY, clean)
  setCookie(COOKIE_NAME, clean, 365)
}

export async function authorizeUser(token) {
  const valid = await verifyToken(token)
  if (valid === null) {
    return { success: false, message: 'Could not reach the server. Check your connection and try again.' }
  }
  if (!valid) {
    return { success: false, message: 'Invalid or deactivated access token.' }
  }
  storeToken(token)
  return { success: true }
}

// Re-checks the saved token with the server. If the server is unreachable
// (e.g. offline PWA launch), a previously saved token is trusted.
export async function checkStoredAuthorization() {
  const token = getUserStoredToken()
  if (!token) return false
  const valid = await verifyToken(token)
  if (valid === null) return true
  if (!valid) logoutUser()
  return valid
}

export function logoutUser() {
  safeRemove(USER_TOKEN_KEY)
  deleteCookie(COOKIE_NAME)
}
