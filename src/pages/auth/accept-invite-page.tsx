import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { Shield, UserCheck, Eye, EyeOff } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { acceptInviteSignup, getInviteByToken } from '@/services/invite-service'
import type { InvitePreview } from '@/types'
import { ROLE_LABELS } from '@/types'
import { formatDate } from '@/lib/utils'

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

export function AcceptInvitePage() {
  const { token } = useParams<{ token: string }>()
  const navigate = useNavigate()
  const [preview, setPreview] = useState<InvitePreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', confirmPassword: '' },
  })

  useEffect(() => {
    if (!token) return
    const cleanToken = token.replace(/[^a-zA-Z0-9]/g, '').trim()
    getInviteByToken(cleanToken)
      .then((data) => {
        setPreview(data)
        if (data?.is_valid) {
          form.setValue('email', data.email)
        }
      })
      .catch(() => setPreview(null))
      .finally(() => setLoadingPreview(false))
  }, [token, form])

  const onSubmit = async (data: z.infer<typeof schema>) => {
    if (!token) return
    const cleanToken = token.replace(/[^a-zA-Z0-9]/g, '').trim()
    setSubmitting(true)
    try {
      await acceptInviteSignup(cleanToken, preview!.email, data.password, data.fullName)
      toast.success(`Welcome to PriceDesk — ${ROLE_LABELS[preview!.role]}`)
      navigate('/dashboard')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Could not accept invite')
    } finally {
      setSubmitting(false)
    }
  }

  if (loadingPreview) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <Skeleton className="h-96 w-full max-w-md rounded-xl" />
      </div>
    )
  }

  if (!preview || !preview.is_valid) {
    return (
      <div className="min-h-screen flex items-center justify-center p-8">
        <div className="glass-card max-w-md w-full p-8 text-center">
          <h2 className="text-xl font-bold">Invite unavailable</h2>
          <p className="text-muted-foreground mt-2 text-sm">
            This link is invalid, expired, or already used. Ask your administrator for a new invite.
          </p>
          <Button className="mt-6" asChild>
            <Link to="/login">Go to sign in</Link>
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-8 bg-background">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md bg-card border border-border rounded-lg shadow-sm p-8"
      >
        <div className="flex items-center gap-2 text-primary mb-2">
          <UserCheck className="h-5 w-5" />
          <span className="text-xs font-bold uppercase tracking-wider">You&apos;re invited to PriceDesk</span>
        </div>
        <h2 className="text-2xl font-bold font-display text-foreground">Accept Invitation</h2>
        <p className="text-muted-foreground mt-1 mb-4 text-xs">
          Complete your account setup. Your role has been pre-assigned by your administrator.
        </p>

        <div className="rounded-lg border bg-muted/30 p-3 mb-6 space-y-2 text-sm">
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Email</span>
            <span className="font-medium">{preview.email}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Role</span>
            <Badge>{ROLE_LABELS[preview.role]}</Badge>
          </div>
          {preview.department && (
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">Department</span>
              <span>{preview.department}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-muted-foreground">Expires</span>
            <span className="text-xs">{formatDate(preview.expires_at)}</span>
          </div>
        </div>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" {...form.register('fullName')} className="mt-1.5" />
            {form.formState.errors.fullName && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.fullName.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              readOnly
              className="mt-1.5 bg-muted/50"
              {...form.register('email')}
            />
            {form.formState.errors.email && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.email.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                {...form.register('password')}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.password && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.password.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="confirmPassword">Confirm password</Label>
            <div className="relative mt-1.5">
              <Input
                id="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                {...form.register('confirmPassword')}
                className="pr-10"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {form.formState.errors.confirmPassword && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.confirmPassword.message}
              </p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={submitting}>
            {submitting ? 'Creating account...' : 'Join PriceDesk'}
          </Button>
        </form>

        <p className="mt-4 flex items-start gap-2 text-xs text-muted-foreground">
          <Shield className="h-3.5 w-3.5 shrink-0 mt-0.5" />
          Role cannot be changed here — contact your admin if this is incorrect.
        </p>
      </motion.div>
    </div>
  )
}
