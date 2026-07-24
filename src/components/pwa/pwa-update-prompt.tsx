import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

/**
 * PWAUpdatePrompt
 *
 * Listens for new service worker registration events.
 * When a new version of the app is deployed on Netlify:
 * - Automatically activates the new service worker immediately
 * - Automatically refreshes to display the latest updates seamlessly
 *
 * Works on Desktop browsers, iOS Safari PWA, and Android Chrome.
 */
export function PWAUpdatePrompt() {
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      // Automatically trigger update and refresh so the user gets latest version instantly
      toast.info('Updating to the latest version of PriceDesk...', {
        id: 'pwa-updating',
        duration: 2000,
        icon: <RefreshCw className="h-4 w-4 text-primary animate-spin" />,
      })
      updateServiceWorker(true)
    },
    onOfflineReady() {
      console.info('[PWA] App ready to work offline.')
    },
    onRegistered(r) {
      if (r) {
        // Immediately check for updates when app opens
        r.update().catch(console.warn)

        // Check for updates when tab gains focus
        const handleFocus = () => {
          r.update().catch(console.warn)
        }
        window.addEventListener('focus', handleFocus)

        // Poll every 60s for updates while app remains open
        const interval = setInterval(() => {
          r.update().catch(console.warn)
        }, 60 * 1000)

        return () => {
          window.removeEventListener('focus', handleFocus)
          clearInterval(interval)
        }
      }
    },
  })

  return null
}
