import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy API + SSE to the backend so the browser makes same-origin requests
// (no CORS in dev). The web client never talks to Fireblocks directly.
export default defineConfig({
  plugins: [react()],
  // GitHub Pages serves under /<repo>/; Vercel/other serve at root.
  base: process.env.GH_PAGES === '1' ? '/fireblocks-wallet/' : '/',
  server: {
    // Allow access through a Cloudflare quick tunnel (public demo link).
    allowedHosts: ['.trycloudflare.com', 'localhost'],
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/stream': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
})
