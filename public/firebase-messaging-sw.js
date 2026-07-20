// Firebase Cloud Messaging Background Service Worker
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js')
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js')

firebase.initializeApp({
  apiKey: "AIzaSyCKpOORJZBqUtwniD3bX9dPsSbgZ29FO88",
  authDomain: "pricedeskk.firebaseapp.com",
  projectId: "pricedeskk",
  storageBucket: "pricedeskk.firebasestorage.app",
  messagingSenderId: "893201133479",
  appId: "1:893201133479:web:1f3ea6eac36fe95604d082"
})

const messaging = firebase.messaging()

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload)
  
  const notificationTitle = payload.notification?.title || 'PriceDesk Notification'
  const notificationOptions = {
    body: payload.notification?.body || 'New update in PriceDesk',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-192.png',
    data: payload.data
  }

  self.registration.showNotification(notificationTitle, notificationOptions)
})
