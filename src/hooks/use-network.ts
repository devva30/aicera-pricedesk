import { useEffect, useState } from 'react'
import { Capacitor } from '@capacitor/core'

export function useNetwork() {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  )

  useEffect(() => {
    if (Capacitor.isNativePlatform()) {
      let listener: any

      import('@capacitor/network')
        .then((mod) => {
          const NetworkPlugin = mod.Network
          NetworkPlugin.getStatus().then((status: any) => {
            setIsOnline(status.connected)
          })
          NetworkPlugin.addListener('networkStatusChange', (status: any) => {
            setIsOnline(status.connected)
          }).then((l: any) => {
            listener = l
          })
        })
        .catch((err) => {
          console.warn('Capacitor Network plugin not available, falling back to browser navigator', err)
        })

      return () => {
        if (listener) {
          listener.remove()
        }
      }
    } else {
      const handleOnline = () => setIsOnline(true)
      const handleOffline = () => setIsOnline(false)

      window.addEventListener('online', handleOnline)
      window.addEventListener('offline', handleOffline)

      return () => {
        window.removeEventListener('online', handleOnline)
        window.removeEventListener('offline', handleOffline)
      }
    }
  }, [])

  return { isOnline }
}
