import { create } from 'zustand'
import type { Notification } from '@/types'
import { MOCK_NOTIFICATIONS, persistMockNotifications } from '@/lib/mock-data'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth-store'
import {
  collection,
  doc,
  getDocs,
  query,
  where,
  deleteDoc,
  writeBatch,
} from 'firebase/firestore'

interface NotificationState {
  notifications: Notification[]
  isLoading: boolean
  fetchNotifications: (userId: string) => Promise<void>
  markAsRead: (id: string) => Promise<void>
  markAllRead: (userId: string) => Promise<void>
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationState>((set, get) => ({
  notifications: [],
  isLoading: false,

  unreadCount: () => get().notifications.filter((n) => !n.is_read).length,

  fetchNotifications: async (userId) => {
    set({ isLoading: true })
    
    if (useAuthStore.getState().isDemo) {
      set({
        notifications: MOCK_NOTIFICATIONS.filter((n) => n.user_id === userId),
        isLoading: false,
      })
      return
    }

    const q = query(collection(db, 'notifications'), where('user_id', '==', userId))
    const snap = await getDocs(q)
    const list: Notification[] = []
    
    snap.forEach((doc) => {
      list.push({ id: doc.id, ...doc.data() } as Notification)
    })

    set({ notifications: list, isLoading: false })
  },

  markAsRead: async (id) => {
    set({
      notifications: get().notifications.filter((n) => n.id !== id),
    })

    if (useAuthStore.getState().isDemo) {
      const idx = MOCK_NOTIFICATIONS.findIndex((x) => x.id === id)
      if (idx !== -1) {
        MOCK_NOTIFICATIONS.splice(idx, 1)
        persistMockNotifications()
      }
      return
    }

    await deleteDoc(doc(db, 'notifications', id))
  },

  markAllRead: async (userId) => {
    set({
      notifications: [],
    })

    if (useAuthStore.getState().isDemo) {
      for (let i = MOCK_NOTIFICATIONS.length - 1; i >= 0; i--) {
        if (MOCK_NOTIFICATIONS[i].user_id === userId) {
          MOCK_NOTIFICATIONS.splice(i, 1)
        }
      }
      persistMockNotifications()
      return
    }

    const q = query(collection(db, 'notifications'), where('user_id', '==', userId))
    const snap = await getDocs(q)
    const batch = writeBatch(db)
    
    snap.forEach((doc) => {
      batch.delete(doc.ref)
    })
    
    await batch.commit()
  },
}))
