// Shared by Vite and the checked-in Vercel configuration (verified by tests).
const playerOrigins = '"https://vidlink.pro" "https://embed.vidrift.net"'
export const deniedFeatures = [
  'camera', 'microphone', 'geolocation', 'display-capture', 'clipboard-read', 'clipboard-write',
  'payment', 'usb', 'serial', 'hid', 'bluetooth', 'midi', 'accelerometer', 'gyroscope',
  'magnetometer', 'xr-spatial-tracking', 'screen-wake-lock', 'publickey-credentials-get',
]

export function securityHeaders(development = false) {
  return {
    'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'SAMEORIGIN',
    'Referrer-Policy': 'no-referrer',
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Permissions-Policy': [
      ...deniedFeatures.map((feature) => `${feature}=()`),
      ...['autoplay', 'fullscreen', 'encrypted-media', 'picture-in-picture'].map((feature) => `${feature}=(self ${playerOrigins})`),
    ].join(', '),
    'Content-Security-Policy': [
      "default-src 'self'",
      // Vite's React preamble is inline; production allows only same-origin scripts.
      `script-src 'self'${development ? " 'unsafe-inline'" : ''}`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: https://image.tmdb.org https://via.placeholder.com",
      `connect-src 'self' https://api.themoviedb.org${development ? ' ws: wss:' : ''}`,
      "frame-src 'self' https://vidlink.pro https://embed.vidrift.net",
      "frame-ancestors 'self'", "object-src 'none'", "base-uri 'none'", "form-action 'none'",
      "worker-src 'self'", "manifest-src 'self'", "media-src 'self' blob:",
    ].join('; '),
  }
}
