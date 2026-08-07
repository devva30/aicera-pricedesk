import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Shield,
  AlertCircle,
  TrendingUp,
  Wallet,
  Wrench,
  ClipboardCheck,
  ClipboardList,
  Settings,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth-store'

const schema = z.object({
  email: z.string().email('Please enter a valid work email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['admin', 'sales_rep', 'finance', 'technical', 'sales_head', 'ops']),
})

type LoginFormValues = z.infer<typeof schema>

const ROLES = [
  { value: 'sales_rep',  label: 'Sales Rep',       icon: TrendingUp   },
  { value: 'technical',  label: 'Tech Reviewer',   icon: Wrench       },
  { value: 'finance',    label: 'Finance Reviewer', icon: Wallet      },
  { value: 'sales_head', label: 'Sales Head',       icon: ClipboardCheck },
  { value: 'ops',        label: 'Ops Executive',    icon: ClipboardList },
  { value: 'admin',      label: 'Admin',            icon: Settings    },
]

export function LoginPage() {
  const navigate = useNavigate()
  const { login, user, isLoading } = useAuthStore()
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (user) navigate('/dashboard', { replace: true })
  }, [user, navigate])

  const form = useForm<LoginFormValues>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '', role: 'sales_rep' },
  })

  const selectedRole = form.watch('role')

  const onSubmit = async (data: LoginFormValues) => {
    setError(null)
    const toastId = toast.loading('Authenticating corporate credentials...')
    try {
      const res = await login(data.email, data.password, data.role)
      if (res && res.redirectWarning) {
        toast.dismiss(toastId)
        toast.warning(res.redirectWarning, { duration: 1500 })
      } else {
        toast.success('Signed in successfully!', { id: toastId, duration: 1500 })
      }
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err.message || 'Authentication failed. Please verify credentials.'
      setError(msg)
      toast.error(msg, { id: toastId, duration: 1500 })
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-background via-muted/30 to-primary/5 text-foreground flex flex-col items-center justify-center p-3 sm:p-6 md:p-12 relative overflow-hidden font-sans selection:bg-primary/20">

      {/* Background accents */}
      <div className="absolute top-[-30%] left-[20%] w-[300px] sm:w-[600px] h-[300px] sm:h-[600px] rounded-full bg-primary/5 blur-3xl pointer-events-none animate-pulse duration-[8000ms]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[250px] sm:w-[500px] h-[250px] sm:h-[500px] rounded-full bg-secondary/5 blur-3xl pointer-events-none" />

      <div className="w-full max-w-md z-10 space-y-4 sm:space-y-5">

        {/* Branding Logo & Header */}
        <div className="text-center space-y-1 flex flex-col items-center">
          <div className="inline-flex items-center justify-center h-12 sm:h-14 w-12 sm:w-14 rounded-2xl bg-card border border-border p-2 shadow-sm mb-1">
            <img
              src="https://framerusercontent.com/images/AlNvsxkJzF8SFWwwytH2xsnL8uM.png"
              alt="Aicera PriceDesk Logo"
              className="h-8 w-8 sm:h-10 sm:w-10 object-contain rounded-lg"
            />
          </div>
          <motion.h1
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-2xl sm:text-3xl font-extrabold tracking-tight font-display text-foreground"
          >
            Aicera PriceDesk
          </motion.h1>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="text-[9px] sm:text-[10px] text-primary font-bold uppercase tracking-widest"
          >
            Enterprise Pricing &amp; Approvals
          </motion.p>
        </div>



        {/* Corporate Login Card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.15 }}
          className="rounded-2xl bg-card border border-border shadow-sm p-4 sm:p-8"
        >
          <div className="mb-6">
            <h2 className="text-xl font-bold font-display text-foreground">Sign In</h2>
            <p className="text-xs text-muted-foreground mt-1">
              Enter your organizational credentials to access the workflow desk.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-foreground">Work Email</Label>
              <div className="relative focus-within:ring-1 focus-within:ring-primary/50 rounded-md transition-all">
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  className="pl-10 h-11 text-sm bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background transition-all"
                  placeholder="name@company.com"
                  autoComplete="email"
                  disabled={isLoading}
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              </div>
              {form.formState.errors.email && (
                <p className="text-[11px] text-destructive font-medium">{form.formState.errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-foreground">Password</Label>
              <div className="relative focus-within:ring-1 focus-within:ring-primary/50 rounded-md transition-all">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...form.register('password')}
                  className="pl-10 pr-10 h-11 text-sm bg-muted/50 border-border text-foreground placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-background transition-all"
                  placeholder="••••••••"
                  autoComplete="current-password"
                  disabled={isLoading}
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  disabled={isLoading}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-[11px] text-destructive font-medium">{form.formState.errors.password.message}</p>
              )}
            </div>

            {/* Role selector */}
            <div className="space-y-2 pb-1">
              <Label className="text-xs font-semibold text-foreground">Access Role</Label>
              <div className="grid grid-cols-2 gap-2">
                {ROLES.map((roleOpt) => {
                  const isSelected = selectedRole === roleOpt.value
                  const Icon = roleOpt.icon
                  return (
                    <button
                      key={roleOpt.value}
                      type="button"
                      onClick={() => form.setValue('role', roleOpt.value as any, { shouldValidate: true })}
                      className={`flex items-center gap-2 p-2.5 rounded-xl border text-xs font-semibold transition-all duration-200 cursor-pointer text-left ${
                        isSelected
                          ? 'bg-primary/10 border-primary text-primary shadow-sm shadow-primary/5'
                          : 'bg-muted/50 border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                      }`}
                      disabled={isLoading}
                    >
                      <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                      <span>{roleOpt.label}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50/60 p-3 text-xs text-red-600 flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold text-sm transition-all duration-200 cursor-pointer shadow-md mt-2"
              disabled={isLoading}
            >
              {isLoading ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          <div className="mt-3 text-right text-xs text-muted-foreground">
            <Link to="/forgot-password" className="text-primary hover:underline">Forgot password?</Link>
          </div>

          <div className="mt-6 text-center text-[10px] text-muted-foreground leading-relaxed border-t border-border pt-4 flex items-center justify-center gap-1.5">
            <Shield className="h-3.5 w-3.5 text-primary" />
            <span>PriceDesk Identity Protection Active</span>
          </div>
        </motion.div>
      </div>

      <div className="mt-10 text-center text-[10px] text-muted-foreground font-medium z-10">
        &copy; {new Date().getFullYear()} Aicera Systems Pvt Ltd. All rights reserved.
      </div>
    </div>
  )
}
