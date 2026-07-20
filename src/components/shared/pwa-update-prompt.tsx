import { useEffect, useState } from 'react'
import { useRegisterSW } from 'virtual:pwa-register/react'
import { toast } from 'sonner'
import { RefreshCw } from 'lucide-react'

/**
 * PWAUpdatePrompt
 * 
 * Listens for new service worker registration events.
 * When a new version of the app is deployed, this component
 * automatically triggers a reload so users always get the latest build.
 * 
 * Works correctly on iOS Safari PWA (installed to home screen).
 */
export function PWAUpdatePrompt() {
  const [needRefresh, setNeedRefresh] = useState(false)

  const {
    updateServiceWorker,
  } = useRegisterSW({
    onNeedRefresh() {
      setNeedRefresh(true)
    },
    onOfflineReady() {
      // App is ready to work offline
      console.info('[PWA] App ready to work offline.')
    },
  })

  useEffect(() => {
    if (needRefresh) {
      // Show a non-intrusive toast with an update button
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
        icon: <RefreshCw className="h-4 w-4 text-primary animate-spin" />,
      })
    }
  }, [needRefresh, updateServiceWorker])

  return null
}
