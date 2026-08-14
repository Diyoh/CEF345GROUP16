import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
/**
 * PROXY TARGET
 * Where the Express API is listening locally. Changing the backend PORT means
 * changing this one line.
 */
const API_TARGET = 'http://localhost:5000'

/**
 * The backend's CORS allowlist only trusts localhost origins in development.
 * When the dev server is reached through a public tunnel, the browser stamps
 * requests with the tunnel's origin, which the API would reject. We rewrite the
 * Origin header to a trusted one as the request leaves the proxy - safe because
 * this hop is server-to-server on the same machine, never the browser's word.
 */
const PROXY_HEADERS = { Origin: 'http://localhost:5173' }

export default defineConfig({
  plugins: [react()],
  server: {
    // Listen on all interfaces, not just 127.0.0.1, so a tunnel or another
    // device on the LAN can reach the dev server at all.
    host: true,
    // Vite rejects requests whose Host header it does not recognise. Cloudflare
    // quick tunnels hand out a random *.trycloudflare.com name each run.
    allowedHosts: ['.trycloudflare.com'],
    proxy: {
      // Serving the API from the same origin as the app means one tunnel covers
      // both, and the auth cookie is first-party rather than cross-site.
      '/api': {
        target: API_TARGET,
        changeOrigin: true,
        headers: PROXY_HEADERS
      },
      '/socket.io': {
        target: API_TARGET,
        changeOrigin: true,
        ws: true, // Real-time updates are a WebSocket upgrade, not plain HTTP
        headers: PROXY_HEADERS
      }
    }
  },
   test: {
    globals: true, // Allows using describe, it, expect without importing
    environment: "happy-dom", // Simulates a browser environment (faster/compat with Vite)
    setupFiles: "./src/test/setup.js", // Global setup file
  },
})


