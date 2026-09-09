import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      include: ['buffer', 'crypto', 'net', 'stream', 'util', 'events', 'path', 'os'],
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
    }),
  ],
  server: {
    proxy: {
      '/archivo': {
        target: 'https://vexjqvxxsyiuybxetlnq.supabase.co/storage/v1/object/public',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/archivo/, '')
      }
    }
  }
})
