import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Proxy API + SSE to the backend so the browser makes same-origin requests
// (no CORS in dev). The web client never talks to Fireblocks directly.
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      '/api': { target: 'http://localhost:4000', changeOrigin: true },
      '/stream': { target: 'http://localhost:4000', changeOrigin: true },
    },
  },
})
