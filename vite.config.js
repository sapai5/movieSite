import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { securityHeaders } from './config/security.js'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    host: '0.0.0.0',
    strictPort: true,
    open: true,
    headers: securityHeaders(true),
  },
  preview: {
    headers: securityHeaders(),
  },
})
