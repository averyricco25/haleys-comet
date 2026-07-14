import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icons/comet.svg'],
      manifest: {
        name: "Haley's Comet",
        short_name: 'Comet',
        description: 'Track the shows in your universe',
        theme_color: '#0d1024',
        background_color: '#0d1024',
        display: 'standalone',
        orientation: 'portrait',
        start_url: '/',
        icons: [
          { src: 'icons/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
        ]
      },
      workbox: {
        navigateFallbackDenylist: [/^\/__/],
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.tvmaze\.com\/.*/,
            handler: 'NetworkFirst',
            options: { cacheName: 'tvmaze-api', expiration: { maxEntries: 100, maxAgeSeconds: 86400 } }
          },
          {
            urlPattern: /^https:\/\/static\.tvmaze\.com\/.*/,
            handler: 'CacheFirst',
            options: { cacheName: 'tvmaze-images', expiration: { maxEntries: 300, maxAgeSeconds: 604800 } }
          }
        ]
      }
    })
  ]
})
