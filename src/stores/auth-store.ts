import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User, UserRole } from '@/types'
import { auth, db } from '@/lib/firebase'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
} from 'firebase/auth'
import { doc, getDoc, setDoc } from 'firebase/firestore'

interface AuthState {
  user: User | null
  session: { access_token: string } | null
  isLoading: boolean
  isDemo: boolean
  setUser: (user: User | null) => void
  setLoading: (loading: boolean) => void
  login: (email: string, password: string, role?: UserRole) => Promise<{ redirectWarning?: string } | void>
  signup: (email: string, password: string, fullName: string, role?: UserRole) => Promise<void>
  logout: () => Promise<void>
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      session: null,
      isLoading: true,
      isDemo: false,

      setUser: (user) => set({ user }),
      setLoading: (isLoading) => set({ isLoading }),

      login: async (email, password, role) => {
        set({ isLoading: true })

        try {
          const userCredential = await signInWithEmailAndPassword(auth, email, password)
          const userId = userCredential.user.uid

          const docRef = doc(db, 'users', userId)
          const docSnap = await getDoc(docRef)

          if (!docSnap.exists()) {
            throw new Error('User profile not found in database. Please contact administrator.')
          }

          const profile = { id: userId, ...docSnap.data() } as User

          let redirectWarning = undefined
          if (role && profile.role !== role) {
            const roleLabels: Record<string, string> = {
              admin: 'Admin',
              sales_rep: 'Sales Representative',
              finance: 'Finance Reviewer',
              technical: 'Tech Reviewer',
              sales_head: 'Sales Head',
              ops: 'Ops Executive',
            }
            const expectedLabel = roleLabels[profile.role] || profile.role
            const requestedLabel = roleLabels[role] || role
            redirectWarning = `Redirected to assigned role: Your account is registered as a ${expectedLabel}, not a ${requestedLabel}.`
          }

          set({
            user: profile,
            session: { access_token: await userCredential.user.getIdToken() },
            isDemo: false,
            isLoading: false,
          })

          if (redirectWarning) {
            return { redirectWarning }
          }
        } catch (err: any) {
          set({ isLoading: false })
          // Map Firebase auth errors to a professional user-friendly message
          if (err.code && err.code.startsWith('auth/')) {
            throw new Error('Invalid email or password. Please check your credentials.')
          }
          if (err.message && (err.message.includes('Firebase') || err.message.includes('auth/'))) {
            throw new Error('Invalid email or password. Please check your credentials.')
          }
          throw err
        }
      },

      signup: async (email, password, fullName, role = 'sales_rep') => {
        set({ isLoading: true })
        try {
          const userCredential = await createUserWithEmailAndPassword(auth, email, password)
          const userId = userCredential.user.uid

          const profile: User = {
            id: userId,
            email: email.trim().toLowerCase(),
            full_name: fullName,
            role: role,
            is_active: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          }

          // Create Firestore User Document
          await setDoc(doc(db, 'users', userId), {
            email: profile.email,
            full_name: profile.full_name,
            role: profile.role,
            is_active: profile.is_active,
            created_at: profile.created_at,
            updated_at: profile.updated_at,
            password: password,
          })

          set({
            user: profile,
            session: { access_token: await userCredential.user.getIdToken() },
            isDemo: false,
            isLoading: false,
          })
        } catch (err: any) {
          set({ isLoading: false })
          throw err
        }
      },

      logout: async () => {
        try {
          await signOut(auth)
        } catch (e) {
          console.error('Logout error:', e)
        }
        set({ user: null, session: null, isDemo: false })
      },

      initialize: async () => {
        // Set up the persistent Firebase Auth listener
        onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            try {
              const docRef = doc(db, 'users', firebaseUser.uid)
              const docSnap = await getDoc(docRef)
              if (docSnap.exists()) {
                const profile = { id: firebaseUser.uid, ...docSnap.data() } as User
                set({
                  user: profile,
                  session: { access_token: await firebaseUser.getIdToken() },
                  isDemo: false,
                  isLoading: false,
                })
              } else {
                set({ isLoading: false })
              }
            } catch (err) {
              console.error('Failed to load user profile during initialization:', err)
              set({ isLoading: false })
            }
          } else {
            set({ user: null, session: null, isDemo: false, isLoading: false })
          }
        })
      },
    }),
    {
      name: 'pricedesk-auth',
      partialize: (state) => ({
        user: state.user,
        session: state.session,
        isDemo: state.isDemo,
      }),
    }
  )
)
