import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Mail, Shield, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { auth, db } from '@/lib/firebase'
import { sendPasswordResetEmail } from 'firebase/auth'
import { collection, query, where, getDocs, addDoc } from 'firebase/firestore'
import { useAuthStore } from '@/stores/auth-store'
import emailjs from '@emailjs/browser'
import { ROLE_LABELS } from '@/types'

const schema = z.object({
  email: z.string().email('Please enter a valid work email'),
})

type ForgotPasswordFormValues = z.infer<typeof schema>

export function ForgotPasswordPage() {
  const navigate = useNavigate()
  const { user, isLoading: isAuthLoading } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [isSent, setIsSent] = useState(false)
  const [debugInfo, setDebugInfo] = useState<string | null>(null)

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const form = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '' },
  })

  const onSubmit = async (data: ForgotPasswordFormValues) => {
    setLoading(true)
    const email = data.email.trim().toLowerCase()
    try {


      // Check Firestore to verify the user actually exists in the database
      const usersCol = collection(db, 'users')
      const q = query(usersCol, where('email', '==', email))
      const snap = await getDocs(q)
      
      if (snap.empty) {
        toast.error('Email not found. Please check the address or contact your administrator.')
        setLoading(false)
        return
      }

      const userProfile = snap.docs[0].data()
      const userRole = userProfile.role || 'sales_rep'
      const userDept = userProfile.department || 'General'
      const roleLabel = ROLE_LABELS[userRole as keyof typeof ROLE_LABELS] || userRole

      // Generate a secure random token
      const token = crypto.randomUUID().replace(/-/g, '')
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString() // 1 hour expiry

      // Save token to Firestore password_resets collection
      await addDoc(collection(db, 'password_resets'), {
        email,
        token,
        expires_at: expiresAt,
        created_at: new Date().toISOString(),
      })

      const resetLink = `${window.location.origin}/#/reset-password?token=${token}`

      // Send the email via EmailJS
      const serviceId = import.meta.env.VITE_EMAILJS_SERVICE_ID
      const templateId = import.meta.env.VITE_EMAILJS_TEMPLATE_ID
      const publicKey = import.meta.env.VITE_EMAILJS_PUBLIC_KEY
      
      let emailjsSent = false
      if (serviceId && templateId && publicKey) {
        try {
          await emailjs.send(
            serviceId,
            templateId,
            {
              to_email: email,
              email: email,
              subject: 'PriceDesk — Password Reset Link',
              invite_url: resetLink,
              action_url: resetLink,
              link: resetLink,
              invite_link: resetLink,
              url: resetLink,
              message: `You requested to reset your password for PriceDesk. Please set a new password by clicking the link below:\n\n${resetLink}\n\nThis link is valid for 1 hour.`,
              role_label: roleLabel,
              department_label: userDept,
            },
            publicKey
          )
          toast.success('Password reset link sent to your inbox via EmailJS!')
          emailjsSent = true
          setIsSent(true)
          form.reset()
        } catch (emailjsErr) {
          console.error('Failed to send reset link via EmailJS:', emailjsErr)
        }
      }

      if (!emailjsSent) {
        // Fallback to standard Firebase Auth reset if EmailJS is not configured or fails
        await sendPasswordResetEmail(auth, email)
        toast.success('Password reset email sent. Check your inbox (and spam folder).')
        setIsSent(true)
        form.reset()
      }
    } catch (err: any) {
      let message = err?.message || 'Unable to send reset email. Please try again.'
      if (err?.code === 'auth/user-not-found') {
        const usersCol = collection(db, 'users')
        const q = query(usersCol, where('email', '==', email))
        const snap = await getDocs(q)
        if (!snap.empty) {
          message = 'An account profile exists for this email but no authentication credentials were found. Please contact your administrator to create the login.'
        } else {
          message = 'Email not found. Please check the address or contact your administrator.'
        }
      }
      toast.error(message)
      setDebugInfo(
        `Project ID: ${import.meta.env.VITE_FIREBASE_PROJECT_ID || 'unknown'} | Auth domain: ${import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'unknown'} | Error: ${message}`
      )
    } finally {
      setLoading(false)
    }
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
            Reset Password
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[10px] text-sky-600 font-bold uppercase tracking-widest"
          >
            Forgot your password? We’ll email you a reset link.
          </motion.p>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="rounded-2xl bg-white border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-8 relative overflow-hidden"
        >
          {isSent ? (
            <div className="space-y-4 text-center">
              <div className="h-12 w-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="text-xl font-bold font-display text-slate-900">Link Sent Successfully</h2>
              <p className="text-xs text-slate-500 leading-relaxed">
                A secure password reset link has been sent to your email address. Please check your inbox and follow the instructions to set your new password.
              </p>
              <Button className="w-full mt-2 bg-sky-600 hover:bg-sky-500 text-white" asChild>
                <Link to="/login">Back to Sign In</Link>
              </Button>
            </div>
          ) : (
            <>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Work Email</Label>
                  <div className="relative focus-within:ring-1 focus-within:ring-sky-500/50 rounded-md transition-all">
                    <Input
                      id="email"
                      type="email"
                      {...form.register('email')}
                      className="pl-10 h-11 text-sm bg-slate-50/50 border-slate-200 text-slate-900 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-sky-500 focus-visible:bg-white transition-all"
                      placeholder="name@company.com"
                      autoComplete="email"
                      disabled={loading || isAuthLoading}
                    />
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  </div>
                  {form.formState.errors.email && (
                    <p className="text-[11px] text-destructive font-medium">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full h-11 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/10"
                  disabled={loading || isAuthLoading}
                >
                  {loading ? 'Sending reset link...' : 'Send reset link'}
                </Button>
              </form>

              <div className="mt-6 text-xs text-slate-500">
                Remembered your password?{' '}
                <Link to="/login" className="text-sky-600 hover:underline">
                  Sign in
                </Link>
              </div>
            </>
          )}
        </motion.div>

        <div className="mt-6 border-t border-slate-200 pt-4 text-center text-[10px] text-slate-400 font-medium z-10 w-full max-w-xs">
          <Shield className="h-3.5 w-3.5 inline-block mr-2 text-sky-600" />
          PriceDesk Identity Protection Active
        </div>
        {debugInfo ? (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            <strong>Debug:</strong> {debugInfo}
          </div>
        ) : null}
      </div>
    </div>
  )
}
