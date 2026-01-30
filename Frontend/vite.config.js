import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
   test: {
    globals: true, // Allows using describe, it, expect without importing
    environment: "jsdom", // Simulates a browser environment
    setupFiles: "./src/test/setup.js", // Global setup file
  },
})


