import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, ClipboardList, Calendar, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/stores/auth-store'
import { fetchDeals } from '@/services/deals-service'
import { saveOrder, fetchOrders } from '@/services/orders-service'
import type { Deal } from '@/types'
import { cn, formatCurrency, formatPercent, getMarginColor } from '@/lib/utils'
import { toast } from 'sonner'

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

export function OrderNewPage() {
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [approvedDeals, setApprovedDeals] = useState<Deal[]>([])
  const [loadingDeals, setLoadingDeals] = useState(true)

  // Selected deal details
  const [selectedDealId, setSelectedDealId] = useState('')
  const [selectedDeal, setSelectedDeal] = useState<Deal | null>(null)

  // Input fields
  const [selectedVendorIdx, setSelectedVendorIdx] = useState('')
  const [oem, setOem] = useState('')
  const [supplierName, setSupplierName] = useState('')
  const [contactPerson, setContactPerson] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [quotedValue, setQuotedValue] = useState('')
  const [paymentTerms, setPaymentTerms] = useState('')
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState('')
  const [vendorAddress, setVendorAddress] = useState('')
  const [opsOwner, setOpsOwner] = useState('Chetan')
  const [submitting, setSubmitting] = useState(false)

  const [poItems, setPoItems] = useState<Array<{ product_name: string, quantity: number, transfer_price: number, quoted_price?: number }>>([])
  const [poDiscountPct, setPoDiscountPct] = useState(0)
  const [poCgstPct, setPoCgstPct] = useState(9)
  const [poSgstPct, setPoSgstPct] = useState(9)
  const [poIgstPct, setPoIgstPct] = useState(0)
  const [poShipping, setPoShipping] = useState(0)
  const [poNotes, setPoNotes] = useState('')
  const [poTerms, setPoTerms] = useState(`Payment Terms: Net 30 days\nDelivery: 7-10 business days\nWarranty: 1 year manufacturer warranty`)

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

  useEffect(() => {
    if (!user?.role || !user?.id) return
    const loadApprovedDeals = async () => {
      setLoadingDeals(true)
      try {
        const [deals, existingOrders] = await Promise.all([
          fetchDeals(user.role, user.id),
          fetchOrders(user.role, user.id),
        ])
        // Build a set of deal IDs that already have an order, so we can block duplicates
        const dealIdsWithOrder = new Set(
          existingOrders.filter((o) => !!o.deal_id).map((o) => o.deal_id)
        )
        const approved = deals.filter(
          (d) => d.status === 'approved' && !d.is_quote_only && !dealIdsWithOrder.has(d.id)
        )
        setApprovedDeals(approved)
      } catch (e) {
        console.error('Failed to load deals:', e)
      } finally {
        setLoadingDeals(false)
      }
    }
    loadApprovedDeals()
  }, [user])

  useEffect(() => {
    const autoAssignOps = async () => {
      try {
        const existingOrders = await fetchOrders(user.role, user.id)
        const counts = { Chetan: 0, Bhoomika: 0, Deekshit: 0 }
        existingOrders.forEach((o) => {
          if (o.ops_owner === 'Chetan') counts.Chetan++
          if (o.ops_owner === 'Bhoomika') counts.Bhoomika++
          if (o.ops_owner === 'Deekshit') counts.Deekshit++
        })
        const minOwner = (Object.keys(counts) as Array<keyof typeof counts>).reduce((a, b) => 
          counts[a] <= counts[b] ? a : b
        )
        setOpsOwner(minOwner)
      } catch (e) {
        console.error('Failed to run round-robin auto-assignment:', e)
      }
    }
    autoAssignOps()
  }, [user])

  const handleVendorSelectChange = (idxStr: string) => {
    setSelectedVendorIdx(idxStr)
    if (idxStr === '') {
      return
    }
    const idx = Number(idxStr)
    const vendor = VENDOR_DETAILS[idx]
    if (vendor) {
      setSupplierName(vendor.name)
      setContactPerson(vendor.contactPerson)
      setEmail(vendor.email)
      setPhone(vendor.phone)
      setVendorAddress(vendor.address)

      // Auto-set OEM brand if recognizable
      if (vendor.name.includes('REDINGTON')) setOem('Generic')
      else if (vendor.name.includes('India Electronics')) setOem('Generic')
      else if (vendor.name.includes('Dell')) setOem('Dell')
      else if (vendor.name.includes('HP')) setOem('HPE')
      else if (vendor.name.includes('Ingram')) setOem('Generic')
    }
  }

  const handleDealChange = (dealId: string) => {
    setSelectedDealId(dealId)
    const deal = approvedDeals.find((d) => d.id === dealId) || null
    setSelectedDeal(deal)
    // Auto-fill OEM from the deal
    if (deal?.oem) {
      setOem(deal.oem)
    }
    // Pre-populate items from the approved deal to preserve quoted price and transfer price
    if (deal && deal.items && deal.items.length > 0) {
      setPoItems(deal.items.map(item => ({
        product_name: item.product_name,
        quantity: item.quantity,
        transfer_price: item.transfer_price,
        quoted_price: item.quoted_price
      })))
    } else {
      setPoItems([{ product_name: '', quantity: 1, transfer_price: 0 }])
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedDeal) {
      toast.error('Please select an approved quote/deal first.')
      return
    }

    if (!supplierName.trim()) {
      toast.error('Please enter supplier name.')
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

    setSubmitting(true)
    const toastId = toast.loading('Initializing order sheet...')

    try {
      const order = await saveOrder({
        deal_id: selectedDeal.id,
        deal_number: selectedDeal.deal_number,
        title: selectedDeal.title,
        customer_name: selectedDeal.customer_name,
        customer_id: selectedDeal.customer_id,
        sales_rep_id: selectedDeal.created_by || user.id,
        sales_rep_name: selectedDeal.creator?.full_name || user.full_name,
        oem: oem.trim(),
        quote_number: selectedDeal.quote_number || null,
        supplier_name: supplierName.trim(),
        supplier_invoice: '',
        contact_person: contactPerson.trim(),
        email: email.trim(),
        phone: phone.trim(),
        quoted_value: total,
        payment_terms: paymentTerms.trim(),
        expected_delivery_date: expectedDeliveryDate.trim(),
        vendor_address: vendorAddress.trim(),
        ops_owner: opsOwner,
        items: poItems.map(item => ({
          sku: item.product_name.replace(/\s+/g, '-').toUpperCase(),
          product_name: item.product_name,
          quantity: item.quantity,
          transfer_price: item.transfer_price,
          quoted_price: item.quoted_price || item.transfer_price,
          unit_of_measure: 'EA'
        })),
        discount_pct: poDiscountPct,
        cgst_pct: poCgstPct,
        sgst_pct: poSgstPct,
        igst_pct: poIgstPct,
        shipping_charge: poShipping,
        notes: poNotes,
        terms_conditions: poTerms
      }, user.id)

      toast.success('Order Worksheet initialized successfully!', { id: toastId })
      // Navigate to order detail page (checklist step)
      navigate(`/orders/${order.id}`)
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Failed to create order.', { id: toastId })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Back Button */}
      <div className="flex items-center gap-3">
        <Button
          variant="outline"
          size="sm"
          onClick={() => navigate('/orders')}
          className="h-8 text-xs font-semibold"
        >
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Orders
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg shadow-sm p-4 flex items-center gap-3">
        <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
          <ClipboardList className="h-5 w-5" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">New Object Creation</span>
          <h1 className="text-xl font-bold font-display text-foreground mt-0.5">Initialize Commercial Order</h1>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Deal selection */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-5 md:p-6 space-y-4">
          <h3 className="text-sm font-bold text-foreground border-b border-border/50 pb-2 uppercase tracking-wider">
            1. Select Approved Quote/Deal
          </h3>
          <div>
            <Label htmlFor="dealSelect" className="text-xs font-semibold text-muted-foreground">Approved Quote Number</Label>
            {loadingDeals ? (
              <div className="h-10 bg-slate-100 animate-pulse rounded border border-slate-200 mt-1.5" />
            ) : approvedDeals.length === 0 ? (
              <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded p-3 mt-1.5 flex items-center gap-2">
                <span>No approved deals available. Make sure you have deals that are **Fully Approved** in your pipeline.</span>
              </div>
            ) : (
              <select
                id="dealSelect"
                value={selectedDealId}
                onChange={(e) => handleDealChange(e.target.value)}
                className="w-full mt-1.5 h-10 px-3 border border-border rounded-md bg-slate-50/50 text-xs font-semibold focus-visible:ring-1 focus-visible:ring-primary focus-visible:bg-white focus:outline-none"
              >
                <option value="">-- Choose Approved Quote --</option>
                {approvedDeals.map((deal) => (
                  <option key={deal.id} value={deal.id}>
                    {deal.quote_number ? `${deal.quote_number} (Ref: ${deal.deal_number})` : deal.deal_number} — {deal.title} ({deal.customer_name})
                  </option>
                ))}
              </select>
            )}
          </div>

          {selectedDeal && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-muted/30 border border-border/50 rounded-lg p-4 text-xs mt-4">
              <div>
                <span className="text-muted-foreground font-semibold">Customer Name</span>
                <p className="font-bold text-foreground mt-0.5">{selectedDeal.customer_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">Sales rep</span>
                <p className="font-bold text-foreground mt-0.5">{user.full_name}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">Total Revenue</span>
                <p className="font-bold text-foreground mt-0.5">{formatCurrency(selectedDeal.total_revenue)}</p>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold">Deal Date</span>
                <p className="font-bold text-foreground mt-0.5">{new Date(selectedDeal.updated_at).toLocaleDateString()}</p>
              </div>
            </div>
          )}
          {selectedDeal && (
            <div className="mt-3 flex items-start gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-3 text-xs">
              <span className="text-blue-500 font-bold shrink-0 mt-0.5">ℹ</span>
              <p className="text-blue-800">
                <strong>Manual Entry Required:</strong> Order line items and pricing are not auto-filled from the deal. Please enter the actual supplier pricing and quantities below.
                To update order details after creation, use the <strong>Edit Details</strong> button on the order.
              </p>
            </div>
          )}
        </div>


        {selectedDeal && (
          <>
            {/* Supplier / Distributor details */}
            <div className="bg-card border border-border rounded-lg shadow-sm p-5 md:p-6 space-y-4">
              <h3 className="text-sm font-bold text-foreground border-b border-border/50 pb-2 uppercase tracking-wider">
                2. Supplier &amp; Distributor Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <Label htmlFor="supplierName" className="text-xs font-semibold text-muted-foreground">Supplier Name *</Label>
                  <Input
                    id="supplierName"
                    value={supplierName}
                    onChange={(e) => setSupplierName(e.target.value)}
                    className="mt-1.5 h-10 text-xs bg-slate-50/50 border-border"
                    placeholder="e.g. Cisco Systems, India Electronics"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contact" className="text-xs font-semibold text-muted-foreground">Contact Person</Label>
                  <Input
                    id="contact"
                    value={contactPerson}
                    onChange={(e) => setContactPerson(e.target.value)}
                    className="mt-1.5 h-10 text-xs bg-slate-50/50 border-border"
                    placeholder="Name"
                  />
                </div>
                <div>
                  <Label htmlFor="email" className="text-xs font-semibold text-muted-foreground">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1.5 h-10 text-xs bg-slate-50/50 border-border"
                    placeholder="contact@supplier.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone" className="text-xs font-semibold text-muted-foreground">Phone</Label>
                  <Input
                    id="phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="mt-1.5 h-10 text-xs bg-slate-50/50 border-border"
                    placeholder="Contact number"
                  />
                </div>
                <div>
                  <Label htmlFor="oem" className="text-xs font-semibold text-muted-foreground">OEM</Label>
                  <Input
                    id="oem"
                    value={oem}
                    onChange={(e) => setOem(e.target.value)}
                    className="mt-1.5 h-10 text-xs bg-slate-50/50 border-border"
                    placeholder="e.g. Cisco, Aicera"
                  />
                </div>
                <div className="lg:col-span-2">
                  <Label htmlFor="quotedValue" className="text-xs font-semibold text-muted-foreground">Quoted Value (INR)</Label>
                  <Input
                    id="quotedValue"
                    type="number"
                    value={quotedValue}
                    onChange={(e) => setQuotedValue(e.target.value)}
                    onFocus={(e) => e.target.select()}
                    className="mt-1.5 h-10 text-xs bg-slate-50/50 border-border"
                    placeholder="Amount"
                  />
                </div>

                <div className="lg:col-span-2">
                  <Label htmlFor="paymentTerms" className="text-xs font-semibold text-muted-foreground">Payment Terms</Label>
                  <Input
                    id="paymentTerms"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    className="mt-1.5 h-10 text-xs bg-slate-50/50 border-border"
                    placeholder="e.g. Net 30, 50% Advance"
                  />
                </div>
                <div className="lg:col-span-2">
                  <Label htmlFor="expectedDeliveryDate" className="text-xs font-semibold text-muted-foreground">Expected Delivery Date</Label>
                  <div className="relative mt-1.5">
                    <Input
                      id="expectedDeliveryDate"
                      type="date"
                      value={expectedDeliveryDate}
                      onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                      className="pl-9 h-10 text-xs bg-slate-50/50 border-border"
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                  </div>
                </div>
                <div className="lg:col-span-2">
                  <Label htmlFor="opsOwner" className="text-xs font-semibold text-muted-foreground">Ops Executive *</Label>
                  <select
                    id="opsOwner"
                    value={opsOwner}
                    onChange={(e) => setOpsOwner(e.target.value)}
                    className="mt-1.5 h-10 w-full rounded-md border border-border bg-slate-50/50 px-3 py-2 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-foreground"
                  >
                    <option value="Chetan">Chetan</option>
                    <option value="Bhoomika">Bhoomika</option>
                    <option value="Deekshit">Deekshit</option>
                  </select>
                </div>
              </div>

              {/* Order worksheet section integrated directly inside Supplier details */}
              <div className="border-t border-border/50 pt-5 mt-5 space-y-4 text-left">
                <div className="flex items-center justify-between border-b pb-2">
                  <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">
                    PO Items List
                  </h4>
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
                <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                  {poItems.map((item, index) => (
                    <div key={index} className="flex gap-3 items-start bg-slate-50/50 p-3 border border-border rounded-lg">
                      <div className="flex-1 min-w-0">
                        <Input
                          placeholder="Product Description (e.g. Dell Servers)"
                          value={item.product_name}
                          onChange={(e) => handleItemChange(index, 'product_name', e.target.value)}
                          className="h-9 border-border text-xs focus:ring-1 focus:ring-primary bg-white"
                        />
                      </div>
                      <div className="w-20">
                        <Input
                          type="number"
                          placeholder="Qty"
                          value={item.quantity || ''}
                          onChange={(e) => handleItemChange(index, 'quantity', e.target.value)}
                          onFocus={(e) => e.target.select()}
                          className="h-9 border-border text-xs focus:ring-1 focus:ring-primary bg-white"
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
                          className="h-9 border-border text-xs focus:ring-1 focus:ring-primary bg-white"
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

                {/* Calculations Grid */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t pt-4">
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-500 mb-1 block">Discount (%)</Label>
                    <Input
                      type="number"
                      value={poDiscountPct || ''}
                      onChange={(e) => setPoDiscountPct(Number(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      className="h-9 border-border text-xs bg-slate-50/50"
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
                      className="h-9 border-border text-xs bg-slate-50/50"
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
                      className="h-9 border-border text-xs bg-slate-50/50"
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
                      className="h-9 border-border text-xs bg-slate-50/50"
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
                      className="h-9 border-border text-xs bg-slate-50/50"
                      min="0"
                    />
                  </div>
                </div>

                {/* Calculations Box */}
                <div className="bg-card border border-border p-4 rounded-lg space-y-2 text-xs text-slate-700">
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
                    <Label htmlFor="notes" className="text-xs font-bold text-slate-700 block mb-1.5">
                      Notes
                    </Label>
                    <Textarea
                      id="notes"
                      placeholder="Additional notes..."
                      value={poNotes}
                      onChange={(e) => setPoNotes(e.target.value)}
                      className="h-20 border-border text-xs bg-slate-50/50 focus:ring-1 focus:ring-primary focus:bg-white focus:outline-none"
                    />
                  </div>
                  <div>
                    <Label htmlFor="terms" className="text-xs font-bold text-slate-700 block mb-1.5">
                      Terms &amp; Conditions
                    </Label>
                    <Textarea
                      id="terms"
                      placeholder="Terms and conditions..."
                      value={poTerms}
                      onChange={(e) => setPoTerms(e.target.value)}
                      className="h-20 border-border text-xs bg-slate-50/50 focus:ring-1 focus:ring-primary focus:bg-white focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Next button */}
            <div className="flex justify-end pr-2 mt-6">
              <Button
                type="submit"
                disabled={submitting}
                className="h-11 font-semibold text-xs px-6 bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-md shadow-sky-600/10 transition-all duration-200"
              >
                {submitting ? 'Initializing...' : 'Next: Initialize Checklist'}
              </Button>
            </div>
          </>
        )}
      </form>
    </div>
  )
}