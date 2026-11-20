// Vercel serverless function: checks a token against the ACCESS_TOKENS env var.
// ACCESS_TOKENS is a comma-separated list, e.g. "MP-ABCD-EFGH,MP-JKLM-NPQR"
import { timingSafeEqual } from 'node:crypto'

function getAllowedTokens() {
  return (process.env.ACCESS_TOKENS || '')
    .split(',')
    .map((t) => t.trim().toUpperCase())
    .filter(Boolean)
}

function safeEqual(a, b) {
  const ab = Buffer.from(a)
  const bb = Buffer.from(b)
  return ab.length === bb.length && timingSafeEqual(ab, bb)
}

export function isAllowedToken(token) {
  if (typeof token !== 'string' || !token.trim()) return false
  const clean = token.trim().toUpperCase()
  return getAllowedTokens().some((allowed) => safeEqual(allowed, clean))
}

export default function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store')
  if (req.method !== 'POST') {
    res.status(405).json({ valid: false, message: 'Method not allowed' })
    return
  }
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { body = {} }
  }
  const valid = isAllowedToken(body?.token)
  res.status(valid ? 200 : 401).json({ valid })
}
