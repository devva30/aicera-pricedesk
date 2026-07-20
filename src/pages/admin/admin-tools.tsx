import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { fetchSignInMethodsForEmail } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { collection, query, where, getDocs } from 'firebase/firestore'

export function AdminToolsPage() {
  const [email, setEmail] = useState('')
  const [checking, setChecking] = useState(false)
  const [result, setResult] = useState<null | { authMethods: string[]; hasProfile: boolean }>(null)

  const onCheck = async () => {
    if (!email) return toast.error('Enter an email to check')
    setChecking(true)
    const e = email.trim().toLowerCase()
    try {
      let methods: string[] = []
      try {
        methods = await fetchSignInMethodsForEmail(auth, e)
      } catch (err: any) {
        // fetchSignInMethodsForEmail throws for invalid requests; treat as no methods
        methods = []
      }

      const usersCol = collection(db, 'users')
      const q = query(usersCol, where('email', '==', e))
      const snap = await getDocs(q)
      const hasProfile = !snap.empty

      setResult({ authMethods: methods, hasProfile })
      if (methods.length === 0 && hasProfile) {
        toast.error('No Auth credentials found but Firestore profile exists.')
      } else if (methods.length === 0) {
        toast.error('No Auth or Firestore profile found for this email.')
      } else {
        toast.success('Auth account found: ' + methods.join(', '))
      }
    } catch (err: any) {
      toast.error(err?.message || 'Unable to check email status')
    } finally {
      setChecking(false)
    }
  }

  const createCommand = () => {
    const safeEmail = email.trim().toLowerCase()
    const suggested = `node scripts/create-admin.mjs --email "${safeEmail}" --password "TempPass123!" --fullname "Admin User"`
    return suggested
  }

  return (
    <div className="p-6 max-w-2xl">
      <h2 className="text-2xl font-semibold mb-4">Admin Tools</h2>
      <div className="space-y-3">
        <div>
          <Label htmlFor="check-email">Email to inspect</Label>
          <Input id="check-email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="user@example.com" />
        </div>

        <div className="flex gap-2">
          <Button onClick={onCheck} disabled={checking}>{checking ? 'Checking...' : 'Check Email'}</Button>
        </div>

        {result && (
          <div className="mt-4 rounded-md border p-3 bg-white">
            <p className="text-sm">Auth sign-in methods: <strong>{result.authMethods.length ? result.authMethods.join(', ') : 'None'}</strong></p>
            <p className="text-sm">Firestore profile: <strong>{result.hasProfile ? 'Found' : 'Not found'}</strong></p>
          </div>
        )}

        <div className="mt-4 rounded-md border p-3 bg-slate-50">
          <p className="text-sm mb-2">If no Auth account exists you can create one locally using this script (run on your dev machine):</p>
          <pre className="bg-white p-3 rounded text-sm overflow-auto">{createCommand()}</pre>
          <p className="text-xs text-slate-500 mt-2">After running, ask the user to request a password reset from the app.</p>
        </div>
      </div>
    </div>
  )
}

export default AdminToolsPage
