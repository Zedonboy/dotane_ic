import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'
import path from 'path'
import dotenv from "dotenv"

// Load .env from a different directory
const envPath = path.resolve(__dirname, '../../.env')
let env = dotenv.config({ path: envPath })

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      // Whether to polyfill specific globals
      globals: {
        global: true,
        process: true,
        Buffer: true,
      },
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@declarations": path.resolve(__dirname, "../declarations"),
      "@packages": path.resolve(__dirname, "./packages"),
    },
  },
  optimizeDeps: {
    exclude: ['@fusion-wallet/wallet-direct', '@fusion-wallet/wallet-app']
  },
  define: {
    "process.env": {
      ...process.env,
      ...env.parsed,
    },
  },
}) 