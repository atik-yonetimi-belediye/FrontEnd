import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      includeAssets: ['favicon.ico', 'favicon.svg', 'apple-touch-icon-180x180.png', 'fonts/*.woff2'],
      manifest: {
        name: 'Onikişubat Belediyesi Atık Yönetim Sistemi',
        short_name: 'Atık Yönetimi',
        description: 'Onikişubat Belediyesi akıllı atık, şikâyet ve geri dönüşüm takip sistemi',
        lang: 'tr',
        start_url: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#080c14',
        theme_color: '#10b981',
        icons: [
          { src: '/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/pwa-512x512.png', sizes: '512x512', type: 'image/png' },
          { src: '/maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        clientsClaim: true,
        skipWaiting: false,
        navigateFallback: '/index.html',
        runtimeCaching: [
          {
            urlPattern: ({ request }) => request.mode === 'navigate',
            handler: 'NetworkFirst',
            options: { cacheName: 'app-pages-v1', networkTimeoutSeconds: 3 },
          },
          {
            urlPattern: ({ url }) => url.pathname === '/api/sofor/konteynerler',
            handler: 'NetworkFirst',
            options: {
              cacheName: 'private-driver-tasks-v1',
              networkTimeoutSeconds: 4,
              expiration: { maxEntries: 8, maxAgeSeconds: 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: /^https:\/\/(?:[^.]+\.)?(?:basemaps\.cartocdn\.com|arcgisonline\.com)\//,
            handler: 'StaleWhileRevalidate',
            options: {
              cacheName: 'map-tiles-v2',
              expiration: { maxEntries: 180, maxAgeSeconds: 7 * 24 * 60 * 60 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
          {
            urlPattern: ({ request, sameOrigin }) => sameOrigin && (request.destination === 'image' || request.destination === 'font'),
            handler: 'CacheFirst',
            options: { cacheName: 'static-assets-v1', expiration: { maxEntries: 80, maxAgeSeconds: 30 * 24 * 60 * 60 } },
          },
        ],
      },
    }),
  ],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (!id.includes('node_modules')) return undefined
          if (id.includes('leaflet')) return 'maps'
          if (id.includes('recharts') || id.includes('d3-')) return 'charts'
          if (id.includes('@tanstack')) return 'server-state'
          return undefined
        }
      }
    }
  },
  server: {
    host: true, // Expose to local network (0.0.0.0)
    port: 5180,
    strictPort: true,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true
      },
      '/uploads': {
        target: 'http://127.0.0.1:5001',
        changeOrigin: true
      }
    }
  }
})
