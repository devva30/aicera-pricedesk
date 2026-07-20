import { useCallback, useEffect, useState } from 'react'
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
} from '@tanstack/react-table'
import { Copy, Trash2, X, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { InviteUserDialog } from '@/components/admin/invite-user-dialog'
import { CreateUserDialog } from '@/components/admin/create-user-dialog'
import { buildInviteUrl, fetchInvites, revokeInvite } from '@/services/invite-service'
import { fetchUsers, deleteUser, updateUserRole } from '@/services/users-service'
import { ROLE_LABELS, type Invite, type User, type Customer } from '@/types'
import { cn, formatRelative } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth-store'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { motion, AnimatePresence } from 'framer-motion'
import { fetchCustomers, saveCustomer, deleteCustomer } from '@/services/customers-service'

export function AdminUsersPage() {
  const [activeTab, setActiveTab] = useState<'users' | 'customers'>('users')
  const [users, setUsers] = useState<User[]>([])
  const [loadingUsers, setLoadingUsers] = useState(true)
  const [invites, setInvites] = useState<Invite[]>([])
  const [loadingInvites, setLoadingInvites] = useState(true)
  const currentUser = useAuthStore((s) => s.user)

  // Customer Registry states
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loadingCustomers, setLoadingCustomers] = useState(true)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null)
  const [customerForm, setCustomerForm] = useState({ name: '', id: '' })

  const loadInvites = useCallback(async () => {
    setLoadingInvites(true)
    try {
      setInvites(await fetchInvites())
    } catch {
      toast.error('Failed to load invites')
    } finally {
      setLoadingInvites(false)
    }
  }, [])

  const loadUsers = useCallback(async () => {
    setLoadingUsers(true)
    try {
      setUsers(await fetchUsers())
    } catch {
      toast.error('Failed to load users')
    } finally {
      setLoadingUsers(false)
    }
  }, [])

  const loadCustomers = useCallback(async () => {
    setLoadingCustomers(true)
    try {
      setCustomers(await fetchCustomers())
    } catch {
      toast.error('Failed to load customers')
    } finally {
      setLoadingCustomers(false)
    }
  }, [])

  useEffect(() => {
    loadInvites()
    loadUsers()
    loadCustomers()
  }, [loadInvites, loadUsers, loadCustomers])

  const openAddCustomer = () => {
    const generatedId = 'CUST-' + Math.floor(1000 + Math.random() * 9000)
    setEditingCustomer(null)
    setCustomerForm({ name: '', id: generatedId })
    setIsDrawerOpen(true)
  }

  const openEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust)
    setCustomerForm({ name: cust.name, id: cust.id })
    setIsDrawerOpen(true)
  }

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerForm.name.trim()) {
      toast.error('Customer name is required')
      return
    }
    try {
      await saveCustomer({
        id: customerForm.id,
        name: customerForm.name.trim(),
        created_at: editingCustomer?.created_at || new Date().toISOString()
      })
      toast.success(editingCustomer ? 'Customer updated successfully' : 'Customer added successfully')
      setIsDrawerOpen(false)
      loadCustomers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to save customer')
    }
  }

  const handleDeleteCustomer = async (cust: Customer) => {
    const confirmed = window.confirm(`Are you sure you want to delete customer "${cust.name}"?`)
    if (!confirmed) return
    try {
      await deleteCustomer(cust.id)
      toast.success('Customer deleted successfully')
      loadCustomers()
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete customer')
    }
  }

  const userColumns: ColumnDef<User>[] = [
    { accessorKey: 'full_name', header: 'Name' },
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => {
        const isSelf = currentUser?.id === row.original.id
        if (isSelf) {
          return <Badge variant="secondary">{ROLE_LABELS[row.original.role]}</Badge>
        }
        return (
          <div className="w-36">
            <Select
              defaultValue={row.original.role}
              onValueChange={async (val: User['role']) => {
                try {
                  await updateUserRole(row.original.id, val)
                  toast.success(`Role updated successfully to ${ROLE_LABELS[val]}`)
                  loadUsers()
                } catch (err: any) {
                  toast.error(err.message || 'Failed to update role')
                }
              }}
            >
              <SelectTrigger className="h-8 text-xs font-medium">
                <SelectValue placeholder="Select role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="sales_rep">Sales Rep</SelectItem>
                <SelectItem value="technical">Technical Queue</SelectItem>
                <SelectItem value="finance">Finance Queue</SelectItem>
                <SelectItem value="sales_head">Sales Head</SelectItem>
                <SelectItem value="admin">Administrator</SelectItem>
              </SelectContent>
            </Select>
          </div>
        )
      },
    },
    { accessorKey: 'department', header: 'Department' },
    {
      accessorKey: 'is_active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.original.is_active ? 'success' : 'danger'}>
          {row.original.is_active ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const isSelf = currentUser?.id === row.original.id
        return (
          <div className="flex justify-end gap-1">
            {!isSelf && (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 h-8 px-2.5"
                onClick={async () => {
                  const confirmed = window.confirm(
                    `Are you sure you want to remove user "${row.original.full_name}"? This will delete all deals they created.`
                  )
                  if (!confirmed) return
                  try {
                    await deleteUser(row.original.id)
                    toast.success('User removed successfully')
                    loadUsers()
                  } catch (err: any) {
                    toast.error(err.message || 'Failed to remove user')
                  }
                }}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Remove
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  const inviteColumns: ColumnDef<Invite>[] = [
    { accessorKey: 'email', header: 'Email' },
    {
      accessorKey: 'role',
      header: 'Role',
      cell: ({ row }) => (
        <Badge variant="outline">{ROLE_LABELS[row.original.role]}</Badge>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      cell: ({ row }) => {
        const accepted = !!row.original.accepted_at
        const expired = new Date(row.original.expires_at) < new Date()
        if (accepted) return <Badge variant="success">Accepted</Badge>
        if (expired) return <Badge variant="danger">Expired</Badge>
        return <Badge variant="warning">Pending</Badge>
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Sent',
      cell: ({ row }) => formatRelative(row.original.created_at),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => {
        const pending = !row.original.accepted_at
        return (
          <div className="flex justify-end gap-2">
            {pending && (
              <Button
                variant="ghost"
                size="sm"
                className="gap-1.5 h-8 px-2.5"
                onClick={() => {
                  navigator.clipboard.writeText(buildInviteUrl(row.original.token))
                  toast.success('Link copied')
                }}
              >
                <Copy className="h-3.5 w-3.5" />
                Copy Link
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10 gap-1.5 h-8 px-2.5"
              onClick={async () => {
                const confirmed = window.confirm(
                  `Are you sure you want to remove this invite record for "${row.original.email}"?`
                )
                if (!confirmed) return
                try {
                  await revokeInvite(row.original.id)
                  toast.success('Invite record removed successfully')
                  loadInvites()
                } catch (err: any) {
                  toast.error(err.message || 'Failed to remove invite record')
                }
              }}
            >
              <Trash2 className="h-3.5 w-3.5" />
              Remove
            </Button>
          </div>
        )
      },
    },
  ]

  const userTable = useReactTable({ data: users, columns: userColumns, getCoreRowModel: getCoreRowModel() })
  const inviteTable = useReactTable({
    data: invites,
    columns: inviteColumns,
    getCoreRowModel: getCoreRowModel(),
  })

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold font-display">
            {activeTab === 'users' ? 'User Management' : 'Customer Registry'}
          </h1>
          <p className="text-muted-foreground mt-1">
            {activeTab === 'users'
              ? 'Manage team members, roles, and platform permissions.'
              : 'Manage enterprise customers and autocomplete suggestion list.'}
          </p>
        </div>
        <div className="flex gap-2">
          {activeTab === 'users' ? (
            <>
              <CreateUserDialog onCreated={() => { loadInvites(); loadUsers() }} />
              <InviteUserDialog onCreated={() => { loadInvites(); loadUsers() }} />
            </>
          ) : (
            <Button
              onClick={openAddCustomer}
              className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90 rounded-lg shadow-sm h-10 px-4 cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              Add Customer
            </Button>
          )}
        </div>
      </div>

      {/* Tabs Switcher */}
      <div className="flex border-b border-border">
        <button
          onClick={() => setActiveTab('users')}
          className={cn(
            "px-5 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-all cursor-pointer",
            activeTab === 'users'
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Team & Invites
        </button>
        <button
          onClick={() => setActiveTab('customers')}
          className={cn(
            "px-5 py-2.5 text-sm font-semibold border-b-2 -mb-[2px] transition-all cursor-pointer",
            activeTab === 'customers'
              ? "border-primary text-primary font-bold"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          Customers
        </button>
      </div>

      {activeTab === 'users' ? (
        <>
          <Card>
            <CardHeader>
              <CardTitle>Pending & recent invites</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loadingInvites ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading invites...</p>
              ) : invites.length === 0 ? (
                <p className="text-sm text-muted-foreground py-8 text-center">
                  No invites yet. Click &quot;Invite user&quot; to add a team member.
                </p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    {inviteTable.getHeaderGroups().map((hg) => (
                      <tr key={hg.id} className="border-b text-muted-foreground">
                        {hg.headers.map((h) => (
                          <th key={h.id} className="pb-3 text-left font-medium px-2">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {inviteTable.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-b border-border/30">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="py-3 px-2">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Team directory</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {loadingUsers ? (
                <p className="text-sm text-muted-foreground py-8 text-center">Loading users...</p>
              ) : (
                <table className="w-full text-sm">
                  <thead>
                    {userTable.getHeaderGroups().map((hg) => (
                      <tr key={hg.id} className="border-b text-muted-foreground">
                        {hg.headers.map((h) => (
                          <th key={h.id} className="pb-3 text-left font-medium px-2">
                            {flexRender(h.column.columnDef.header, h.getContext())}
                          </th>
                        ))}
                      </tr>
                    ))}
                  </thead>
                  <tbody>
                    {userTable.getRowModel().rows.map((row) => (
                      <tr key={row.id} className="border-b border-border/30 hover:bg-muted/20">
                        {row.getVisibleCells().map((cell) => (
                          <td key={cell.id} className="py-3 px-2">
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Enterprise Customers List</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            {loadingCustomers ? (
              <p className="text-sm text-muted-foreground py-8 text-center">Loading customers...</p>
            ) : customers.length === 0 ? (
              <p className="text-sm text-muted-foreground py-8 text-center">
                No customers found. Click &quot;Add Customer&quot; to register your first enterprise customer.
              </p>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b text-muted-foreground">
                    <th className="pb-3 text-left font-medium px-2">Customer ID</th>
                    <th className="pb-3 text-left font-medium px-2">Customer Name</th>
                    <th className="pb-3 text-left font-medium px-2">Date Added</th>
                    <th className="pb-3 text-right font-medium px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((cust) => (
                    <tr key={cust.id} className="border-b border-border/30 hover:bg-muted/20">
                      <td className="py-3 px-2 font-mono text-xs text-muted-foreground">{cust.id}</td>
                      <td className="py-3 px-2 font-medium">{cust.name}</td>
                      <td className="py-3 px-2 text-muted-foreground">{formatRelative(cust.created_at)}</td>
                      <td className="py-3 px-2">
                        <div className="flex justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2.5 hover:bg-muted"
                            onClick={() => openEditCustomer(cust)}
                          >
                            Edit
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2.5"
                            onClick={() => handleDeleteCustomer(cust)}
                          >
                            Delete
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>
      )}

      {/* Slide-over Drawer Panel */}
      <AnimatePresence>
        {isDrawerOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsDrawerOpen(false)}
              className="fixed inset-0 bg-background/40 backdrop-blur-xs z-50"
            />
            {/* Drawer */}
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 20, stiffness: 180 }}
              className="fixed inset-y-0 right-0 w-full max-w-md bg-card border-l border-border shadow-2xl z-50 flex flex-col h-full"
            >
              {/* Header */}
              <div className="p-6 border-b border-border flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold font-display text-foreground">
                    {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
                  </h2>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {editingCustomer ? 'Modify the customer profile' : 'Create a new customer profile'}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="rounded-full h-8 w-8 hover:bg-muted"
                  onClick={() => setIsDrawerOpen(false)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>

              {/* Form Body */}
              <form onSubmit={handleSaveCustomer} className="flex-1 flex flex-col justify-between">
                <div className="p-6 space-y-4 flex-1">
                  <div className="space-y-1.5">
                    <Label htmlFor="cust-id" className="text-xs font-semibold text-foreground">
                      Customer ID
                    </Label>
                    <Input
                      id="cust-id"
                      value={customerForm.id}
                      disabled
                      className="bg-muted/50 text-muted-foreground font-mono cursor-not-allowed h-10 border-border rounded-lg"
                    />
                    <p className="text-[10px] text-muted-foreground">
                      Auto-generated customer reference identifier
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="cust-name" className="text-xs font-semibold text-foreground flex items-center gap-1">
                      Customer Name <span className="text-primary font-bold">*</span>
                    </Label>
                    <Input
                      id="cust-name"
                      value={customerForm.name}
                      onChange={(e) => setCustomerForm(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="e.g. Tata Steel Ltd."
                      required
                      autoFocus
                      className="bg-background h-10 border-border rounded-lg focus:ring-1 focus:ring-primary focus:border-primary text-sm transition-all"
                    />
                  </div>
                </div>

                {/* Form Footer */}
                <div className="p-6 border-t border-border bg-muted/10 flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsDrawerOpen(false)}
                    className="h-10 px-4 rounded-lg text-sm"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    className="h-10 px-4 rounded-lg text-sm bg-primary text-primary-foreground hover:bg-primary/95 transition-all font-medium shadow-xs"
                  >
                    {editingCustomer ? 'Update Customer' : 'Add Customer'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}
