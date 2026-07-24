import { useEffect } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

/**
 * PWAUpdatePrompt (Shared)
 *
 * Listens for new service worker registration events.
 * Automatically updates to the latest Netlify build whenever the site is opened or focused.
 */
export function PWAUpdatePrompt() {
  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
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
        r.update().catch(console.warn)

        const handleFocus = () => {
          r.update().catch(console.warn)
        }
        window.addEventListener('focus', handleFocus)

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
