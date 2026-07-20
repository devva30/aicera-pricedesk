import { useState } from 'react'
import { motion } from 'framer-motion'
import { User, Mail, Shield, Building, Save } from 'lucide-react'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { ROLE_LABELS } from '@/types'

export function ProfilePage() {
  const { user, setUser } = useAuthStore()
  const [fullName, setFullName] = useState(user?.full_name ?? '')
  const [department, setDepartment] = useState(user?.department ?? '')
  const [saving, setSaving] = useState(false)

  if (!user) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-muted-foreground">
        Please log in to view your profile.
      </div>
    )
  }

  const initials = user.full_name
    ?.split(' ')
    .map((n) => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setTimeout(() => {
      setUser({
        ...user,
        full_name: fullName,
        department: department || null,
      })
      toast.success('Profile updated successfully!')
      setSaving(false)
    }, 400)
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-bold font-display">My Profile</h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal workspace profile and platform credentials.
        </p>
      </motion.div>

      <div className="grid gap-6 grid-cols-1">
        {/* Profile Card Header */}
        <Card className="overflow-hidden border border-border/50">
          <div className="h-24 bg-gradient-to-r from-violet-600 via-pink-500 to-cyan-500" />
          <CardContent className="relative pt-12 pb-6 px-6">
            {/* Initials Badge overlay */}
            <div className="absolute -top-12 left-6 h-20 w-20 rounded-full border-4 border-card bg-gradient-to-br from-violet-500 via-pink-500 to-cyan-400 flex items-center justify-center text-white font-bold text-2xl shadow-md">
              {initials}
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">{user.full_name}</h2>
              <p className="text-xs text-primary font-semibold uppercase tracking-wider mt-0.5">
                {ROLE_LABELS[user.role]}
              </p>
              {user.department && (
                <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1.5">
                  <Building className="h-3.5 w-3.5" />
                  {user.department}
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Profile Fields Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-bold flex items-center gap-2">
              <User className="h-4 w-4 text-primary" />
              Workspace Account Details
            </CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSave} className="space-y-4">
              <div className="grid gap-4 grid-cols-1 md:grid-cols-2">
                <div>
                  <Label className="text-xs">Full Name</Label>
                  <div className="relative mt-1.5">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="pl-9 h-10 text-xs"
                      required
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Work Email Address (Gmail / Corporate)</Label>
                  <div className="relative mt-1.5">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      type="email"
                      value={user.email}
                      disabled
                      className="pl-9 h-10 text-xs bg-muted/40 text-muted-foreground cursor-not-allowed border-dashed"
                    />
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Email address is tied to your enterprise SSO and cannot be modified.
                  </p>
                </div>

                <div>
                  <Label className="text-xs">Platform Role</Label>
                  <div className="relative mt-1.5">
                    <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/60" />
                    <Input
                      value={ROLE_LABELS[user.role]}
                      disabled
                      className="pl-9 h-10 text-xs bg-muted/40 text-muted-foreground cursor-not-allowed border-dashed"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-xs">Department (Optional)</Label>
                  <div className="relative mt-1.5">
                    <Building className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      placeholder="e.g. Solutions Engineering"
                      className="pl-9 h-10 text-xs"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2 border-t border-border/40 mt-4">
                <Button type="submit" disabled={saving} className="bg-primary hover:bg-primary/95 text-white text-xs h-9 font-semibold">
                  <Save className="h-3.5 w-3.5 mr-1.5" />
                  {saving ? 'Saving changes...' : 'Save Profile'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
