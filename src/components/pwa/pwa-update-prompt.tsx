import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

/**
 * PWAUpdatePrompt
 *
 * Listens for new service worker registration events.
 * When a new version of the app is deployed:
 * - skipWaiting is called so the new SW activates immediately
 * - A toast notification prompts the user to reload
 *
 * Works on iOS Safari PWA (installed to home screen) and Android Chrome.
 */
export function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)

  const { updateServiceWorker } = useRegisterSW({
    onNeedRefresh() {
      setNeedRefresh(true)
    },
    onOfflineReady() {
      console.info('[PWA] App ready to work offline.')
    },
    onRegistered(r) {
      // Poll every 60s for a new SW (catches updates while app is open)
      if (r) {
        setInterval(() => {
          r.update().catch(console.warn)
        }, 60 * 1000)
      }
    },
  })

  useEffect(() => {
    if (!needRefresh) return

    toast('🚀 New update available!', {
      id: 'pwa-update',
      duration: Infinity,
      description: 'A new version of PriceDesk has been deployed.',
      action: {
        label: 'Update Now',
        onClick: () => {
          updateServiceWorker(true)
        },
      },
      icon: <RefreshCw className="h-4 w-4 text-primary" />,
    })
  }, [needRefresh, updateServiceWorker])

  return null
}
