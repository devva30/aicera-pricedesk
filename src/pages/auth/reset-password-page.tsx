import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Lock, Eye, EyeOff, Shield, AlertCircle, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { auth, db } from '@/lib/firebase'
import { signInWithEmailAndPassword, updatePassword, signOut } from 'firebase/auth'
import { collection, query, where, getDocs, doc, updateDoc, deleteDoc } from 'firebase/firestore'

const schema = z
  .object({
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type ResetPasswordFormValues = z.infer<typeof schema>

export function ResetPasswordPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const token = searchParams.get('token')

  const [checkingToken, setCheckingToken] = useState(true)
  const [tokenValid, setTokenValid] = useState(false)
  const [email, setEmail] = useState<string | null>(null)
  const [tokenId, setTokenId] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (!token) {
      setTokenValid(false)
      setCheckingToken(false)
      return
    }

    const verifyToken = async () => {
      try {
        const resetsCol = collection(db, 'password_resets')
        const q = query(resetsCol, where('token', '==', token.trim()))
        const snap = await getDocs(q)

        if (snap.empty) {
          setTokenValid(false)
        } else {
          const docData = snap.docs[0].data()
          const expiresAt = new Date(docData.expires_at)
          const now = new Date()

          if (expiresAt < now) {
            setTokenValid(false)
            // Cleanup expired token
            await deleteDoc(doc(db, 'password_resets', snap.docs[0].id))
          } else {
            setTokenValid(true)
            setEmail(docData.email)
            setTokenId(snap.docs[0].id)
          }
        }
      } catch (err) {
        console.error('Error verifying reset token:', err)
        setTokenValid(false)
      } finally {
        setCheckingToken(false)
      }
    }

    verifyToken()
  }, [token])

  const onSubmit = async (data: ResetPasswordFormValues) => {
    if (!email || !tokenId) {
      toast.error('Session expired or invalid. Please request a new link.')
      return
    }

    setLoading(true)
    const toastId = toast.loading('Resetting password and securing account...')

    try {
      // Find the user document in Firestore to retrieve their current plaintext password
      const usersCol = collection(db, 'users')
      const q = query(usersCol, where('email', '==', email))
      const snap = await getDocs(q)

      if (snap.empty) {
        throw new Error('User profile not found in database.')
      }

      const userDoc = snap.docs[0]
      const currentPassword = userDoc.data().password

      if (!currentPassword) {
        throw new Error('Could not retrieve current password credentials. Please contact administrator.')
      }

      // Log in programmatically with the current credentials to establish auth context
      const credential = await signInWithEmailAndPassword(auth, email, currentPassword)
      
      // Update Firebase Auth password
      await updatePassword(credential.user, data.password)

      // Update Firestore user document
      await updateDoc(doc(db, 'users', userDoc.id), {
        password: data.password,
        updated_at: new Date().toISOString(),
      })

      // Clean up the password reset token
      await deleteDoc(doc(db, 'password_resets', tokenId))

      // Sign out the user to clear the programmatic login
      await signOut(auth)

      toast.success('Password updated successfully! Please log in with your new credentials.', { id: toastId })
      navigate('/login', { replace: true })
    } catch (err: any) {
      const errMsg = err?.message || 'Failed to reset password. Please try again.'
      toast.error(errMsg, { id: toastId })
      console.error('Password reset failure:', err)
    } finally {
      setLoading(false)
    }
  }

  if (checkingToken) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100 to-indigo-50/30 text-slate-900 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-sky-600 mx-auto" />
          <p className="text-sm text-slate-500 font-medium">Verifying reset credentials...</p>
        </div>
      </div>
    )
  }

  if (!tokenValid) {
    return (
      <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100 to-indigo-50/30 text-slate-900 flex flex-col items-center justify-center p-6 font-sans">
        <div className="w-full max-w-md z-10 space-y-6 text-center">
          <div className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-8 space-y-4">
            <div className="h-12 w-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="text-xl font-bold font-display text-slate-900">Reset link expired or invalid</h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              This password reset link is invalid, expired, or has already been used. Please request a new password reset link.
            </p>
            <Button className="w-full mt-2" asChild>
              <Link to="/forgot-password">Request new link</Link>
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100 to-indigo-50/30 text-slate-900 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden font-sans selection:bg-sky-500/10">
      <div className="absolute top-[-30%] left-[20%] w-[600px] h-[600px] rounded-full bg-gradient-to-tr from-sky-500/5 to-indigo-500/10 blur-3xl pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br from-sky-500/5 to-purple-500/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-6">
        <div className="text-center space-y-2">
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="inline-flex h-14 w-14 rounded-2xl bg-white border border-slate-200/80 items-center justify-center mb-1 shadow-sm"
          >
            <img src="https://framerusercontent.com/images/AlNvsxkJzF8SFWwwytH2xsnL8uM.png" alt="PriceDesk Logo" width="36" height="36" className="rounded-lg" />
          </motion.div>
          <motion.h1
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
            className="text-3xl font-extrabold tracking-tight font-display text-slate-900"
          >
            Set New Password
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[10px] text-sky-600 font-bold uppercase tracking-widest"
          >
            Enter your new secure corporate password.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-8 relative overflow-hidden"
        >
          <div className="rounded-lg border border-sky-500/10 bg-sky-50/50 px-3.5 py-2.5 text-xs text-sky-700 flex items-start gap-2 mb-5">
            <CheckCircle2 className="h-4 w-4 shrink-0 mt-0.5 text-sky-600" />
            <div>
              <span className="font-semibold">Resetting account:</span>{' '}
              <span className="font-medium text-slate-700">{email}</span>
            </div>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">New Password</Label>
              <div className="relative focus-within:ring-1 focus-within:ring-sky-500/50 rounded-md transition-all">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...form.register('password')}
                  className="pl-10 pr-10 h-11 text-sm bg-slate-50/50 border-slate-200 text-slate-900 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-sky-500 focus-visible:bg-white transition-all"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  disabled={loading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-[11px] text-destructive font-medium">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-700">Confirm Password</Label>
              <div className="relative focus-within:ring-1 focus-within:ring-sky-500/50 rounded-md transition-all">
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  {...form.register('confirmPassword')}
                  className="pl-10 pr-10 h-11 text-sm bg-slate-50/50 border-slate-200 text-slate-900 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-sky-500 focus-visible:bg-white transition-all"
                  placeholder="••••••••"
                  autoComplete="new-password"
                  disabled={loading}
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  disabled={loading}
                >
                  {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.confirmPassword && (
                <p className="text-[11px] text-destructive font-medium">
                  {form.formState.errors.confirmPassword.message}
                </p>
              )}
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/10"
              disabled={loading}
            >
              {loading ? 'Updating Password...' : 'Reset Password'}
            </Button>
          </form>

          <div className="mt-6 text-xs text-slate-500">
            Remembered your password?{' '}
            <Link to="/login" className="text-sky-600 hover:underline">
              Sign in
            </Link>
          </div>
        </motion.div>

        <div className="mt-6 border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400 font-medium z-10 w-full max-w-xs">
          <Shield className="h-3.5 w-3.5 inline-block mr-2 text-sky-600" />
          PriceDesk Identity Protection Active
        </div>
      </div>
    </div>
  )
}
