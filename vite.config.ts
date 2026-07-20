import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'path'
import fs from 'fs'

export default defineConfig({
  base: './',
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      manifest: {
        name: 'PriceDesk',
        short_name: 'PriceDesk',
        description: 'Smarter tech. Sharper minds. Enterprise pricing approval workflow.',
        theme_color: '#7C3AED',
        background_color: '#1E1B4B',
        display: 'standalone',
        orientation: 'portrait-primary',
        start_url: './index.html',
        icons: [
          {
            src: 'icons/icon-192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'icons/icon-512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'icons/icon-maskable-512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable'
          },
          {
            src: 'icons/apple-touch-icon.png',
            sizes: '180x180',
            type: 'image/png'
          }
        ]
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],
        maximumFileSizeToCacheInBytes: 4 * 1024 * 1024,
        // Force immediate activation — new SW takes over without waiting
        skipWaiting: true,
        clientsClaim: true,
        // Remove old caches from previous SW versions automatically
        cleanupOutdatedCaches: true,
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-stylesheets',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          },
          {
            urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
            handler: 'CacheFirst',
            options: {
              cacheName: 'google-fonts-webformats',
              expiration: {
                maxEntries: 30,
                maxAgeSeconds: 60 * 60 * 24 * 365 // 1 year
              }
            }
          }
        ]
      }
    }),
    {
      name: 'firebase-admin-helper',
      configureServer(server) {
        server.middlewares.use((req, res, next) => {
          if (req.url === '/api/generate-reset-link' && req.method === 'POST') {
            let body = ''
            req.on('data', (chunk) => {
              body += chunk
            })
            req.on('end', async () => {
              try {
                const { email } = JSON.parse(body)
                if (!email) {
                  res.statusCode = 400
                  res.end(JSON.stringify({ error: 'Email is required' }))
                  return
                }

                // Dynamically import firebase-admin to avoid bringing it into browser bundle
                const admin = (await import('firebase-admin')).default

                const keyPath = path.resolve('./serviceAccountKey.json')
                if (!fs.existsSync(keyPath)) {
                  res.statusCode = 400
                  res.setHeader('Content-Type', 'application/json')
                  res.end(JSON.stringify({ error: 'serviceAccountKey.json missing' }))
                  return
                }

                if (admin.apps.length === 0) {
                  const serviceAccount = JSON.parse(fs.readFileSync(keyPath, 'utf8'))
                  admin.initializeApp({
                    credential: admin.credential.cert(serviceAccount),
                  })
                }

                const resetUrl = process.env.RESET_URL || `http://localhost:5173/login`
                const link = await admin.auth().generatePasswordResetLink(email, { url: resetUrl })

                res.statusCode = 200
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ link }))
              } catch (err: any) {
                res.statusCode = 500
                res.setHeader('Content-Type', 'application/json')
                res.end(JSON.stringify({ error: err.message || 'Internal server error' }))
              }
            })
          } else {
            next()
          }
        })
      },
    },
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
})
