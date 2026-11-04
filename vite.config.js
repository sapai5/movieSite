import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 3000,
    open: true,
    headers: {
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
    },
  },
  preview: {
    headers: {
      'X-Robots-Tag': 'noindex, nofollow, noarchive, nosnippet',
    },
  },
})