import { create } from 'zustand'
import type { Notification } from '@/types'
import { MOCK_NOTIFICATIONS, persistMockNotifications, subscribeToMockNotifications } from '@/lib/mock-data'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth-store'
import {
  collection,
  doc,
  query,
  where,
  deleteDoc,
  writeBatch,
  onSnapshot,
  orderBy,
  limit,
  type Unsubscribe,
} from 'firebase/firestore'

interface NotificationState {
  notifications: Notification[]
  isLoading: boolean
  fetchNotifications: (userId: string) => Promise<void>
  subscribeToLiveNotifications: (userId: string) => Unsubscribe | undefined
  markAsRead: (id: string) => Promise<void>
  markAllRead: (userId: string) => Promise<void>
  unreadCount: () => number
}

export const useNotificationStore = create<NotificationState>((set, get) => {
  // ─── Demo Mode: Event Bus ──────────────────────────────────────────────────
  // Re-reads MOCK_NOTIFICATIONS whenever a new notification is appended
  subscribeToMockNotifications(() => {
    const currentUser = useAuthStore.getState().user
    if (!currentUser || !useAuthStore.getState().isDemo) return

    const uid = currentUser.id
    const isOps = currentUser.role === 'ops'
    const isSalesHead = currentUser.role === 'sales_head'
    const isSalesRep = currentUser.role === 'sales_rep'

    const fresh = MOCK_NOTIFICATIONS.filter((n) =>
      n.user_id === uid ||
      (isSalesHead && (n.user_id === 'demo-head' || n.user_id === 'sales_head' || n.user_id?.includes('head'))) ||
      (isSalesRep && (n.user_id === 'demo-sales' || n.user_id === 'demo-sales-2' || n.user_id === uid || n.user_id?.includes('sales'))) ||
      (isOps && (n.user_id === 'demo-ops-chetan' || n.user_id === 'demo-ops' || n.user_id?.includes('ops')))
    )
    set({ notifications: fresh })
  })

  return {
    notifications: [],
    isLoading: false,

    unreadCount: () => get().notifications.filter((n) => !n.is_read).length,

    // ─── Fetch (demo mode one-shot read) ─────────────────────────────────────
    fetchNotifications: async (userId) => {
      set({ isLoading: true })
      const currentUser = useAuthStore.getState().user
      const isOps = currentUser?.role === 'ops'
      const isSalesHead = currentUser?.role === 'sales_head'
      const isSalesRep = currentUser?.role === 'sales_rep'

      if (useAuthStore.getState().isDemo) {
        set({
          notifications: MOCK_NOTIFICATIONS.filter((n) =>
            n.user_id === userId ||
            n.user_id === currentUser?.id ||
            (isSalesHead && (n.user_id === 'demo-head' || n.user_id === 'sales_head' || n.user_id?.includes('head'))) ||
            (isSalesRep && (n.user_id === 'demo-sales' || n.user_id === 'demo-sales-2' || n.user_id === 'sales_rep' || n.user_id?.includes('sales'))) ||
            (isOps && (n.user_id === 'demo-ops-chetan' || n.user_id === 'demo-ops' || n.user_id?.includes('ops')))
          ),
          isLoading: false,
        })
        return
      }

      // Live mode: no-op — subscribeToLiveNotifications handles real-time updates
      set({ isLoading: false })
    },

    // ─── Live mode: Firestore onSnapshot real-time listener ──────────────────
    subscribeToLiveNotifications: (userId) => {
      if (useAuthStore.getState().isDemo) return undefined

      const q = query(
        collection(db, 'notifications'),
        where('user_id', '==', userId),
        orderBy('created_at', 'desc'),
        limit(50)
      )

      const unsubscribe = onSnapshot(
        q,
        (snap) => {
          const list: Notification[] = []
          snap.forEach((d) => {
            list.push({ id: d.id, ...d.data() } as Notification)
          })
          set({ notifications: list, isLoading: false })
        },
        (err) => {
          console.error('Notification listener error:', err)
          set({ isLoading: false })
        }
      )

      return unsubscribe
    },

    // ─── Mark as read ─────────────────────────────────────────────────────────
    markAsRead: async (id) => {
      set({
        notifications: get().notifications.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
      })

      if (useAuthStore.getState().isDemo) {
        const idx = MOCK_NOTIFICATIONS.findIndex((x) => x.id === id)
        if (idx !== -1) {
          MOCK_NOTIFICATIONS[idx].is_read = true
          persistMockNotifications()
        }
        return
      }

      try {
        const { doc, updateDoc } = await import('firebase/firestore')
        await updateDoc(doc(db, 'notifications', id), { is_read: true })
      } catch (e) {
        console.error('Failed to mark notification as read in Firestore:', e)
      }
    },

    // ─── Mark all read ────────────────────────────────────────────────────────
    markAllRead: async (userId) => {
      set({
        notifications: get().notifications.map((n) => ({ ...n, is_read: true })),
      })

      if (useAuthStore.getState().isDemo) {
        MOCK_NOTIFICATIONS.forEach((n) => {
          n.is_read = true
        })
        persistMockNotifications()
        return
      }

      try {
        const { getDocs, updateDoc, writeBatch } = await import('firebase/firestore')
        const q = query(collection(db, 'notifications'), where('user_id', '==', userId))
        const snap = await getDocs(q)
        const batch = writeBatch(db)
        snap.forEach((d) => batch.update(d.ref, { is_read: true }))
        await batch.commit()
      } catch (e) {
        console.error('Failed to mark all notifications as read in Firestore:', e)
      }
    },
  }
})
