// Web Audio API & Web Push Notification Utility for PriceDesk

export function playNotificationChime() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()
    const now = ctx.currentTime

    // Tone 1: D5 (587.33Hz)
    const osc1 = ctx.createOscillator()
    const gain1 = ctx.createGain()
    osc1.type = 'sine'
    osc1.frequency.setValueAtTime(587.33, now)
    gain1.gain.setValueAtTime(0.12, now)
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.25)
    osc1.connect(gain1)
    gain1.connect(ctx.destination)
    osc1.start(now)
    osc1.stop(now + 0.25)

    // Tone 2: A5 (880Hz)
    const osc2 = ctx.createOscillator()
    const gain2 = ctx.createGain()
    osc2.type = 'sine'
    osc2.frequency.setValueAtTime(880, now + 0.08)
    gain2.gain.setValueAtTime(0.18, now + 0.08)
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.45)
    osc2.connect(gain2)
    gain2.connect(ctx.destination)
    osc2.start(now + 0.08)
    osc2.stop(now + 0.45)
  } catch (e) {
    console.warn('AudioContext chime not allowed without prior user interaction:', e)
  }
}

export function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if ('Notification' in window) {
    return Notification.requestPermission()
  }
  return Promise.resolve('denied' as NotificationPermission)
}

export function showBrowserNotification(title: string, body: string) {
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
