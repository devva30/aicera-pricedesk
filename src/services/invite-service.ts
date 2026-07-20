import { ROLE_LABELS, type Invite, type InvitePreview, type User, type UserRole } from '@/types'
import { DEMO_USERS } from '@/lib/mock-data'
import { useAuthStore } from '@/stores/auth-store'
import emailjs from '@emailjs/browser'
import { db, auth } from '@/lib/firebase'
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  query,
  orderBy,
  where,
  deleteDoc,
} from 'firebase/firestore'
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth'

export let MOCK_INVITES: Invite[] = []

function generateToken(): string {
  return crypto.randomUUID().replace(/-/g, '') + crypto.randomUUID().replace(/-/g, '')
}

export function buildInviteUrl(token: string): string {
  return `${window.location.origin}/#/accept-invite/${token}`
}

export async function fetchInvites(): Promise<Invite[]> {
  if (useAuthStore.getState().isDemo) {
    return [...MOCK_INVITES].sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    )
  }

  const snap = await getDocs(query(collection(db, 'invites'), orderBy('created_at', 'desc')))
  const list: Invite[] = []
  snap.forEach((doc) => {
    list.push({ id: doc.id, ...doc.data() } as Invite)
  })
  return list
}

export async function createInvite(params: {
  email: string
  role: UserRole
  invitedBy: string
  department?: string
}): Promise<{ invite: Invite; inviteUrl: string; emailSent: boolean }> {
  const email = params.email.trim().toLowerCase()
  const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString()
  const token = generateToken()

  if (useAuthStore.getState().isDemo) {
    MOCK_INVITES = MOCK_INVITES.filter(
      (i) => !(i.email.toLowerCase() === email && !i.accepted_at)
    )

    const invite: Invite = {
      id: `invite-${Date.now()}`,
      email,
      role: params.role,
      invited_by: params.invitedBy,
      token,
      department: params.department ?? null,
      expires_at: expiresAt,
      created_at: new Date().toISOString(),
      inviter: DEMO_USERS.admin,
    }
    MOCK_INVITES = [invite, ...MOCK_INVITES]
    return { invite, inviteUrl: buildInviteUrl(token), emailSent: false }
  }

  // Live Firebase invite creation
  const inviteId = `invite-${Date.now()}`
  
  // Fetch inviter profile info to cache in invite
  const userRef = doc(db, 'users', params.invitedBy)
  const userSnap = await getDoc(userRef)
  const inviterProfile = userSnap.exists()
    ? ({ id: params.invitedBy, ...userSnap.data() } as User)
    : undefined

  const invite: Invite = {
    id: inviteId,
    email,
    role: params.role,
    invited_by: params.invitedBy,
    token,
    department: params.department ?? null,
    expires_at: expiresAt,
    created_at: new Date().toISOString(),
    inviter: inviterProfile,
  }

  await setDoc(doc(db, 'invites', inviteId), invite)
  const inviteUrl = buildInviteUrl(token)

  // Removed automatic email sending on creation, user must click "Send the Mail" explicitly
  const emailSent = false

  return { invite, inviteUrl, emailSent }
}

export async function sendInviteEmail(params: {
  email: string
  inviteUrl: string
  role: UserRole
  department?: string | null
}): Promise<boolean> {
  const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
  const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
  const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY

  if (!serviceId || !templateId || !publicKey) {
    console.warn('⚠️ EmailJS credentials missing for invite email.')
    return false
  }

  const roleLabel = ROLE_LABELS[params.role] || params.role
  await emailjs.send(
    serviceId,
    templateId,
    {
      to_email: params.email,
      email: params.email, // Add this fallback to support both {{to_email}} and {{email}} in template settings
      subject: `Invitation to join PriceDesk as ${roleLabel}`,
      invite_url: params.inviteUrl,
      action_url: params.inviteUrl, // Fallback variable for the link
      link: params.inviteUrl,       // Fallback variable for the link
      invite_link: params.inviteUrl, // Extra fallback variable for the link
      url: params.inviteUrl,        // Extra fallback variable for the link
      message: `You have been invited to join PriceDesk as a ${roleLabel}. Please set up your account by clicking the link: ${params.inviteUrl}`, // Ensure the link is visible as part of a message parameter
      role_label: roleLabel,
      department_label: params.department || 'General',
    },
    publicKey
  )
  return true
}

export async function revokeInvite(inviteId: string): Promise<void> {
  if (useAuthStore.getState().isDemo) {
    MOCK_INVITES = MOCK_INVITES.filter((i) => i.id !== inviteId)
    return
  }

  await deleteDoc(doc(db, 'invites', inviteId))
}

export async function getInviteByToken(token: string): Promise<InvitePreview | null> {
  const cleanToken = token.replace(/[^a-zA-Z0-9]/g, '').trim()
  
  if (useAuthStore.getState().isDemo) {
    const invite = MOCK_INVITES.find((i) => i.token === cleanToken)
    if (!invite) return null
    const is_valid =
      !invite.accepted_at && new Date(invite.expires_at) > new Date()
    return {
      email: invite.email,
      role: invite.role,
      department: invite.department,
      expires_at: invite.expires_at,
      is_valid,
    }
  }

  const invitesCol = collection(db, 'invites')
  const q = query(invitesCol, where('token', '==', cleanToken))
  const snap = await getDocs(q)
  let inviteData: Invite | null = null
  
  snap.forEach((doc) => {
    inviteData = { id: doc.id, ...doc.data() } as Invite
  })

  if (!inviteData) return null
  const invite = inviteData as Invite
  const is_valid = !invite.accepted_at && new Date(invite.expires_at) > new Date()

  return {
    email: invite.email,
    role: invite.role,
    department: invite.department,
    expires_at: invite.expires_at,
    is_valid,
  }
}

export async function acceptInviteSignup(
  token: string,
  email: string,
  password: string,
  fullName: string
): Promise<void> {
  const cleanToken = token.replace(/[^a-zA-Z0-9]/g, '').trim()
  const preview = await getInviteByToken(cleanToken)
  if (!preview?.is_valid) {
    throw new Error('This invite is invalid or has expired')
  }
  if (preview.email.toLowerCase() !== email.trim().toLowerCase()) {
    throw new Error('Email must match the invited address')
  }

  if (useAuthStore.getState().isDemo) {
    const invite = MOCK_INVITES.find((i) => i.token === cleanToken)
    if (!invite) throw new Error('Invite not found')
    invite.accepted_at = new Date().toISOString()
    invite.accepted_by = `user-${Date.now()}`

    const user: User = {
      id: invite.accepted_by!,
      email: invite.email,
      full_name: fullName,
      role: invite.role,
      department: invite.department ?? undefined,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }
    useAuthStore.setState({
      user,
      session: { access_token: 'demo-invite-token' },
      isDemo: true,
    })
    return
  }

  // Live Firebase invite consumption and signup
  let userCredential
  try {
    userCredential = await createUserWithEmailAndPassword(auth, email, password)
  } catch (err: any) {
    if (err.code === 'auth/email-already-in-use') {
      try {
        userCredential = await signInWithEmailAndPassword(auth, email, password)
      } catch (signInErr: any) {
        throw new Error(
          'This email is already registered in Firebase Authentication with a different password. ' +
          'Please sign up using your existing password, or ask your administrator to remove the old record from the Firebase Console.'
        )
      }
    } else {
      throw err
    }
  }
  const userId = userCredential.user.uid

  // Find and update invite accepted fields
  const invitesCol = collection(db, 'invites')
  const q = query(invitesCol, where('token', '==', cleanToken))
  const snap = await getDocs(q)
  let inviteId = ''
  
  snap.forEach((doc) => {
    inviteId = doc.id
  })

  if (inviteId) {
    await setDoc(doc(db, 'invites', inviteId), {
      accepted_at: new Date().toISOString(),
      accepted_by: userId,
    }, { merge: true })
  }

  const user: User = {
    id: userId,
    email: email.trim().toLowerCase(),
    full_name: fullName,
    role: preview.role,
    department: preview.department ?? undefined,
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  }

  // Create User Profile doc in Firestore
  await setDoc(doc(db, 'users', userId), {
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    department: user.department ?? null,
    is_active: user.is_active,
    created_at: user.created_at,
    updated_at: user.updated_at,
    password: password,
  })

  useAuthStore.setState({
    user,
    session: { access_token: await userCredential.user.getIdToken() },
    isDemo: false,
  })
}
