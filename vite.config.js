import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'NovAttend',
        short_name: 'NovAttend',
        theme_color: '#800000',
        background_color: '#FAFAF8',
        display: 'standalone',
        icons: [
          { src: '/logova1.png', sizes: '192x192', type: 'image/png' },
          { src: '/logova1.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
})
