import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Copy, Mail, UserPlus } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { createInvite, sendInviteEmail } from '@/services/invite-service'
import { ALL_ROLES, ROLE_SIGNUP_HINTS } from '@/lib/auth-roles'
import { ROLE_LABELS, type UserRole } from '@/types'
import { useAuthStore } from '@/stores/auth-store'

const schema = z.object({
  email: z.string().email('Valid work email required'),
  role: z.enum(['sales_rep', 'finance', 'technical', 'sales_head', 'admin']),
  department: z.string().optional(),
})

interface InviteUserDialogProps {
  onCreated: () => void
}

export function InviteUserDialog({ onCreated }: InviteUserDialogProps) {
  const admin = useAuthStore((s) => s.user)
  const [open, setOpen] = useState(false)
  const [inviteUrl, setInviteUrl] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<UserRole>('sales_rep')
  const [sendingEmail, setSendingEmail] = useState(false)
  const [invitedEmail, setInvitedEmail] = useState('')
  const [invitedDept, setInvitedDept] = useState<string | undefined>('')

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { email: '', role: 'sales_rep' as UserRole, department: '' },
  })

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setLoading(true)
    setInviteUrl(null)
    try {
      setInvitedEmail(data.email)
      setInvitedDept(data.department)
      const { inviteUrl: url, emailSent } = await createInvite({
        email: data.email,
        role: data.role,
        invitedBy: admin.id,
        department: data.department,
      })
      setInviteUrl(url)
      if (emailSent) {
        toast.success(`Invite created and email sent to ${data.email}!`)
      } else {
        toast.success(`Invite created! Copy the link to share manually.`)
      }
      onCreated()
      form.reset({ email: '', role: 'sales_rep', department: '' })
    } catch (e: any) {
      const errorMsg = e?.text || e?.message || 'Failed to create invite'
      toast.error(errorMsg)
    } finally {
      setLoading(false)
    }
  }

  const handleSendEmail = async () => {
    if (!inviteUrl || !invitedEmail) return
    setSendingEmail(true)
    try {
      const success = await sendInviteEmail({
        email: invitedEmail,
        inviteUrl,
        role,
        department: invitedDept || null,
      })
      if (success) {
        toast.success(`Invite email sent successfully to ${invitedEmail}!`)
      } else {
        toast.error('EmailJS credentials are not configured in the application.')
      }
    } catch (e: any) {
      const errorMsg = e?.text || e?.message || 'Failed to send invite email'
      toast.error(errorMsg)
    } finally {
      setSendingEmail(false)
    }
  }

  const copyLink = () => {
    if (inviteUrl) {
      navigator.clipboard.writeText(inviteUrl)
      toast.success('Invite link copied')
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v)
        if (!v) setInviteUrl(null)
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <UserPlus className="h-4 w-4 mr-2" />
          Invite user
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Invite team member</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Set their role now. They will complete signup via a secure invite link (valid 7 days).
        </p>

        {inviteUrl ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-4 text-sm">
              <p className="font-medium text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Invite created
              </p>
              <p className="mt-2 text-muted-foreground">
                Copy the link below or click the quick action button to send it via your email client.
              </p>
            </div>
            <div className="flex gap-2">
              <Input readOnly value={inviteUrl} className="text-xs font-mono" />
              <Button type="button" variant="outline" size="icon" onClick={copyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <div className="rounded-lg border bg-muted/40 p-3 space-y-2 text-xs">
              <p className="font-medium text-foreground">Quick Action:</p>
              <Button
                type="button"
                variant="outline"
                className="w-full justify-center text-xs flex items-center gap-2"
                disabled={sendingEmail}
                onClick={handleSendEmail}
              >
                <Mail className="h-4 w-4" />
                {sendingEmail ? 'Sending Mail...' : 'Send the Mail'}
              </Button>
            </div>
            <Button className="w-full" onClick={() => setOpen(false)}>
              Done
            </Button>
          </div>
        ) : (
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <Label>Work email</Label>
              <Input
                type="email"
                placeholder="colleague@acmecorp.com"
                {...form.register('email')}
                className="mt-1.5"
              />
              {form.formState.errors.email && (
                <p className="text-xs text-destructive mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>
            <div>
              <Label>Role</Label>
              <Select
                value={role}
                onValueChange={(v) => {
                  setRole(v as UserRole)
                  form.setValue('role', v as UserRole)
                }}
              >
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ALL_ROLES.map((r) => (
                    <SelectItem key={r} value={r}>
                      {ROLE_LABELS[r]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1.5">
                {ROLE_SIGNUP_HINTS[role]}
              </p>
            </div>
            <div>
              <Label>Department (optional)</Label>
              <Input
                placeholder="Finance, Enterprise Sales..."
                {...form.register('department')}
                className="mt-1.5"
              />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Creating invite...' : 'Create invite link'}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  )
}
