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
import { ALL_ROLES } from '@/lib/auth-roles'
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
  const [customerForm, setCustomerForm] = useState({
    id: '',
    name: '',
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    billing_street: '',
    billing_city: '',
    billing_state: '',
    billing_code: '',
    billing_country: 'India',
    shipping_street: '',
    shipping_city: '',
    shipping_state: '',
    shipping_code: '',
    shipping_country: 'India',
  })

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
    setCustomerForm({
      id: generatedId,
      name: '',
      contact_name: '',
      contact_email: '',
      contact_phone: '',
      billing_street: '',
      billing_city: '',
      billing_state: '',
      billing_code: '',
      billing_country: 'India',
      shipping_street: '',
      shipping_city: '',
      shipping_state: '',
      shipping_code: '',
      shipping_country: 'India',
    })
    setIsDrawerOpen(true)
  }

  const openEditCustomer = (cust: Customer) => {
    setEditingCustomer(cust)
    setCustomerForm({
      id: cust.id,
      name: cust.name || '',
      contact_name: cust.contact_name || '',
      contact_email: cust.contact_email || '',
      contact_phone: cust.contact_phone || '',
      billing_street: cust.billing_street || '',
      billing_city: cust.billing_city || '',
      billing_state: cust.billing_state || '',
      billing_code: cust.billing_code || '',
      billing_country: cust.billing_country || 'India',
      shipping_street: cust.shipping_street || '',
      shipping_city: cust.shipping_city || '',
      shipping_state: cust.shipping_state || '',
      shipping_code: cust.shipping_code || '',
      shipping_country: cust.shipping_country || 'India',
    })
    setIsDrawerOpen(true)
  }

  const handleCopyBillingToShipping = () => {
    setCustomerForm(prev => ({
      ...prev,
      shipping_street: prev.billing_street,
      shipping_city: prev.billing_city,
      shipping_state: prev.billing_state,
      shipping_code: prev.billing_code,
      shipping_country: prev.billing_country,
    }))
    toast.success('Billing address copied to shipping address!')
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
        created_at: editingCustomer?.created_at || new Date().toISOString(),
        contact_name: customerForm.contact_name.trim() || undefined,
        contact_email: customerForm.contact_email.trim() || undefined,
        contact_phone: customerForm.contact_phone.trim() || undefined,
        billing_street: customerForm.billing_street.trim() || undefined,
        billing_city: customerForm.billing_city.trim() || undefined,
        billing_state: customerForm.billing_state.trim() || undefined,
        billing_code: customerForm.billing_code.trim() || undefined,
        billing_country: customerForm.billing_country.trim() || undefined,
        shipping_street: customerForm.shipping_street.trim() || undefined,
        shipping_city: customerForm.shipping_city.trim() || undefined,
        shipping_state: customerForm.shipping_state.trim() || undefined,
        shipping_code: customerForm.shipping_code.trim() || undefined,
        shipping_country: customerForm.shipping_country.trim() || undefined,
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
                {ALL_ROLES.map((r) => (
                  <SelectItem key={r} value={r}>{ROLE_LABELS[r]}</SelectItem>
                ))}
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
                <div className="overflow-x-auto touch-pan-x">
                  <table className="w-full text-sm min-w-[650px]">
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
              </div>
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
                  <tr className="border-b text-muted-foreground text-xs uppercase tracking-wider">
                    <th className="pb-3 text-left font-medium px-2">Customer ID</th>
                    <th className="pb-3 text-left font-medium px-2">Customer Name</th>
                    <th className="pb-3 text-left font-medium px-2">Primary Contact</th>
                    <th className="pb-3 text-left font-medium px-2">Billing Location</th>
                    <th className="pb-3 text-left font-medium px-2">Date Added</th>
                    <th className="pb-3 text-right font-medium px-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((cust) => {
                    const location = [cust.billing_city, cust.billing_state, cust.billing_country].filter(Boolean).join(', ')
                    return (
                      <tr key={cust.id} className="border-b border-border/30 hover:bg-muted/20 text-xs">
                        <td className="py-3 px-2 font-mono text-muted-foreground font-semibold">{cust.id}</td>
                        <td className="py-3 px-2 font-bold text-foreground">{cust.name}</td>
                        <td className="py-3 px-2">
                          {cust.contact_name ? (
                            <div>
                              <div className="font-medium text-foreground">{cust.contact_name}</div>
                              {cust.contact_email && <div className="text-[11px] text-muted-foreground">{cust.contact_email}</div>}
                            </div>
                          ) : (
                            <span className="text-muted-foreground italic text-[11px]">—</span>
                          )}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">
                          {location || <span className="italic text-[11px]">—</span>}
                        </td>
                        <td className="py-3 px-2 text-muted-foreground">{formatRelative(cust.created_at)}</td>
                        <td className="py-3 px-2">
                          <div className="flex justify-end gap-1.5">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 px-2.5 hover:bg-muted font-medium"
                              onClick={() => openEditCustomer(cust)}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive hover:bg-destructive/10 h-8 px-2.5 font-medium"
                              onClick={() => handleDeleteCustomer(cust)}
                            >
                              Delete
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
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
              <form onSubmit={handleSaveCustomer} className="flex-1 flex flex-col justify-between overflow-hidden">
                <div className="p-6 space-y-5 flex-1 overflow-y-auto max-h-[calc(100vh-140px)]">
                  {/* Basic Information */}
                  <div className="space-y-3">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
                      Account & Contact Information
                    </h3>

                    <div className="space-y-1.5">
                      <Label htmlFor="cust-id" className="text-xs font-semibold text-foreground">
                        Customer ID
                      </Label>
                      <Input
                        id="cust-id"
                        value={customerForm.id}
                        disabled
                        className="bg-muted/50 text-muted-foreground font-mono cursor-not-allowed h-9 border-border rounded-lg text-xs"
                      />
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
                        className="bg-background h-9 border-border rounded-lg text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-1 gap-2.5">
                      <div className="space-y-1">
                        <Label htmlFor="cust-contact-name" className="text-[11px] font-medium text-foreground">
                          Contact Person
                        </Label>
                        <Input
                          id="cust-contact-name"
                          value={customerForm.contact_name}
                          onChange={(e) => setCustomerForm(prev => ({ ...prev, contact_name: e.target.value }))}
                          placeholder="e.g. Rajesh Shah"
                          className="bg-background h-9 text-xs"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="space-y-1">
                          <Label htmlFor="cust-contact-email" className="text-[11px] font-medium text-foreground">
                            Email Address
                          </Label>
                          <Input
                            id="cust-contact-email"
                            type="email"
                            value={customerForm.contact_email}
                            onChange={(e) => setCustomerForm(prev => ({ ...prev, contact_email: e.target.value }))}
                            placeholder="rajesh@company.com"
                            className="bg-background h-9 text-xs"
                          />
                        </div>
                        <div className="space-y-1">
                          <Label htmlFor="cust-contact-phone" className="text-[11px] font-medium text-foreground">
                            Phone Number
                          </Label>
                          <Input
                            id="cust-contact-phone"
                            value={customerForm.contact_phone}
                            onChange={(e) => setCustomerForm(prev => ({ ...prev, contact_phone: e.target.value }))}
                            placeholder="+91 98200 12345"
                            className="bg-background h-9 text-xs"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Billing Address Section */}
                  <div className="space-y-3 pt-2">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground border-b border-border/60 pb-1">
                      Billing Address
                    </h3>

                    <div className="space-y-1.5">
                      <Label htmlFor="cust-billing-street" className="text-[11px] font-medium text-foreground">
                        Street Address / Area
                      </Label>
                      <Input
                        id="cust-billing-street"
                        value={customerForm.billing_street}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, billing_street: e.target.value }))}
                        placeholder="e.g. 122 MG Road, Fort"
                        className="bg-background h-9 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="cust-billing-city" className="text-[11px] font-medium text-foreground">
                          City
                        </Label>
                        <Input
                          id="cust-billing-city"
                          value={customerForm.billing_city}
                          onChange={(e) => setCustomerForm(prev => ({ ...prev, billing_city: e.target.value }))}
                          placeholder="Mumbai"
                          className="bg-background h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cust-billing-state" className="text-[11px] font-medium text-foreground">
                          State
                        </Label>
                        <Input
                          id="cust-billing-state"
                          value={customerForm.billing_state}
                          onChange={(e) => setCustomerForm(prev => ({ ...prev, billing_state: e.target.value }))}
                          placeholder="Maharashtra"
                          className="bg-background h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="cust-billing-code" className="text-[11px] font-medium text-foreground">
                          ZIP / PIN Code
                        </Label>
                        <Input
                          id="cust-billing-code"
                          value={customerForm.billing_code}
                          onChange={(e) => setCustomerForm(prev => ({ ...prev, billing_code: e.target.value }))}
                          placeholder="400001"
                          className="bg-background h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cust-billing-country" className="text-[11px] font-medium text-foreground">
                          Country
                        </Label>
                        <Input
                          id="cust-billing-country"
                          value={customerForm.billing_country}
                          onChange={(e) => setCustomerForm(prev => ({ ...prev, billing_country: e.target.value }))}
                          placeholder="India"
                          className="bg-background h-9 text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Shipping Address Section */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between border-b border-border/60 pb-1">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                        Shipping Address
                      </h3>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyBillingToShipping}
                        className="h-6 text-[10px] text-primary hover:text-primary font-semibold px-2 hover:bg-primary/10"
                      >
                        Copy Billing → Shipping
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      <Label htmlFor="cust-shipping-street" className="text-[11px] font-medium text-foreground">
                        Street Address / Warehouse
                      </Label>
                      <Input
                        id="cust-shipping-street"
                        value={customerForm.shipping_street}
                        onChange={(e) => setCustomerForm(prev => ({ ...prev, shipping_street: e.target.value }))}
                        placeholder="e.g. Logistics Park Hub 4, Bhiwandi"
                        className="bg-background h-9 text-xs"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="cust-shipping-city" className="text-[11px] font-medium text-foreground">
                          City
                        </Label>
                        <Input
                          id="cust-shipping-city"
                          value={customerForm.shipping_city}
                          onChange={(e) => setCustomerForm(prev => ({ ...prev, shipping_city: e.target.value }))}
                          placeholder="Thane"
                          className="bg-background h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cust-shipping-state" className="text-[11px] font-medium text-foreground">
                          State
                        </Label>
                        <Input
                          id="cust-shipping-state"
                          value={customerForm.shipping_state}
                          onChange={(e) => setCustomerForm(prev => ({ ...prev, shipping_state: e.target.value }))}
                          placeholder="Maharashtra"
                          className="bg-background h-9 text-xs"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="cust-shipping-code" className="text-[11px] font-medium text-foreground">
                          ZIP / PIN Code
                        </Label>
                        <Input
                          id="cust-shipping-code"
                          value={customerForm.shipping_code}
                          onChange={(e) => setCustomerForm(prev => ({ ...prev, shipping_code: e.target.value }))}
                          placeholder="421302"
                          className="bg-background h-9 text-xs"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="cust-shipping-country" className="text-[11px] font-medium text-foreground">
                          Country
                        </Label>
                        <Input
                          id="cust-shipping-country"
                          value={customerForm.shipping_country}
                          onChange={(e) => setCustomerForm(prev => ({ ...prev, shipping_country: e.target.value }))}
                          placeholder="India"
                          className="bg-background h-9 text-xs"
                        />
                      </div>
                    </div>
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
