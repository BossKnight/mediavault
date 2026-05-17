import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],

  server: {
    // --- What is a proxy? ---
    // A proxy is a middleman. In development, the frontend runs on port 5173
    // and the backend runs on port 3001. Without a proxy, the frontend has to
    // hardcode "http://localhost:3001" everywhere.
    //
    // With this proxy, any request the browser makes to /items, /lookup, or
    // /images on port 5173 is automatically forwarded to port 3001. The browser
    // never has to know the backend's port number.
    proxy: {
      '/items':  'http://localhost:3001',
      '/lookup': 'http://localhost:3001',
      '/images': 'http://localhost:3001',
      '/health': 'http://localhost:3001',
    },
  },
})
