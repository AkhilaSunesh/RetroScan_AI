import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      // This allows you to test the PWA offline mode while running 'npm run dev'
      devOptions: {
        enabled: true,
        type: 'module'
      },
      // Caches your assets so the app loads without internet
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg}'],
        navigateFallback: '/index.html'
      },
      manifest: {
        name: 'RetroScan AI',
        short_name: 'RetroScan',
        description: 'NHAI Retroreflectivity Scanner',
        theme_color: '#e11d48', // Your primary rose color
        background_color: '#0f0a0d', // Your dark base color
        display: 'standalone',
        orientation: 'portrait',
        icons: [
          {
            src: '/favicon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any maskable'
          }
        ]
      }
    })
  ],
})