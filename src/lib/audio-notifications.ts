// Web Push Notification Utility for PriceDesk

export function playNotificationChime() {
  // Silent / disabled per user requirement
}

export function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if ('Notification' in window) {
    return Notification.requestPermission()
  }
  return Promise.resolve('denied' as NotificationPermission)
}

export function showBrowserNotification(title: string, body: string) {
  if (typeof localStorage !== 'undefined' && localStorage.getItem('pricedesk_push_disabled') === 'true') {
    return
  }
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      const notif = new Notification(title, {
        body,
        icon: 'https://framerusercontent.com/images/AlNvsxkJzF8SFWwwytH2xsnL8uM.png',
        tag: 'pricedesk-alert',
      })
      notif.onclick = () => {
        window.focus()
      }
    } catch (e) {
      console.warn('Failed to show browser notification:', e)
    }
  }
}
