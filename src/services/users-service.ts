import type { User } from '@/types'
import { DEMO_USERS } from '@/lib/mock-data'
import { db } from '@/lib/firebase'
import { useAuthStore } from '@/stores/auth-store'
import { initializeApp, deleteApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword, signOut, signInWithEmailAndPassword } from 'firebase/auth'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  updateDoc,
  query,
  where,
} from 'firebase/firestore'


export async function fetchUsers(): Promise<User[]> {
  if (useAuthStore.getState().isDemo) {
    return Object.values(DEMO_USERS)
  }

  const snap = await getDocs(collection(db, 'users'))
  const list: User[] = []
  snap.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() } as User)
  })
  return list
}

export async function updateUserRole(
  userId: string,
  role: User['role']
): Promise<void> {
  if (useAuthStore.getState().isDemo) {
    const entry = Object.entries(DEMO_USERS).find(([, u]) => u.id === userId)
    if (entry) {
      DEMO_USERS[entry[0]] = { ...entry[1], role }
    }
    return
  }

  await updateDoc(doc(db, 'users', userId), { role })
}

const normalizeEmail = (email: string) => email.trim().toLowerCase()

export async function deleteUser(userId: string): Promise<void> {
  if (useAuthStore.getState().isDemo) {
    const entry = Object.entries(DEMO_USERS).find(([, u]) => u.id === userId)
    if (entry) {
      delete DEMO_USERS[entry[0]]
    }
    return
  }

  const userRef = doc(db, 'users', userId)
  const userSnap = await getDoc(userRef)
  let authDeletionSucceeded = false

  if (userSnap.exists()) {
    const data = userSnap.data()
    const email = data.email as string | undefined
    const password = data.password as string | undefined

    if (email && password) {
      const firebaseConfig = {
        apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
        authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
        projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
        storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
        messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
        appId: import.meta.env.VITE_FIREBASE_APP_ID,
      }

      const tempAppName = `temp-delete-app-${Date.now()}`
      const tempApp = initializeApp(firebaseConfig, tempAppName)
      const tempAuth = getAuth(tempApp)

      try {
        const userCred = await signInWithEmailAndPassword(tempAuth, normalizeEmail(email), password)
        await userCred.user.delete()
        authDeletionSucceeded = true
      } catch (authErr: any) {
        if (authErr.code === 'auth/user-not-found') {
          authDeletionSucceeded = true
          console.warn('Firebase Auth user not found during deletion, continuing with profile cleanup.')
        } else if (authErr.code === 'auth/wrong-password') {
          throw new Error(
            'Unable to delete the authentication account because the stored password is incorrect. ' +
              'Please verify the user credentials or delete the Firebase Auth account manually.'
          )
        } else {
          throw new Error(
            'Unable to delete the Firebase Auth user during removal. Please check your Firebase console or credentials.'
          )
        }
      } finally {
        await deleteApp(tempApp)
      }
    } else {
      console.warn('No stored auth credentials available for this user. Firestore profile will still be removed.')
      authDeletionSucceeded = true
    }
  } else {
    authDeletionSucceeded = true
  }

  if (!authDeletionSucceeded) {
    throw new Error('Failed to remove user authentication record. The user profile was not deleted.')
  }

  const dealsQuery = query(collection(db, 'deals'), where('created_by', '==', userId))
  const dealsSnap = await getDocs(dealsQuery)
  const dealDeletes: Promise<void>[] = []
  dealsSnap.forEach((dealDoc) => {
    dealDeletes.push(deleteDoc(doc(db, 'deals', dealDoc.id)))
  })
  await Promise.all(dealDeletes)

  await deleteDoc(userRef)
}

export async function createUserAccount(userData: {
  full_name: string
  email: string
  password?: string
  role: User['role']
  department?: string
}): Promise<User> {
  if (useAuthStore.getState().isDemo) {
    const id = `user-${Date.now()}`
    const newUser: User = {
      id,
      email: normalizeEmail(userData.email),
      full_name: userData.full_name,
      role: userData.role,
      department: userData.department || null,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    DEMO_USERS[newUser.email] = newUser
    return newUser
  }

  const email = normalizeEmail(userData.email)

  if (!userData.password) {
    throw new Error('Password is required to create a live user account.')
  }

  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  }

  const tempAppName = `temp-app-${Date.now()}`
  const tempApp = initializeApp(firebaseConfig, tempAppName)
  const tempAuth = getAuth(tempApp)
  
  let userId = ''
  try {
    const userCredential = await createUserWithEmailAndPassword(tempAuth, email, userData.password)
    userId = userCredential.user.uid
    await signOut(tempAuth)
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      try {
        const userCredential = await signInWithEmailAndPassword(tempAuth, email, userData.password)
        userId = userCredential.user.uid
        await signOut(tempAuth)
      } catch (signInErr: any) {
        throw new Error(
          'This email is already registered in Firebase Authentication with a different password. ' +
          'Please use the existing password or have your administrator remove the existing account.'
        )
      }
    } else {
      throw new Error(err.message || 'Failed to create user credentials in Firebase Auth')
    }
  } finally {
    await deleteApp(tempApp)
  }

  // Provision profile document in Firestore
  const newUser: User = {
    id: userId,
    email,
    full_name: userData.full_name,
    role: userData.role,
    department: userData.department || null,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  await setDoc(doc(db, 'users', userId), {
    email: newUser.email,
    full_name: newUser.full_name,
    role: newUser.role,
    department: newUser.department,
    is_active: newUser.is_active,
    created_at: newUser.created_at,
    updated_at: newUser.updated_at,
    password: userData.password,
  })

  return newUser
}
