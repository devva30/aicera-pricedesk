import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Package, RefreshCw, ChevronRight, ChevronDown, Search, Trash2, Calendar, AlertTriangle, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/auth-store'
import { fetchOrders, saveOrder, deleteOrder } from '@/services/orders-service'
import { exportOrdersToExcel } from '@/lib/excel-exporter'
import type { Order } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { EmptyState } from '@/components/shared/empty-state'

const VENDOR_DETAILS = [
  {
    name: 'REDINGTON LIMITED',
    contactPerson: 'Procurement Desk',
    email: 'procurement@redington.co.in',
    phone: '+91 99000 12345',
    address: 'Redington Tower, Plot No 95, Chennai, Tamil Nadu 600032'
  },
  {
    name: 'India Electronics Corp',
    contactPerson: 'Amit Sharma',
    email: 'amit@indiaelections.com',
    phone: '+91 98765 43210',
    address: '12, MG Road, Industrial Area, Bangalore, Karnataka 560001'
  },
  {
    name: 'Dell Technologies',
    contactPerson: 'Dell Commercial Support',
    email: 'sales@dell.com',
    phone: '+91 80 2510 8000',
    address: 'Dell Campus, Divyasree Greens, Bangalore, Karnataka 560071'
  },
  {
    name: 'HP Enterprise',
    contactPerson: 'HPE Sales Desk',
    email: 'hpe.sales@hpe.com',
    phone: '+91 80 4333 4000',
    address: 'HPE India, 24th Main Rd, HSR Layout, Bangalore, Karnataka 560102'
  },
  {
    name: 'Ingram Micro',
    contactPerson: 'Ingram Order Desk',
    email: 'order.in@ingrammicro.com',
    phone: '+91 22 5556 6000',
    address: 'Ingram Micro India, Godrej Coliseum, Mumbai, Maharashtra 400022'
  }
]

export function OrdersListPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)!
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')

  // Standalone PO Form States
  const [isCreatePoOpen, setIsCreatePoOpen] = useState(false)

  const [poVendorName, setPoVendorName] = useState('')
  const [poContactPerson, setPoContactPerson] = useState('')
  const [poEmail, setPoEmail] = useState('')
  const [poPhone, setPoPhone] = useState('')
  const [poOem, setPoOem] = useState('')
  const [poPaymentTerms, setPoPaymentTerms] = useState('')
  const [poAddress, setPoAddress] = useState('')
  const [poDeliveryDate, setPoDeliveryDate] = useState('')
  const [poItems, setPoItems] = useState<Array<{ product_name: string, quantity: number, transfer_price: number }>>([
    { product_name: 'Dell Servers', quantity: 5, transfer_price: 100 }
  ])
  const [poDiscountPct, setPoDiscountPct] = useState(0)
  const [poCgstPct, setPoCgstPct] = useState(9)
  const [poSgstPct, setPoSgstPct] = useState(9)
  const [poIgstPct, setPoIgstPct] = useState(0)
  const [poShipping, setPoShipping] = useState(0)
  const [poNotes, setPoNotes] = useState('')
  const [poTerms, setPoTerms] = useState('')
  const [poSubmitting, setPoSubmitting] = useState(false)

  const handleVendorSelectChange = (idxStr: string) => {
    if (idxStr === '') {
      return
    }
    const idx = Number(idxStr)
    const vendor = VENDOR_DETAILS[idx]
    if (vendor) {
      setPoVendorName(vendor.name)
      setPoContactPerson(vendor.contactPerson)
      setPoEmail(vendor.email)
      setPoPhone(vendor.phone)
      setPoAddress(vendor.address)
      if (vendor.name.includes('REDINGTON')) setPoOem('Generic')
      else if (vendor.name.includes('India Electronics')) setPoOem('Generic')
      else if (vendor.name.includes('Dell')) setPoOem('Dell')
      else if (vendor.name.includes('HP')) setPoOem('HPE')
      else if (vendor.name.includes('Ingram')) setPoOem('Generic')
    }
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...poItems]
    updated[index] = {
      ...updated[index],
      [field]: field === 'product_name' ? value : Number(value) || 0
    }
    setPoItems(updated)
  }

  const handleAddItem = () => {
    setPoItems([...poItems, { product_name: '', quantity: 1, transfer_price: 0 }])
  }

  const handleRemoveItem = (index: number) => {
    if (poItems.length === 1) {
      toast.error('At least one item is required.')
      return
    }
    setPoItems(poItems.filter((_, i) => i !== index))
  }

  const subtotal = poItems.reduce((sum, item) => sum + (item.quantity * item.transfer_price), 0)
  const discountAmount = subtotal * (poDiscountPct / 100)
  const discountedSubtotal = subtotal - discountAmount
  const cgstAmount = discountedSubtotal * (poCgstPct / 100)
  const sgstAmount = discountedSubtotal * (poSgstPct / 100)
  const igstAmount = discountedSubtotal * (poIgstPct / 100)
  const total = discountedSubtotal + cgstAmount + sgstAmount + igstAmount + Number(poShipping)

  const handleCreatePoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!poVendorName.trim()) {
      toast.error('Please enter vendor name.')
      return
    }
    if (!poDeliveryDate) {
      toast.error('Please select expected delivery date.')
      return
    }
    if (poItems.some(item => !item.product_name.trim())) {
      toast.error('Please enter product description for all items.')
      return
    }
    if (poItems.some(item => item.quantity <= 0 || item.transfer_price <= 0)) {
      toast.error('Quantity and Unit Price must be greater than 0.')
      return
    }

    setPoSubmitting(true)
    const toastId = toast.loading('Creating standalone purchase order...')

    try {
      const generatedPoNumber = `PO-2026-${String(Math.floor(Math.random() * 900000) + 100000)}`

      await saveOrder({
        is_standalone: true,
        order_status: 'Draft',
        order_number: generatedPoNumber,
        po_number: generatedPoNumber,
        vendor_po_number: generatedPoNumber,
        deal_id: 'standalone',
        deal_number: 'standalone',
        title: `Purchase Order: ${poVendorName}`,
        customer_name: 'Standalone',
        oem: poOem || 'N/A',
        supplier_name: poVendorName,
        contact_person: poContactPerson,
        email: poEmail,
        phone: poPhone,
        vendor_address: poAddress,
        quoted_value: total,
        payment_terms: poPaymentTerms || 'As per PO terms',
        expected_delivery_date: poDeliveryDate,
        sales_rep_id: user.id,
        sales_rep_name: user.full_name,
        items: poItems.map(item => ({
          sku: item.product_name.replace(/\s+/g, '-').toUpperCase(),
          product_name: item.product_name,
          quantity: item.quantity,
          transfer_price: item.transfer_price,
          quoted_price: item.transfer_price,
          unit_of_measure: 'EA'
        })),
        discount_pct: poDiscountPct,
        cgst_pct: poCgstPct,
        sgst_pct: poSgstPct,
        igst_pct: poIgstPct,
        shipping_charge: Number(poShipping) || 0,
        notes: poNotes,
        terms_conditions: poTerms
      }, user.id)

      toast.success(`Purchase Order ${generatedPoNumber} created successfully!`, { id: toastId })
      setIsCreatePoOpen(false)
      // reset form
      setPoVendorName('')
      setPoContactPerson('')
      setPoEmail('')
      setPoPhone('')
      setPoOem('')
      setPoPaymentTerms('')
      setPoAddress('')
      setPoDeliveryDate('')
      setPoItems([{ product_name: 'Dell Servers', quantity: 5, transfer_price: 100 }])
      setPoDiscountPct(0)
      setPoCgstPct(9)
      setPoSgstPct(9)
      setPoIgstPct(0)
      setPoShipping(0)
      setPoNotes('')
      setPoTerms('')

      loadOrders()
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to create purchase order.', { id: toastId })
    } finally {
      setPoSubmitting(false)
    }
  }

  const [orderToDelete, setOrderToDelete] = useState<Order | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDeleteOrder = async () => {
    if (!orderToDelete) return
    setIsDeleting(true)
    try {
      await deleteOrder(orderToDelete.id, user?.id)
      setOrders((prev) => prev.filter((o) => o.id !== orderToDelete.id))
      toast.success(`Order ${orderToDelete.order_number || orderToDelete.title} deleted successfully`)
      setOrderToDelete(null)
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete order')
    } finally {
      setIsDeleting(false)
    }
  }

  const loadOrders = async () => {
    setLoading(true)
    try {
      const data = await fetchOrders(user.role, user.id)
      setOrders(data)
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  const filteredOrders = orders.filter((order) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    return (
      (order.order_number || '').toLowerCase().includes(q) ||
      (order.title || '').toLowerCase().includes(q) ||
      (order.customer_name || '').toLowerCase().includes(q) ||
      (order.oem || '').toLowerCase().includes(q) ||
      (order.sales_rep_name || '').toLowerCase().includes(q) ||
      (order.ops_owner || '').toLowerCase().includes(q)
    )
  })

  useEffect(() => {
    loadOrders()
  }, [user])

  // Progress calculations handled automatically via services

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-lg shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Order Management Workspace</span>
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-xl font-bold font-display text-foreground">My Orders</h1>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <Button variant="outline" size="icon" onClick={loadOrders} title="Refresh list" className="h-9 w-9">
            <RefreshCw className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => exportOrdersToExcel(filteredOrders)}
            className="h-9 text-xs font-semibold px-3 gap-1.5 border-emerald-200 text-emerald-700 bg-emerald-50/50 hover:bg-emerald-100 cursor-pointer"
          >
            <FileSpreadsheet className="h-4 w-4 text-emerald-600" />
            Download Worksheet
          </Button>
          {(user.role === 'sales_rep' || user.role === 'finance' || user.role === 'admin') && (
            <>
              <Button onClick={() => navigate('/orders/new')} size="sm" className="h-9 text-xs font-semibold px-4 border border-slate-200">
                <Plus className="h-4 w-4 mr-1.5" />
                New Order Setup
              </Button>
              <Button onClick={() => setIsCreatePoOpen(true)} size="sm" className="h-9 text-xs font-semibold px-4 bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer shadow-sm">
                <Plus className="h-4 w-4 mr-1.5" />
                Create Standalone PO
              </Button>
            </>
          )}
        </div>
      </div>

      {/* KPI Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 bg-card border border-border rounded-lg shadow-sm p-4 text-xs">
        <div>
          <p className="text-muted-foreground font-semibold">Total Orders</p>
          <p className="font-bold text-foreground mt-1 text-sm">{orders.length} record(s)</p>
        </div>
        <div>
          <p className="text-muted-foreground font-semibold">Active Orders</p>
          <p className="font-bold text-foreground mt-1 text-sm">
            {orders.filter((o) => o.order_status !== 'Closed').length} order(s)
          </p>
        </div>
        <div>
          <p className="text-muted-foreground font-semibold">Closed Orders</p>
          <p className="font-bold text-foreground mt-1 text-sm">
            {orders.filter((o) => o.order_status === 'Closed').length} order(s)
          </p>
        </div>
      </div>

      {/* Search Bar */}
      {!loading && orders.length > 0 && (
        <div className="bg-card border border-border p-4 rounded-lg shadow-sm flex items-center gap-3">
          <div className="relative max-w-md w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by order #, title, customer, OEM, or sales rep..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-border text-xs rounded-lg w-full bg-background"
            />
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="bg-card border border-border rounded-lg h-96 animate-pulse shadow-sm" />
      ) : orders.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-12 text-center shadow-sm">
          <Package className="h-10 w-10 mx-auto text-muted-foreground/50 mb-3" />
          <h3 className="font-bold text-foreground mb-1">No Orders Found</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto">
            {user.role === 'sales_rep' || user.role === 'finance'
              ? 'You have not drafted any orders. Create an order from your fully approved quotes/deals.'
              : 'There are no active orders routed to the finance queue.'}
          </p>
          {(user.role === 'sales_rep' || user.role === 'finance') && (
            <Button onClick={() => navigate('/orders/new')} size="sm" className="mt-4">
              Create New Order
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="sm:hidden px-3 py-1.5 bg-muted/40 text-[10px] text-muted-foreground flex items-center justify-between border-b border-border/40">
            <span>👈 Swipe horizontally to view full order details 👉</span>
          </div>
          <div className="overflow-x-auto touch-pan-x">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="bg-muted/40 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase">
                  <th className="p-4">Order Number</th>
                  <th className="p-4">Deal Title</th>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">OEM</th>
                  {user.role !== 'sales_rep' && <th className="p-4">Sales Rep</th>}
                  <th className="p-4">Ops Executive</th>
                  <th className="p-4">Execution Progress</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs">
                {filteredOrders.length === 0 ? (
                  <tr>
                    <td colSpan={user.role === 'sales_rep' ? 8 : 9} className="p-0">
                      <EmptyState
                        icon={Package}
                        title="No orders found"
                        description={searchQuery.trim() ? "Try adjusting your search query to locate this order." : "No orders are currently registered for execution."}
                      />
                    </td>
                  </tr>
                ) : (
                  filteredOrders.map((order) => {
                    return (
                      <tr
                        key={order.id}
                        onClick={() => navigate(`/orders/${order.id}`)}
                        className="hover:bg-muted/30 cursor-pointer transition-colors group"
                      >
                        <td className="p-4">
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-foreground">{order.order_number}</span>
                            {(order.version_number ?? 1) > 1 && (
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200 shrink-0">
                                v{order.version_number}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="p-4 font-medium text-foreground">{order.title}</td>
                        <td className="p-4 text-muted-foreground">
                          {order.is_standalone ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              Standalone PO
                            </span>
                          ) : (
                            order.customer_name
                          )}
                        </td>
                        <td className="p-4">
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-100">
                            {order.is_standalone ? 'N/A' : (order.oem || 'N/A')}
                          </span>
                        </td>
                        {user.role !== 'sales_rep' && (
                          <td className="p-4 text-muted-foreground font-medium">{order.sales_rep_name}</td>
                        )}
                        <td className="p-4 text-muted-foreground font-bold">{order.ops_owner || 'Unassigned'}</td>
                        <td className="p-4">
                          <div className="flex flex-col gap-1 w-32">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-slate-500 font-bold">
                                {order.pct_complete || 0}%
                              </span>
                              <span className={cn(
                                "text-[9px] px-1.5 py-0.5 rounded font-bold uppercase border",
                                order.stage === 'CLOSED' && "bg-emerald-50 text-emerald-700 border-emerald-200/50",
                                order.stage === 'ADVANCED' && "bg-blue-50 text-blue-700 border-blue-200/50",
                                order.stage === 'IN PROGRESS' && "bg-amber-50 text-amber-700 border-amber-200/50",
                                (order.stage === 'EARLY' || !order.stage) && "bg-slate-50 text-slate-600 border-slate-200/50",
                              )}>
                                {order.stage || 'EARLY'}
                              </span>
                            </div>
                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={cn(
                                  "h-full transition-all duration-300",
                                  order.stage === 'CLOSED' && "bg-emerald-500",
                                  order.stage === 'ADVANCED' && "bg-blue-500",
                                  order.stage === 'IN PROGRESS' && "bg-amber-500",
                                  (order.stage === 'EARLY' || !order.stage) && "bg-slate-400"
                                )}
                                style={{ width: `${order.pct_complete || 0}%` }}
                              />
                            </div>
                          </div>
                        </td>
                        <td className="p-4">
                          <span className={cn(
                            "inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold uppercase border",
                            order.order_status === 'Closed' && "bg-emerald-50 text-emerald-700 border-emerald-200/50",
                            order.order_status === 'Cancelled' && "bg-red-50 text-red-700 border-red-200/50",
                            order.order_status === 'Installed' && "bg-purple-50 text-purple-700 border-purple-200/50",
                            order.order_status === 'Delivered' && "bg-indigo-50 text-indigo-700 border-indigo-200/50",
                            order.order_status === 'In Transit' && "bg-sky-50 text-sky-700 border-sky-200/50",
                            order.order_status === 'Draft' && "bg-slate-100 text-slate-700 border-slate-200/50",
                            (order.order_status === 'Processing' || !order.order_status) && "bg-amber-50 text-amber-700 border-amber-200/50"
                          )}>
                            {order.order_status || 'Processing'}
                          </span>
                        </td>
                        <td className="p-4 text-right pr-6">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-muted-foreground hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20"
                              title="Delete Order"
                              onClick={(e) => {
                                e.stopPropagation()
                                setOrderToDelete(order)
                              }}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground group-hover:text-primary transition-colors">
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create Standalone Vendor PO Dialog */}
      <Dialog open={isCreatePoOpen} onOpenChange={setIsCreatePoOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-[#FAF9F6]">
          <DialogHeader className="border-b pb-4 flex flex-row items-center justify-between">
            <div>
              <DialogTitle className="text-xl font-bold font-display text-indigo-950">
                Create Standalone Vendor PO
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">Create a purchase order without linking to a quote</p>
            </div>
          </DialogHeader>

          <form onSubmit={handleCreatePoSubmit} className="space-y-6 mt-4 text-left">
            {/* Vendor Details */}
            <div className="bg-white p-4 md:p-5 border border-slate-200 rounded-lg shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider border-b pb-2">
                Vendor Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <Label htmlFor="vendor-name-input" className="text-[10px] font-bold text-slate-500 mb-1.5 block">
                    Vendor * <span className="text-slate-400 font-normal normal-case">(type or pick from list)</span>
                  </Label>
                  <div className="relative">
                    <Input
                      id="vendor-name-input"
                      list="vendor-suggestions"
                      placeholder="Type vendor name or select..."
                      value={poVendorName}
                      onChange={(e) => {
                        const typed = e.target.value
                        setPoVendorName(typed)
                        // Auto-fill if the typed value matches a known vendor exactly
                        const matchIdx = VENDOR_DETAILS.findIndex(v => v.name.toLowerCase() === typed.toLowerCase())
                        if (matchIdx !== -1) {
                          handleVendorSelectChange(String(matchIdx))
                        }
                      }}
                      className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-indigo-500 pr-8"
                      required
                    />
                    <datalist id="vendor-suggestions">
                      {VENDOR_DETAILS.map((v, idx) => (
                        <option key={idx} value={v.name} />
                      ))}
                    </datalist>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                <div className="lg:col-span-2">
                  <Label htmlFor="delivery-date" className="text-[10px] font-bold text-slate-500 mb-1.5 block">
                    Expected Delivery *
                  </Label>
                  <div className="relative">
                    <Input
                      type="date"
                      id="delivery-date"
                      value={poDeliveryDate}
                      onChange={(e) => setPoDeliveryDate(e.target.value)}
                      className="pl-9 h-10 border-slate-300 text-xs bg-white rounded focus:ring-1 focus:ring-indigo-500 animate-none"
                      required
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>
            </div>

            {/* Items Section */}
            <div className="space-y-3">
              <div className="flex items-center justify-between border-b pb-2">
                <Label className="text-xs font-bold text-indigo-950">
                  Items *
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleAddItem}
                  className="h-8 text-xs font-semibold px-3 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5 mr-1" />
                  Add Item
                </Button>
              </div>

              {/* Items List */}
              <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                {poItems.map((item, index) => (
                  <div key={index} className="flex gap-3 items-start bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
                    <div className="flex-1 min-w-0">
                      <Input
                        placeholder="Product Description (e.g. Dell Servers)"
                        value={item.product_name}
                        onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                        className="h-9 border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="w-20">
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity || ''}
                        onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-9 border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                        min="1"
                      />
                    </div>
                    <div className="w-28">
                      <Input
                        type="number"
                        placeholder="Unit Price"
                        value={item.transfer_price || ''}
                        onChange={(e) => handleItemChange(index, 'transfer_price', e.target.value)}
                        onFocus={(e) => e.target.select()}
                        className="h-9 border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                        min="0"
                      />
                    </div>
                    <div className="pt-2 text-[10px] font-semibold text-slate-500 min-w-[80px] text-right font-sans whitespace-nowrap">
                      Subtotal: ₹{(item.quantity * item.transfer_price).toFixed(2)}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveItem(index)}
                      className="h-9 w-9 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>

            {/* Calculations Grid */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t pt-4">
              <div>
                <Label className="text-[10px] font-semibold text-slate-500 mb-1 block">Discount (%)</Label>
                <Input
                  type="number"
                  value={poDiscountPct || ''}
                  onChange={(e) => setPoDiscountPct(Number(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="h-9 border-slate-200 text-xs bg-white"
                  min="0"
                  max="100"
                />
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-slate-500 mb-1 block">CGST (%)</Label>
                <Input
                  type="number"
                  value={poCgstPct || ''}
                  onChange={(e) => setPoCgstPct(Number(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="h-9 border-slate-200 text-xs bg-white"
                  min="0"
                />
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-slate-500 mb-1 block">SGST (%)</Label>
                <Input
                  type="number"
                  value={poSgstPct || ''}
                  onChange={(e) => setPoSgstPct(Number(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="h-9 border-slate-200 text-xs bg-white"
                  min="0"
                />
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-slate-500 mb-1 block">IGST (%)</Label>
                <Input
                  type="number"
                  value={poIgstPct || ''}
                  onChange={(e) => setPoIgstPct(Number(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="h-9 border-slate-200 text-xs bg-white"
                  min="0"
                />
              </div>
              <div>
                <Label className="text-[10px] font-semibold text-slate-500 mb-1 block">Shipping (₹)</Label>
                <Input
                  type="number"
                  value={poShipping || ''}
                  onChange={(e) => setPoShipping(Number(e.target.value) || 0)}
                  onFocus={(e) => e.target.select()}
                  className="h-9 border-slate-200 text-xs bg-white"
                  min="0"
                />
              </div>
            </div>

            {/* Calculations Box */}
            <div className="bg-white p-4 border border-slate-200 rounded-lg space-y-2 text-xs text-slate-700">
              <div className="flex justify-between items-center border-b pb-1.5 gap-2">
                <span className="text-slate-500 shrink-0 whitespace-nowrap">Subtotal:</span>
                <span className={`font-semibold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[70%] ${`₹${subtotal.toFixed(2)}`.length > 20 ? 'text-[10px]' : 'text-xs'}`}>₹{subtotal.toFixed(2)}</span>
              </div>
              {poDiscountPct > 0 && (
                <div className="flex justify-between items-center border-b pb-1.5 text-red-600 gap-2">
                  <span className="shrink-0 whitespace-nowrap">Discount ({poDiscountPct}%):</span>
                  <span className={`font-semibold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[70%] ${`-₹${discountAmount.toFixed(2)}`.length > 20 ? 'text-[10px]' : 'text-xs'}`}>-₹{discountAmount.toFixed(2)}</span>
                </div>
              )}
              {poCgstPct > 0 && (
                <div className="flex justify-between items-center border-b pb-1.5 gap-2">
                  <span className="text-slate-500 shrink-0 whitespace-nowrap">CGST ({poCgstPct}%):</span>
                  <span className={`font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[70%] ${`₹${cgstAmount.toFixed(2)}`.length > 20 ? 'text-[10px]' : 'text-xs'}`}>₹{cgstAmount.toFixed(2)}</span>
                </div>
              )}
              {poSgstPct > 0 && (
                <div className="flex justify-between items-center border-b pb-1.5 gap-2">
                  <span className="text-slate-500 shrink-0 whitespace-nowrap">SGST ({poSgstPct}%):</span>
                  <span className={`font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[70%] ${`₹${sgstAmount.toFixed(2)}`.length > 20 ? 'text-[10px]' : 'text-xs'}`}>₹{sgstAmount.toFixed(2)}</span>
                </div>
              )}
              {poIgstPct > 0 && (
                <div className="flex justify-between items-center border-b pb-1.5 gap-2">
                  <span className="text-slate-500 shrink-0 whitespace-nowrap">IGST ({poIgstPct}%):</span>
                  <span className={`font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[70%] ${`₹${igstAmount.toFixed(2)}`.length > 20 ? 'text-[10px]' : 'text-xs'}`}>₹{igstAmount.toFixed(2)}</span>
                </div>
              )}
              {poShipping > 0 && (
                <div className="flex justify-between items-center border-b pb-1.5 gap-2">
                  <span className="text-slate-500 shrink-0 whitespace-nowrap">Shipping (₹):</span>
                  <span className={`font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[70%] ${`₹${Number(poShipping).toFixed(2)}`.length > 20 ? 'text-[10px]' : 'text-xs'}`}>₹{Number(poShipping).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between items-center font-bold text-sm text-indigo-950 pt-1 border-t gap-2">
                <span className="shrink-0 whitespace-nowrap">Total:</span>
                <span className={`font-bold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[70%] ${`₹${total.toFixed(2)}`.length > 20 ? 'text-xs' : 'text-sm'}`}>₹{total.toFixed(2)}</span>
              </div>
            </div>

            {/* Notes and Terms */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="notes" className="text-xs font-bold text-indigo-950 block mb-1.5">
                  Notes
                </Label>
                <Textarea
                  id="notes"
                  placeholder="Additional notes..."
                  value={poNotes}
                  onChange={(e) => setPoNotes(e.target.value)}
                  className="h-20 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div>
                <Label htmlFor="terms" className="text-xs font-bold text-indigo-950 block mb-1.5">
                  Terms &amp; Conditions
                </Label>
                <Textarea
                  id="terms"
                  placeholder="Terms and conditions..."
                  value={poTerms}
                  onChange={(e) => setPoTerms(e.target.value)}
                  className="h-20 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Form Action Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsCreatePoOpen(false)}
                className="h-10 text-xs font-semibold px-5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={poSubmitting}
                className="h-10 text-xs font-semibold px-5 bg-[#3B5998] hover:bg-indigo-900 text-white cursor-pointer shadow-md"
              >
                {poSubmitting ? 'Creating...' : 'Create Standalone PO'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Delete Order Confirmation Dialog */}
      <Dialog open={Boolean(orderToDelete)} onOpenChange={(open) => !open && setOrderToDelete(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Order
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete <strong className="text-foreground">{orderToDelete?.order_number || orderToDelete?.title}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-4 border-t mt-3">
            <Button variant="outline" size="sm" onClick={() => setOrderToDelete(null)} disabled={isDeleting}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteOrder} disabled={isDeleting} className="gap-1.5 font-semibold">
              <Trash2 className="h-4 w-4" />
              {isDeleting ? 'Deleting...' : 'Delete Order'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
