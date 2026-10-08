import { fileURLToPath, URL } from 'node:url'
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vitest/config'

// '/' locally. The GitHub Pages deploy sets BASE_PATH=/Ielts-Take-Note-App/ (see .github/workflows/deploy.yml).
const base = process.env.BASE_PATH ?? '/'

export default defineConfig({
  base,
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon.svg'],
      manifest: {
        name: 'IELTS Upgrade Notebook',
        short_name: 'Upgrade Notebook',
        description: 'A private notebook for your IELTS corrections, with spaced review.',
        theme_color: '#2E2A4B',
        background_color: '#EBE1CC',
        display: 'standalone',
        start_url: base,
        scope: base,
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
        // Relative to the service worker, so it works under any base path.
        navigateFallback: 'index.html',
      },
    }),
  ],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    // Threads start more reliably than forks when several test runs share the machine.
    pool: 'threads',
    // jsdom screen tests are CPU-heavy. One worker per core (21 on a 22-core laptop) starves them and makes
    // async waits time out at random; 4 workers is as fast overall and stable. GitHub runners have 4 cores.
    maxWorkers: 4,
  },
})
