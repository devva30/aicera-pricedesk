import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  AlertCircle,
  Eye,
  EyeOff,
  Shield,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth-store'

const schema = z
  .object({
    fullName: z.string().min(2, 'Name must be at least 2 characters'),
    email: z.string().email('Please enter a valid work email'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  })

type SignupFormValues = z.infer<typeof schema>


export function SignupPage() {
  const navigate = useNavigate()
  const signup = useAuthStore((s) => s.signup)
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const form = useForm<SignupFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })

  const onSubmit = async (data: SignupFormValues) => {
    setLoading(true)
    setError(null)
    try {
      await signup(data.email, data.password, data.fullName, 'sales_rep')
      toast.success('Account created successfully!')
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err.message || 'Registration failed'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-gradient-to-tr from-slate-50 via-slate-100 to-indigo-50/30">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-white border border-slate-200/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-8"
      >
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold font-display text-slate-900">Register Account</h2>
          <p className="text-muted-foreground mt-1 text-xs">
            Create your PriceDesk organizational account
          </p>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label className="text-xs font-semibold text-slate-700">Full name</Label>
            <Input {...form.register('fullName')} className="mt-1.5 h-10 bg-slate-50/50 border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-sky-500 rounded-lg" placeholder="John Doe" disabled={loading} />
            {form.formState.errors.fullName && (
              <p className="text-[11px] text-destructive mt-1 font-medium">{form.formState.errors.fullName.message}</p>
            )}
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700">Work email</Label>
            <Input type="email" {...form.register('email')} className="mt-1.5 h-10 bg-slate-50/50 border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-sky-500 rounded-lg" placeholder="name@company.in" disabled={loading} />
            {form.formState.errors.email && (
              <p className="text-[11px] text-destructive mt-1 font-medium">{form.formState.errors.email.message}</p>
            )}
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700">Password</Label>
            <div className="relative mt-1.5">
              <Input
                type={showPassword ? 'text' : 'password'}
                {...form.register('password')}
                className="pr-10 h-10 bg-slate-50/50 border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-sky-500 rounded-lg"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                disabled={loading}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-[11px] text-destructive mt-1 font-medium">{form.formState.errors.password.message}</p>
            )}
          </div>
          <div>
            <Label className="text-xs font-semibold text-slate-700">Confirm password</Label>
            <div className="relative mt-1.5">
              <Input
                type={showConfirmPassword ? 'text' : 'password'}
                {...form.register('confirmPassword')}
                className="pr-10 h-10 bg-slate-50/50 border-slate-200 text-sm focus-visible:ring-1 focus-visible:ring-sky-500 rounded-lg"
                placeholder="••••••••"
                disabled={loading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                disabled={loading}
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-[11px] text-destructive mt-1 font-medium">{form.formState.errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Access Role Production Note */}
          <div className="rounded-lg border border-slate-200/80 bg-slate-50 p-3.5 text-xs text-slate-600 flex items-start gap-2.5 leading-relaxed shadow-sm">
            <Shield className="h-4 w-4 shrink-0 mt-0.5 text-sky-600" />
            <span>
              New accounts are registered as a <strong>Sales Representative</strong> by default.
              Other roles (Finance, Technical, Sales Head, Administrator) must be assigned by your organization&apos;s administrator.
            </span>
          </div>

          {error && (
            <div className="rounded-lg border border-red-100 bg-red-50/60 p-3 text-xs text-red-600 flex items-start gap-2.5 leading-relaxed">
              <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}
          <Button type="submit" className="w-full h-11 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/10 mt-2" disabled={loading}>
            {loading ? 'Creating account...' : 'Create account'}
          </Button>
        </form>
        <p className="mt-6 text-center text-sm text-slate-500">
          Already registered?{' '}
          <Link to="/login" className="text-primary font-medium hover:underline">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  )
}
