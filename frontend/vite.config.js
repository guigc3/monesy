import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve, dirname } from 'path'
import { fileURLToPath } from 'url'
import { computeAppVersion } from '../scripts/compute-version.js'

const __dirname = dirname(fileURLToPath(import.meta.url))
const appVersion = computeAppVersion(resolve(__dirname, '..'))

export default defineConfig({
  plugins: [vue()],
  define: {
    __APP_VERSION__: JSON.stringify(appVersion),
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5001',
      '/design-system': 'http://localhost:5001',
      '/logos': 'http://localhost:5001',
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      output: {
        manualChunks: {
          vue: ['vue', 'vue-router', 'pinia'],
          chartjs: ['chart.js'],
        },
      },
    },
  },
})
