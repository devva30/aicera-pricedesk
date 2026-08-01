import { useEffect, useState, useRef } from 'react'
import { useParams, useNavigate, useSearchParams } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { useAuthStore } from '@/stores/auth-store'
import { fetchOrderById, saveOrder, deleteOrder, deleteDeliveryChallan } from '@/services/orders-service'
import { fetchUsers } from '@/services/users-service'
import { fetchSettings } from '@/services/targets-service'
import type { Order, OrderChecklist, DealItem, OrderVersion, User } from '@/types'
import { cn, formatCurrency } from '@/lib/utils'
import { toast } from 'sonner'
import { pdf } from '@react-pdf/renderer'
import { VendorPOPDFDocument } from '@/components/deals/VendorPOPDFDocument'
import {
  ShieldAlert,
  ClipboardCheck,
  FileSpreadsheet,
  Package,
  ArrowLeft,
  FileText,
  Upload,
  Download,
  Trash2,
  Printer,
  Eye,
  Edit,
  Calendar,
  Plus,
  History,
  FileDown,
  AlertTriangle
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'

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

const GATES_METADATA = [
  { key: 'customer_po_received', label: 'Customer PO Received', desc: 'Customer PO signed document upload and verification.' },
  { key: 'po_value_terms_verified', label: 'PO Value & Terms Verified', desc: 'Verify unit prices, tax components and overall totals against approved quote.' },
  { key: 'oem_quote_validity_checked', label: 'OEM Quote Validity Checked', desc: 'Ensure supplier quotes are within their validity periods and pricing holds.' },
  { key: 'distributor_po_placed', label: 'Distributor PO Placed', desc: 'Release Purchase Order to Redington, Dell, HP or Ingram.' },
  { key: 'oem_order_acknowledged', label: 'OEM Order Acknowledged', desc: 'Receive official order number and confirmation from the manufacturer.' },
  { key: 'delivery_grn_done', label: 'Delivery / GRN Done', desc: 'Verify physical goods receipt or software delivery note against packing list.' },
  { key: 'installation_complete', label: 'Installation Complete', desc: 'Integration engineers complete on-site deployment or SaaS setup.' },
  { key: 'invoice_raised', label: 'Invoice Raised', desc: 'Generate customer invoice in accounting system.' },
  { key: 'payment_terms_confirmed', label: 'Payment Terms Confirmed', desc: 'Validate credit timeline and payment dates with customer finance.' },
  { key: 'payment_collected', label: 'Payment Collected', desc: 'Receive full bank credit and clear invoice records.' },
]

export function OrderDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const [order, setOrder] = useState<Order | null>(null)
  const settings = fetchSettings()
  const [loading, setLoading] = useState(true)

  const poThemeColor = settings.po_theme_color || '#1e1b4b'
  const poAccentColor = settings.po_accent_color || 'rgba(238,242,255,0.1)'

  const resolvePoTags = (text?: string) => {
    if (!text || !order) return ''
    const dateStr = new Date(order.vendor_po_generated_at || Date.now()).toLocaleDateString()
    const compName = settings.company_name || 'Aicera Systems'
    return text
      .replace(/#QuoteNo#/g, order.quote_number || 'N/A')
      .replace(/#Customer#/g, order.customer_name || 'N/A')
      .replace(/#Date#/g, dateStr)
      .replace(/#Company#/g, compName)
      .replace(/#Total#/g, formatCurrency(order.items?.reduce((s, i) => s + i.transfer_price * i.quantity, 0) || 0))
  }

  const [searchParams] = useSearchParams()
  const tabParam = searchParams.get('tab')
  const initialTab = (tabParam as 'commercials' | 'checklist') || 'commercials'

  const [activeTab, setActiveTab] = useState<'commercials' | 'checklist'>(initialTab)
  const [saving, setSaving] = useState(false)
  const [viewingVendorPo, setViewingVendorPo] = useState(false)
  const [viewingCustomerPo, setViewingCustomerPo] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Edit Commercial Details States
  const [isEditing, setIsEditing] = useState(false)
  const [expandedOrderVersion, setExpandedOrderVersion] = useState<number | null>(null)
  const [editSupplierName, setEditSupplierName] = useState('')
  const [editContactPerson, setEditContactPerson] = useState('')
  const [editEmail, setEditEmail] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editOem, setEditOem] = useState('')
  const [editQuotedValue, setEditQuotedValue] = useState(0)
  const [editPaymentTerms, setEditPaymentTerms] = useState('')
  const [editExpectedDeliveryDate, setEditExpectedDeliveryDate] = useState('')
  const [editItems, setEditItems] = useState<DealItem[]>([])
  const [editDiscountPct, setEditDiscountPct] = useState(0)
  const [editCgstPct, setEditCgstPct] = useState(9)
  const [editSgstPct, setEditSgstPct] = useState(9)
  const [editIgstPct, setEditIgstPct] = useState(0)
  const [editShipping, setEditShipping] = useState(0)
  const [editNotes, setEditNotes] = useState('')
  const [editTerms, setEditTerms] = useState('')
  const [editVendorAddress, setEditVendorAddress] = useState('')

  // Delete order modal state
  const [showDeleteOrderModal, setShowDeleteOrderModal] = useState(false)
  const [isDeletingOrder, setIsDeletingOrder] = useState(false)

  const handleDeleteOrder = async () => {
    if (!order) return
    setIsDeletingOrder(true)
    try {
      await deleteOrder(order.id, user?.id)
      toast.success(`Order ${order.order_number || order.title} deleted successfully`)
      navigate('/orders')
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete order')
    } finally {
      setIsDeletingOrder(false)
      setShowDeleteOrderModal(false)
    }
  }

  // Generate Vendor PO Dialog & Form States
  const [isGeneratePoOpen, setIsGeneratePoOpen] = useState(false)

  const handlePrintPo = () => {
    if (!order) return
    const el = document.getElementById('printable-po')
    if (!el) return
    const printWindow = window.open('', '_blank', 'width=900,height=700')
    if (!printWindow) return

    let devStylesCss = ''
    try {
      if (settings.po_developer_styles) {
        const parsed = JSON.parse(settings.po_developer_styles)
        if (parsed.fontSize) devStylesCss += `body { font-size: ${parsed.fontSize}px !important; }\n`
        if (parsed.lineHeight) devStylesCss += `body { line-height: ${parsed.lineHeight} !important; }\n`
        if (parsed.tableCellPadding) devStylesCss += `th, td { padding: ${parsed.tableCellPadding}px !important; }\n`
      }
    } catch {}

    const headerHtml = settings.po_custom_header_note
      ? `<div style="background:#f8fafc; border:1px solid #e2e8f0; padding:10px; font-size:10px; margin-bottom:15px; border-radius:4px; text-align:left;">${resolvePoTags(settings.po_custom_header_note)}</div>`
      : ''

    const footerHtml = settings.po_custom_footer_note
      ? `<div style="border-top:1px solid #e2e8f0; padding-top:10px; margin-top:20px; font-size:9px; color:#64748b; font-family:monospace; display:flex; justify-content:space-between; text-align:left;">
           <span>${resolvePoTags(settings.po_custom_footer_note)}</span>
           <span>Page 1 of 1</span>
         </div>`
      : ''

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Purchase Order</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Inter, system-ui, sans-serif; font-size: 11px; background: white; color: black; padding: 24px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { padding: 8px 12px; }
            thead tr { border-bottom: 2px solid ${poThemeColor}; background: ${poAccentColor}; color: ${poThemeColor}; font-weight: 700; }
            tbody tr { border-bottom: 1px solid #f1f5f9; }
            .border-b { border-bottom: 1px solid #e2e8f0; padding-bottom: 24px; margin-bottom: 24px; }
            .border-t-2 { border-top: 2px solid ${poThemeColor}; padding-top: 16px; margin-top: 16px; }
            .border-t { border-top: 1px solid #e2e8f0; padding-top: 16px; margin-top: 16px; }
            .flex { display: flex; }
            .justify-between { display: flex; justify-content: space-between; }
            .justify-end { display: flex; justify-content: flex-end; }
            .items-start { align-items: flex-start; }
            .grid-2 { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
            .grid-4 { display: grid; grid-template-columns: repeat(4, 1fr); gap: 16px; }
            .space-y > * + * { margin-top: 8px; }
            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .text-indigo { color: ${poThemeColor}; }
            .text-muted { color: #64748b; }
            .font-bold { font-weight: 700; }
            .font-semibold { font-weight: 600; }
            .text-xl { font-size: 18px; }
            .text-sm { font-size: 13px; }
            .text-xs { font-size: 11px; }
            .text-xxs { font-size: 9px; text-transform: uppercase; letter-spacing: 0.08em; }
            .bg-highlight { background: ${poAccentColor}; padding: 8px; border-radius: 4px; }
            .bg-details { background: rgba(248,250,252,0.5); padding: 16px; border-radius: 8px; }
            .sig-line { border-bottom: 1px solid #94a3b8; width: 192px; height: 48px; margin: 0 auto 8px; display: flex; align-items: flex-end; justify-content: center; color: #94a3b8; font-style: italic; font-size: 9px; }
            .sig-block { text-align: center; }
            .pre-wrap { white-space: pre-wrap; }
            .mt-1 { margin-top: 4px; }
            .mt-8 { margin-top: 32px; }

            /* Map classes to settings custom theme */
            .text-indigo-900 { color: ${poThemeColor} !important; }
            .border-indigo-950 { border-color: ${poThemeColor} !important; }
            .bg-indigo-50\\/30 { background-color: ${poAccentColor} !important; }
            .text-indigo-950 { color: ${poThemeColor} !important; }
            .bg-indigo-100 { background-color: ${poAccentColor} !important; }
            .text-indigo-700 { color: ${poThemeColor} !important; }

            ${devStylesCss}
          </style>
        </head>
        <body>
          ${headerHtml}
          ${el.innerHTML}
          ${footerHtml}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => { printWindow.print() }, 400)
  }

  const handleDownloadPo = async (orderData?: Order) => {
    const target = orderData || order
    if (!target) return
    const toastId = toast.loading('Generating PO PDF...')
    try {
      const currentSettings = fetchSettings()
      const blob = await pdf(<VendorPOPDFDocument order={target} settings={currentSettings} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `VendorPO_${target.vendor_po_number || target.order_number}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
      toast.success('Vendor PO PDF downloaded!', { id: toastId })
    } catch (err: any) {
      console.error(err)
      toast.error(`Failed to generate PDF: ${err.message || err}`, { id: toastId })
    }
  }

  const [formSupplierName, setFormSupplierName] = useState('')
  const [formContactPerson, setFormContactPerson] = useState('')
  const [formEmail, setFormEmail] = useState('')
  const [formPhone, setFormPhone] = useState('')
  const [formOem, setFormOem] = useState('')
  const [formPaymentTerms, setFormPaymentTerms] = useState('')
  const [formExpectedDeliveryDate, setFormExpectedDeliveryDate] = useState('')
  const [formVendorAddress, setFormVendorAddress] = useState('')
  const [formItems, setFormItems] = useState<Array<{ sku?: string, product_name: string, quantity: number, transfer_price: number, quoted_price?: number, unit_of_measure?: string }>>([])
  const [formDiscountPct, setFormDiscountPct] = useState(0)
  const [formCgstPct, setFormCgstPct] = useState(9)
  const [formSgstPct, setFormSgstPct] = useState(9)
  const [formIgstPct, setFormIgstPct] = useState(0)
  const [formShipping, setFormShipping] = useState(0)
  const [formNotes, setFormNotes] = useState('')
  const [formTerms, setFormTerms] = useState('')
 
  const handleFormItemChange = (index: number, field: string, value: any) => {
    const updated = [...formItems]
    updated[index] = {
      ...updated[index],
      [field]: field === 'product_name' || field === 'sku' ? value : Number(value) || 0
    }
    setFormItems(updated)
  }
 
  const handleFormAddItem = () => {
    setFormItems([...formItems, { sku: 'NEW-ITEM', product_name: '', quantity: 1, transfer_price: 0, quoted_price: 0, unit_of_measure: 'EA' }])
  }
 
  const handleFormRemoveItem = (index: number) => {
    if (formItems.length === 1) {
      toast.error('At least one item is required.')
      return
    }
    setFormItems(formItems.filter((_, i) => i !== index))
  }

  const formSubtotal = formItems.reduce((sum, item) => sum + (item.quantity * item.transfer_price), 0)
  const formDiscountAmount = formSubtotal * (formDiscountPct / 100)
  const formDiscountedSubtotal = formSubtotal - formDiscountAmount
  const formCgstAmount = formDiscountedSubtotal * (formCgstPct / 100)
  const formSgstAmount = formDiscountedSubtotal * (formSgstPct / 100)
  const formIgstAmount = formDiscountedSubtotal * (formIgstPct / 100)
  const formTotal = formDiscountedSubtotal + formCgstAmount + formSgstAmount + formIgstAmount + Number(formShipping)

  // Local state for editing checklist
  const [checklist, setChecklist] = useState<OrderChecklist>({
    customer_po_received: false,
    po_value_terms_verified: false,
    oem_quote_validity_checked: false,
    distributor_po_placed: false,
    oem_order_acknowledged: false,
    delivery_grn_done: false,
    installation_complete: false,
    invoice_raised: false,
    payment_terms_confirmed: false,
    payment_collected: false,
    remarks: {},
  })

  const [opsUsers, setOpsUsers] = useState<User[]>([])

  useEffect(() => {
    fetchUsers().then(users => {
      setOpsUsers(users.filter(u => u.role === 'ops'))
    }).catch(err => console.error('Failed to fetch ops users:', err))
  }, [])

  useEffect(() => {
    const loadOrder = async () => {
      if (!id) return
      setLoading(true)
      try {
        const data = await fetchOrderById(id)
        if (data) {
          setOrder(data)
          setChecklist(data.checklist)
        } else {
          toast.error('Order not found')
          navigate('/orders')
        }
      } catch (e) {
        console.error(e)
      } finally {
        setLoading(false)
      }
    }
    loadOrder()
  }, [id, navigate])

  const startEditing = () => {
    if (!order) return
    setEditSupplierName(order.supplier_name || '')
    setEditContactPerson(order.contact_person || '')
    setEditEmail(order.email || '')
    setEditPhone(order.phone || '')
    setEditOem(order.oem || '')
    setEditQuotedValue(order.quoted_value || 0)
    setEditPaymentTerms(order.payment_terms || '')
    setEditExpectedDeliveryDate(order.expected_delivery_date || '')
    setEditItems(JSON.parse(JSON.stringify(order.items || [])))
    setEditDiscountPct(order.discount_pct || 0)
    setEditCgstPct(order.cgst_pct !== undefined ? order.cgst_pct : 9)
    setEditSgstPct(order.sgst_pct !== undefined ? order.sgst_pct : 9)
    setEditIgstPct(order.igst_pct || 0)
    setEditShipping(order.shipping_charge || 0)
    setEditNotes(order.notes || '')
    setEditTerms(order.terms_conditions || '')
    setEditVendorAddress(order.vendor_address || '')
    setIsEditing(true)
  }

  const handleEditItemChange = (index: number, field: string, value: any) => {
    const updated = [...editItems]
    updated[index] = {
      ...updated[index],
      [field]: field === 'product_name' || field === 'sku' ? value : Number(value) || 0
    }
    setEditItems(updated)
  }

  const handleAddEditItem = () => {
    setEditItems([...editItems, { sku: 'NEW-ITEM', product_name: '', quantity: 1, unit_of_measure: 'EA', transfer_price: 0, quoted_price: 0 }])
  }

  const handleRemoveEditItem = (index: number) => {
    if (editItems.length === 1) {
      toast.error('At least one item is required.')
      return
    }
    setEditItems(editItems.filter((_, i) => i !== index))
  }

  const handleSaveChanges = async () => {
    if (!order) return
    if (!editSupplierName.trim()) {
      toast.error('Supplier Name is required')
      return
    }
    if (editItems.some(item => !item.product_name.trim())) {
      toast.error('Product description cannot be empty')
      return
    }
    if (editItems.some(item => item.quantity <= 0 || item.transfer_price <= 0)) {
      toast.error('Quantity and Unit Price must be greater than 0')
      return
    }

    setSaving(true)
    const toastId = toast.loading('Saving commercial changes...')
    try {
      const currentVersionNumber = order.version_number ?? 1
      const newVersions = [...(order.previous_versions ?? [])]

      const snapshot: OrderVersion = {
        version_number: currentVersionNumber,
        saved_at: new Date().toISOString(),
        saved_by: user.id,
        saved_by_name: user.full_name,
        supplier_name: order.supplier_name || '',
        quoted_value: order.quoted_value || 0,
        discount_pct: order.discount_pct,
        cgst_pct: order.cgst_pct,
        sgst_pct: order.sgst_pct,
        igst_pct: order.igst_pct,
        shipping_charge: order.shipping_charge,
        items: order.items || [],
        notes: order.notes,
        terms_conditions: order.terms_conditions,
      }
      newVersions.push(snapshot)

      const updated = await saveOrder({
        ...order,
        version_number: currentVersionNumber + 1,
        previous_versions: newVersions,
        supplier_name: editSupplierName.trim(),
        contact_person: editContactPerson.trim(),
        email: editEmail.trim(),
        phone: editPhone.trim(),
        oem: editOem.trim(),
        quoted_value: Number(editQuotedValue) || 0,
        payment_terms: editPaymentTerms.trim(),
        expected_delivery_date: editExpectedDeliveryDate.trim(),
        discount_pct: editDiscountPct,
        cgst_pct: editCgstPct,
        sgst_pct: editSgstPct,
        igst_pct: editIgstPct,
        shipping_charge: editShipping,
        notes: editNotes,
        terms_conditions: editTerms,
        vendor_address: editVendorAddress.trim(),
        items: editItems.map(item => ({
          ...item,
          quoted_price: item.quoted_price ?? item.transfer_price,
        }))
      }, user.id)
      setOrder(updated)
      setIsEditing(false)
      toast.success(
        `Order updated to v${currentVersionNumber + 1}. Previous version (v${currentVersionNumber}) saved as snapshot for Deal Ops reference.`,
        { id: toastId }
      )
    } catch (e: any) {
      console.error(e)
      toast.error(e.message || 'Failed to update commercial details', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  const canEdit = user.role === 'admin' || user.role === 'ops' || order?.sales_rep_id === user.id || user.role === 'sales_head'

  const handleSaveChecklist = async () => {
    if (!order) return
    setSaving(true)
    const toastId = toast.loading('Saving checklist changes...')
    try {
      const updated = await saveOrder({
        ...order,
        checklist
      }, user.id)
      setOrder(updated)
      setChecklist(updated.checklist)
      toast.success('Execution checklist updated successfully.', { id: toastId })
      navigate('/orders')
    } catch (e: any) {
      console.error(e)
      toast.error('Failed to save checklist.', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  const handleUpdateOpsOwner = async (owner: string) => {
    if (!order) return
    const toastId = toast.loading('Assigning Ops Executive...')
    try {
      const updated = await saveOrder({
        ...order,
        ops_owner: owner || null,
      }, user.id)
      setOrder(updated)
      toast.success(`Assigned to ${owner || 'Unassigned'} successfully.`, { id: toastId })
    } catch (e) {
      console.error(e)
      toast.error('Failed to update Ops Executive.', { id: toastId })
    }
  }

  const handleUpdateOrderStatus = async (status: any) => {
    if (!order) return
    if (status === 'Closed' && order.pct_complete < 100) {
      toast.error('Cannot mark order as Closed until checklist is 100% complete.')
      return
    }
    const toastId = toast.loading('Updating order status...')
    try {
      const updated = await saveOrder({
        ...order,
        order_status: status,
      }, user.id)
      setOrder(updated)
      toast.success(`Order status updated to ${status}.`, { id: toastId })
    } catch (e) {
      console.error(e)
      toast.error('Failed to update order status.', { id: toastId })
    }
  }





  const openGeneratePoDialog = () => {
    if (!order) return
    setFormSupplierName(order.supplier_name || '')
    setFormContactPerson(order.contact_person || '')
    setFormEmail(order.email || '')
    setFormPhone(order.phone || '')
    setFormOem(order.oem || '')
    setFormPaymentTerms(order.payment_terms || '')
    setFormExpectedDeliveryDate(order.expected_delivery_date || '')

    // Auto-fill address if empty and supplier matches a pre-defined vendor
    let matchedAddress = order.vendor_address || ''
    if (!matchedAddress && order.supplier_name) {
      const found = VENDOR_DETAILS.find(v => v.name.toLowerCase() === order.supplier_name.toLowerCase())
      if (found) {
        matchedAddress = found.address
      }
    }
    setFormVendorAddress(matchedAddress)



    // Initialize items, calculations, notes, terms
    setFormItems(order.items ? order.items.map(item => ({
      sku: item.sku,
      product_name: item.product_name,
      quantity: item.quantity,
      transfer_price: item.transfer_price,
      quoted_price: item.quoted_price,
      unit_of_measure: item.unit_of_measure || 'EA'
    })) : [])
    setFormDiscountPct(order.discount_pct || 0)
    setFormCgstPct(order.cgst_pct || 9)
    setFormSgstPct(order.sgst_pct || 9)
    setFormIgstPct(order.igst_pct || 0)
    setFormShipping(order.shipping_charge || 0)
    setFormNotes(order.notes || '')
    setFormTerms(order.terms_conditions || "Payment Terms: Net 30 days\nDelivery: 7-10 business days\nWarranty: 1 year manufacturer warranty")

    setIsGeneratePoOpen(true)
  }

  const handleGenerateVendorPoSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!order) return
    if (!formSupplierName.trim()) {
      toast.error('Please enter supplier/vendor name.')
      return
    }
    if (formItems.some(item => !item.product_name.trim())) {
      toast.error('Please enter product description for all items.')
      return
    }
    if (formItems.some(item => item.quantity <= 0 || item.transfer_price <= 0)) {
      toast.error('Quantity and Unit Price must be greater than 0.')
      return
    }

    setSaving(true)
    const toastId = toast.loading('Generating Vendor PO...')
    const poNum = `PO-${order.order_number.replace('ORD-', '')}`
    try {
      const updated = await saveOrder({
        ...order,
        supplier_name: formSupplierName,
        contact_person: formContactPerson,
        email: formEmail,
        phone: formPhone,
        oem: formOem,
        payment_terms: formPaymentTerms,
        expected_delivery_date: formExpectedDeliveryDate,
        vendor_address: formVendorAddress,
        vendor_po_generated_at: new Date().toISOString(),
        vendor_po_number: poNum,
        items: formItems.map(item => ({
          sku: item.sku || item.product_name.replace(/\s+/g, '-').toUpperCase(),
          product_name: item.product_name,
          quantity: item.quantity,
          transfer_price: item.transfer_price,
          quoted_price: item.quoted_price ?? item.transfer_price,
          unit_of_measure: item.unit_of_measure || 'EA'
        })),
        discount_pct: formDiscountPct,
        cgst_pct: formCgstPct,
        sgst_pct: formSgstPct,
        igst_pct: formIgstPct,
        shipping_charge: formShipping,
        notes: formNotes,
        terms_conditions: formTerms,
        quoted_value: formTotal
      }, user.id)
      setOrder(updated)
      toast.success(`Vendor PO ${poNum} generated!`, { id: toastId })
      setIsGeneratePoOpen(false)
      setViewingVendorPo(true)
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to generate Vendor PO.', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  const handleCustomerPoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file || !order) return
    if (file.size > 800 * 1024) {
      toast.error('File is too large. Please upload a file smaller than 800KB.')
      return
    }

    const reader = new FileReader()
    reader.onloadend = async () => {
      const dataUrl = reader.result as string
      setSaving(true)
      const toastId = toast.loading('Uploading Customer PO...')
      try {
        const updated = await saveOrder({
          ...order,
          customer_po_file: {
            name: file.name,
            size: file.size,
            type: file.type,
            uploaded_at: new Date().toISOString(),
            dataUrl
          }
        }, user.id)
        setOrder(updated)
        toast.success('Customer PO uploaded and saved successfully.', { id: toastId })
      } catch (err: any) {
        console.error(err)
        toast.error(err.message || 'Failed to upload customer PO.', { id: toastId })
      } finally {
        setSaving(false)
      }
    }
    reader.readAsDataURL(file)
  }

  const handleCustomerPoDelete = async () => {
    if (!order) return
    setSaving(true)
    const toastId = toast.loading('Removing Customer PO...')
    try {
      const updatedChecklist = {
        ...checklist,
        customer_po_received: false
      }
      const updated = await saveOrder({
        ...order,
        customer_po_file: null,
        checklist: updatedChecklist
      }, user.id)
      setOrder(updated)
      setChecklist(updatedChecklist)
      toast.success('Customer PO removed successfully.', { id: toastId })
    } catch (err: any) {
      console.error(err)
      toast.error('Failed to remove Customer PO.', { id: toastId })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return <div className="bg-card border border-border rounded-lg h-96 animate-pulse shadow-sm" />
  }

  if (!order) return null

  // Standalone PO details view
  if (order.is_standalone && !isEditing) {
    return (
      <div className="space-y-6">
        {/* Back and actions */}
        <div className="flex items-center justify-between print:hidden">
          <Button variant="outline" size="sm" onClick={() => navigate('/orders')} className="h-8 text-xs font-semibold">
            <ArrowLeft className="h-4 w-4 mr-1.5" />
            Back to Orders
          </Button>
          <div className="flex gap-2">
            {canEdit && (order.order_status === 'Draft' || user.role === 'admin' || user.role === 'ops') && (
              <Button
                onClick={startEditing}
                size="sm"
                className="text-xs font-semibold gap-1.5 bg-amber-600 hover:bg-amber-500 text-white cursor-pointer"
              >
                <Edit className="h-4 w-4" />
                Edit Details
              </Button>
            )}
            <Button
              onClick={() => handleDownloadPo(order)}
              size="sm"
              className="text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
            >
              <FileDown className="h-4 w-4" />
              Download PDF
            </Button>
            <Button
              onClick={() => window.print()}
              size="sm"
              className="text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer animate-none"
            >
              <Printer className="h-4 w-4" />
              Print Purchase Order
            </Button>
            <Button
              onClick={() => setShowDeleteOrderModal(true)}
              variant="outline"
              size="sm"
              className="text-xs font-semibold gap-1.5 text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              Delete Order
            </Button>
          </div>
        </div>

        {/* Hero Header */}
        <div className="bg-card border border-border rounded-lg shadow-sm p-4 flex items-center gap-3 print:hidden">
          <div className="h-10 w-10 rounded bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <FileText className="h-5 w-5" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
              Standalone Purchase Order • {order.supplier_name}
            </span>
            <h1 className="text-xl font-bold font-display text-foreground">{order.title}</h1>
          </div>
        </div>

        {/* The PO Sheet */}
        <div id="printable-po" className="p-8 bg-white border border-border rounded-lg text-black space-y-6 text-left">
          <style dangerouslySetInnerHTML={{
            __html: `
            @media print {
              body * {
                visibility: hidden;
              }
              #printable-po, #printable-po * {
                visibility: visible;
              }
              #printable-po {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                color: black !important;
                padding: 24px;
              }
            }
            #printable-po .text-indigo-900 { color: ${poThemeColor} !important; }
            #printable-po .border-indigo-950 { border-color: ${poThemeColor} !important; }
            #printable-po .bg-indigo-50\\/30 { background-color: ${poAccentColor} !important; }
            #printable-po .text-indigo-950 { color: ${poThemeColor} !important; }
            #printable-po .bg-indigo-100 { background-color: ${poAccentColor} !important; }
            #printable-po .text-indigo-700 { color: ${poThemeColor} !important; }
            #printable-po thead tr { border-bottom: 2px solid ${poThemeColor} !important; background: ${poAccentColor} !important; }
            #printable-po .border-t-2 { border-top-color: ${poThemeColor} !important; }
            #printable-po .border-indigo-900 { border-color: ${poThemeColor} !important; }
            #printable-po .bg-indigo-50\\/40 { background-color: ${poAccentColor} !important; }

            ${settings.po_developer_styles ? (() => {
              let devStyles = ''
              try {
                const parsed = JSON.parse(settings.po_developer_styles)
                if (parsed.fontSize) devStyles += `#printable-po { font-size: ${parsed.fontSize}px !important; }\n`
                if (parsed.lineHeight) devStyles += `#printable-po { line-height: ${parsed.lineHeight} !important; }\n`
                if (parsed.tableCellPadding) devStyles += `#printable-po th, #printable-po td { padding: ${parsed.tableCellPadding}px !important; }\n`
              } catch {}
              return devStyles
            })() : ''}
          `}} />

          {settings.po_custom_header_note && (
            <div className="bg-slate-50 border border-slate-200 p-2 text-[10px] rounded text-slate-500 mb-4 text-left">
              {resolvePoTags(settings.po_custom_header_note)}
            </div>
          )}

          {/* Letterhead Header */}
          <div className="flex justify-between items-start border-b pb-6">
            <div className="flex items-start gap-4">
              <img
                src="https://framerusercontent.com/images/AlNvsxkJzF8SFWwwytH2xsnL8uM.png"
                alt="Aicera Logo"
                className="h-8 w-8 rounded object-contain shrink-0"
              />
              <div className="space-y-1">
                <div className="text-xl font-bold tracking-tight text-indigo-900 font-display">
                  Aicera Systems Pvt Ltd
                </div>
                <div className="text-[10px] text-muted-foreground max-w-[250px] leading-relaxed">
                  sales@aicera.co.in | 9945073777 | GSTIN: 29AAXCA8339E1Z1<br />
                  224, Bannerghatta Rd, Near Arekere Gate, Arekere, Bengaluru - 560 076
                </div>
              </div>
            </div>

            <div className="text-right space-y-1">
              <h1 className="text-xl font-bold uppercase text-indigo-900 tracking-wider">Purchase Order</h1>
              <div className="text-xs">
                <p><span className="text-muted-foreground font-semibold">PO Number:</span> <strong className="text-black font-mono">{order.order_number}</strong></p>
                <p><span className="text-muted-foreground font-semibold">Date:</span> <span className="font-medium">{new Date(order.created_at).toLocaleDateString()}</span></p>
              </div>
            </div>
          </div>

          {/* Address Grid */}
          <div className="grid grid-cols-2 gap-6 text-xs border-b pb-6">
            <div className="space-y-1">
              <span className="font-bold text-indigo-900 uppercase tracking-wide text-[10px]">Vendor/Supplier</span>
              <p className="font-bold text-sm">{order.supplier_name}</p>
              <div className="text-muted-foreground leading-normal mt-1 animate-none">
                {order.contact_person && <p>Contact: {order.contact_person}</p>}
                {order.email && <p>Email: {order.email}</p>}
                {order.phone && <p>Phone: {order.phone}</p>}
                {order.vendor_address && <p className="mt-1 whitespace-pre-wrap">Address: {order.vendor_address}</p>}
              </div>
            </div>

            <div className="space-y-1">
              <span className="font-bold text-indigo-900 uppercase tracking-wide text-[10px]">Deliver / Bill To</span>
              <p className="font-bold text-sm">Aicera Systems Pvt Ltd</p>
              <div className="text-muted-foreground leading-normal mt-1">
                224, Bannerghatta Rd, Near Arekere Gate,<br />
                Arekere, Bengaluru, Karnataka 560 076<br />
                GSTIN: 29AAFCA8891C1ZP
              </div>
            </div>
          </div>

          {/* Details */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-b pb-6 bg-slate-50/50 p-4 rounded-lg">
            <div>
              <span className="text-muted-foreground font-semibold block text-[10px]">Expected Delivery Date</span>
              <span className="font-bold text-foreground mt-0.5 block">{order.expected_delivery_date || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold block text-[10px]">Payment Terms</span>
              <span className="font-bold text-foreground mt-0.5 block">{order.payment_terms || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold block text-[10px]">OEM Brand</span>
              <span className="font-bold text-foreground mt-0.5 block">{order.oem || 'N/A'}</span>
            </div>
            <div>
              <span className="text-muted-foreground font-semibold block text-[10px]">Created By</span>
              <span className="font-bold text-foreground mt-0.5 block">{order.sales_rep_name}</span>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2">
            <span className="font-bold text-indigo-900 uppercase tracking-wide text-[10px]">Purchase Itemized Details</span>
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b-2 border-indigo-950 font-bold bg-indigo-50/30 text-indigo-950">
                  {((settings.po_visible_columns || []).includes('sl')) && <th className="p-3 w-12 text-center font-bold">#</th>}
                  {((settings.po_visible_columns || []).includes('desc')) && <th className="p-3 font-bold">Product Description</th>}
                  {((settings.po_visible_columns || []).includes('qty')) && <th className="p-3 text-center w-16 font-bold">Qty</th>}
                  {((settings.po_visible_columns || []).includes('unitCost')) && <th className="p-3 text-right w-32 font-bold">Unit Price (₹)</th>}
                  {((settings.po_visible_columns || []).includes('totalCost')) && <th className="p-3 text-right w-36 font-bold">Line Total</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {order.items.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/20">
                    {((settings.po_visible_columns || []).includes('sl')) && <td className="p-3 text-center text-muted-foreground font-mono">{idx + 1}</td>}
                    {((settings.po_visible_columns || []).includes('desc')) && (
                      <td className="p-3">
                        <span className="font-bold text-slate-900">{item.product_name}</span>
                      </td>
                    )}
                    {((settings.po_visible_columns || []).includes('qty')) && <td className="p-3 text-center font-bold text-slate-800">{item.quantity}</td>}
                    {((settings.po_visible_columns || []).includes('unitCost')) && <td className="p-3 text-right text-slate-700">{formatCurrency(item.transfer_price)}</td>}
                    {((settings.po_visible_columns || []).includes('totalCost')) && (
                      <td className="p-3 text-right font-bold text-slate-900">
                        {formatCurrency(item.transfer_price * item.quantity)}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Cost Summary Calculations */}
          {(() => {
            const subtotal = order.items.reduce((sum, item) => sum + (item.quantity * item.transfer_price), 0)
            const discountPct = order.discount_pct || 0
            const discountAmount = subtotal * (discountPct / 100)
            const discountedSubtotal = subtotal - discountAmount
            const cgstPct = order.cgst_pct || 0
            const sgstPct = order.sgst_pct || 0
            const igstPct = order.igst_pct || 0
            const shipping = order.shipping_charge || 0

            const cgstAmount = discountedSubtotal * (cgstPct / 100)
            const sgstAmount = discountedSubtotal * (sgstPct / 100)
            const igstAmount = discountedSubtotal * (igstPct / 100)
            const total = discountedSubtotal + cgstAmount + sgstAmount + igstAmount + shipping

            return (
              <div className="flex justify-end pt-4 border-t-2 border-indigo-900">
                <div className="w-80 text-xs space-y-2">
                  <div className="flex justify-between items-center font-semibold border-b pb-1 gap-2">
                    <span className="text-muted-foreground shrink-0 whitespace-nowrap">Subtotal Cost:</span>
                    <span className={`font-semibold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[65%] ${formatCurrency(subtotal).length > 20 ? 'text-[10px]' : 'text-xs'}`}>{formatCurrency(subtotal)}</span>
                  </div>
                  {discountPct > 0 && (
                    <div className="flex justify-between items-center font-semibold border-b pb-1 text-red-600 gap-2">
                      <span className="shrink-0 whitespace-nowrap">Discount ({discountPct}%):</span>
                      <span className={`font-semibold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[65%] text-red-600 ${formatCurrency(discountAmount).length > 20 ? 'text-[10px]' : 'text-xs'}`}>-{formatCurrency(discountAmount)}</span>
                    </div>
                  )}
                  {cgstPct > 0 && (
                    <div className="flex justify-between items-center font-semibold border-b pb-1 gap-2">
                      <span className="text-muted-foreground shrink-0 whitespace-nowrap">CGST ({cgstPct}%):</span>
                      <span className={`font-semibold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[65%] ${formatCurrency(cgstAmount).length > 20 ? 'text-[10px]' : 'text-xs'}`}>{formatCurrency(cgstAmount)}</span>
                    </div>
                  )}
                  {sgstPct > 0 && (
                    <div className="flex justify-between items-center font-semibold border-b pb-1 gap-2">
                      <span className="text-muted-foreground shrink-0 whitespace-nowrap">SGST ({sgstPct}%):</span>
                      <span className={`font-semibold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[65%] ${formatCurrency(sgstAmount).length > 20 ? 'text-[10px]' : 'text-xs'}`}>{formatCurrency(sgstAmount)}</span>
                    </div>
                  )}
                  {igstPct > 0 && (
                    <div className="flex justify-between items-center font-semibold border-b pb-1 gap-2">
                      <span className="text-muted-foreground shrink-0 whitespace-nowrap">IGST ({igstPct}%):</span>
                      <span className={`font-semibold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[65%] ${formatCurrency(igstAmount).length > 20 ? 'text-[10px]' : 'text-xs'}`}>{formatCurrency(igstAmount)}</span>
                    </div>
                  )}
                  {shipping > 0 && (
                    <div className="flex justify-between items-center font-semibold border-b pb-1 gap-2">
                      <span className="text-muted-foreground shrink-0 whitespace-nowrap">Shipping:</span>
                      <span className={`font-semibold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[65%] ${formatCurrency(shipping).length > 20 ? 'text-[10px]' : 'text-xs'}`}>{formatCurrency(shipping)}</span>
                    </div>
                  )}
                  <div className="flex justify-between items-center font-bold text-sm text-indigo-900 bg-indigo-50/40 p-2 rounded gap-2">
                    <span className="shrink-0 whitespace-nowrap">Grand Total Cost (INR):</span>
                    <span className={`font-bold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[60%] ${formatCurrency(total).length > 20 ? 'text-xs' : 'text-sm'}`}>{formatCurrency(total)}</span>
                  </div>
                </div>
              </div>
            )
          })()}

          {/* Notes and Terms & Conditions */}
          {(order.notes || order.terms_conditions) && (
            <div className="grid grid-cols-2 gap-6 pt-4 border-t text-[10px]">
              <div>
                <span className="font-bold text-indigo-900 block uppercase tracking-wide">Notes</span>
                <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{order.notes || 'N/A'}</p>
              </div>
              <div>
                <span className="font-bold text-indigo-900 block uppercase tracking-wide">Terms &amp; Conditions</span>
                <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{order.terms_conditions || 'N/A'}</p>
              </div>
            </div>
          )}

          {/* Signature Area */}
          <div className="grid grid-cols-2 gap-12 pt-16 text-center text-xs">
            <div className="space-y-4">
              <div className="border-b w-48 mx-auto h-12 flex items-end justify-center text-muted-foreground italic text-[10px]">
                Generated Electronically
              </div>
              <p className="font-bold text-slate-800">Authorized Procurement Agent</p>
              <p className="text-[10px] text-muted-foreground">Aicera Systems Pvt Ltd</p>
            </div>
            <div className="space-y-4">
              <div className="border-b w-48 mx-auto h-12"></div>
              <p className="font-bold text-slate-800">Supplier Acknowledgment</p>
              <p className="text-[10px] text-muted-foreground">Sign and Return for Acceptance</p>
            </div>
          </div>

          {settings.po_custom_footer_note && (
            <div className="border-t pt-2 mt-6 text-[9px] text-slate-400 font-mono flex justify-between text-left">
              <span>{resolvePoTags(settings.po_custom_footer_note)}</span>
              <span>Page 1 of 1</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // Role gating variables
  const isSalesRepOrAdmin = user.role === 'sales_rep' || user.role === 'admin'

  return (
    <div className="space-y-6">
      {/* Back to list */}
      <div className="flex items-center justify-between">
        <Button variant="outline" size="sm" onClick={() => navigate('/orders')} className="h-8 text-xs font-semibold">
          <ArrowLeft className="h-4 w-4 mr-1.5" />
          Back to Orders
        </Button>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => setShowDeleteOrderModal(true)}
            variant="outline"
            size="sm"
            className="h-8 text-xs font-semibold text-red-600 border-red-200 hover:bg-red-50 dark:hover:bg-red-950/20 gap-1.5 cursor-pointer"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Delete Order
          </Button>
          <span className="text-[10px] font-bold tracking-wider text-muted-foreground uppercase">
            Order Identity: {order.order_number}
          </span>
        </div>
      </div>

      {/* Hero Header */}
      <div className="bg-card border border-border rounded-lg shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded bg-primary/10 flex items-center justify-center text-primary shrink-0">
            <Package className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Order worksheet • {order.customer_name}
              </span>
              {(order.version_number ?? 1) > 1 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                  <History className="h-2.5 w-2.5" />
                  v{order.version_number} · Revised
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <h1 className="text-xl font-bold font-display text-foreground">{order.title}</h1>
            </div>
          </div>
        </div>
        {(order.version_number ?? 1) > 1 && (
          <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <History className="h-4 w-4 text-amber-600 shrink-0" />
            <div>
              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">Order Revised</p>
              <p className="text-[10px] text-amber-700">This order has been edited {(order.version_number ?? 1) - 1} time(s). Current version: v{order.version_number ?? 1}</p>
            </div>
          </div>
        )}
      </div>

      {/* Execution Progress & Status Panel */}
      <div className="bg-card border border-border rounded-lg shadow-sm p-5 grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Progress Bar & Stage */}
        <div className="space-y-2 text-left">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted-foreground">EXECUTION CHECKLIST</span>
            <span className={cn(
              "text-[10px] px-2 py-0.5 rounded-full font-bold uppercase border",
              order.stage === 'CLOSED' && "bg-emerald-50 text-emerald-700 border-emerald-200/50",
              order.stage === 'ADVANCED' && "bg-blue-50 text-blue-700 border-blue-200/50",
              order.stage === 'IN PROGRESS' && "bg-amber-50 text-amber-700 border-amber-200/50",
              (order.stage === 'EARLY' || !order.stage) && "bg-slate-50 text-slate-600 border-slate-200/50",
            )}>
              {order.stage || 'EARLY'}
            </span>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-slate-100 h-2.5 rounded-full overflow-hidden">
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
            <span className="text-xs font-extrabold text-slate-800">{order.pct_complete || 0}%</span>
          </div>
        </div>

        {/* Ops Executive Dropdown */}
        <div className="text-left space-y-1.5">
          <label htmlFor="ops-owner" className="text-xs font-bold text-slate-500">OPS EXECUTIVE</label>
          {user.role === 'admin' || user.role === 'sales_head' ? (
            <select
              id="ops-owner"
              value={order.ops_owner || ''}
              onChange={(e) => handleUpdateOpsOwner(e.target.value)}
              className="h-9 w-full rounded-md border border-border bg-slate-50/50 px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-foreground font-bold cursor-pointer"
            >
              <option value="">Unassigned</option>
              {opsUsers.map(u => (
                <option key={u.id} value={u.full_name}>
                  {u.full_name} ({u.email})
                </option>
              ))}
              {opsUsers.length === 0 && order.ops_owner && (
                <option value={order.ops_owner}>{order.ops_owner}</option>
              )}
            </select>
          ) : (
            <div className="h-9 flex items-center px-3 rounded-md border border-border bg-slate-100/50 text-xs font-bold text-muted-foreground">
              {order.ops_owner || 'Unassigned'}
            </div>
          )}
        </div>

        {/* Order Status Dropdown */}
        <div className="text-left space-y-1.5">
          <label htmlFor="order-status" className="text-xs font-bold text-slate-500">ORDER STATUS</label>
          {user.role === 'ops' || user.role === 'admin' || user.role === 'sales_head' ? (
            <select
              id="order-status"
              value={order.order_status || 'Processing'}
              onChange={(e) => handleUpdateOrderStatus(e.target.value as any)}
              className="h-9 w-full rounded-md border border-border bg-slate-50/50 px-3 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-ring text-foreground font-bold cursor-pointer"
            >
              <option value="Draft">Draft</option>
              <option value="Processing">Processing</option>
              <option value="In Transit">In Transit</option>
              <option value="Delivered">Delivered</option>
              <option value="Installed">Installed</option>
              <option value="Cancelled">Cancelled</option>
              <option value="Closed" disabled={order.pct_complete < 100}>
                Closed {order.pct_complete < 100 ? '(Requires 100% Checklist)' : ''}
              </option>
            </select>
          ) : (
            <div className={cn(
              "h-9 flex items-center px-3 rounded-md border border-border text-xs font-bold",
              order.order_status === 'Closed' && "bg-emerald-50 text-emerald-700 border-emerald-200/30",
              order.order_status === 'Processing' && "bg-amber-50 text-amber-700 border-amber-200/30",
              order.order_status === 'Cancelled' && "bg-rose-50 text-rose-700 border-rose-200/30",
              order.order_status === 'Draft' && "bg-slate-100 text-slate-700 border-slate-200/30",
              (order.order_status === 'In Transit' || order.order_status === 'Delivered' || order.order_status === 'Installed') && "bg-sky-50 text-sky-700 border-sky-200/30",
            )}>
              {order.order_status || 'Processing'}
            </div>
          )}
        </div>
      </div>

      {/* Tabs list (custom local state implementation for extreme safety and style) */}
      <div className="flex border-b border-border/60 gap-1.5 overflow-x-auto pb-1 text-xs text-left">
        <button
          onClick={() => setActiveTab('commercials')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold transition-all rounded-t-lg border-b-2 hover:bg-muted/30 cursor-pointer ${activeTab === 'commercials'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          <FileSpreadsheet className="h-4 w-4" />
          <span>1. Commercial Order worksheet</span>
        </button>
        <button
          onClick={() => setActiveTab('checklist')}
          className={`flex items-center gap-2 px-4 py-2.5 font-bold transition-all rounded-t-lg border-b-2 hover:bg-muted/30 cursor-pointer ${activeTab === 'checklist'
              ? 'border-primary text-primary bg-primary/5'
              : 'border-transparent text-muted-foreground hover:text-foreground'
            }`}
        >
          <ClipboardCheck className="h-4 w-4" />
          <span>2. Pre-Execution Checklist</span>
        </button>
      </div>

      {/* Tab Contents */}
      <div className="mt-4 transition-all duration-300">

        {/* Tab 1: Commercial Details */}
        {activeTab === 'commercials' && (
          <div className="space-y-6">
            <div className="flex justify-between items-center border-b border-border/50 pb-2.5">
              <div>
                <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Commercial Worksheets</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">Supplier PO pricing and billing details.</p>
              </div>
              {!isEditing && canEdit && (
                <div className="flex gap-2 items-center">
                  <Button onClick={startEditing} size="sm" className="h-8 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white flex items-center gap-1.5 cursor-pointer shadow-sm">
                    <Edit className="h-3.5 w-3.5" />
                    Edit Details
                  </Button>
                </div>
              )}
            </div>

            {isEditing ? (
              // ─── EDIT MODE ───
              (() => {
                const subtotal = editItems.reduce((sum, item) => sum + (item.quantity * item.transfer_price), 0)
                const discountAmount = subtotal * (editDiscountPct / 100)
                const discountedSubtotal = subtotal - discountAmount
                const cgstAmount = discountedSubtotal * (editCgstPct / 100)
                const sgstAmount = discountedSubtotal * (editSgstPct / 100)
                const igstAmount = discountedSubtotal * (editIgstPct / 100)
                const grandTotal = discountedSubtotal + cgstAmount + sgstAmount + igstAmount + editShipping

                return (
                  <div className="space-y-6">
                    {/* 2. SUPPLIER & DISTRIBUTOR DETAILS */}
                    <div className="bg-card border border-border rounded-lg shadow-sm p-5 md:p-6 space-y-4">
                      <h3 className="text-sm font-bold text-foreground border-b border-border/50 pb-2 uppercase tracking-wider text-left">
                        2. Supplier &amp; Distributor Details
                      </h3>
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-left">
                        <div className="lg:col-span-2">
                          <Label className="text-xs font-semibold text-muted-foreground">Supplier Name *</Label>
                          <Input
                            value={editSupplierName}
                            onChange={(e) => setEditSupplierName(e.target.value)}
                            className="mt-1.5 h-10 text-xs bg-slate-50/50 border-border"
                            placeholder="e.g. Cisco Systems, India Electronics"
                            required
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground">Contact Person</Label>
                          <Input
                            value={editContactPerson}
                            onChange={(e) => setEditContactPerson(e.target.value)}
                            className="mt-1.5 h-10 text-xs bg-slate-50/50 border-border"
                            placeholder="Name"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground">Email</Label>
                          <Input
                            type="email"
                            value={editEmail}
                            onChange={(e) => setEditEmail(e.target.value)}
                            className="mt-1.5 h-10 text-xs bg-slate-50/50 border-border"
                            placeholder="contact@supplier.com"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground">Phone</Label>
                          <Input
                            value={editPhone}
                            onChange={(e) => setEditPhone(e.target.value)}
                            className="mt-1.5 h-10 text-xs bg-slate-50/50 border-border"
                            placeholder="Contact number"
                          />
                        </div>
                        <div>
                          <Label className="text-xs font-semibold text-muted-foreground">OEM</Label>
                          <Input
                            value={editOem}
                            onChange={(e) => setEditOem(e.target.value)}
                            className="mt-1.5 h-10 text-xs bg-slate-50/50 border-border"
                            placeholder="e.g. Cisco, Aicera"
                          />
                        </div>
                        <div className="lg:col-span-2">
                          <Label className="text-xs font-semibold text-muted-foreground">Quoted Value (INR)</Label>
                          <Input
                            type="number"
                            value={editQuotedValue || ''}
                            onChange={(e) => setEditQuotedValue(Number(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="mt-1.5 h-10 text-xs bg-slate-50/50 border-border"
                            placeholder="Amount"
                          />
                        </div>
                        <div className="lg:col-span-2">
                          <Label className="text-xs font-semibold text-muted-foreground">Payment Terms</Label>
                          <Input
                            value={editPaymentTerms}
                            onChange={(e) => setEditPaymentTerms(e.target.value)}
                            className="mt-1.5 h-10 text-xs bg-slate-50/50 border-border"
                            placeholder="e.g. Net 30, 50% Advance"
                          />
                        </div>
                        <div className="lg:col-span-2">
                          <Label className="text-xs font-semibold text-muted-foreground">Expected Delivery Date</Label>
                          <div className="relative mt-1.5">
                            <Input
                              type="date"
                              value={editExpectedDeliveryDate}
                              onChange={(e) => setEditExpectedDeliveryDate(e.target.value)}
                              className="pl-9 h-10 text-xs bg-slate-50/50 border-border"
                            />
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                          </div>
                        </div>
                        <div className="lg:col-span-4 text-left">
                          <Label className="text-xs font-semibold text-muted-foreground">Supplier Address</Label>
                          <Textarea
                            value={editVendorAddress}
                            onChange={(e) => setEditVendorAddress(e.target.value)}
                            className="mt-1.5 text-xs bg-slate-50/50 border-border min-h-[80px]"
                            placeholder="Supplier address details..."
                          />
                        </div>
                      </div>
                    </div>

                    {/* PO ITEMS LIST */}
                    <div className="bg-card border border-border rounded-lg shadow-sm p-5 md:p-6 space-y-4">
                      <div className="flex items-center justify-between border-b border-border/50 pb-2">
                        <h3 className="text-sm font-bold text-foreground uppercase tracking-wider text-left">
                          PO Items List
                        </h3>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleAddEditItem}
                          className="h-8 text-xs font-semibold px-3 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                        >
                          <Plus className="h-3.5 w-3.5 mr-1" />
                          Add Item
                        </Button>
                      </div>

                      <div className="space-y-3">
                        {editItems.map((item, index) => (
                          <div key={index} className="flex gap-3 items-start bg-slate-50/50 p-3 border border-border rounded-lg text-left">
                            <div className="flex-1 min-w-0">
                              <Input
                                placeholder="Product Description (e.g. Dell Servers)"
                                value={item.product_name}
                                onChange={(e) => handleEditItemChange(index, 'product_name', e.target.value)}
                                className="h-9 border-border text-xs bg-white"
                              />
                            </div>
                            <div className="w-20">
                              <Input
                                type="number"
                                placeholder="Qty"
                                value={item.quantity || ''}
                                onChange={(e) => handleEditItemChange(index, 'quantity', e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="h-9 border-border text-xs bg-white"
                                min="1"
                              />
                            </div>
                            <div className="w-28">
                              <Input
                                type="number"
                                placeholder="Unit Price"
                                value={item.transfer_price || ''}
                                onChange={(e) => handleEditItemChange(index, 'transfer_price', e.target.value)}
                                onFocus={(e) => e.target.select()}
                                className="h-9 border-border text-xs bg-white"
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
                              onClick={() => handleRemoveEditItem(index)}
                              className="h-9 w-9 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                      </div>

                      {/* Calculations Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 border-t pt-4 text-left">
                        <div>
                          <Label className="text-[10px] font-semibold text-slate-500 mb-1 block">Discount (%)</Label>
                          <Input
                            type="number"
                            value={editDiscountPct || ''}
                            onChange={(e) => setEditDiscountPct(Number(e.target.value) || 0)}
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
                            value={editCgstPct || ''}
                            onChange={(e) => setEditCgstPct(Number(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="h-9 border-border text-xs bg-slate-50/50"
                            min="0"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-semibold text-slate-500 mb-1 block">SGST (%)</Label>
                          <Input
                            type="number"
                            value={editSgstPct || ''}
                            onChange={(e) => setEditSgstPct(Number(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="h-9 border-border text-xs bg-slate-50/50"
                            min="0"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-semibold text-slate-500 mb-1 block">IGST (%)</Label>
                          <Input
                            type="number"
                            value={editIgstPct || ''}
                            onChange={(e) => setEditIgstPct(Number(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="h-9 border-border text-xs bg-slate-50/50"
                            min="0"
                          />
                        </div>
                        <div>
                          <Label className="text-[10px] font-semibold text-slate-500 mb-1 block">Shipping (₹)</Label>
                          <Input
                            type="number"
                            value={editShipping || ''}
                            onChange={(e) => setEditShipping(Number(e.target.value) || 0)}
                            onFocus={(e) => e.target.select()}
                            className="h-9 border-border text-xs bg-slate-50/50"
                            min="0"
                          />
                        </div>
                      </div>

                      {/* Calculations Box */}
                      <div className="bg-card border border-border p-4 rounded-lg space-y-2 text-xs text-slate-700 text-left">
                        <div className="flex justify-between border-b pb-1.5">
                          <span className="text-slate-500">Subtotal:</span>
                          <span className="font-semibold">₹{subtotal.toFixed(2)}</span>
                        </div>
                        {editDiscountPct > 0 && (
                          <div className="flex justify-between border-b pb-1.5 text-red-600">
                            <span>Discount ({editDiscountPct}%):</span>
                            <span>-₹{discountAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {editCgstPct > 0 && (
                          <div className="flex justify-between border-b pb-1.5">
                            <span className="text-slate-500">CGST ({editCgstPct}%):</span>
                            <span>₹{cgstAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {editSgstPct > 0 && (
                          <div className="flex justify-between border-b pb-1.5">
                            <span className="text-slate-500">SGST ({editSgstPct}%):</span>
                            <span>₹{sgstAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {editIgstPct > 0 && (
                          <div className="flex justify-between border-b pb-1.5">
                            <span className="text-slate-500">IGST ({editIgstPct}%):</span>
                            <span>₹{igstAmount.toFixed(2)}</span>
                          </div>
                        )}
                        {editShipping > 0 && (
                          <div className="flex justify-between border-b pb-1.5">
                            <span className="text-slate-500">Shipping (₹):</span>
                            <span>₹{Number(editShipping).toFixed(2)}</span>
                          </div>
                        )}
                        <div className="flex justify-between font-bold text-sm text-indigo-950 pt-1 border-t">
                          <span>Total:</span>
                          <span>₹{grandTotal.toFixed(2)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Notes & Terms Textareas */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-left">
                      <div>
                        <Label htmlFor="editNotes" className="text-xs font-bold text-slate-700 block mb-1.5">
                          Notes
                        </Label>
                        <Textarea
                          id="editNotes"
                          placeholder="Additional notes..."
                          value={editNotes}
                          onChange={(e) => setEditNotes(e.target.value)}
                          className="h-20 border-border text-xs bg-slate-50/50 focus:ring-1 focus:ring-primary focus:bg-white focus:outline-none"
                        />
                      </div>
                      <div>
                        <Label htmlFor="editTerms" className="text-xs font-bold text-slate-700 block mb-1.5">
                          Terms &amp; Conditions
                        </Label>
                        <Textarea
                          id="editTerms"
                          placeholder="Terms and conditions..."
                          value={editTerms}
                          onChange={(e) => setEditTerms(e.target.value)}
                          className="h-20 border-border text-xs bg-slate-50/50 focus:ring-1 focus:ring-primary focus:bg-white focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Edit Actions */}
                    <div className="flex justify-end gap-3 pr-1">
                      <Button onClick={() => setIsEditing(false)} variant="outline" size="sm" className="h-9 font-semibold text-xs px-4 cursor-pointer" disabled={saving}>
                        Cancel
                      </Button>
                      <Button onClick={handleSaveChanges} size="sm" className="h-9 font-semibold text-xs px-4 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer" disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                      </Button>
                    </div>
                  </div>
                )
              })()
            ) : (
              // ─── VIEW MODE ───
              (() => {
                const subtotal = order.items.reduce((sum, item) => sum + (item.quantity * item.transfer_price), 0)
                const discountPct = order.discount_pct || 0
                const discountAmount = subtotal * (discountPct / 100)
                const discountedSubtotal = subtotal - discountAmount
                const cgstPct = order.cgst_pct || 0
                const sgstPct = order.sgst_pct || 0
                const igstPct = order.igst_pct || 0
                const shipping = order.shipping_charge || 0

                const cgstAmount = discountedSubtotal * (cgstPct / 100)
                const sgstAmount = discountedSubtotal * (sgstPct / 100)
                const igstAmount = discountedSubtotal * (igstPct / 100)
                const grandTotal = discountedSubtotal + cgstAmount + sgstAmount + igstAmount + shipping

                return (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                          Quote Commercials
                          {(order.version_number ?? 1) > 1 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[9px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                              <History className="h-2.5 w-2.5" />
                              v{order.version_number}
                            </span>
                          )}
                        </h3>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between border-b border-border/30 pb-1.5">
                            <span className="text-muted-foreground">Quote Number:</span>
                            <span className="font-bold text-foreground">{order.quote_number || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between border-b border-border/30 pb-1.5">
                            <span className="text-muted-foreground">Deal Reference:</span>
                            <span className="font-semibold text-muted-foreground font-mono text-[10px]">{order.deal_number}</span>
                          </div>
                          <div className="flex justify-between border-b border-border/30 pb-1.5">
                            <span className="text-muted-foreground">OEM:</span>
                            <span className="font-bold text-blue-700 bg-blue-50 border border-blue-100 px-1.5 py-0.2 rounded text-[10px]">
                              {order.oem || 'N/A'}
                            </span>
                          </div>
                          <div className="flex justify-between border-b border-border/30 pb-1.5">
                            <span className="text-muted-foreground">Sales Rep Account:</span>
                            <span className="font-semibold text-foreground">{order.sales_rep_name}</span>
                          </div>
                          <div className="flex justify-between border-b border-border/30 pb-1.5">
                            <span className="text-muted-foreground">Order Initialized:</span>
                            <span className="font-semibold text-foreground">{new Date(order.created_at).toLocaleDateString()}</span>
                          </div>
                          {(order.version_number ?? 1) > 1 && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Last Edited:</span>
                              <span className="font-semibold text-amber-700">{new Date(order.updated_at).toLocaleString()}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Supplier &amp; Distributor Details</h3>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between border-b border-border/30 pb-1.5">
                            <span className="text-muted-foreground">Supplier Name:</span>
                            <span className="font-semibold text-foreground">{order.supplier_name || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between border-b border-border/30 pb-1.5">
                            <span className="text-muted-foreground">Contact:</span>
                            <span className="font-semibold text-foreground">{order.contact_person || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between border-b border-border/30 pb-1.5">
                            <span className="text-muted-foreground">Email:</span>
                            <span className="font-semibold text-foreground truncate max-w-[150px]">{order.email || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between border-b border-border/30 pb-1.5">
                            <span className="text-muted-foreground">Phone:</span>
                            <span className="font-semibold text-foreground">{order.phone || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between border-b border-border/30 pb-1.5">
                            <span className="text-muted-foreground">Payment Terms:</span>
                            <span className="font-semibold text-foreground">{order.payment_terms || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Expected Delivery:</span>
                            <span className="font-semibold text-foreground">{order.expected_delivery_date || 'N/A'}</span>
                          </div>
                        </div>

                        {/* Generate / Preview PO option */}
                        <div className="mt-4 pt-3 border-t border-border/40">
                          {order.vendor_po_number ? (
                            <div className="bg-indigo-50 border border-indigo-100 rounded-md p-3 space-y-2 text-left">
                              <span className="text-[10px] font-bold text-indigo-900 block uppercase tracking-wide">Generated Vendor PO</span>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-indigo-700">{order.vendor_po_number}</span>
                                <span className="text-[9px] text-muted-foreground">• {new Date(order.vendor_po_generated_at || '').toLocaleDateString()}</span>
                              </div>
                              <div className="flex gap-2">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setViewingVendorPo(true)}
                                  className="flex-1 h-8 text-[10px] font-semibold flex items-center justify-center gap-1 border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50/50 cursor-pointer"
                                >
                                  <Eye className="h-3.5 w-3.5" />
                                  Preview
                                </Button>
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleDownloadPo(order)}
                                  className="flex-1 h-8 text-[10px] font-semibold flex items-center justify-center gap-1 border border-indigo-200 text-indigo-700 bg-white hover:bg-indigo-50/50 cursor-pointer"
                                >
                                  <FileDown className="h-3.5 w-3.5" />
                                  Download
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              {isSalesRepOrAdmin ? (
                                <Button
                                  type="button"
                                  onClick={openGeneratePoDialog}
                                  className="w-full h-9 text-xs font-semibold flex items-center justify-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-sm"
                                >
                                  <Printer className="h-4 w-4" />
                                  Generate Vendor PO
                                </Button>
                              ) : (
                                <div className="text-[10px] text-muted-foreground italic text-center py-2 bg-slate-50/50 border border-slate-100 rounded">
                                  Vendor PO not yet generated
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="bg-card border border-border rounded-lg p-5 shadow-sm space-y-3">
                        <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Commercial Summary</h3>
                        <div className="space-y-2 text-xs">
                          <div className="flex justify-between items-center border-b border-border/30 pb-1.5 gap-2">
                            <span className="text-muted-foreground shrink-0 whitespace-nowrap">Subtotal Cost:</span>
                            <span className={`font-semibold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[65%] text-foreground ${formatCurrency(subtotal).length > 20 ? 'text-[10px]' : 'text-xs'}`}>{formatCurrency(subtotal)}</span>
                          </div>
                          {discountPct > 0 && (
                            <div className="flex justify-between items-center border-b border-border/30 pb-1.5 text-red-600 gap-2">
                              <span className="shrink-0 whitespace-nowrap">Discount ({discountPct}%):</span>
                              <span className={`font-semibold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[65%] text-red-600 ${formatCurrency(discountAmount).length > 20 ? 'text-[10px]' : 'text-xs'}`}>-{formatCurrency(discountAmount)}</span>
                            </div>
                          )}
                          {cgstPct > 0 && (
                            <div className="flex justify-between items-center border-b border-border/30 pb-1.5 gap-2">
                              <span className="text-muted-foreground shrink-0 whitespace-nowrap">CGST ({cgstPct}%):</span>
                              <span className={`font-semibold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[65%] ${formatCurrency(cgstAmount).length > 20 ? 'text-[10px]' : 'text-xs'}`}>{formatCurrency(cgstAmount)}</span>
                            </div>
                          )}
                          {sgstPct > 0 && (
                            <div className="flex justify-between items-center border-b border-border/30 pb-1.5 gap-2">
                              <span className="text-muted-foreground shrink-0 whitespace-nowrap">SGST ({sgstPct}%):</span>
                              <span className={`font-semibold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[65%] ${formatCurrency(sgstAmount).length > 20 ? 'text-[10px]' : 'text-xs'}`}>{formatCurrency(sgstAmount)}</span>
                            </div>
                          )}
                          {igstPct > 0 && (
                            <div className="flex justify-between items-center border-b border-border/30 pb-1.5 gap-2">
                              <span className="text-muted-foreground shrink-0 whitespace-nowrap">IGST ({igstPct}%):</span>
                              <span className={`font-semibold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[65%] ${formatCurrency(igstAmount).length > 20 ? 'text-[10px]' : 'text-xs'}`}>{formatCurrency(igstAmount)}</span>
                            </div>
                          )}
                          {shipping > 0 && (
                            <div className="flex justify-between items-center border-b border-border/30 pb-1.5 gap-2">
                              <span className="text-muted-foreground shrink-0 whitespace-nowrap">Shipping:</span>
                              <span className={`font-semibold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[65%] ${formatCurrency(shipping).length > 20 ? 'text-[10px]' : 'text-xs'}`}>{formatCurrency(shipping)}</span>
                            </div>
                          )}
                          <div className="flex justify-between items-center border-b border-border/30 pb-1.5 font-bold gap-2">
                            <span className="text-muted-foreground shrink-0 whitespace-nowrap">Total Revenue:</span>
                            <span className={`font-bold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[65%] text-foreground ${formatCurrency(order.items.reduce((sum, item) => sum + item.quoted_price * item.quantity, 0)).length > 20 ? 'text-[10px]' : 'text-xs'}`}>
                              {formatCurrency(order.items.reduce((sum, item) => sum + item.quoted_price * item.quantity, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between items-center font-bold text-sm text-indigo-900 bg-indigo-50/40 p-2 rounded gap-2">
                            <span className="shrink-0 whitespace-nowrap">Grand Total Cost:</span>
                            <span className={`font-bold font-mono tabular-nums overflow-x-auto whitespace-nowrap scrollbar-none text-right max-w-[60%] ${formatCurrency(grandTotal).length > 20 ? 'text-xs' : 'text-sm'}`}>{formatCurrency(grandTotal)}</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Previous Versions Panel */}
                    {(order.previous_versions ?? []).length > 0 && (
                      <div className="bg-card border border-amber-200 bg-amber-50/10 rounded-lg p-5 shadow-sm space-y-3">
                        <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider flex items-center gap-2">
                          <History className="h-4 w-4 text-amber-600" />
                          Order Edit History (Snapshots)
                          <span className="text-[10px] py-0.5 px-2 bg-amber-100/70 text-amber-700 border border-amber-200 rounded font-semibold ml-auto">
                            {(order.previous_versions ?? []).length} snapshot{(order.previous_versions ?? []).length !== 1 ? 's' : ''} saved
                          </span>
                        </h3>
                        <p className="text-[10px] text-amber-700/80 text-left">
                          Read-only snapshots of previous versions, captured automatically when order details were edited.
                        </p>
                        <div className="space-y-3 text-xs mt-2">
                          {[...(order.previous_versions ?? [])].reverse().map((version, vIdx, arr) => {
                            const vSubtotal = version.items.reduce((sum, item) => sum + (item.quantity * item.transfer_price), 0)
                            const vDiscountAmount = vSubtotal * ((version.discount_pct || 0) / 100)
                            const vDiscountedSubtotal = vSubtotal - vDiscountAmount
                            const vCgstAmount = vDiscountedSubtotal * ((version.cgst_pct || 0) / 100)
                            const vSgstAmount = vDiscountedSubtotal * ((version.sgst_pct || 0) / 100)
                            const vIgstAmount = vDiscountedSubtotal * ((version.igst_pct || 0) / 100)
                            const vGrandTotal = vDiscountedSubtotal + vCgstAmount + vSgstAmount + vIgstAmount + (version.shipping_charge || 0)

                            // Compute diff: compare this snapshot with the next (newer) version or current order
                            const nextVersion = vIdx === 0
                              ? { // current order as next
                                  supplier_name: order.supplier_name,
                                  quoted_value: order.quoted_value,
                                  discount_pct: order.discount_pct,
                                  cgst_pct: order.cgst_pct,
                                  sgst_pct: order.sgst_pct,
                                  igst_pct: order.igst_pct,
                                  shipping_charge: order.shipping_charge,
                                  items: order.items,
                                }
                              : arr[vIdx - 1]

                            const changedFields: string[] = []
                            if (nextVersion.supplier_name !== version.supplier_name) changedFields.push(`Supplier: "${version.supplier_name}" → "${nextVersion.supplier_name}"`)
                            if ((nextVersion.discount_pct || 0) !== (version.discount_pct || 0)) changedFields.push(`Discount: ${version.discount_pct || 0}% → ${nextVersion.discount_pct || 0}%`)
                            if ((nextVersion.cgst_pct || 0) !== (version.cgst_pct || 0)) changedFields.push(`CGST: ${version.cgst_pct || 0}% → ${nextVersion.cgst_pct || 0}%`)
                            if ((nextVersion.sgst_pct || 0) !== (version.sgst_pct || 0)) changedFields.push(`SGST: ${version.sgst_pct || 0}% → ${nextVersion.sgst_pct || 0}%`)
                            if ((nextVersion.igst_pct || 0) !== (version.igst_pct || 0)) changedFields.push(`IGST: ${version.igst_pct || 0}% → ${nextVersion.igst_pct || 0}%`)
                            if ((nextVersion.shipping_charge || 0) !== (version.shipping_charge || 0)) changedFields.push(`Shipping: ${formatCurrency(version.shipping_charge || 0)} → ${formatCurrency(nextVersion.shipping_charge || 0)}`)
                            if (nextVersion.items.length !== version.items.length) changedFields.push(`Items count: ${version.items.length} → ${nextVersion.items.length} line items`)

                            const isExpanded = expandedOrderVersion === version.version_number

                            return (
                              <div key={version.version_number} className="border border-amber-200/80 rounded-lg overflow-hidden bg-white shadow-sm">
                                <button
                                  type="button"
                                  onClick={() => setExpandedOrderVersion(isExpanded ? null : version.version_number)}
                                  className="w-full flex items-center justify-between p-3 hover:bg-amber-50/20 transition-colors text-left focus:outline-none"
                                >
                                  <div className="flex items-center gap-3">
                                    <span className="inline-flex items-center justify-center h-6 w-6 rounded-full bg-amber-100 text-amber-700 font-bold text-[10px] border border-amber-200 shrink-0">
                                      v{version.version_number}
                                    </span>
                                    <div>
                                      <p className="font-bold text-foreground">Supplier: {version.supplier_name}</p>
                                      <p className="text-[9px] text-muted-foreground mt-0.5">
                                        Saved {new Date(version.saved_at).toLocaleString()} by {version.saved_by_name}
                                      </p>
                                      {changedFields.length > 0 && (
                                        <div className="flex flex-wrap gap-1 mt-1">
                                          {changedFields.slice(0, 2).map((change, i) => (
                                            <span key={i} className="text-[9px] bg-orange-50 text-orange-700 border border-orange-100 px-1.5 py-0.5 rounded font-medium">
                                              {change}
                                            </span>
                                          ))}
                                          {changedFields.length > 2 && (
                                            <span className="text-[9px] text-muted-foreground">+{changedFields.length - 2} more changes</span>
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <span className="font-bold text-foreground block">{formatCurrency(vGrandTotal)}</span>
                                    <span className="text-[9px] text-muted-foreground block">{version.items.length} items</span>
                                  </div>
                                </button>

                                {isExpanded && (
                                  <div className="p-4 border-t border-amber-100 bg-amber-50/5 space-y-4 text-left">
                                    {/* What Changed section */}
                                    {changedFields.length > 0 && (
                                      <div className="bg-orange-50 border border-orange-200 rounded-lg p-3 space-y-1.5">
                                        <p className="text-[10px] font-bold text-orange-800 uppercase tracking-wide">What Changed (v{version.version_number} → v{version.version_number + 1})</p>
                                        <div className="space-y-1">
                                          {changedFields.map((change, i) => (
                                            <div key={i} className="flex items-start gap-2 text-[10px]">
                                              <span className="text-orange-500 mt-0.5 shrink-0">→</span>
                                              <span className="text-orange-800 font-medium">{change}</span>
                                            </div>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-[11px]">
                                      <div>
                                        <p className="font-bold text-amber-900 uppercase tracking-wide text-[9px] mb-1">Details Snapshot</p>
                                        <div className="space-y-1">
                                          <p><span className="text-muted-foreground">Supplier:</span> <span className="font-semibold">{version.supplier_name}</span></p>
                                          {version.notes && <p><span className="text-muted-foreground">Notes:</span> <span className="font-sans whitespace-pre-line text-slate-600 block bg-slate-50 border p-1 rounded mt-0.5 text-[10px]">{version.notes}</span></p>}
                                          {version.terms_conditions && <p><span className="text-muted-foreground">Terms:</span> <span className="font-sans whitespace-pre-line text-slate-600 block bg-slate-50 border p-1 rounded mt-0.5 text-[10px]">{version.terms_conditions}</span></p>}
                                        </div>
                                      </div>
                                      <div className="space-y-1.5 max-w-xs ml-auto w-full border-l pl-4 border-amber-200/50">
                                        <p className="font-bold text-amber-900 uppercase tracking-wide text-[9px] mb-1">Commercial Summary</p>
                                        <div className="flex justify-between"><span className="text-muted-foreground">Subtotal Cost:</span> <span>{formatCurrency(vSubtotal)}</span></div>
                                        {version.discount_pct ? <div className="flex justify-between text-red-600"><span>Discount ({version.discount_pct}%):</span> <span>-{formatCurrency(vDiscountAmount)}</span></div> : null}
                                        {version.cgst_pct ? <div className="flex justify-between"><span>CGST ({version.cgst_pct}%):</span> <span>{formatCurrency(vCgstAmount)}</span></div> : null}
                                        {version.sgst_pct ? <div className="flex justify-between"><span>SGST ({version.sgst_pct}%):</span> <span>{formatCurrency(vSgstAmount)}</span></div> : null}
                                        {version.igst_pct ? <div className="flex justify-between"><span>IGST ({version.igst_pct}%):</span> <span>{formatCurrency(vIgstAmount)}</span></div> : null}
                                        {version.shipping_charge ? <div className="flex justify-between"><span>Shipping:</span> <span>{formatCurrency(version.shipping_charge)}</span></div> : null}
                                        <div className="flex justify-between font-bold border-t pt-1 text-indigo-900"><span>Grand Total Cost:</span> <span>{formatCurrency(vGrandTotal)}</span></div>
                                      </div>
                                    </div>
                                    <div className="border border-border/60 rounded overflow-hidden mt-2 bg-white">
                                      <table className="w-full text-left border-collapse text-[10px]">
                                        <thead>
                                          <tr className="bg-slate-50 border-b border-border/60 font-bold text-slate-600">
                                            <th className="p-2">Item Description</th>
                                            <th className="p-2 text-right">Qty</th>
                                            <th className="p-2 text-right">Unit Price (TP)</th>
                                            <th className="p-2 text-right">Subtotal</th>
                                          </tr>
                                        </thead>
                                        <tbody>
                                          {version.items.map((item, idx) => (
                                            <tr key={idx} className="border-b border-border/30 last:border-0">
                                              <td className="p-2 font-medium">{item.product_name}</td>
                                              <td className="p-2 text-right">{item.quantity}</td>
                                              <td className="p-2 text-right">{formatCurrency(item.transfer_price)}</td>
                                              <td className="p-2 text-right">{formatCurrency(item.quantity * item.transfer_price)}</td>
                                            </tr>
                                          ))}
                                        </tbody>
                                      </table>
                                    </div>
                                  </div>
                                )}
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Line items table */}
                    <div className="bg-card border border-border rounded-lg shadow-sm p-5 space-y-3">
                      <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">Order Items List</h3>
                      <div className="border border-border/50 rounded-md overflow-hidden">
                        <table className="w-full text-left border-collapse text-xs">
                          <thead>
                            <tr className="bg-muted/40 border-b border-border/50 text-[10px] font-bold text-muted-foreground uppercase">
                              <th className="p-3">Product Name / SKU *</th>
                              <th className="p-3">Quantity</th>
                              <th className="p-3 text-right">Transfer Price (TP)</th>
                              <th className="p-3 text-right">Quoted Price (QP)</th>
                              <th className="p-3 text-right">Line Total</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/40 font-medium">
                            {order.items.map((item, i) => (
                              <tr key={i} className="hover:bg-muted/10">
                                <td className="p-3">
                                  <span className="font-bold text-foreground">{item.product_name}</span>
                                  <span className="block text-[10px] text-muted-foreground mt-0.5">SKU: {item.sku}</span>
                                </td>
                                <td className="p-3 text-foreground">{item.quantity}</td>
                                <td className="p-3 text-right text-muted-foreground">{formatCurrency(item.transfer_price)}</td>
                                <td className="p-3 text-right text-foreground">{formatCurrency(item.quoted_price)}</td>
                                <td className="p-3 text-right text-foreground font-bold">
                                  {formatCurrency(item.quoted_price * item.quantity)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Notes & Terms Conditions block */}
                    {(order.notes || order.terms_conditions) && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card border border-border rounded-lg p-5 shadow-sm text-xs">
                        {order.notes && (
                          <div className="space-y-1.5 text-left">
                            <span className="font-bold text-indigo-900 uppercase tracking-wide text-[10px] block">Notes</span>
                            <p className="text-muted-foreground whitespace-pre-wrap">{order.notes}</p>
                          </div>
                        )}
                        {order.terms_conditions && (
                          <div className="space-y-1.5 text-left">
                            <span className="font-bold text-indigo-900 uppercase tracking-wide text-[10px] block">Terms &amp; Conditions</span>
                            <p className="text-muted-foreground whitespace-pre-wrap">{order.terms_conditions}</p>
                          </div>
                        )}
                      </div>
                    )}

                    <div className="flex justify-end pr-1">
                      <Button onClick={() => setActiveTab('checklist')} size="sm" className="h-9 font-semibold text-xs px-4">
                        Proceed to Checklist
                      </Button>
                    </div>
                  </>
                )
              })()
            )}
          </div>
        )}

        {/* Tab 2: Pre-Execution Checklist */}
        {activeTab === 'checklist' && (
          <div className="space-y-6">
            <div className="bg-card border border-border rounded-lg shadow-sm p-5 space-y-4">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-border/50 pb-3 gap-2">
                <div>
                  <h3 className="text-sm font-bold text-foreground uppercase tracking-wider">Order Execution Checklist</h3>
                  <p className="text-[10px] text-muted-foreground mt-0.5">Execution gates required to complete and close the order.</p>
                </div>
                {user.role === 'sales_rep' && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-1 rounded flex items-center gap-1.5 shrink-0">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Read Only (Only Ops Executive / Admin can check-off)
                  </span>
                )}
              </div>

              {/* Grid table */}
              <div className="border border-border/50 rounded-md overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border/50 text-[10px] font-bold text-muted-foreground uppercase">
                      <th className="p-3 w-1/3">Execution Gate</th>
                      <th className="p-3 text-center w-24">Status (Y/N)</th>
                      <th className="p-3">Remarks / Reference Documents</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40 font-medium text-xs">
                    {GATES_METADATA.map((gate) => {
                      const isChecked = (checklist as any)[gate.key] || false
                      const remarkValue = (checklist.remarks && checklist.remarks[gate.key]) || ''

                      return (
                        <tr key={gate.key} className="hover:bg-muted/10">
                          <td className="p-3 font-semibold text-foreground">
                            <div className="flex flex-col gap-0.5 text-left">
                              <span>{gate.label}</span>
                              <span className="text-[10px] text-muted-foreground font-normal">{gate.desc}</span>
                            </div>
                            {gate.key === 'customer_po_received' && (
                              <div className="mt-1.5 text-left">
                                {order.customer_po_file ? (
                                  <div className="flex flex-col gap-1 text-[10px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded p-1.5 font-normal w-fit">
                                    <span className="font-bold flex items-center gap-1">
                                      <FileText className="h-3.5 w-3.5 shrink-0" />
                                      <span className="truncate max-w-[120px]">{order.customer_po_file.name}</span>
                                    </span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <button
                                        type="button"
                                        onClick={() => setViewingCustomerPo(true)}
                                        className="text-primary hover:underline font-bold text-[9px] flex items-center gap-0.5 cursor-pointer"
                                      >
                                        <Eye className="h-2.5 w-2.5" /> View
                                      </button>
                                      {(user.role === 'ops' || user.role === 'admin' || user.role === 'sales_head') && (
                                        <button
                                          type="button"
                                          onClick={handleCustomerPoDelete}
                                          className="text-red-600 hover:underline font-bold text-[9px] flex items-center gap-0.5 cursor-pointer"
                                        >
                                          <Trash2 className="h-2.5 w-2.5" /> Delete
                                        </button>
                                      )}
                                    </div>
                                  </div>
                                ) : (
                                  <div>
                                    {(user.role === 'ops' || user.role === 'admin' || user.role === 'sales_head' || user.role === 'sales_rep') ? (
                                      <>
                                        <button
                                          type="button"
                                          onClick={() => fileInputRef.current?.click()}
                                          className="inline-flex items-center gap-1 text-[9px] font-bold text-sky-600 hover:text-sky-700 border border-sky-200 bg-sky-50/50 hover:bg-sky-50 px-1.5 py-0.5 rounded cursor-pointer transition-colors"
                                        >
                                          <Upload className="h-2.5 w-2.5" /> Attach PO File
                                        </button>
                                        <input
                                          type="file"
                                          ref={fileInputRef}
                                          onChange={handleCustomerPoUpload}
                                          className="hidden"
                                          accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                        />
                                      </>
                                    ) : (
                                      <span className="text-[10px] text-muted-foreground italic font-normal">No document uploaded</span>
                                    )}
                                  </div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="p-3 text-center">
                            <input
                              type="checkbox"
                              disabled={user.role !== 'ops' && user.role !== 'admin' && user.role !== 'sales_head'}
                              checked={isChecked}
                              onChange={(e) => {
                                setChecklist({
                                  ...checklist,
                                  [gate.key]: e.target.checked
                                })
                              }}
                              className="h-4 w-4 text-primary border-slate-300 rounded focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                            />
                          </td>
                          <td className="p-3">
                            <Input
                              value={remarkValue}
                              disabled={user.role !== 'ops' && user.role !== 'admin' && user.role !== 'sales_head'}
                              onChange={(e) => {
                                const newRemarks = { ...(checklist.remarks || {}) }
                                newRemarks[gate.key] = e.target.value
                                setChecklist({
                                  ...checklist,
                                  remarks: newRemarks
                                })
                              }}
                              className="h-8 text-xs bg-slate-50/50"
                              placeholder="Remarks / References"
                            />
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Save checklist button */}
            {(user.role === 'ops' || user.role === 'admin' || user.role === 'sales_head') && (
              <div className="flex justify-end pr-1 gap-2">
                <Button
                  onClick={handleSaveChecklist}
                  disabled={saving}
                  className="h-10 text-xs font-semibold px-5 bg-sky-600 hover:bg-sky-500 text-white cursor-pointer shadow-md shadow-sky-600/10"
                >
                  {saving ? 'Saving...' : 'Save Execution Checklist'}
                </Button>
              </div>
            )}
          </div>
        )}

      </div>

      {/* Customer PO View Dialog */}
      <Dialog open={viewingCustomerPo} onOpenChange={setViewingCustomerPo}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between pr-6 border-b pb-2">
              <span className="text-sm font-bold uppercase tracking-wider text-foreground">Customer Purchase Order Preview</span>
              {order.customer_po_file && (
                <span className="text-xs text-muted-foreground font-normal">{order.customer_po_file.name}</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {order.customer_po_file ? (
            <div className="mt-4">
              {order.customer_po_file.dataUrl && order.customer_po_file.type === 'application/pdf' ? (
                <iframe src={order.customer_po_file.dataUrl} className="w-full h-[60vh] border rounded-lg" />
              ) : order.customer_po_file.dataUrl && order.customer_po_file.type.startsWith('image/') ? (
                <img src={order.customer_po_file.dataUrl} className="max-w-full h-auto max-h-[60vh] object-contain border rounded-lg mx-auto" />
              ) : (
                <div className="flex flex-col items-center justify-center p-12 border border-dashed rounded-lg bg-muted/20">
                  <FileText className="h-16 w-16 text-muted-foreground/40 mb-3" />
                  <span className="font-bold text-foreground text-sm">{order.customer_po_file.name}</span>
                  <span className="text-xs text-muted-foreground mt-1">Format: {order.customer_po_file.type} • {(order.customer_po_file.size / 1024).toFixed(1)} KB</span>
                  <Button asChild variant="outline" size="sm" className="mt-4 bg-sky-600 hover:bg-sky-500 text-white cursor-pointer">
                    <a href={order.customer_po_file.dataUrl} download={order.customer_po_file.name}>
                      <Download className="h-3.5 w-3.5 mr-1" /> Download Document
                    </a>
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-center text-muted-foreground p-6">No document uploaded.</p>
          )}
        </DialogContent>
      </Dialog>

      {/* Vendor PO Dialog */}
      <Dialog open={viewingVendorPo} onOpenChange={setViewingVendorPo}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-0">
          <DialogHeader className="p-6 border-b flex flex-row items-center justify-between">
            <DialogTitle className="text-sm font-bold uppercase tracking-wider text-foreground">
              Supplier Purchase Order Details
            </DialogTitle>
            <div className="flex gap-2 mr-6">
              <Button
                onClick={() => handleDownloadPo(order)}
                size="sm"
                className="text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
              >
                <FileDown className="h-4 w-4" />
                Download PDF
              </Button>
              <Button
                onClick={handlePrintPo}
                size="sm"
                className="text-xs font-semibold gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white cursor-pointer"
              >
                <Printer className="h-4 w-4" />
                Print Purchase Order
              </Button>
            </div>
          </DialogHeader>

          {/* The printable document container */}
          <div id="printable-po" className="p-8 bg-white text-black space-y-6">
            <style dangerouslySetInnerHTML={{
              __html: `
              #printable-po .text-indigo-900 { color: ${poThemeColor} !important; }
              #printable-po .border-indigo-950 { border-color: ${poThemeColor} !important; }
              #printable-po .bg-indigo-50\\/30 { background-color: ${poAccentColor} !important; }
              #printable-po .text-indigo-950 { color: ${poThemeColor} !important; }
              #printable-po .bg-indigo-100 { background-color: ${poAccentColor} !important; }
              #printable-po .text-indigo-700 { color: ${poThemeColor} !important; }
              #printable-po thead tr { border-bottom: 2px solid ${poThemeColor} !important; background: ${poAccentColor} !important; }
              #printable-po .border-t-2 { border-top-color: ${poThemeColor} !important; }
              #printable-po .border-indigo-900 { border-color: ${poThemeColor} !important; }
              #printable-po .bg-indigo-50\\/40 { background-color: ${poAccentColor} !important; }

              ${settings.po_developer_styles ? (() => {
                let devStyles = ''
                try {
                  const parsed = JSON.parse(settings.po_developer_styles)
                  if (parsed.fontSize) devStyles += `#printable-po { font-size: ${parsed.fontSize}px !important; }\n`
                  if (parsed.lineHeight) devStyles += `#printable-po { line-height: ${parsed.lineHeight} !important; }\n`
                  if (parsed.tableCellPadding) devStyles += `#printable-po th, #printable-po td { padding: ${parsed.tableCellPadding}px !important; }\n`
                } catch {}
                return devStyles
              })() : ''}
            `}} />

            {settings.po_custom_header_note && (
              <div className="bg-slate-50 border border-slate-200 p-2 text-[10px] rounded text-slate-500 mb-4 text-left">
                {resolvePoTags(settings.po_custom_header_note)}
              </div>
            )}

            {/* Letterhead Header */}
            <div className="flex justify-between items-start border-b pb-6">
              <div className="flex items-start gap-4">
                <img
                  src="https://framerusercontent.com/images/AlNvsxkJzF8SFWwwytH2xsnL8uM.png"
                  alt="Aicera Logo"
                  className="h-8 w-8 rounded object-contain shrink-0"
                />
                <div className="space-y-1 text-left">
                  <div className="text-xl font-bold tracking-tight text-indigo-900 font-display">
                    Aicera Systems Pvt Ltd
                  </div>
                  <div className="text-[10px] text-muted-foreground max-w-[250px] leading-relaxed">
                    sales@aicera.co.in | 9945073777 | GSTIN: 29AAXCA8339E1Z1<br />
                    224, Bannerghatta Rd, Near Arekere Gate, Arekere, Bengaluru - 560 076
                  </div>
                </div>
              </div>

              <div className="text-right space-y-1">
                <h1 className="text-xl font-bold uppercase text-indigo-900 tracking-wider">Purchase Order</h1>
                <div className="text-xs">
                  <p><span className="text-muted-foreground font-semibold">PO Number:</span> <strong className="text-black font-mono">{order.vendor_po_number || `PO-${order.order_number.replace('ORD-', '')}`}</strong></p>
                  <p><span className="text-muted-foreground font-semibold">Date:</span> <span className="font-medium">{new Date(order.vendor_po_generated_at || Date.now()).toLocaleDateString()}</span></p>
                  <p><span className="text-muted-foreground font-semibold">Quote Reference:</span> <span className="font-semibold">{order.quote_number || 'N/A'}</span></p>
                </div>
              </div>
            </div>

            {/* Address Grid */}
            <div className="grid grid-cols-2 gap-6 text-xs border-b pb-6 text-left">
              <div className="space-y-1">
                <span className="font-bold text-indigo-900 uppercase tracking-wide text-[10px]">Vendor/Supplier</span>
                <p className="font-bold text-sm">{order.supplier_name}</p>
                <div className="text-muted-foreground leading-normal mt-1">
                  {order.contact_person && <p>Contact: {order.contact_person}</p>}
                  {order.email && <p>Email: {order.email}</p>}
                  {order.phone && <p>Phone: {order.phone}</p>}
                  {order.vendor_address && <p className="mt-1 whitespace-pre-wrap">Address: {order.vendor_address}</p>}
                </div>
              </div>

              <div className="space-y-1">
                <span className="font-bold text-indigo-900 uppercase tracking-wide text-[10px]">Deliver / Bill To</span>
                <p className="font-bold text-sm">Aicera Systems Pvt Ltd</p>
                <div className="text-muted-foreground leading-normal mt-1">
                  224, Bannerghatta Rd, Near Arekere Gate,<br />
                  Arekere, Bengaluru, Karnataka 560 076<br />
                  GSTIN: 29AAFCA8891C1ZP
                </div>
              </div>
            </div>

            {/* Details and dates */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs border-b pb-6 bg-slate-50/50 p-4 rounded-lg text-left">
              <div>
                <span className="text-muted-foreground font-semibold block text-[10px]">Payment Terms</span>
                <span className="font-bold text-foreground mt-0.5 block">{order.payment_terms || 'Net 30'}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold block text-[10px]">Delivery Date (Target)</span>
                <span className="font-bold text-foreground mt-0.5 block">{order.expected_delivery_date || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold block text-[10px]">OEM Brand</span>
                <span className="font-bold text-indigo-800 mt-0.5 block">{order.oem || 'N/A'}</span>
              </div>
              <div>
                <span className="text-muted-foreground font-semibold block text-[10px]">Client Reference</span>
                <span className="font-bold text-foreground mt-0.5 block truncate">{order.customer_name}</span>
              </div>
            </div>

            {/* Line Items Table */}
            <div className="space-y-2 text-left">
              <span className="font-bold text-indigo-900 uppercase tracking-wide text-[10px]">Purchase Itemized Details</span>
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b-2 border-indigo-950 font-bold bg-indigo-50/30 text-indigo-950">
                    {((settings.po_visible_columns || []).includes('sl')) && <th className="p-3 w-12 text-center font-bold">#</th>}
                    {((settings.po_visible_columns || []).includes('desc')) && <th className="p-3 font-bold">Product Description</th>}
                    {((settings.po_visible_columns || []).includes('qty')) && <th className="p-3 text-center w-16 font-bold">Qty</th>}
                    {((settings.po_visible_columns || []).includes('unitCost')) && <th className="p-3 text-right w-32 font-bold">Unit Price (Cost)</th>}
                    {((settings.po_visible_columns || []).includes('totalCost')) && <th className="p-3 text-right w-36 font-bold">Line Total</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {order.items.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/20">
                      {((settings.po_visible_columns || []).includes('sl')) && <td className="p-3 text-center text-muted-foreground font-mono">{idx + 1}</td>}
                      {((settings.po_visible_columns || []).includes('desc')) && (
                        <td className="p-3">
                          <span className="font-bold text-slate-900">{item.product_name}</span>
                        </td>
                      )}
                      {((settings.po_visible_columns || []).includes('qty')) && <td className="p-3 text-center font-bold text-slate-800">{item.quantity}</td>}
                      {((settings.po_visible_columns || []).includes('unitCost')) && <td className="p-3 text-right text-slate-700">{formatCurrency(item.transfer_price)}</td>}
                      {((settings.po_visible_columns || []).includes('totalCost')) && (
                        <td className="p-3 text-right font-bold text-slate-900">
                          {formatCurrency(item.transfer_price * item.quantity)}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Totals Summary — reads all saved tax/discount/shipping fields from the order */}
            {(() => {
              const _subtotal = order.items.reduce((s, i) => s + i.transfer_price * i.quantity, 0)
              const _discountPct = order.discount_pct || 0
              const _discountAmt = _subtotal * (_discountPct / 100)
              const _discountedSub = _subtotal - _discountAmt
              const _cgstPct = order.cgst_pct || 0
              const _sgstPct = order.sgst_pct || 0
              const _igstPct = order.igst_pct || 0
              const _shipping = order.shipping_charge || 0
              const _cgstAmt = _discountedSub * (_cgstPct / 100)
              const _sgstAmt = _discountedSub * (_sgstPct / 100)
              const _igstAmt = _discountedSub * (_igstPct / 100)
              const _grandTotal = _discountedSub + _cgstAmt + _sgstAmt + _igstAmt + _shipping
              return (
                <div className="flex justify-end pt-4 border-t-2 border-indigo-900">
                  <div className="w-80 text-xs space-y-2 text-left">
                    <div className="flex justify-between font-semibold border-b pb-1">
                      <span className="text-muted-foreground">Subtotal (Excl. Taxes):</span>
                      <span>{formatCurrency(_subtotal)}</span>
                    </div>
                    {_discountPct > 0 && (
                      <div className="flex justify-between font-semibold border-b pb-1 text-red-600">
                        <span>Discount ({_discountPct}%):</span>
                        <span>-{formatCurrency(_discountAmt)}</span>
                      </div>
                    )}
                    {_cgstPct > 0 && (
                      <div className="flex justify-between font-semibold border-b pb-1">
                        <span className="text-muted-foreground">CGST ({_cgstPct}%):</span>
                        <span>{formatCurrency(_cgstAmt)}</span>
                      </div>
                    )}
                    {_sgstPct > 0 && (
                      <div className="flex justify-between font-semibold border-b pb-1">
                        <span className="text-muted-foreground">SGST ({_sgstPct}%):</span>
                        <span>{formatCurrency(_sgstAmt)}</span>
                      </div>
                    )}
                    {_igstPct > 0 && (
                      <div className="flex justify-between font-semibold border-b pb-1">
                        <span className="text-muted-foreground">IGST ({_igstPct}%):</span>
                        <span>{formatCurrency(_igstAmt)}</span>
                      </div>
                    )}
                    {_shipping > 0 && (
                      <div className="flex justify-between font-semibold border-b pb-1">
                        <span className="text-muted-foreground">Shipping:</span>
                        <span>{formatCurrency(_shipping)}</span>
                      </div>
                    )}
                    <div className="flex justify-between font-bold text-sm text-indigo-900 bg-indigo-50/40 p-2 rounded">
                      <span>Grand Total Cost (INR):</span>
                      <span>{formatCurrency(_grandTotal)}</span>
                    </div>
                  </div>
                </div>
              )
            })()}

            {/* Notes and Terms & Conditions */}
            {(order.notes || order.terms_conditions) && (
              <div className="grid grid-cols-2 gap-6 pt-4 border-t text-[10px] text-left">
                <div>
                  <span className="font-bold text-indigo-900 block uppercase tracking-wide">Notes</span>
                  <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{order.notes || 'N/A'}</p>
                </div>
                <div>
                  <span className="font-bold text-indigo-900 block uppercase tracking-wide">Terms &amp; Conditions</span>
                  <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{order.terms_conditions || 'N/A'}</p>
                </div>
              </div>
            )}

            {/* Signature Area */}
            <div className="grid grid-cols-2 gap-12 pt-16 text-center text-xs">
              <div className="space-y-4">
                <div className="border-b w-48 mx-auto h-12 flex items-end justify-center text-muted-foreground italic text-[10px]">
                  Generated Electronically
                </div>
                <p className="font-bold text-slate-800">Authorized Procurement Agent</p>
                <p className="text-[10px] text-muted-foreground">Aicera Systems Pvt Ltd</p>
              </div>
              <div className="space-y-4">
                <div className="border-b w-48 mx-auto h-12"></div>
                <p className="font-bold text-slate-800">Supplier Acknowledgment</p>
                <p className="text-[10px] text-muted-foreground">Sign and Return for Acceptance</p>
              </div>
            </div>

            {settings.po_custom_footer_note && (
              <div className="border-t pt-2 mt-6 text-[9px] text-slate-400 font-mono flex justify-between text-left">
                <span>{resolvePoTags(settings.po_custom_footer_note)}</span>
                <span>Page 1 of 1</span>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Generate Vendor PO Dialog */}
      <Dialog open={isGeneratePoOpen} onOpenChange={setIsGeneratePoOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto p-6 bg-[#FAF9F6]">
          <DialogHeader className="border-b pb-4 flex flex-row items-center justify-between text-left">
            <div>
              <DialogTitle className="text-xl font-bold font-display text-indigo-950">
                Generate Vendor Purchase Order
              </DialogTitle>
              <p className="text-xs text-muted-foreground mt-1">Review and fill vendor details before generating the purchase order document</p>
            </div>
          </DialogHeader>

          <form onSubmit={handleGenerateVendorPoSubmit} className="space-y-6 mt-4 text-left">
            {/* Vendor Details */}
            <div className="bg-white p-4 md:p-5 border border-slate-200 rounded-lg shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-indigo-950 uppercase tracking-wider border-b pb-2">
                Supplier & Distributor Details
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="lg:col-span-2">
                  <Label htmlFor="supplier-name-dialog" className="text-[10px] font-bold text-slate-500 mb-1.5 block">
                    Supplier Name *
                  </Label>
                  <Input
                    id="supplier-name-dialog"
                    value={formSupplierName}
                    onChange={(e) => setFormSupplierName(e.target.value)}
                    className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                    placeholder="Enter supplier name"
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="contact-person-dialog" className="text-[10px] font-bold text-slate-500 mb-1.5 block">
                    Contact Person
                  </Label>
                  <Input
                    id="contact-person-dialog"
                    value={formContactPerson}
                    onChange={(e) => setFormContactPerson(e.target.value)}
                    className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                    placeholder="Name"
                  />
                </div>

                <div>
                  <Label htmlFor="email-dialog" className="text-[10px] font-bold text-slate-500 mb-1.5 block">
                    Email
                  </Label>
                  <Input
                    id="email-dialog"
                    type="email"
                    value={formEmail}
                    onChange={(e) => setFormEmail(e.target.value)}
                    className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                    placeholder="contact@supplier.com"
                  />
                </div>

                <div>
                  <Label htmlFor="phone-dialog" className="text-[10px] font-bold text-slate-500 mb-1.5 block">
                    Phone
                  </Label>
                  <Input
                    id="phone-dialog"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                    placeholder="Contact number"
                  />
                </div>

                <div>
                  <Label htmlFor="oem-dialog" className="text-[10px] font-bold text-slate-500 mb-1.5 block">
                    OEM Brand
                  </Label>
                  <Input
                    id="oem-dialog"
                    value={formOem}
                    onChange={(e) => setFormOem(e.target.value)}
                    className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. Cisco, Aicera"
                  />
                </div>

                <div>
                  <Label htmlFor="payment-terms-dialog" className="text-[10px] font-bold text-slate-500 mb-1.5 block">
                    Payment Terms
                  </Label>
                  <Input
                    id="payment-terms-dialog"
                    value={formPaymentTerms}
                    onChange={(e) => setFormPaymentTerms(e.target.value)}
                    className="h-10 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                    placeholder="e.g. Net 30, 50% Advance"
                  />
                </div>

                <div>
                  <Label htmlFor="delivery-date-dialog" className="text-[10px] font-bold text-slate-500 mb-1.5 block">
                    Expected Delivery Date
                  </Label>
                  <div className="relative">
                    <Input
                      type="date"
                      id="delivery-date-dialog"
                      value={formExpectedDeliveryDate}
                      onChange={(e) => setFormExpectedDeliveryDate(e.target.value)}
                      className="pl-9 h-10 border-slate-300 text-xs bg-white rounded focus:ring-1 focus:ring-indigo-500 animate-none"
                    />
                    <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>
              </div>

              {/* Integrated PO Items & Worksheet Section inside the card */}
              <div className="border-t border-slate-100 pt-5 mt-5 space-y-4 text-left">
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
                      onClick={handleFormAddItem}
                      className="h-8 text-xs font-semibold px-3 border border-indigo-200 text-indigo-600 hover:bg-indigo-50 cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5 mr-1" />
                      Add Item
                    </Button>
                  </div>

                  {/* Items List */}
                  <div className="space-y-3 max-h-48 overflow-y-auto pr-1">
                    {formItems.map((item, index) => (
                      <div key={index} className="flex gap-3 items-start bg-white p-3 border border-slate-200 rounded-lg shadow-sm">
                        <div className="flex-1 min-w-0">
                          <Input
                            placeholder="Product Description (e.g. Dell Servers)"
                            value={item.product_name}
                            onChange={(e) => handleFormItemChange(index, 'product_name', e.target.value)}
                            className="h-9 border-slate-200 text-xs focus:ring-1 focus:ring-indigo-500"
                          />
                        </div>
                        <div className="w-20">
                          <Input
                            type="number"
                            placeholder="Qty"
                            value={item.quantity || ''}
                            onChange={(e) => handleFormItemChange(index, 'quantity', e.target.value)}
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
                            onChange={(e) => handleFormItemChange(index, 'transfer_price', e.target.value)}
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
                          onClick={() => handleFormRemoveItem(index)}
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
                      value={formDiscountPct || ''}
                      onChange={(e) => setFormDiscountPct(Number(e.target.value) || 0)}
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
                      value={formCgstPct || ''}
                      onChange={(e) => setFormCgstPct(Number(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      className="h-9 border-slate-200 text-xs bg-white"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-500 mb-1 block">SGST (%)</Label>
                    <Input
                      type="number"
                      value={formSgstPct || ''}
                      onChange={(e) => setFormSgstPct(Number(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      className="h-9 border-slate-200 text-xs bg-white"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-500 mb-1 block">IGST (%)</Label>
                    <Input
                      type="number"
                      value={formIgstPct || ''}
                      onChange={(e) => setFormIgstPct(Number(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      className="h-9 border-slate-200 text-xs bg-white"
                      min="0"
                    />
                  </div>
                  <div>
                    <Label className="text-[10px] font-semibold text-slate-500 mb-1 block">Shipping (₹)</Label>
                    <Input
                      type="number"
                      value={formShipping || ''}
                      onChange={(e) => setFormShipping(Number(e.target.value) || 0)}
                      onFocus={(e) => e.target.select()}
                      className="h-9 border-slate-200 text-xs bg-white"
                      min="0"
                    />
                  </div>
                </div>

                {/* Calculations Box */}
                <div className="bg-white p-4 border border-slate-200 rounded-lg space-y-2 text-xs text-slate-700">
                  <div className="flex justify-between border-b pb-1.5">
                    <span className="text-slate-500">Subtotal:</span>
                    <span className="font-semibold">₹{formSubtotal.toFixed(2)}</span>
                  </div>
                  {formDiscountPct > 0 && (
                    <div className="flex justify-between border-b pb-1.5 text-red-600">
                      <span>Discount ({formDiscountPct}%):</span>
                      <span>-₹{formDiscountAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {formCgstPct > 0 && (
                    <div className="flex justify-between border-b pb-1.5">
                      <span className="text-slate-500">CGST ({formCgstPct}%):</span>
                      <span>₹{formCgstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {formSgstPct > 0 && (
                    <div className="flex justify-between border-b pb-1.5">
                      <span className="text-slate-500">SGST ({formSgstPct}%):</span>
                      <span>₹{formSgstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {formIgstPct > 0 && (
                    <div className="flex justify-between border-b pb-1.5">
                      <span className="text-slate-500">IGST ({formIgstPct}%):</span>
                      <span>₹{formIgstAmount.toFixed(2)}</span>
                    </div>
                  )}
                  {formShipping > 0 && (
                    <div className="flex justify-between border-b pb-1.5">
                      <span className="text-slate-500">Shipping (₹):</span>
                      <span>₹{Number(formShipping).toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex justify-between font-bold text-sm text-indigo-950 pt-1 border-t">
                    <span>Total:</span>
                    <span>₹{formTotal.toFixed(2)}</span>
                  </div>
                </div>

                {/* Notes and Terms */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="notes-dialog" className="text-xs font-bold text-indigo-950 block mb-1.5">
                      Notes
                    </Label>
                    <Textarea
                      id="notes-dialog"
                      placeholder="Additional notes..."
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="h-20 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <Label htmlFor="terms-dialog" className="text-xs font-bold text-indigo-950 block mb-1.5">
                      Terms &amp; Conditions
                    </Label>
                    <Textarea
                      id="terms-dialog"
                      placeholder="Terms and conditions..."
                      value={formTerms}
                      onChange={(e) => setFormTerms(e.target.value)}
                      className="h-20 border-slate-300 text-xs bg-white focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t border-slate-200">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsGeneratePoOpen(false)}
                className="h-10 text-xs font-semibold px-5 border border-slate-300 text-slate-700 bg-white hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={saving}
                className="h-10 text-xs font-semibold px-5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shadow-md"
              >
                {saving ? 'Generating...' : 'Generate & Save PO'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
      {/* Delete Order Confirmation Dialog */}
      <Dialog open={showDeleteOrderModal} onOpenChange={setShowDeleteOrderModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-lg font-bold flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Delete Order
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground pt-1">
              Are you sure you want to delete <strong className="text-foreground">{order?.order_number || order?.title}</strong>? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-4 border-t mt-3">
            <Button variant="outline" size="sm" onClick={() => setShowDeleteOrderModal(false)} disabled={isDeletingOrder}>
              Cancel
            </Button>
            <Button variant="destructive" size="sm" onClick={handleDeleteOrder} disabled={isDeletingOrder} className="gap-1.5 font-semibold">
              <Trash2 className="h-4 w-4" />
              {isDeletingOrder ? 'Deleting...' : 'Delete Order'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
