import { Shield } from 'lucide-react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ROLE_LABELS, type UserRole } from '@/types'
import {
  ALL_ROLES,
  canPickRoleOnSignup,
  ROLE_SIGNUP_HINTS,
  SELF_SIGNUP_ROLE,
} from '@/lib/auth-roles'

interface RolePickerProps {
  value: UserRole
  onChange: (role: UserRole) => void
}

export function RolePicker({ value, onChange }: RolePickerProps) {
  const demoMode = canPickRoleOnSignup()
  const roles = demoMode ? ALL_ROLES : [SELF_SIGNUP_ROLE]

  return (
    <div className="space-y-2">
      <Label>Role</Label>
      <Select
        value={value}
        onValueChange={(v) => onChange(v as UserRole)}
        disabled={!demoMode}
      >
        <SelectTrigger className="mt-1.5">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {roles.map((role) => (
            <SelectItem key={role} value={role}>
              {ROLE_LABELS[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{ROLE_SIGNUP_HINTS[value]}</p>

      {demoMode ? (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-800 dark:text-amber-200">
          <strong>Demo mode:</strong> You can pick any role to test the app. In production,
          self-signup is always Sales Rep only.
        </div>
      ) : (
        <div className="rounded-lg border border-primary/20 bg-primary/5 px-3 py-2 text-xs text-muted-foreground flex gap-2">
          <Shield className="h-4 w-4 shrink-0 text-primary mt-0.5" />
          <span>
            New accounts are <strong>Sales Rep</strong> only. Finance, Technical, Sales Head,
            and Admin roles are assigned by your organization&apos;s administrator — not at
            signup.
          </span>
        </div>
      )}
    </div>
  )
}
