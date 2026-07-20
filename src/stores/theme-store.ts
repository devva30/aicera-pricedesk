import { create } from 'zustand'
import { persist } from 'zustand/middleware'

interface ThemeState {
  theme: 'light' | 'dark' | 'system'
  setTheme: (theme: 'light' | 'dark' | 'system') => void
  resolvedTheme: () => 'light' | 'dark'
  applyTheme: () => void
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set, get) => ({
      theme: 'system',
      setTheme: (theme) => {
        set({ theme })
        get().applyTheme()
      },
      resolvedTheme: () => {
        const { theme } = get()
        if (theme === 'system') {
          return window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
        }
        return theme
      },
      applyTheme: () => {
        const resolved = get().resolvedTheme()
        document.documentElement.classList.toggle('dark', resolved === 'dark')
      },
    }),
    { name: 'pricedesk-theme' }
  )
)
