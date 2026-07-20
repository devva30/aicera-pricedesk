import React, { useEffect, useState } from 'react'
import {
  Truck,
  Plus,
  Search,
  Trash2,
  Printer,
  RefreshCw,
  Edit3,
  ScrollText,
  ArrowLeft,
  ChevronRight,
  CheckCircle,
  Package,
  Undo2,
  FileDown,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/stores/auth-store'
import { fetchOrders, saveOrder, deleteDeliveryChallan } from '@/services/orders-service'
import type { Order } from '@/types'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { fetchSettings } from '@/services/targets-service'
import { formatCurrency } from '@/lib/utils'
import { pdf } from '@react-pdf/renderer'
import { DeliveryChallanPDFDocument } from '@/components/deals/DeliveryChallanPDFDocument'

type View = 'dashboard' | 'create' | 'edit'

interface ChallanItem {
  product_name: string
  quantity: number
  delivered_quantity: number
  unit_price: number
  hsn_code: string
}

export function DeliveryChallansPage() {
  const settings = fetchSettings()
  const user = useAuthStore((s) => s.user)
  const [orders, setOrders] = useState<Order[]>([])

  const challanThemeColor = settings.challan_theme_color || '#115e59'
  const challanAccentColor = settings.challan_accent_color || 'rgba(240,253,250,0.1)'

  const resolveChallanTags = (text?: string) => {
    if (!text || !previewOrder) return ''
    const dateStr = previewOrder.delivery_challan?.delivery_date ? new Date(previewOrder.delivery_challan.delivery_date).toLocaleDateString() : new Date().toLocaleDateString()
    const compName = settings.company_name || 'Aicera Systems'
    const totalVal = previewOrder.delivery_challan?.items?.reduce((s, i) => s + (i.delivered_quantity * i.unit_price), 0) || 0
    return text
      .replace(/#QuoteNo#/g, previewOrder.quote_number || 'N/A')
      .replace(/#Customer#/g, previewOrder.customer_name || 'N/A')
      .replace(/#Date#/g, dateStr)
      .replace(/#Company#/g, compName)
      .replace(/#Total#/g, formatCurrency(totalVal))
  }
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [view, setView] = useState<View>('dashboard')

  // ─── Customer & Reference States ─────────────────────────────────────────
  const [customerName, setCustomerName] = useState('')
  const [challanNumber, setChallanNumber] = useState('')
  const [challanType, setChallanType] = useState<'non-returnable' | 'returnable'>('non-returnable')
  const [orderNumber, setOrderNumber] = useState('')
  const [quoteNumber, setQuoteNumber] = useState('')

  // ─── Create/Edit Form States ─────────────────────────────────────────────
  const [selectedOrderId, setSelectedOrderId] = useState('')
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null)
  const [saving, setSaving] = useState(false)

  const [challanDeliveryDate, setChallanDeliveryDate] = useState('')
  const [challanExpectedDate, setChallanExpectedDate] = useState('')
  const [challanAddress, setChallanAddress] = useState('')
  const [challanVehicle, setChallanVehicle] = useState('')
  const [challanDriverName, setChallanDriverName] = useState('')
  const [challanDriverContact, setChallanDriverContact] = useState('')
  const [challanItems, setChallanItems] = useState<ChallanItem[]>([])
  const [challanNotes, setChallanNotes] = useState('')

  // ─── Preview Dialog States ────────────────────────────────────────────────
  const [previewOrder, setPreviewOrder] = useState<Order | null>(null)
  const [viewingDeliveryChallan, setViewingDeliveryChallan] = useState(false)

  const isReadOnly = user?.role !== 'sales_rep' && user?.role !== 'finance' && user?.role !== 'admin'

  // ─── Data Loading ─────────────────────────────────────────────────────────
  const loadOrders = async () => {
    if (!user?.role || !user?.id) return
    setLoading(true)
    try {
      const data = await fetchOrders(user.role, user.id)
      setOrders(data)
    } catch (e) {
      console.error(e)
      toast.error('Failed to load orders.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadOrders()
  }, [user])

  // Get all orders containing a delivery challan
  const challanOrders = orders.filter(o => o.delivery_challan)

  // Filter challans by search query
  const filteredChallans = challanOrders.filter((order) => {
    if (!searchQuery) return true
    const q = searchQuery.toLowerCase()
    const challan = order.delivery_challan!
    return (
      (challan.challan_number || '').toLowerCase().includes(q) ||
      (order.order_number || '').toLowerCase().includes(q) ||
      (order.customer_name || '').toLowerCase().includes(q) ||
      (challan.vehicle_number || '').toLowerCase().includes(q) ||
      (challan.driver_name || '').toLowerCase().includes(q)
    )
  })

  // ─── Form Handlers ────────────────────────────────────────────────────────
  const handleNewChallanClick = () => {
    setSelectedOrderId('')
    setSelectedOrder(null)
    setCustomerName('')
    // Generate a professional serial number: DC-2026-00XXXX
    const serial = String(Math.floor(Math.random() * 900000) + 100000)
    setChallanNumber(`DC-2026-${serial}`)
    setChallanType('non-returnable')
    setOrderNumber('')
    setQuoteNumber('')
    setChallanDeliveryDate(new Date().toISOString().split('T')[0])
    setChallanExpectedDate('')
    setChallanAddress('')
    setChallanVehicle('')
    setChallanDriverName('')
    setChallanDriverContact('')
    setChallanItems([{ product_name: '', quantity: 1, delivered_quantity: 1, unit_price: 0, hsn_code: '' }])
    setChallanNotes('')
    setView('create')
  }

  const handleOrderSelect = (orderId: string) => {
    setSelectedOrderId(orderId)
    const order = orders.find(o => o.id === orderId) || null
    setSelectedOrder(order)
    if (order) {
      setCustomerName(order.customer_name)
      setOrderNumber(order.order_number)
      setQuoteNumber(order.quote_number || '')
      setChallanDeliveryDate(new Date().toISOString().split('T')[0])
      setChallanExpectedDate(order.expected_delivery_date || '')
      setChallanAddress(order.delivery_challan?.delivery_address || '')
      setChallanVehicle(order.delivery_challan?.vehicle_number || '')
      setChallanDriverName(order.delivery_challan?.driver_name || '')
      setChallanDriverContact(order.delivery_challan?.driver_contact || '')
      setChallanType(order.delivery_challan?.challan_type || 'non-returnable')
      setChallanItems(order.items?.map(item => ({
        product_name: item.product_name,
        quantity: item.quantity,
        delivered_quantity: item.quantity,
        unit_price: item.quoted_price || 0,
        hsn_code: '',
      })) || [{ product_name: '', quantity: 1, delivered_quantity: 1, unit_price: 0, hsn_code: '' }])
    }
  }

  const handleEditClick = (order: Order) => {
    setSelectedOrderId(order.id)
    setSelectedOrder(order)
    setCustomerName(order.customer_name)
    setOrderNumber(order.order_number)
    setQuoteNumber(order.quote_number || '')
    
    const dc = order.delivery_challan!
    setChallanNumber(dc.challan_number)
    setChallanType(dc.challan_type || 'non-returnable')
    setChallanDeliveryDate(dc.delivery_date || '')
    setChallanExpectedDate(dc.expected_delivery_date || '')
    setChallanAddress(dc.delivery_address || '')
    setChallanVehicle(dc.vehicle_number || '')
    setChallanDriverName(dc.driver_name || '')
    setChallanDriverContact(dc.driver_contact || '')
    setChallanItems(dc.items.map(item => ({
      product_name: item.product_name,
      quantity: item.quantity,
      delivered_quantity: item.delivered_quantity,
      unit_price: item.unit_price,
      hsn_code: item.hsn_code || '',
    })))
    setChallanNotes(dc.additional_notes || '')
    setView('edit')
  }

  const handleItemChange = (index: number, field: string, value: any) => {
    const updated = [...challanItems]
    updated[index] = {
      ...updated[index],
      [field]: field === 'product_name' || field === 'hsn_code' ? value : Number(value) || 0,
    }
    setChallanItems(updated)
  }

  const handleAddItem = () => {
    setChallanItems([...challanItems, { product_name: '', quantity: 1, delivered_quantity: 1, unit_price: 0, hsn_code: '' }])
  }

  const handleRemoveItem = (index: number) => {
    if (challanItems.length === 1) { toast.error('At least one item is required.'); return }
    setChallanItems(challanItems.filter((_, i) => i !== index))
  }

  const handleSaveChallan = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customerName.trim()) { toast.error('Customer name is required.'); return }
    if (!challanNumber.trim()) { toast.error('Challan number is required.'); return }
    if (!challanDeliveryDate) { toast.error('Delivery date is required.'); return }
    if (challanItems.some(item => !item.product_name.trim())) {
      toast.error('Product description is required for all items.')
      return
    }

    setSaving(true)
    const toastId = toast.loading(view === 'edit' ? 'Updating Delivery Challan...' : 'Saving Delivery Challan...')
    try {
      const newChallan = {
        challan_number: challanNumber,
        challan_type: challanType,
        created_at: selectedOrder?.delivery_challan?.created_at || new Date().toISOString(),
        delivery_date: challanDeliveryDate,
        expected_delivery_date: challanExpectedDate,
        delivery_address: challanAddress,
        vehicle_number: challanVehicle,
        driver_name: challanDriverName,
        driver_contact: challanDriverContact,
        items: challanItems.map(item => ({
          product_name: item.product_name,
          quantity: item.quantity,
          delivered_quantity: item.delivered_quantity,
          unit_price: item.unit_price,
          subtotal: item.delivered_quantity * item.unit_price,
          hsn_code: item.hsn_code,
        })),
        additional_notes: challanNotes,
      }

      if (selectedOrder) {
        // Link to existing loaded order
        await saveOrder({
          ...selectedOrder,
          customer_name: customerName,
          order_number: orderNumber || selectedOrder.order_number,
          quote_number: quoteNumber || selectedOrder.quote_number,
          delivery_challan: newChallan,
          items: selectedOrder.items
        }, user.id)
      } else {
        // Create new standalone order containing this challan
        const standaloneOrderPayload = {
          is_standalone: true,
          order_number: orderNumber || `ORD-2026-${String(Math.floor(Math.random() * 900000) + 100000)}`,
          deal_id: 'standalone',
          deal_number: 'standalone',
          title: `Delivery Challan Order - ${customerName}`,
          customer_name: customerName,
          quote_number: quoteNumber || null,
          oem: 'N/A',
          supplier_name: 'N/A',
          contact_person: 'N/A',
          email: '',
          phone: '',
          vendor_address: '',
          quoted_value: challanItems.reduce((s, i) => s + i.delivered_quantity * i.unit_price, 0),
          payment_terms: 'COD',
          expected_delivery_date: challanExpectedDate || challanDeliveryDate,
          sales_rep_id: user.id,
          sales_rep_name: user.full_name,
          items: challanItems.map(item => ({
            sku: 'STANDALONE',
            product_name: item.product_name,
            quantity: item.quantity,
            unit_of_measure: 'EA',
            transfer_price: item.unit_price,
            quoted_price: item.unit_price
          })),
          delivery_challan: newChallan,
        }
        await saveOrder(standaloneOrderPayload, user.id)
      }

      // Reload lists
      await loadOrders()
      
      toast.success(`Delivery Challan ${challanNumber} ${view === 'edit' ? 'updated' : 'created'} successfully!`, { id: toastId })
      setView('dashboard')
      setSelectedOrderId('')
      setSelectedOrder(null)
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to save Delivery Challan.', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  const handleDeleteChallan = async (orderToUpdate: Order) => {
    if (!window.confirm(`Delete Delivery Challan ${orderToUpdate.delivery_challan?.challan_number}? This cannot be undone.`)) return
    const toastId = toast.loading('Deleting...')
    try {
      await deleteDeliveryChallan(orderToUpdate.id)
      await loadOrders()
      toast.success('Delivery Challan deleted.', { id: toastId })
    } catch (e) {
      console.error(e)
      toast.error('Failed to delete Delivery Challan.', { id: toastId })
    }
  }

  const handlePrintChallan = () => {
    const el = document.getElementById('dashboard-printable-challan')
    if (!el) return
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return

    let devStylesCss = ''
    try {
      if (settings.challan_developer_styles) {
        const parsed = JSON.parse(settings.challan_developer_styles)
        if (parsed.fontSize) devStylesCss += `body { font-size: ${parsed.fontSize}px !important; }\n`
        if (parsed.lineHeight) devStylesCss += `body { line-height: ${parsed.lineHeight} !important; }\n`
        if (parsed.tableCellPadding) devStylesCss += `th, td { padding: ${parsed.tableCellPadding}px !important; }\n`
      }
    } catch {}

    const headerHtml = settings.challan_custom_header_note
      ? `<div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; font-size:10px; margin-bottom:15px; border-radius:4px; text-align:left;">${resolveChallanTags(settings.challan_custom_header_note)}</div>`
      : ''

    const footerHtml = settings.challan_custom_footer_note
      ? `<div style="border-top:1px solid #e2e8f0; padding-top:10px; margin-top:20px; font-size:9px; color:#64748b; font-family:monospace; display:flex; justify-content:space-between; text-align:left;">
           <span>${resolveChallanTags(settings.challan_custom_footer_note)}</span>
           <span>Page 1 of 1</span>
         </div>`
      : ''

    printWindow.document.write(`<!DOCTYPE html><html><head><title>Delivery Challan</title><style>
      * { box-sizing: border-box; margin: 0; padding: 0; }
      body { font-family: Inter, system-ui, -apple-system, sans-serif; font-size: 11px; background: white; color: #1e293b; padding: 24px; line-height: 1.5; }
      
      /* Layout Utilities */
      .flex { display: flex; }
      .justify-between { justify-content: space-between; }
      .items-start { align-items: flex-start; }
      .shrink-0 { flex-shrink: 0; }
      .grid { display: grid; }
      .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
      .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
      .gap-4 { gap: 16px; }
      .gap-6 { gap: 24px; }
      .h-8 { height: 32px; }
      .w-8 { width: 32px; }
      
      /* Spacing Utilities */
      .p-8 { padding: 32px; }
      .p-4 { padding: 16px; }
      .p-3 { padding: 12px; }
      .pb-6 { padding-bottom: 24px; }
      .pt-4 { padding-top: 16px; }
      .pt-8 { padding-top: 32px; }
      .px-4 { padding-left: 16px; padding-right: 16px; }
      .py-2 { padding-top: 8px; padding-bottom: 8px; }
      .mb-2 { margin-bottom: 8px; }
      .mb-1 { margin-bottom: 4px; }
      .mt-0\\.5 { margin-top: 2px; }
      .mt-1 { margin-top: 4px; }
      .mt-4 { margin-top: 16px; }
      .mt-8 { margin-top: 32px; }
      
      /* Text Utilities */
      .text-left { text-align: left; }
      .text-right { text-align: right; }
      .text-center { text-align: center; }
      .text-xl { font-size: 18px; }
      .text-sm { font-size: 13px; }
      .text-xs { font-size: 11px; }
      .text-\\[10px\\] { font-size: 10px; }
      .text-\\[9px\\] { font-size: 9px; }
      .font-bold { font-weight: 700; }
      .font-semibold { font-weight: 600; }
      .font-mono { font-family: monospace; }
      .uppercase { text-transform: uppercase; }
      .tracking-wide { letter-spacing: 0.5px; }
      .tracking-wider { letter-spacing: 1px; }
      .leading-relaxed { line-height: 1.625; }
      .whitespace-pre-wrap { white-space: pre-wrap; }
      
      /* Colors */
      .text-teal-900 { color: ${challanThemeColor}; }
      .text-teal-700 { color: ${challanThemeColor}; }
      .text-slate-500 { color: #64748b; }
      .text-slate-400 { color: #94a3b8; }
      .text-slate-600 { color: #475569; }
      .text-slate-700 { color: #334155; }
      .text-slate-800 { color: #1e293b; }
      .text-foreground { color: #0f172a; }
      .bg-white { background-color: #ffffff; }
      .bg-slate-50\\/70 { background-color: rgba(248, 250, 252, 0.7); }
      .bg-teal-50\\/30 { background-color: ${challanAccentColor}; }
      .bg-teal-50\\/50 { background-color: ${challanAccentColor}; }
      
      /* Borders */
      .border-b { border-bottom: 1px solid #e2e8f0; }
      .border-b-2 { border-bottom: 2px solid #e2e8f0; }
      .border-t { border-top: 1px solid #e2e8f0; }
      .border-t-2 { border-top: 2px solid #e2e8f0; }
      .border-slate-300 { border-bottom: 1px solid #cbd5e1; }
      .border-teal-100 { border: 1px solid ${challanAccentColor}; }
      .border-teal-900 { border-color: ${challanThemeColor}; }
      .rounded { border-radius: 4px; }
      .rounded-lg { border-radius: 8px; }
      
      /* Tables */
      table { width: 100%; border-collapse: collapse; margin-top: 8px; }
      th, td { padding: 8px 12px; }
      thead tr { border-bottom: 2px solid ${challanThemeColor}; background: ${challanAccentColor}; color: ${challanThemeColor}; }
      .divide-y > tr { border-bottom: 1px solid #f1f5f9; }
      
      /* Page Break and Print Styles */
      @media print {
        body { padding: 0; }
        .no-print { display: none; }
        tr, td, th, div, table { page-break-inside: avoid; }
      }
      ${devStylesCss}
    </style></head><body>${headerHtml}${el.innerHTML}${footerHtml}</body></html>`)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 400)
  }

  const handleDownloadChallan = async (orderData: Order | null) => {
    if (!orderData || !orderData.delivery_challan) return
    const toastId = toast.loading('Generating Delivery Challan PDF...')
    try {
      const currentSettings = fetchSettings()
      const blob = await pdf(
        <DeliveryChallanPDFDocument 
          order={orderData} 
          challan={orderData.delivery_challan} 
          settings={currentSettings} 
        />
      ).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `DeliveryChallan_${orderData.delivery_challan.challan_number}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Delivery Challan PDF downloaded!', { id: toastId })
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to generate PDF: ${err.message || err}`, { id: toastId })
    }
  }



  // ─── RENDER: Create/Edit View ────────────────────────────────────────────
  if (view === 'create' || view === 'edit') {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => { setView('dashboard'); setSelectedOrderId(''); setSelectedOrder(null) }}
              className="h-8 w-8 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="hover:text-foreground cursor-pointer" onClick={() => setView('dashboard')}>Delivery Challans</span>
              <ChevronRight className="h-3 w-3" />
              <span className="text-foreground font-semibold">
                {view === 'edit' ? 'Edit Challan' : 'New Delivery Challan'}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-3 text-left">
            <div className="h-9 w-9 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
              <ScrollText className="h-4 w-4" />
            </div>
            <div>
              <h1 className="text-base font-bold font-display text-foreground">
                {view === 'edit' ? 'Edit Delivery Challan' : 'Create Delivery Challan'}
              </h1>
              <p className="text-[10px] text-muted-foreground">
                {view === 'edit' ? 'Modify the dispatch and transport details' : 'Prepare delivery details for customer dispatch'}
              </p>
            </div>
          </div>
        </div>

        {/* Quick Fill Dropdown (Only show in Create mode) */}
        {view === 'create' && orders.length > 0 && (
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
            <div className="space-y-1">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Quick Fill from Active Order</h3>
              <p className="text-[10px] text-muted-foreground">Select an order to pre-populate customer, references, items, and address</p>
            </div>
            <div className="w-80">
              <select
                value={selectedOrderId}
                onChange={(e) => handleOrderSelect(e.target.value)}
                className="w-full h-10 px-3 border border-slate-300 rounded-lg text-xs bg-white focus:ring-1 focus:ring-teal-500 appearance-none font-medium cursor-pointer"
              >
                <option value="">-- Load details from order (Optional) --</option>
                {orders.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.order_number} - {o.customer_name} ({o.title})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}

        {/* Challan Form */}
        <form onSubmit={handleSaveChallan} className="space-y-5 text-left">
          {/* Delivery Challan Type */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider border-b pb-1.5">Delivery Challan Type</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div
                onClick={() => setChallanType('non-returnable')}
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                  challanType === 'non-returnable'
                    ? 'border-teal-600 bg-teal-50/20'
                    : 'border-border bg-white hover:bg-slate-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="challanType"
                  checked={challanType === 'non-returnable'}
                  onChange={() => setChallanType('non-returnable')}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <div className={`h-8 w-8 rounded flex items-center justify-center shrink-0 ${
                  challanType === 'non-returnable' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-450'
                }`}>
                  <Package className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground">Non-Returnable</p>
                  <p className="text-[10px] text-muted-foreground">One-way delivery</p>
                </div>
              </div>

              <div
                onClick={() => setChallanType('returnable')}
                className={`flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all ${
                  challanType === 'returnable'
                    ? 'border-teal-600 bg-teal-50/20'
                    : 'border-border bg-white hover:bg-slate-50/50'
                }`}
              >
                <input
                  type="radio"
                  name="challanType"
                  checked={challanType === 'returnable'}
                  onChange={() => setChallanType('returnable')}
                  className="h-4 w-4 text-teal-600 focus:ring-teal-500 cursor-pointer"
                />
                <div className={`h-8 w-8 rounded flex items-center justify-center shrink-0 ${
                  challanType === 'returnable' ? 'bg-teal-100 text-teal-700' : 'bg-slate-100 text-slate-450'
                }`}>
                  <Undo2 className="h-4 w-4" />
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-foreground">Returnable</p>
                  <p className="text-[10px] text-muted-foreground">Requires return tracking</p>
                </div>
              </div>
            </div>
          </div>

          {/* Customer & Reference Details */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider border-b pb-1.5">General Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <Label htmlFor="dc-number" className="text-[10px] font-bold text-slate-500 mb-1.5 block">Challan Number *</Label>
                <Input
                  id="dc-number"
                  placeholder="e.g., DC-2026-000001"
                  value={challanNumber}
                  onChange={(e) => setChallanNumber(e.target.value)}
                  className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-teal-500 font-semibold text-teal-850"
                  required
                />
              </div>
              <div>
                <Label htmlFor="dc-customer-name" className="text-[10px] font-bold text-slate-500 mb-1.5 block">Customer Name *</Label>
                <Input
                  id="dc-customer-name"
                  placeholder="e.g., Titan Manufacturing Ltd."
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-teal-500 font-semibold"
                  required
                />
              </div>
              <div>
                <Label htmlFor="dc-order-ref" className="text-[10px] font-bold text-slate-500 mb-1.5 block">Order Number / Reference</Label>
                <Input
                  id="dc-order-ref"
                  placeholder="e.g., ORD-2026-000219"
                  value={orderNumber}
                  onChange={(e) => setOrderNumber(e.target.value)}
                  className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <Label htmlFor="dc-quote-ref" className="text-[10px] font-bold text-slate-500 mb-1.5 block">Quote Number / Reference</Label>
                <Input
                  id="dc-quote-ref"
                  placeholder="e.g., QT-2026-001029"
                  value={quoteNumber}
                  onChange={(e) => setQuoteNumber(e.target.value)}
                  className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Delivery Details */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider border-b pb-1.5">Delivery Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="dc-date" className="text-[10px] font-bold text-slate-500 mb-1.5 block">Delivery Date *</Label>
                <Input
                  id="dc-date"
                  type="date"
                  value={challanDeliveryDate}
                  onChange={(e) => setChallanDeliveryDate(e.target.value)}
                  className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-teal-500"
                  required
                />
              </div>
              <div>
                <Label htmlFor="dc-exp-date" className="text-[10px] font-bold text-slate-500 mb-1.5 block">Expected Delivery Date</Label>
                <Input
                  id="dc-exp-date"
                  type="date"
                  value={challanExpectedDate}
                  onChange={(e) => setChallanExpectedDate(e.target.value)}
                  className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="dc-address" className="text-[10px] font-bold text-slate-500 mb-1.5 block">Delivery Address (Customer)</Label>
              <Textarea
                id="dc-address"
                placeholder="Enter complete delivery address for the customer"
                value={challanAddress}
                onChange={(e) => setChallanAddress(e.target.value)}
                className="min-h-20 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-teal-500"
              />
            </div>
          </div>

          {/* Transport Details */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider border-b pb-1.5">Transport Details</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="dc-vehicle" className="text-[10px] font-bold text-slate-500 mb-1.5 block">Vehicle Number</Label>
                <Input
                  id="dc-vehicle"
                  placeholder="e.g., KA-01-AB-1234"
                  value={challanVehicle}
                  onChange={(e) => setChallanVehicle(e.target.value)}
                  className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <Label htmlFor="dc-driver" className="text-[10px] font-bold text-slate-500 mb-1.5 block">Driver Name</Label>
                <Input
                  id="dc-driver"
                  placeholder="Driver's full name"
                  value={challanDriverName}
                  onChange={(e) => setChallanDriverName(e.target.value)}
                  className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>
              <div>
                <Label htmlFor="dc-contact" className="text-[10px] font-bold text-slate-500 mb-1.5 block">Driver Contact</Label>
                <Input
                  id="dc-contact"
                  placeholder="Mobile number"
                  value={challanDriverContact}
                  onChange={(e) => setChallanDriverContact(e.target.value)}
                  className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-teal-500"
                />
              </div>
            </div>
          </div>

          {/* Dispatch Items */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider">Dispatch Items</h3>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddItem}
                className="h-8 text-[10px] font-semibold gap-1 border-teal-200 text-teal-700 bg-white hover:bg-teal-50 cursor-pointer"
              >
                <Plus className="h-3 w-3" /> Add Item
              </Button>
            </div>

            <div className="space-y-4">
              {challanItems.map((item, idx) => (
                <div key={idx} className="bg-slate-50/40 p-4 border border-slate-200 rounded-lg space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-teal-800 bg-teal-50 border border-teal-100 px-2 py-0.5 rounded">Item {idx + 1}</span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveItem(idx)}
                      className="h-7 text-xs text-red-600 hover:text-red-500 hover:bg-red-50 cursor-pointer p-1"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500 mb-1 block">Product Description *</Label>
                    <Input
                      placeholder="Item description"
                      value={item.product_name}
                      onChange={(e) => handleItemChange(idx, 'product_name', e.target.value)}
                      className="h-9 border-slate-200 text-xs bg-white focus:ring-1 focus:ring-teal-500"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500 mb-1 block">Ordered Quantity</Label>
                      <Input
                        type="number" min="0"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, 'quantity', e.target.value)}
                        className="h-9 border-slate-200 text-xs bg-white focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500 mb-1 block">Delivered Quantity</Label>
                      <Input
                        type="number" min="0"
                        value={item.delivered_quantity}
                        onChange={(e) => handleItemChange(idx, 'delivered_quantity', e.target.value)}
                        className="h-9 border-slate-200 text-xs bg-white focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500 mb-1 block">Unit Price</Label>
                      <Input
                        type="number" min="0"
                        value={item.unit_price}
                        onChange={(e) => handleItemChange(idx, 'unit_price', e.target.value)}
                        className="h-9 border-slate-200 text-xs bg-white focus:ring-1 focus:ring-teal-500"
                      />
                    </div>
                    <div>
                      <Label className="text-[10px] font-bold text-slate-500 mb-1 block">Subtotal</Label>
                      <div className="h-9 px-3 border border-slate-200 rounded text-xs bg-slate-50 flex items-center font-bold text-slate-700">
                        {formatCurrency(item.delivered_quantity * item.unit_price)}
                      </div>
                    </div>
                  </div>
                  <div>
                    <Label className="text-[10px] font-bold text-slate-500 mb-1 block">HSN/SAC Code</Label>
                    <Input
                      placeholder="Optional"
                      value={item.hsn_code}
                      onChange={(e) => handleItemChange(idx, 'hsn_code', e.target.value)}
                      className="h-9 border-slate-200 text-xs bg-white focus:ring-1 focus:ring-teal-500"
                    />
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="flex justify-end pt-3 border-t border-border/40">
              <div className="text-xs space-y-1 text-right">
                <div className="flex gap-12 justify-between font-bold text-sm text-teal-900 bg-teal-50/50 px-4 py-2 rounded border border-teal-100">
                  <span>Total Challan Value:</span>
                  <span>{formatCurrency(challanItems.reduce((s, i) => s + i.delivered_quantity * i.unit_price, 0))}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Additional Notes */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
            <h3 className="text-xs font-bold text-teal-900 uppercase tracking-wider border-b pb-1.5">Additional Notes</h3>
            <Textarea
              placeholder="Any special delivery instructions, remarks, or notes..."
              value={challanNotes}
              onChange={(e) => setChallanNotes(e.target.value)}
              className="min-h-[80px] border-slate-300 text-xs bg-white focus:ring-1 focus:ring-teal-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-3 pb-4">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => { setView('dashboard'); setSelectedOrderId(''); setSelectedOrder(null) }}
              className="h-10 text-xs font-semibold px-5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving}
              className="h-10 text-xs font-semibold px-6"
            >
              {saving ? 'Saving...' : view === 'edit' ? 'Save Changes' : 'Create Delivery Challan'}
            </Button>
          </div>
        </form>
      </div>
    )
  }

  // ─── RENDER: Dashboard View ───────────────────────────────────────────────
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-card border border-border rounded-lg shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3 text-left">
          <div className="h-10 w-10 rounded bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
            <ScrollText className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">Customer Delivery Logistics</span>
            <h1 className="text-xl font-bold font-display text-foreground mt-0.5">Delivery Challans</h1>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Button variant="outline" size="icon" onClick={loadOrders} title="Refresh" className="h-9 w-9 cursor-pointer">
            <RefreshCw className="h-4 w-4" />
          </Button>
          {!isReadOnly && (
            <Button
              onClick={handleNewChallanClick}
              size="sm"
              className="h-9 text-xs font-semibold px-4"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              New Delivery Challan
            </Button>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
        <div className="bg-card border border-border rounded-lg shadow-sm p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-teal-100 flex items-center justify-center text-teal-700 shrink-0">
            <ScrollText className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Total Challans</p>
            <p className="text-xl font-bold text-foreground mt-0.5">{challanOrders.length}</p>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg shadow-sm p-4 flex items-center gap-4">
          <div className="h-10 w-10 rounded-lg bg-emerald-100 flex items-center justify-center text-emerald-700 shrink-0">
            <CheckCircle className="h-5 w-5" />
          </div>
          <div>
            <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">Total Dispatched Value</p>
            <p className="text-base font-bold text-emerald-700 mt-0.5">
              {formatCurrency(challanOrders.reduce((sum, o) => sum + (o.delivery_challan?.items.reduce((s, i) => s + i.subtotal, 0) || 0), 0))}
            </p>
          </div>
        </div>
      </div>

      {/* Search */}
      {!loading && challanOrders.length > 0 && (
        <div className="bg-card border border-border p-4 rounded-lg shadow-sm">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by challan #, order #, customer, driver..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-10 border-border text-xs bg-background"
            />
          </div>
        </div>
      )}

      {/* List */}
      {loading ? (
        <div className="bg-card border border-border rounded-lg h-80 animate-pulse shadow-sm" />
      ) : challanOrders.length === 0 ? (
        <div className="bg-card border border-border rounded-lg p-16 text-center shadow-sm">
          <div className="h-16 w-16 rounded-2xl bg-teal-50 flex items-center justify-center mx-auto mb-4">
            <Truck className="h-8 w-8 text-teal-400" />
          </div>
          <h3 className="font-bold text-foreground text-base mb-1">No Delivery Challans Yet</h3>
          <p className="text-xs text-muted-foreground max-w-sm mx-auto mb-4">
            Create your first delivery challan to start tracking customer dispatches and deliveries.
          </p>
          {!isReadOnly && (
            <Button onClick={handleNewChallanClick} size="sm" className="font-semibold">
              <Plus className="h-4 w-4 mr-1.5" />
              Create First Delivery Challan
            </Button>
          )}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-lg shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-muted/40 border-b border-border/50 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  <th className="p-4">Challan #</th>
                  <th className="p-4">Order #</th>
                  <th className="p-4">Customer</th>
                  <th className="p-4">Delivery Date</th>
                  <th className="p-4">Transport</th>
                  <th className="p-4 text-right">Challan Value</th>
                  <th className="p-4 text-right pr-6">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40 text-xs text-left">
                {filteredChallans.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground italic">No challans match your search.</td>
                  </tr>
                ) : (
                  filteredChallans.map((order) => {
                    const challan = order.delivery_challan!
                    const challanTotal = challan.items.reduce((s, i) => s + i.subtotal, 0)
                    return (
                      <tr
                        key={order.id}
                        onClick={() => { setPreviewOrder(order); setViewingDeliveryChallan(true) }}
                        className="hover:bg-muted/30 cursor-pointer transition-colors"
                      >
                        <td className="p-4">
                          <div className="space-y-1">
                            <span className="font-bold text-teal-700 font-mono block">{challan.challan_number}</span>
                            <span className={`inline-flex items-center px-1.5 py-0.25 rounded-full text-[9px] font-semibold border ${
                              challan.challan_type === 'returnable'
                                ? 'bg-slate-100 text-slate-700 border-slate-200'
                                : 'bg-teal-50 text-teal-700 border-teal-200'
                            }`}>
                              {challan.challan_type === 'returnable' ? 'Returnable' : 'Non-Returnable'}
                            </span>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[10px] text-slate-500 font-semibold">{order.order_number}</td>
                        <td className="p-4 font-medium text-foreground">{order.customer_name}</td>
                        <td className="p-4 text-slate-600">{new Date(challan.delivery_date).toLocaleDateString()}</td>
                        <td className="p-4 text-slate-600">
                          {challan.vehicle_number ? (
                            <div className="space-y-0.5">
                              <p className="font-semibold text-foreground font-mono">{challan.vehicle_number}</p>
                              {challan.driver_name && <p className="text-[10px] text-muted-foreground">Driver: {challan.driver_name}</p>}
                            </div>
                          ) : (
                            <span className="italic text-muted-foreground text-[10px]">No transport info</span>
                          )}
                        </td>
                        <td className="p-4 text-right font-bold text-foreground">{formatCurrency(challanTotal)}</td>
                        <td className="p-4 text-right pr-6" onClick={(e) => e.stopPropagation()}>
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              onClick={() => handleDownloadChallan(order)}
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-teal-600 hover:bg-teal-50 cursor-pointer"
                              title="Download PDF"
                            >
                              <FileDown className="h-4 w-4" />
                            </Button>
                            <Button
                              onClick={() => { setPreviewOrder(order); setViewingDeliveryChallan(true) }}
                              variant="ghost" size="icon"
                              className="h-8 w-8 text-slate-500 hover:text-teal-600 hover:bg-teal-50 cursor-pointer"
                              title="Preview & Print"
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            {!isReadOnly && (
                              <>
                                <Button
                                  onClick={() => handleEditClick(order)}
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                                  title="Edit Challan"
                                >
                                  <Edit3 className="h-4 w-4" />
                                </Button>
                                <Button
                                  onClick={() => handleDeleteChallan(order)}
                                  variant="ghost" size="icon"
                                  className="h-8 w-8 text-slate-500 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                                  title="Delete Challan"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
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

      {/* Print/Preview Dialog */}
      {previewOrder && previewOrder.delivery_challan && (
        <Dialog open={viewingDeliveryChallan} onOpenChange={setViewingDeliveryChallan}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-white">
            <DialogHeader className="p-6 border-b flex flex-row items-center justify-between text-left">
              <DialogTitle className="text-sm font-bold uppercase tracking-wider">Customer Delivery Challan</DialogTitle>
              <div className="flex gap-2 mr-6">
                <Button
                  onClick={() => handleDownloadChallan(previewOrder)}
                  size="sm"
                  className="text-xs font-semibold gap-1.5 bg-teal-600 hover:bg-teal-500 text-white cursor-pointer"
                >
                  <FileDown className="h-4 w-4" /> Download PDF
                </Button>
                <Button onClick={handlePrintChallan} size="sm" className="text-xs font-semibold gap-1.5">
                  <Printer className="h-4 w-4" /> Print Challan
                </Button>
              </div>
            </DialogHeader>

            <div id="dashboard-printable-challan" className="p-8 bg-white text-black space-y-6 text-left">
              <style dangerouslySetInnerHTML={{
                __html: `
                #dashboard-printable-challan .text-teal-900 { color: ${challanThemeColor} !important; }
                #dashboard-printable-challan .text-teal-700 { color: ${challanThemeColor} !important; }
                #dashboard-printable-challan .bg-teal-50\\/30 { background-color: ${challanAccentColor} !important; }
                #dashboard-printable-challan .bg-teal-50\\/50 { background-color: ${challanAccentColor} !important; }
                #dashboard-printable-challan .border-teal-100 { border-color: ${challanThemeColor} !important; }
                #dashboard-printable-challan .border-teal-900 { border-color: ${challanThemeColor} !important; }
                #dashboard-printable-challan thead tr { border-bottom: 2px solid ${challanThemeColor} !important; background: ${challanAccentColor} !important; }
                #dashboard-printable-challan .border-t-2 { border-top-color: ${challanThemeColor} !important; }

                ${settings.challan_developer_styles ? (() => {
                  let devStyles = ''
                  try {
                    const parsed = JSON.parse(settings.challan_developer_styles)
                    if (parsed.fontSize) devStyles += `#dashboard-printable-challan { font-size: ${parsed.fontSize}px !important; }\n`
                    if (parsed.lineHeight) devStyles += `#dashboard-printable-challan { line-height: ${parsed.lineHeight} !important; }\n`
                    if (parsed.tableCellPadding) devStyles += `#dashboard-printable-challan th, #dashboard-printable-challan td { padding: ${parsed.tableCellPadding}px !important; }\n`
                  } catch {}
                  return devStyles
                })() : ''}
              `}} />

              {settings.challan_custom_header_note && (
                <div className="bg-slate-50 border border-slate-200 p-2 text-[10px] rounded text-slate-500 mb-4 text-left">
                  {resolveChallanTags(settings.challan_custom_header_note)}
                </div>
              )}

              {/* Letterhead */}
              <div className="flex justify-between items-start border-b pb-6">
                <div className="flex items-start gap-4">
                  <img src="https://framerusercontent.com/images/AlNvsxkJzF8SFWwwytH2xsnL8uM.png" alt="Aicera Logo" className="h-8 w-8 rounded object-contain shrink-0" />
                  <div>
                    <div className="text-xl font-bold text-teal-900">Aicera Systems Pvt Ltd</div>
                    <div className="text-[10px] text-slate-500 mt-1 leading-relaxed">
                      sales@aicera.co.in | 9945073777 | GSTIN: 29AAXCA8339E1Z1<br />
                      224, Bannerghatta Rd, Near Arekere Gate, Arekere, Bengaluru - 560 076
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <h1 className="text-xl font-bold uppercase text-teal-900 tracking-wider">Delivery Challan</h1>
                  <div className="text-xs mt-1 space-y-0.5">
                    <p><span className="text-slate-500">Challan #:</span> <strong className="font-mono">{previewOrder.delivery_challan.challan_number}</strong></p>
                    <p><span className="text-slate-500">Type:</span> <strong>{previewOrder.delivery_challan.challan_type === 'returnable' ? 'Returnable' : 'Non-Returnable'}</strong></p>
                    <p><span className="text-slate-500">Date:</span> {new Date(previewOrder.delivery_challan.delivery_date).toLocaleDateString()}</p>
                    <p><span className="text-slate-500">Order Ref:</span> <strong>{previewOrder.order_number}</strong></p>
                    <p><span className="text-slate-500">Quote Ref:</span> {previewOrder.quote_number || 'N/A'}</p>
                  </div>
                </div>
              </div>

              {/* Address Grid */}
              <div className="grid grid-cols-2 gap-6 text-xs border-b pb-6">
                <div>
                  <span className="font-bold text-teal-900 uppercase tracking-wide text-[10px] block mb-2">Deliver To (Customer)</span>
                  <p className="font-bold text-sm">{previewOrder.customer_name}</p>
                  {previewOrder.delivery_challan.delivery_address && (
                    <p className="text-slate-500 mt-1 whitespace-pre-wrap">{previewOrder.delivery_challan.delivery_address}</p>
                  )}
                </div>
                <div>
                  <span className="font-bold text-teal-900 uppercase tracking-wide text-[10px] block mb-2">Dispatched From</span>
                  <p className="font-bold text-sm">Aicera Systems Pvt Ltd</p>
                  <p className="text-slate-500 mt-1">224, Bannerghatta Rd, Near Arekere Gate,<br />Arekere, Bengaluru 560 076<br />GSTIN: 29AAFCA8891C1ZP</p>
                </div>
              </div>

              {/* Transport Info */}
              <div className="grid grid-cols-4 gap-4 text-xs bg-slate-50/70 p-4 rounded-lg border-b pb-6">
                {[
                  ['Vehicle Number', previewOrder.delivery_challan.vehicle_number],
                  ['Driver Name', previewOrder.delivery_challan.driver_name],
                  ['Driver Contact', previewOrder.delivery_challan.driver_contact],
                  ['Expected Delivery', previewOrder.delivery_challan.expected_delivery_date ? new Date(previewOrder.delivery_challan.expected_delivery_date).toLocaleDateString() : null],
                ].map(([label, val]) => (
                  <div key={label as string}>
                    <span className="text-[10px] text-slate-500 font-semibold block">{label}</span>
                    <span className="font-bold text-foreground mt-0.5 block">{val || 'N/A'}</span>
                  </div>
                ))}
              </div>

              {/* Items Table */}
              <div>
                <span className="font-bold text-teal-900 uppercase tracking-wide text-[10px] block mb-2">Itemized Dispatch Details</span>
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b-2 border-teal-900 bg-teal-50/30 text-teal-900">
                      {((settings.challan_visible_columns || []).includes('sl')) && <th className="p-3 text-center">#</th>}
                      {((settings.challan_visible_columns || []).includes('desc')) && <th className="p-3">Product Description</th>}
                      {((settings.challan_visible_columns || []).includes('hsn')) && <th className="p-3 text-center">HSN/SAC</th>}
                      {((settings.challan_visible_columns || []).includes('orderedQty')) && <th className="p-3 text-center">Ordered Qty</th>}
                      {((settings.challan_visible_columns || []).includes('deliveredQty')) && <th className="p-3 text-center">Delivered Qty</th>}
                      {((settings.challan_visible_columns || []).includes('unitPrice')) && <th className="p-3 text-right">Unit Price</th>}
                      {((settings.challan_visible_columns || []).includes('subtotal')) && <th className="p-3 text-right">Subtotal</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {previewOrder.delivery_challan.items.map((item, idx) => (
                      <tr key={idx}>
                        {((settings.challan_visible_columns || []).includes('sl')) && <td className="p-3 text-center text-slate-400 font-mono">{idx + 1}</td>}
                        {((settings.challan_visible_columns || []).includes('desc')) && <td className="p-3 font-bold text-slate-900">{item.product_name}</td>}
                        {((settings.challan_visible_columns || []).includes('hsn')) && <td className="p-3 text-center text-slate-600">{item.hsn_code || '-'}</td>}
                        {((settings.challan_visible_columns || []).includes('orderedQty')) && <td className="p-3 text-center text-slate-600">{item.quantity}</td>}
                        {((settings.challan_visible_columns || []).includes('deliveredQty')) && <td className="p-3 text-center font-bold text-teal-700">{item.delivered_quantity}</td>}
                        {((settings.challan_visible_columns || []).includes('unitPrice')) && <td className="p-3 text-right text-slate-600">{formatCurrency(item.unit_price)}</td>}
                        {((settings.challan_visible_columns || []).includes('subtotal')) && <td className="p-3 text-right font-bold text-slate-900">{formatCurrency(item.subtotal)}</td>}
                      </tr>
                    ))}
                  </tbody>
                </table>
                <div className="flex justify-end mt-4 pt-3 border-t-2 border-teal-900">
                  <div className="text-xs font-bold text-teal-900 bg-teal-50/50 px-4 py-2 rounded border border-teal-100">
                    Total Challan Value (INR): {formatCurrency(previewOrder.delivery_challan.items.reduce((s, i) => s + i.subtotal, 0))}
                  </div>
                </div>
              </div>

              {/* Notes */}
              {previewOrder.delivery_challan.additional_notes && (
                <div className="border-t pt-4">
                  <span className="font-bold text-teal-900 uppercase tracking-wide text-[10px] block mb-1">Additional Notes</span>
                  <p className="text-xs text-slate-700 whitespace-pre-wrap">{previewOrder.delivery_challan.additional_notes}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-12 mt-8 pt-8 border-t text-center">
                <div>
                  <div className="border-b border-slate-300 h-12 mb-2" />
                  <p className="font-semibold text-xs text-slate-800">Customer Representative</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wide">Signature, Name & Date</p>
                </div>
                <div>
                  <div className="border-b border-slate-300 h-12 mb-2" />
                  <p className="font-semibold text-xs text-slate-800">Authorized Signatory</p>
                  <p className="text-[9px] text-slate-400 uppercase tracking-wide">For Aicera Systems Pvt Ltd</p>
                </div>
              </div>

              {settings.challan_custom_footer_note && (
                <div className="border-t pt-2 mt-6 text-[9px] text-slate-400 font-mono flex justify-between text-left">
                  <span>{resolveChallanTags(settings.challan_custom_footer_note)}</span>
                  <span>Page 1 of 1</span>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
