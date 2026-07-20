import { isNative } from '@/lib/capacitor'
import { db } from '@/lib/firebase'
import { doc, updateDoc, arrayUnion } from 'firebase/firestore'

// Dynamically import messaging to avoid breaking native builds or unsupported environments
let webMessaging: any = null
if (!isNative && typeof window !== 'undefined') {
  import('firebase/messaging')
    .then((mod) => {
      // Import getMessaging from firebase/messaging
      const { getMessaging } = mod
      try {
        // Initialize messaging safely (unsupported browsers like Safari in private mode will throw)
        webMessaging = getMessaging()
      } catch (err) {
        console.warn('Firebase Messaging not supported on this browser/context', err)
      }
    })
    .catch((err) => console.warn('Failed to load firebase/messaging module', err))
}

/**
 * Registers the device for FCM push notifications
 * Supports both Native (Capacitor) and Web (PWA Service Worker)
 */
export async function registerPushNotifications(userId: string) {
  if (!userId || userId.startsWith('demo-')) {
    console.log('Skipping push registration for demo user or invalid session')
    return
  }

  if (isNative) {
    // Phase 4: Native Push Notifications via Capacitor
    try {
      const { PushNotifications } = await import('@capacitor/push-notifications')
      
      let permStatus = await PushNotifications.checkPermissions()
      
      if (permStatus.receive === 'prompt') {
        permStatus = await PushNotifications.requestPermissions()
      }
      
      if (permStatus.receive !== 'granted') {
        console.warn('Native push notifications permission denied by user')
        return
      }

      // Register with Apple / Google Push Services
      await PushNotifications.register()

      // Successfully registered to native push services
      await PushNotifications.addListener('registration', async (token) => {
        console.log('Native push registration successful. Token:', token.value)
        try {
          const userRef = doc(db, 'users', userId)
          await updateDoc(userRef, {
            fcmTokens: arrayUnion(token.value)
          })
          console.log('Saved native push token to user profile')
        } catch (dbErr) {
          console.error('Failed to save native push token to Firestore', dbErr)
        }
      })

      await PushNotifications.addListener('registrationError', (err) => {
        console.error('Native push registration error:', err)
      })

      // Show alert or handle foreground pushes
      await PushNotifications.addListener('pushNotificationReceived', (notification) => {
        console.log('Push received in foreground:', notification)
        // Show local toast or native alert if needed
      })

      await PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
        console.log('Push action performed:', action)
        // Handle navigation/redirect here
      })

    } catch (err) {
      console.error('Error setting up native push notifications:', err)
    }
  } else {
    // Phase 4: Web/PWA Push Notifications via Firebase Messaging Web SDK
    if (!webMessaging) {
      console.log('FCM Web messaging not initialized or not supported on this device')
      return
    }

    try {
      const permission = await Notification.requestPermission()
      if (permission !== 'granted') {
        console.warn('Web push notifications permission denied')
        return
      }

      const { getToken } = await import('firebase/messaging')
      // Retrieve registration token
      const token = await getToken(webMessaging, {
        serviceWorkerRegistration: await navigator.serviceWorker.ready
      })

      if (token) {
        console.log('Web PWA push registration successful. Token:', token)
        const userRef = doc(db, 'users', userId)
        await updateDoc(userRef, {
          fcmTokens: arrayUnion(token)
        })
        console.log('Saved web PWA push token to user profile')

        // Listen for messages while app is in foreground
        const { onMessage } = await import('firebase/messaging')
        onMessage(webMessaging, (payload) => {
          console.log('Message received in web foreground: ', payload)
          // You could show a custom toast here
        })
      } else {
        console.warn('No registration token available. Request permission to generate one.')
      }
    } catch (err) {
      console.error('Error setting up Web push notifications:', err)
    }
  }
}
