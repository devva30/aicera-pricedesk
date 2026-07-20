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
  ArrowLeft,
  TrendingUp,
  Wallet,
  Wrench,
  ClipboardCheck,
  ClipboardList,
  Settings,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/auth-store'
import type { UserRole } from '@/types'

const schema = z.object({
  email: z.string().email('Please enter a valid work email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

interface RoleLoginPageProps {
  role: UserRole
}

interface RoleConfig {
  title: string
  subtitle: string
  description: string
  icon: React.ComponentType<{ className?: string }>
  gradient: string
  accentColor: string
  accentBorder: string
  accentBg: string
  accentRing: string
  prefilledEmail: string
  prefilledPassword: string
  responsibilities: string[]
}

const ROLE_CONFIGS: Record<UserRole, RoleConfig> = {
  sales_rep: {
    title: 'Sales Representative',
    subtitle: 'Sales & Deal Desk Portal',
    description: 'Compile commercial line items, specify margins, and initiate pricing requests.',
    icon: TrendingUp,
    gradient: 'from-violet-600 via-purple-600 to-indigo-600',
    accentColor: 'text-purple-500 dark:text-purple-400',
    accentBorder: 'border-purple-500/30 focus-within:border-purple-500',
    accentBg: 'bg-purple-500/10',
    accentRing: 'focus-visible:ring-purple-500',
    prefilledEmail: 'arjun.mehta@pricedesk.in',
    prefilledPassword: 'password123',
    responsibilities: [
      'Create multi-item software & service proposals',
      'Analyze gross & net margin calculations in real-time',
      'Route deals to regional approval queues instantly',
    ],
  },
  finance: {
    title: 'Finance Reviewer',
    subtitle: 'Commercial & Risk Analytics',
    description: 'Review product cost structures, verify margin thresholds, and approve pricing exceptions.',
    icon: Wallet,
    gradient: 'from-emerald-600 via-teal-600 to-cyan-600',
    accentColor: 'text-emerald-500 dark:text-emerald-400',
    accentBorder: 'border-emerald-500/30 focus-within:border-emerald-500',
    accentBg: 'bg-emerald-500/10',
    accentRing: 'focus-visible:ring-emerald-500',
    prefilledEmail: 'priya.sharma@pricedesk.in',
    prefilledPassword: 'password123',
    responsibilities: [
      'Validate transfer price and gross margin thresholds',
      'Evaluate overhead costs, third-party licenses, and commissions',
      'Approve, reject, or request changes on pending deals',
    ],
  },
  technical: {
    title: 'Tech Reviewer',
    subtitle: 'Technical Feasibility Review',
    description: 'Estimate integration complexity, verify custom scoped hours, and sign off technical reviews.',
    icon: Wrench,
    gradient: 'from-amber-500 via-orange-500 to-red-500',
    accentColor: 'text-amber-500 dark:text-amber-400',
    accentBorder: 'border-amber-500/30 focus-within:border-amber-500',
    accentBg: 'bg-amber-500/10',
    accentRing: 'focus-visible:ring-amber-500',
    prefilledEmail: 'vikram.patel@pricedesk.in',
    prefilledPassword: 'password123',
    responsibilities: [
      'Audit custom integration complexity and deployment scopes',
      'Analyze engineering hours versus customer pricing expectations',
      'Provide mandatory technical feasibility sign-offs',
    ],
  },
  sales_head: {
    title: 'Sales Head & Executive',
    subtitle: 'Deal Desk Executive Oversight',
    description: 'Monitor high-level organizational pipeline, grant margin exceptions, and give final sign-offs.',
    icon: ClipboardCheck,
    gradient: 'from-blue-600 via-sky-600 to-indigo-600',
    accentColor: 'text-blue-500 dark:text-blue-400',
    accentBorder: 'border-blue-500/30 focus-within:border-blue-500',
    accentBg: 'bg-blue-500/10',
    accentRing: 'focus-visible:ring-blue-500',
    prefilledEmail: 'ananya.iyer@pricedesk.in',
    prefilledPassword: 'password123',
    responsibilities: [
      'Executive gate approval authority for high-value strategic deals',
      'Override platform margin policies and authorize exception deals',
      'Inspect comprehensive transaction logs and regional pipelines',
    ],
  },
  admin: {
    title: 'Admin',
    subtitle: 'Workspace Configuration & Security',
    description: 'Oversee system security audit logs, manage user invites, and adjust system settings.',
    icon: Settings,
    gradient: 'from-slate-700 via-zinc-700 to-slate-900',
    accentColor: 'text-slate-500 dark:text-slate-400',
    accentBorder: 'border-slate-500/30 focus-within:border-slate-500',
    accentBg: 'bg-slate-500/10',
    accentRing: 'focus-visible:ring-slate-500',
    prefilledEmail: 'admin@pricedesk.in',
    prefilledPassword: 'password123',
    responsibilities: [
      'Generate secure team invitations and provision roles',
      'Audit immutable, system-wide transaction and activity logs',
      'Configure currency matrices, thresholds, and RLS policies',
    ],
  },
  ops: {
    title: 'Sales Ops',
    subtitle: 'Operations & Procurement Portal',
    description: 'Track order fulfillment, verify supplier specifications, and update delivery gates.',
    icon: ClipboardList,
    gradient: 'from-sky-600 via-blue-600 to-indigo-600',
    accentColor: 'text-sky-500 dark:text-sky-400',
    accentBorder: 'border-sky-500/30 focus-within:border-sky-500',
    accentBg: 'bg-sky-50/15',
    accentRing: 'focus-visible:ring-sky-500',
    prefilledEmail: 'chetan@pricedesk.in',
    prefilledPassword: 'password123',
    responsibilities: [
      'Manage order milestones and execution checklist gates',
      'Generate delivery challans and verify supplier invoicing details',
      'Update payment received flags to finalize commission calculations',
    ],
  },
}

export function RoleLoginPage({ role }: RoleLoginPageProps) {
  const navigate = useNavigate()
  const login = useAuthStore((s) => s.login)
  const user = useAuthStore((s) => s.user)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showPassword, setShowPassword] = useState(false)

  const config = ROLE_CONFIGS[role]
  const Icon = config.icon

  useEffect(() => {
    if (user) {
      navigate('/dashboard', { replace: true })
    }
  }, [user, navigate])

  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    defaultValues: { email: '', password: '' },
  })

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setLoading(true)
    setError(null)
    const toastId = toast.loading(`Authenticating workspace session...`)
    
    try {
      const res = await login(data.email, data.password, role)
      if (res && res.redirectWarning) {
        toast.dismiss(toastId)
        toast.warning(res.redirectWarning, { duration: 6000 })
      } else {
        toast.success(`Access granted! Entered as ${config.title}`, { id: toastId })
      }
      navigate('/dashboard')
    } catch (err: any) {
      const msg = err.message || 'Authentication failed'
      setError(msg)
      toast.error(msg, { id: toastId })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-tr from-slate-50 via-slate-100 to-indigo-50/30 text-slate-900 flex flex-col items-center justify-center p-6 md:p-12 relative overflow-hidden font-sans selection:bg-sky-500/10">
      
      {/* Decorative gradient blobs specific to the role */}
      <div className={`absolute top-[-20%] left-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-tr ${config.gradient} opacity-[0.03] blur-3xl pointer-events-none`} />
      <div className={`absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-gradient-to-br ${config.gradient} opacity-[0.03] blur-3xl pointer-events-none`} />

      {/* Header back button */}
      <div className="w-full max-w-5xl flex items-center justify-between mb-8 z-10">
        <Link
          to="/login"
          className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-slate-900 transition-colors group cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
          <span>Back to Role Gateway</span>
        </Link>
        <span className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
          Workspace Access Desk
        </span>
      </div>

      {/* Main visual login grid */}
      <div className="w-full max-w-5xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch z-10">
        
        {/* Left Side: Role Info Card */}
        <motion.div
          initial={{ opacity: 0, x: -24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-5 rounded-2xl bg-white border border-slate-200/85 shadow-sm p-8 flex flex-col justify-between relative overflow-hidden"
        >
          <div>
            <div className={`h-12 w-12 rounded-xl ${config.accentBg} ${config.accentColor} flex items-center justify-center mb-6`}>
              <Icon className="h-6 w-6" />
            </div>

            <span className="text-[10px] font-bold uppercase tracking-wider text-sky-600">
              {config.subtitle}
            </span>
            <h2 className="text-2xl font-extrabold font-display tracking-tight text-slate-900 mt-1">
              {config.title}
            </h2>
            
            <p className="text-sm text-slate-500 mt-4 leading-relaxed font-normal">
              {config.description}
            </p>

            <div className="mt-8 space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-900">
                Key Responsibilities
              </h4>
              <ul className="space-y-3">
                {config.responsibilities.map((resp, i) => (
                  <li key={i} className="flex items-start gap-3 text-xs text-slate-500 leading-relaxed">
                    <CheckCircle2 className={`h-4 w-4 shrink-0 mt-0.5 ${config.accentColor}`} />
                    <span>{resp}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="mt-12 pt-6 border-t border-slate-100 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
            PriceDesk Identity Protection v1.0
          </div>
        </motion.div>

        {/* Right Side: Login Form Card */}
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4 }}
          className="lg:col-span-7 rounded-2xl bg-white border border-slate-200/80 shadow-[0_20px_50px_rgba(0,0,0,0.05)] p-8 md:p-10 flex flex-col justify-center relative overflow-hidden"
        >
          <div className="mb-6">
            <h3 className="text-xl font-bold font-display text-slate-900">Sign In</h3>
            <p className="text-xs text-slate-500 mt-1">
              Enter your work credentials to unlock your workspace.
            </p>
          </div>

          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label htmlFor="email" className="text-xs font-semibold text-slate-700">Work Email</Label>
              <div className="relative mt-1.5 focus-within:ring-1 focus-within:ring-sky-500/50 rounded-md transition-all">
                <Input
                  id="email"
                  type="email"
                  {...form.register('email')}
                  className="pl-10 h-11 text-sm bg-slate-50/50 border-slate-200 text-slate-900 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-sky-500 focus-visible:bg-white transition-all"
                  placeholder="name@company.com"
                  autoComplete="email"
                />
                <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              </div>
              {form.formState.errors.email && (
                <p className="text-[11px] text-destructive mt-1.5 font-medium">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="password" className="text-xs font-semibold text-slate-700">Password</Label>
              <div className="relative mt-1.5 focus-within:ring-1 focus-within:ring-sky-500/50 rounded-md transition-all">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  {...form.register('password')}
                  className="pl-10 pr-10 h-11 text-sm bg-slate-50/50 border-slate-200 text-slate-900 placeholder-slate-400 focus-visible:ring-1 focus-visible:ring-sky-500 focus-visible:bg-white transition-all"
                  placeholder="••••••••"
                  autoComplete="current-password"
                />
                <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {form.formState.errors.password && (
                <p className="text-[11px] text-destructive mt-1.5 font-medium">
                  {form.formState.errors.password.message}
                </p>
              )}
            </div>

            {error && (
              <div className="rounded-lg border border-red-100 bg-red-50/60 p-3 text-xs text-red-600 flex items-start gap-2.5 leading-relaxed">
                <AlertCircle className="h-4 w-4 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <div className="pt-2">
              <Button
                type="submit"
                className="w-full h-11 bg-sky-600 hover:bg-sky-500 text-white font-semibold text-sm transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 shadow-md shadow-sky-600/10"
                disabled={loading}
              >
                {loading ? 'Signing In...' : 'Sign In'}
              </Button>
            </div>
          </form>

          {/* Quick notice and links */}
          <div className="mt-8 text-center text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-5">
            Having trouble logging in? Contact workspace administrator at{' '}
            <a href="mailto:support@pricedesk.in" className="text-sky-600 hover:underline">
              support@pricedesk.in
            </a>
          </div>
        </motion.div>
      </div>

      {/* Footer copyright */}
      <div className="mt-12 w-full max-w-5xl border-t border-slate-200 pt-6 text-center text-[10px] text-slate-400 font-medium relative z-10">
        PriceDesk v1.0 © {new Date().getFullYear()} — Smarter tech. Sharper minds.
      </div>
    </div>
  )
}
