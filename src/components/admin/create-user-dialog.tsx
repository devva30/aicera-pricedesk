import { useState } from 'react'
import { z } from 'zod'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { UserPlus } from 'lucide-react'
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
import { createUserAccount } from '@/services/users-service'
import { ALL_ROLES } from '@/lib/auth-roles'
import { ROLE_LABELS, type UserRole } from '@/types'

const schema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Valid work email required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  role: z.enum(['sales_rep', 'finance', 'technical', 'sales_head', 'admin']),
  department: z.string().optional(),
})

interface CreateUserDialogProps {
  onCreated: () => void
}

export function CreateUserDialog({ onCreated }: CreateUserDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [role, setRole] = useState<UserRole>('sales_rep')

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: { fullName: '', email: '', password: '', role: 'sales_rep' as UserRole, department: '' },
  })

  const onSubmit = async (data: z.infer<typeof schema>) => {
    setLoading(true)
    try {
      await createUserAccount({
        full_name: data.fullName,
        email: data.email,
        password: data.password,
        role: data.role,
        department: data.department,
      })
      toast.success(`User account for ${data.fullName} created successfully!`)
      onCreated()
      setOpen(false)
      form.reset({ fullName: '', email: '', password: '', role: 'sales_rep', department: '' })
      setRole('sales_rep')
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to create user account')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary text-primary hover:bg-primary/5">
          <UserPlus className="h-4 w-4 mr-2" />
          Create user account
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Create User Account</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground -mt-2">
          Directly create a new user account with login credentials.
        </p>

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label>Full name</Label>
            <Input
              placeholder="e.g. Priya Sharma"
              {...form.register('fullName')}
              className="mt-1.5"
            />
            {form.formState.errors.fullName && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.fullName.message}
              </p>
            )}
          </div>

          <div>
            <Label>Work email</Label>
            <Input
              type="email"
              placeholder="name@company.in"
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
            <Label>Password</Label>
            <Input
              type="password"
              placeholder="••••••••"
              {...form.register('password')}
              className="mt-1.5"
            />
            {form.formState.errors.password && (
              <p className="text-xs text-destructive mt-1">
                {form.formState.errors.password.message}
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
          </div>

          <div>
            <Label>Department (optional)</Label>
            <Input
              placeholder="Finance, Enterprise Sales..."
              {...form.register('department')}
              className="mt-1.5"
            />
          </div>

          <Button type="submit" className="w-full mt-2" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  )
}
