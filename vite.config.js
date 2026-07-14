/// <reference types="vitest/config" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/tests/setup.js',
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/**/*.{js,jsx}'],
      exclude: [
        'src/tests/**',
        'src/main.jsx',
        'src/App.jsx',
        // Service worker propio: corre en ServiceWorkerGlobalScope, no en
        // jsdom. No es testeable con Vitest y no debe hundir los thresholds.
        'src/sw.js',
      ],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 60,
        statements: 60,
      },
    },
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      // injectManifest en vez de generateSW: necesitamos logica de cache
      // propia (cacheKeyWillBeUsed) para que la API deje de clavear por el
      // token de sesion. El service worker vive en src/sw.js; ya no hay un
      // bloque `workbox` aqui porque toda esa logica esta escrita a mano ahi.
      // Detalle del problema original en docs/deuda-tecnica.md ("Cache de
      // API claveada por token").
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.js',
      manifest: {
        name: 'NovAttend',
        short_name: 'NovAttend',
        theme_color: '#800000',
        background_color: '#FAFAF8',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        lang: 'es',
        icons: [
          { src: '/logova1.png', sizes: '192x192', type: 'image/png' },
          { src: '/logova1.png', sizes: '512x512', type: 'image/png' }
        ]
      },
      injectManifest: {
        // Sin png: el unico png (logova1, icono) ya lo precachea el plugin via
        // los iconos del manifest; tenerlo tambien en el glob lo duplicaba en
        // el manifest de precache (17 entradas declaradas, 16 unicas reales).
        globPatterns: ['**/*.{js,css,html,svg,ico,woff2}']
      }
    })
  ],
  build: {
    rollupOptions: {
      output: {
        // Separar dependencias de node_modules en chunks cacheables propios.
        // Una funcion (en vez de array de nombres) garantiza que React acabe
        // en su chunk en vez de mezclarse en index.js, para que el navegador
        // no re-descargue React en cada deploy de codigo propio.
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react-router')) return 'vendor-router'
            if (id.includes('/react/') || id.includes('/react-dom/') || id.includes('/scheduler/')) {
              return 'vendor-react'
            }
          }
        }
      }
    }
  }
})
