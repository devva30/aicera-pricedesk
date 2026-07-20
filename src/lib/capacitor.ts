import { Capacitor } from '@capacitor/core'

export const isNative = Capacitor.isNativePlatform()
export const platform = Capacitor.getPlatform() // 'ios' | 'android' | 'web'

export const isAndroid = platform === 'android'
export const isIos = platform === 'ios'
export const isWeb = platform === 'web'
