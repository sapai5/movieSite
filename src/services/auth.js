// Authentication & Whitelist Service

const STORAGE_KEYS = {
  PROTECTION: 'movieplayer_protection_enabled',
  ADMIN_PASS: 'movieplayer_admin_password',
  ADMIN_SESSION: 'movieplayer_admin_session',
  WHITELIST: 'movieplayer_whitelist',
  USER_TOKEN: 'movieplayer_user_token',
}

const DEFAULT_ADMIN_PASS = 'admin123'

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

// --- Protection Toggle ---
export function isProtectionEnabled() {
  const saved = localStorage.getItem(STORAGE_KEYS.PROTECTION)
  return saved === null ? true : saved === 'true'
}

export function setProtectionEnabled(enabled) {
  localStorage.setItem(STORAGE_KEYS.PROTECTION, enabled ? 'true' : 'false')
}

// --- Whitelist Management ---
export function getWhitelist() {
  const raw = localStorage.getItem(STORAGE_KEYS.WHITELIST)
  if (!raw) {
    return []
  }
  try {
    const parsed = JSON.parse(raw)
    // Filter out any legacy demo passes
    const cleaned = parsed.filter(
      (item) => item.token !== 'VIP-NETFLIX-2026' && item.id !== 'seed-1'
    )
    if (cleaned.length !== parsed.length) {
      localStorage.setItem(STORAGE_KEYS.WHITELIST, JSON.stringify(cleaned))
    }
    return cleaned
  } catch {
    return []
  }
}

export function saveWhitelist(list) {
  localStorage.setItem(STORAGE_KEYS.WHITELIST, JSON.stringify(list))
}

export function generateToken(prefix = 'MP') {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let part1 = ''
  let part2 = ''
  for (let i = 0; i < 4; i++) part1 += chars.charAt(Math.floor(Math.random() * chars.length))
  for (let i = 0; i < 4; i++) part2 += chars.charAt(Math.floor(Math.random() * chars.length))
  return `${prefix}-${part1}-${part2}`
}

export function addWhitelistUser(label, customToken = '') {
  const list = getWhitelist()
  const token = (customToken.trim() || generateToken()).toUpperCase()

  // Prevent duplicate tokens
  if (list.some((item) => item.token.toUpperCase() === token)) {
    throw new Error(`Token "${token}" already exists in whitelist.`)
  }

  const newEntry = {
    id: `user-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
    label: label.trim() || 'Invited User',
    token,
    createdAt: new Date().toISOString(),
    active: true,
  }

  list.unshift(newEntry)
  saveWhitelist(list)
  return newEntry
}

export function toggleUserStatus(id) {
  const list = getWhitelist().map((item) => {
    if (item.id === id) {
      return { ...item, active: !item.active }
    }
    return item
  })
  saveWhitelist(list)
  return list
}

export function deleteWhitelistUser(id) {
  const list = getWhitelist().filter((item) => item.id !== id)
  saveWhitelist(list)
  return list
}

// --- User Authorization ---
export function getUserStoredToken() {
  // Check localStorage first, then persistent Cookie
  return localStorage.getItem(STORAGE_KEYS.USER_TOKEN) || getCookie('movieplayer_token')
}

export function isTokenValid(token) {
  if (!token) return false
  const clean = token.trim().toUpperCase()
  // Ensure legacy demo pass is not recognized
  if (clean === 'VIP-NETFLIX-2026') return false
  const list = getWhitelist()
  return list.some((item) => item.token.toUpperCase() === clean && item.active)
}

export function isUserAuthorized() {
  if (!isProtectionEnabled()) return true
  const token = getUserStoredToken()
  return isTokenValid(token)
}

export function authorizeUser(token) {
  if (!isTokenValid(token)) {
    return { success: false, message: 'Invalid or deactivated access token.' }
  }
  const clean = token.trim().toUpperCase()
  localStorage.setItem(STORAGE_KEYS.USER_TOKEN, clean)
  setCookie('movieplayer_token', clean, 365)
  return { success: true }
}

export function logoutUser() {
  localStorage.removeItem(STORAGE_KEYS.USER_TOKEN)
  deleteCookie('movieplayer_token')
}

// --- Admin Authentication ---
export function getAdminPassword() {
  return localStorage.getItem(STORAGE_KEYS.ADMIN_PASS) || DEFAULT_ADMIN_PASS
}

export function setAdminPassword(newPassword) {
  if (!newPassword || newPassword.trim().length < 4) {
    throw new Error('Password must be at least 4 characters.')
  }
  localStorage.setItem(STORAGE_KEYS.ADMIN_PASS, newPassword.trim())
}

export function isAdminAuthenticated() {
  return sessionStorage.getItem(STORAGE_KEYS.ADMIN_SESSION) === 'true'
}

export function loginAdmin(password) {
  const current = getAdminPassword()
  if (password === current) {
    sessionStorage.setItem(STORAGE_KEYS.ADMIN_SESSION, 'true')
    return true
  }
  return false
}

export function logoutAdmin() {
  sessionStorage.removeItem(STORAGE_KEYS.ADMIN_SESSION)
}