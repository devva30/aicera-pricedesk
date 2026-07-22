import { useEffect, useRef, useState, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { motion } from 'framer-motion'
import { toast } from 'sonner'
import {
  FileText, Plus, Trash2, ChevronDown, ArrowLeft, Rocket, Zap,
  ClipboardList, MessageSquare, FileCheck2, Upload, Clipboard,
  Briefcase, Calendar, Layers, X, AlertTriangle, Download,
  Package, Building2, User2, DollarSign, Settings2, Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth-store'
import { fetchCustomers } from '@/services/customers-service'
import { saveDeal, fetchDealById, fetchDeals } from '@/services/deals-service'
import { useDispatch } from 'react-redux'
import { addDeal, updateDeal } from '@/store/deals-slice'
import type { Customer } from '@/lib/mock-data'
import type { BOMItem, Deal, DealVersion, DealItemSubItem } from '@/types'
import { PDFDownloadLink } from '@react-pdf/renderer'
import { QuotePDFDocument } from '@/components/deals/PDFDocument'

// ─── Types ────────────────────────────────────────────────────────────────────
interface LineItem {
  id: string
  description: string
  hsnSac: string
  quantity: number
  unitPrice: number
  unitCost: number
  sub_items?: DealItemSubItem[]
  showSubItems?: boolean
}

const TAX_PRESETS = [
  { label: 'IN - GST (CGST: 9%, SGST: 9%, IGST: 0%)', cgst: 9, sgst: 9, igst: 0 },
  { label: 'IN - GST (CGST: 0%, SGST: 0%, IGST: 18%)', cgst: 0, sgst: 0, igst: 18 },
  { label: 'IN - GST (CGST: 6%, SGST: 6%, IGST: 0%)', cgst: 6, sgst: 6, igst: 0 },
  { label: 'Export / Zero-rated (0%)', cgst: 0, sgst: 0, igst: 0 },
]

const CURRENCIES = ['INR', 'USD', 'EUR', 'GBP', 'AED']

function newLineItem(): LineItem {
  return {
    id: `li-${Date.now()}-${Math.random()}`,
    description: '',
    hsnSac: '',
    quantity: 1,
    unitPrice: 0,
    unitCost: 0,
    sub_items: [],
    showSubItems: false,
  }
}

function newSubItem(): DealItemSubItem {
  return {
    id: `sub-${Date.now()}-${Math.random()}`,
    part_number: '',
    brand: '',
    description: '',
    quantity: 1,
    unit_cost: 0,
    unit_price: 0,
  }
}

const safeNum = (val: any) => {
  const n = Number(val)
  return isNaN(n) ? 0 : n
}

function fmt(n: number, currency: string) {
  const safeVal = safeNum(n)
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '€' : currency === 'GBP' ? '£' : currency === 'AED' ? 'د.إ' : '₹'
  return `${symbol}${safeVal.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

// ─── Sub-components ───────────────────────────────────────────────────────────
function SectionCard({ icon, iconBg, title, subtitle, children, headerRight, className }: {
  icon: React.ReactNode; iconBg: string; title: string; subtitle?: string
  children: React.ReactNode; headerRight?: React.ReactNode; className?: string
}) {
  return (
    <div className={`bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/60 rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.08)] transition-all duration-300 ${className || ''}`}>
      <div className="flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-slate-50/70 to-white/30 dark:from-slate-800/40 dark:to-slate-900/10 border-b border-slate-100 dark:border-slate-800/50 rounded-t-[24px]">
        <div className="flex items-center gap-3.5">
          <div className={`h-10 w-10 rounded-2xl flex items-center justify-center shadow-md shadow-indigo-500/5 ${iconBg}`}>{icon}</div>
          <div>
            <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 block tracking-tight">{title}</span>
            {subtitle && <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 mt-0.5 block uppercase tracking-wider">{subtitle}</span>}
          </div>
        </div>
        {headerRight && <div>{headerRight}</div>}
      </div>
      <div className="p-6">{children}</div>
    </div>
  )
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="block text-[10px] font-extrabold text-slate-500 dark:text-slate-400 mb-1.5 uppercase tracking-wider">
      {children}{required && <span className="text-red-500 ml-0.5">*</span>}
    </label>
  )
}

function StyledInput({ className = '', onFocus, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      onFocus={(e) => {
        if (props.type === 'number') e.target.select()
        onFocus?.(e)
      }}
      className={`w-full h-11 border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-foreground focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400/80 text-sm pl-3 pr-3 font-medium ${className}`}
    />
  )
}

function StyledTextarea({ className = '', ...props }: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      {...props}
      className={`w-full px-3 py-2.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-slate-50/50 dark:bg-slate-950/40 text-foreground focus:outline-none focus:border-indigo-500 focus:bg-white dark:focus:bg-slate-900 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-400/80 resize-none font-medium ${className}`}
    />
  )
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export function QuoteNewPage() {
  const { id } = useParams<{ id: string }>()
  const isEditMode = !!id
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)!
  const dispatch = useDispatch()

  const [loading, setLoading] = useState(isEditMode)
  const [quote, setQuote] = useState<Deal | null>(null)
  const [isApprovedEdit, setIsApprovedEdit] = useState(false)

  // Basic Info
  const [proposalTitle, setProposalTitle] = useState('')
  const [customers, setCustomers] = useState<Customer[]>([])
  const [clientId, setClientId] = useState('')
  const [clientSearch, setClientSearch] = useState('')
  const [contactName, setContactName] = useState('')
  const [currency, setCurrency] = useState('INR')
  const [validityDays, setValidityDays] = useState(30)

  // Billing address
  const [billingStreet, setBillingStreet] = useState('')
  const [billingCity, setBillingCity] = useState('')
  const [billingState, setBillingState] = useState('')
  const [billingCode, setBillingCode] = useState('')
  const [billingCountry, setBillingCountry] = useState('')
  const [shippingStreet, setShippingStreet] = useState('')
  const [shippingCity, setShippingCity] = useState('')
  const [shippingState, setShippingState] = useState('')
  const [shippingCode, setShippingCode] = useState('')
  const [shippingCountry, setShippingCountry] = useState('')
  const [addressExpanded, setAddressExpanded] = useState(true) // Default expanded for easier access

  // Items
  const [lineItems, setLineItems] = useState<LineItem[]>([newLineItem()])

  // Notes & Terms
  const [notes, setNotes] = useState('')
  const [terms, setTerms] = useState(
    'Payment Terms: Net 30 days\nDelivery: 7-10 business days\nWarranty: 1 year manufacturer warranty'
  )
  const [declaration, setDeclaration] = useState(
    'We declare that this quotation shows the actual price of the goods / services described and that all particulars are true and correct to the best of our knowledge. Prices are subject to change without notice. Refer the Annexure for technical specifications and Bill of Material.'
  )

  // BOM / SLA / Timeline
  const [bomData, setBomData] = useState<BOMItem[]>([])
  const [slaData, setSlaData] = useState('SLA: ArctiCare Next Business Day Warranty\nSupport Type: Onsite Hardware Replacement + Remote technical assistance\nSupport Contact: Dedicated support contact')
  const [timelineData, setTimelineData] = useState('Delivery: 4-5 weeks\nInstallation Scope: Racking and Stacking')
  const [advancedTab, setAdvancedTab] = useState<'bom' | 'sla' | 'timeline'>('bom')
  const [pasteModalOpen, setPasteModalOpen] = useState(false)
  const [pasteText, setPasteText] = useState('')

  // Pricing
  const [selectedPreset, setSelectedPreset] = useState(0)
  const [cgst, setCgst] = useState(9)
  const [sgst, setSgst] = useState(9)
  const [igst, setIgst] = useState(0)
  const [discount, setDiscount] = useState(0)
  const [shipping, setShipping] = useState(0)

  // UI
  const [saving, setSaving] = useState(false)
  const [clientOpen, setClientOpen] = useState(false)
  const [presetOpen, setPresetOpen] = useState(false)
  const [currencyOpen, setCurrencyOpen] = useState(false)

  const clientRef = useRef<HTMLDivElement>(null)
  const presetRef = useRef<HTMLDivElement>(null)
  const currencyRef = useRef<HTMLDivElement>(null)

  // ── Close dropdowns on outside click ──────────────────────────────────────
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (clientRef.current && !clientRef.current.contains(e.target as Node)) setClientOpen(false)
      if (presetRef.current && !presetRef.current.contains(e.target as Node)) setPresetOpen(false)
      if (currencyRef.current && !currencyRef.current.contains(e.target as Node)) setCurrencyOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // ── Load data ─────────────────────────────────────────────────────────────
  useEffect(() => {
    fetchCustomers().then(setCustomers).catch(console.error)
  }, [])

  useEffect(() => {
    if (!isEditMode) return
    fetchDealById(id!).then((d) => {
      if (!d) { navigate('/quotes'); return }
      setQuote(d)
      setIsApprovedEdit(d.status === 'approved')
      setProposalTitle(d.title || '')
      setClientSearch(d.customer_name || '')
      setClientId(d.customer_id || '')
      setContactName(d.contact_name || '')
      setCurrency(d.currency || 'INR')
      setValidityDays(d.validity_period || 30)
      setNotes(d.notes || '')
      setTerms(d.terms_conditions !== undefined && d.terms_conditions !== null ? d.terms_conditions : terms)
      setDeclaration(d.declaration !== undefined && d.declaration !== null ? d.declaration : 'We declare that this quotation shows the actual price of the goods / services described and that all particulars are true and correct to the best of our knowledge. Prices are subject to change without notice. Refer the Annexure for technical specifications and Bill of Material.')
      setBomData(d.bom_data ?? [])
      setSlaData(d.sla_data || slaData)
      setTimelineData(d.timeline_data || timelineData)
      setCgst(d.cgst_pct ?? 9)
      setSgst(d.sgst_pct ?? 9)
      setIgst(d.igst_pct ?? 0)
      setDiscount(d.discount_pct ?? 0)
      setShipping(d.shipping_charge ?? 0)
      setBillingStreet(d.billing_street || '')
      setBillingCity(d.billing_city || '')
      setBillingState(d.billing_state || '')
      setBillingCode(d.billing_code || '')
      setBillingCountry(d.billing_country || '')
      setShippingStreet(d.shipping_street || '')
      setShippingCity(d.shipping_city || '')
      setShippingState(d.shipping_state || '')
      setShippingCode(d.shipping_code || '')
      setShippingCountry(d.shipping_country || '')
      if (d.items?.length) {
        setLineItems(d.items.map((item, i) => ({
          id: `li-${i}-${Date.now()}`,
          description: item.product_name || '',
          hsnSac: item.sku || '',
          quantity: item.quantity || 1,
          unitPrice: item.quoted_price || 0,
          unitCost: item.transfer_price || 0,
          sub_items: item.sub_items ?? [],
          showSubItems: (item.sub_items?.length ?? 0) > 0,
        })))
      }
      setLoading(false)
    }).catch(() => { navigate('/quotes') })
  }, [id, isEditMode])

  // ── Item helpers ──────────────────────────────────────────────────────────
  const updateItem = (id: string, field: keyof LineItem, value: any) =>
    setLineItems(prev => prev.map(li => li.id === id ? { ...li, [field]: value } : li))

  const removeItem = (id: string) =>
    setLineItems(prev => prev.filter(li => li.id !== id))

  const addSubItem = (lineId: string) =>
    setLineItems(prev => prev.map(li =>
      li.id === lineId ? { ...li, sub_items: [...(li.sub_items || []), newSubItem()] } : li
    ))

  const removeSubItem = (lineId: string, subId: string) =>
    setLineItems(prev => prev.map(li =>
      li.id === lineId ? { ...li, sub_items: (li.sub_items || []).filter(s => s.id !== subId) } : li
    ))

  const updateSubItem = (lineId: string, subId: string, field: keyof DealItemSubItem, value: any) =>
    setLineItems(prev => prev.map(li =>
      li.id === lineId ? {
        ...li, sub_items: (li.sub_items || []).map(s => s.id === subId ? { ...s, [field]: value } : s)
      } : li
    ))

  // ── BOM Excel import ─────────────────────────────────────────────────────
  const loadXLSX = () => new Promise<any>((resolve, reject) => {
    if ((window as any).XLSX) { resolve((window as any).XLSX); return }
    const s = document.createElement('script')
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js'
    s.onload = () => resolve((window as any).XLSX)
    s.onerror = reject
    document.head.appendChild(s)
  })

  const parseExcelRows = (rows: any[][]): BOMItem[] => {
    let currentSection = 'General'
    const parsed: BOMItem[] = []
    const KNOWN_FIELD_MAP: Record<string, keyof BOMItem> = {
      'module': 'module', 'category': 'module', 'description': 'description',
      'desc': 'description', 'qty': 'quantity', 'quantity': 'quantity',
      'section': 'section', 'part number': 'part_number', 'part_no': 'part_number',
      'brand': 'brand', 'make': 'make', 'type': 'type',
    }
    const header = rows[0]?.map((c: any) => String(c).toLowerCase().trim())
    let hasHeader = false
    const colMap: Array<{ typedField?: keyof BOMItem; rawHeader: string }> = []
    if (header) {
      const knownCount = header.filter((h: string) => KNOWN_FIELD_MAP[h]).length
      if (knownCount >= 1) {
        hasHeader = true
        header.forEach((h: string) => colMap.push({ typedField: KNOWN_FIELD_MAP[h], rawHeader: h }))
      }
    }
    const dataRows = hasHeader ? rows.slice(1) : rows
    dataRows.forEach((row) => {
      if (!row || row.every((c: any) => !c)) return
      if (!hasHeader) {
        const [module, description, quantity] = row
        if (!description) { currentSection = String(module || '').trim() || currentSection; return }
        parsed.push({ section: currentSection, module: String(module || '').trim(), description: String(description || '').trim(), quantity: safeNum(quantity) || 1 })
        return
      }
      const item: BOMItem = { section: currentSection, module: '', description: '', quantity: 1 }
      const extra: Record<string, string> = {}
      row.forEach((cell: any, ci: number) => {
        const col = colMap[ci]
        if (!col) return
        const val = cell === null || cell === undefined ? '' : String(cell).trim()
        if (col.typedField) (item as any)[col.typedField] = col.typedField === 'quantity' ? safeNum(val) || 1 : val
        else if (val) extra[col.rawHeader] = val
      })
      if (Object.keys(extra).length) item.extra_fields = extra
      if (!item.description) { currentSection = item.module || currentSection; return }
      parsed.push(item)
    })
    return parsed
  }

  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const XLSX = await loadXLSX()
      const buf = await file.arrayBuffer()
      const wb = XLSX.read(buf, { type: 'array' })
      const ws = wb.Sheets[wb.SheetNames[0]]
      const rows: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' })
      const parsed = parseExcelRows(rows)
      if (parsed.length > 0) { setBomData(parsed); toast.success(`Imported ${parsed.length} BOM items`) }
      else toast.error('No valid BOM items found')
    } catch { toast.error('Failed to read Excel file') }
    e.target.value = ''
  }

  const handlePasteImport = () => {
    const rows = pasteText.trim().split('\n').map(line => line.split('\t'))
    const parsed = parseExcelRows(rows)
    if (parsed.length > 0) { setBomData(parsed); toast.success(`Imported ${parsed.length} BOM items`); setPasteModalOpen(false); setPasteText('') }
    else toast.error('No valid BOM items found')
  }

  const applyPreset = (i: number) => {
    const p = TAX_PRESETS[i]
    setSelectedPreset(i)
    setCgst(p.cgst); setSgst(p.sgst); setIgst(p.igst)
    setPresetOpen(false)
  }

  // ── Calculations ──────────────────────────────────────────────────────────
  const subtotal = lineItems.reduce((s, li) => s + safeNum(li.quantity) * safeNum(li.unitPrice), 0)
  const discountAmt = subtotal * (safeNum(discount) / 100)
  const taxableAmt = subtotal - discountAmt + safeNum(shipping)
  const cgstAmt = taxableAmt * (safeNum(cgst) / 100)
  const sgstAmt = taxableAmt * (safeNum(sgst) / 100)
  const igstAmt = taxableAmt * (safeNum(igst) / 100)
  const total = taxableAmt + cgstAmt + sgstAmt + igstAmt

  // ── Build preview deal object for PDF ────────────────────────────────────
  const buildDeal = (): Deal => {
    const autoGeneratedBom: BOMItem[] = []
    lineItems.forEach(li => {
      if (li.sub_items && li.sub_items.length > 0) {
        li.sub_items.forEach(sub => {
          autoGeneratedBom.push({
            section: 'Untitled',
            module: li.description || 'Product',
            description: sub.description,
            quantity: sub.quantity * safeNum(li.quantity),
            part_number: sub.part_number || '',
            brand: sub.brand || '',
          })
        })
      }
    })
    const finalBom = bomData.length > 0 ? bomData : autoGeneratedBom
    return {
      id: quote?.id || 'preview',
      deal_number: quote?.deal_number || 'QT-PREVIEW',
      quote_number: quote?.quote_number || `QT-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`,
      title: proposalTitle || `Quote for ${clientSearch}`,
      customer_name: clientSearch,
      customer_id: clientId,
      status: 'draft',
      created_by: user.id,
      currency,
      requires_technical: false,
      total_revenue: total,
      total_cost: 0,
      gross_margin_pct: 100,
      net_margin_pct: 100,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      creator: user,
      contact_name: contactName || null,
      validity_period: safeNum(validityDays),
      discount_pct: safeNum(discount),
      cgst_pct: safeNum(cgst),
      sgst_pct: safeNum(sgst),
      igst_pct: safeNum(igst),
      shipping_charge: safeNum(shipping),
      notes,
      terms_conditions: terms,
      declaration,
      bom_data: finalBom,
      sla_data: slaData,
      timeline_data: timelineData,
      billing_street: billingStreet || null,
      billing_city: billingCity || null,
      billing_state: billingState || null,
      billing_code: billingCode || null,
      billing_country: billingCountry || null,
      shipping_street: shippingStreet || null,
      shipping_city: shippingCity || null,
      shipping_state: shippingState || null,
      shipping_code: shippingCode || null,
      shipping_country: shippingCountry || null,
      items: lineItems.map((li, i) => ({
        sku: li.hsnSac || `ITEM-${i + 1}`,
        product_name: li.description,
        quantity: safeNum(li.quantity),
        unit_of_measure: 'EA',
        transfer_price: safeNum(li.unitCost),
        quoted_price: safeNum(li.unitPrice),
        sub_items: li.sub_items ?? [],
      })),
    }
  }

  // ── Debounced state for PDF rendering ──────────────────────────────────
  const [debouncedDeal, setDebouncedDeal] = useState<Deal>(() => buildDeal())

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedDeal(buildDeal())
    }, 450)
    return () => clearTimeout(handler)
  }, [
    proposalTitle,
    clientSearch,
    clientId,
    contactName,
    currency,
    validityDays,
    lineItems,
    discount,
    shipping,
    cgst,
    sgst,
    igst,
    terms,
    notes,
    bomData,
    billingStreet,
    billingCity,
    billingState,
    billingCode,
    billingCountry,
    shippingStreet,
    shippingCity,
    shippingState,
    shippingCode,
    shippingCountry,
    slaData,
    timelineData,
  ])

  // ── Submit ─────────────────────────────────────────────────────────────────
  const handleCreate = async () => {
    const finalClientName = clientSearch.trim()
    if (!finalClientName) { toast.error('Please select or type a client name'); return }
    if (!proposalTitle.trim()) { toast.error('Please enter a proposal title'); return }
    if (lineItems.some(li => !li.description)) { toast.error('All line items must have a description'); return }

    const matched = customers.find(c => c.name.toLowerCase() === finalClientName.toLowerCase())
    const finalClientId = matched ? matched.id : `CUST-${Math.floor(1000 + Math.random() * 9000)}`

    const autoGeneratedBom: BOMItem[] = []
    lineItems.forEach(li => {
      if (li.sub_items && li.sub_items.length > 0) {
        li.sub_items.forEach(sub => {
          autoGeneratedBom.push({
            section: 'Untitled',
            module: li.description || 'Product',
            description: sub.description,
            quantity: sub.quantity * safeNum(li.quantity),
            part_number: sub.part_number || '',
            brand: sub.brand || '',
          })
        })
      }
    })
    const finalBom = bomData.length > 0 ? bomData : autoGeneratedBom

    setSaving(true)
    try {
      const newVersions: DealVersion[] = [...(quote?.previous_versions ?? [])]
      if (isApprovedEdit && quote) {
        newVersions.push({
          version_number: newVersions.length + 1,
          saved_at: new Date().toISOString(),
          saved_by: user.id,
          saved_by_name: user.full_name,
          status: quote.status,
          total_revenue: quote.total_revenue,
          total_cost: quote.total_cost ?? 0,
          gross_margin_pct: quote.gross_margin_pct ?? 100,
          net_margin_pct: quote.net_margin_pct ?? 100,
          items: quote.items ?? [],
          overheads: quote.overheads ?? [],
          description: quote.description,
          title: quote.title,
          bom_data: quote.bom_data,
        })
      }

      const baseQuoteNumber = quote?.quote_number?.replace(/-v\d+$/, '') ?? quote?.quote_number
      const versionedQuoteNumber = isApprovedEdit
        ? `${baseQuoteNumber}-v${newVersions.length + 1}`
        : (quote?.quote_number ?? `QT-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 999999)).padStart(6, '0')}`)

      const deal = await saveDeal({
        ...(quote || {}),
        id,
        title: proposalTitle,
        customer_name: finalClientName,
        customer_id: finalClientId,
        currency,
        quote_number: versionedQuoteNumber,
        deal_number: quote?.deal_number,
        requires_technical: false,
        status: isApprovedEdit ? 'draft' : (quote?.status ?? 'draft'),
        description: notes,
        is_quote_only: true,
        discount_pct: safeNum(discount),
        cgst_pct: safeNum(cgst),
        sgst_pct: safeNum(sgst),
        igst_pct: safeNum(igst),
        shipping_charge: safeNum(shipping),
        notes,
        terms_conditions: terms,
        declaration,
        validity_period: safeNum(validityDays),
        bom_data: finalBom,
        sla_data: slaData,
        timeline_data: timelineData,
        previous_versions: newVersions,
        contact_name: contactName || null,
        billing_street: billingStreet || null,
        billing_city: billingCity || null,
        billing_state: billingState || null,
        billing_code: billingCode || null,
        billing_country: billingCountry || null,
        shipping_street: shippingStreet || null,
        shipping_city: shippingCity || null,
        shipping_state: shippingState || null,
        shipping_code: shippingCode || null,
        shipping_country: shippingCountry || null,
        items: lineItems.map((li, i) => ({
          sku: li.hsnSac || `ITEM-${i + 1}`,
          product_name: li.description,
          quantity: safeNum(li.quantity),
          unit_of_measure: 'EA',
          transfer_price: safeNum(li.unitCost),
          quoted_price: safeNum(li.unitPrice),
          sub_items: li.sub_items ?? [],
        })),
        overheads: [
          ...(safeNum(discount) !== 0 ? [{ label: 'Discount', amount: 0, is_percentage: true, percentage_value: -safeNum(discount) }] : []),
          ...(safeNum(shipping) > 0 ? [{ label: 'Shipping Charges', amount: safeNum(shipping), is_percentage: false }] : []),
        ],
      }, user.id)

      if (isEditMode) { dispatch(updateDeal(deal)); toast.success(`Quote ${versionedQuoteNumber} updated!`) }
      else { dispatch(addDeal(deal)); toast.success(`Quote ${versionedQuoteNumber} created!`) }
      navigate(`/quotes/${deal.id}`)
    } catch (err) {
      console.error(err)
      toast.error(isEditMode ? 'Failed to update quote' : 'Failed to create quote')
    } finally {
      setSaving(false)
    }
  }

  // ─── Render ────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-24 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        <div className="h-64 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
        <div className="h-96 bg-slate-100 dark:bg-slate-800 rounded-2xl" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 -m-3 sm:-m-4 md:-m-6 p-3 sm:p-4 md:p-6">

      {/* ── Approved Edit Banner ── */}
      {isApprovedEdit && (
        <div className="mb-4 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
          <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-900 text-sm">Revising an Approved Quote</p>
            <p className="text-xs text-amber-800 mt-0.5">Changes will create a new version. The current approved version will be archived.</p>
          </div>
        </div>
      )}

      {/* ── Page Header ── */}
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate(isEditMode ? `/quotes/${id}` : '/quotes')}
            className="h-10 w-10 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center shadow-sm hover:shadow-md transition-all cursor-pointer"
          >
            <ArrowLeft className="h-4 w-4 text-slate-700 dark:text-slate-200" />
          </button>
          <div>
            <div className="flex items-center gap-2 text-xs text-slate-500 mb-0.5">
              <span>My Quotes</span>
              <ChevronDown className="h-3 w-3 -rotate-90" />
              <span className="text-slate-700 dark:text-slate-300 font-medium">
                {isEditMode ? `Edit Quote` : 'New Quote'}
              </span>
            </div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
              {isEditMode ? `Edit Quote — ${quote?.quote_number}` : 'Create New Quote'}
            </h1>
            <p className="text-sm text-slate-500 mt-0.5 flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Prepared by: <span className="font-semibold text-slate-700 dark:text-slate-300">{user.full_name}</span>
            </p>
          </div>
        </div>
      </div>

      {/* ── Single-column Centered Layout ── */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="max-w-5xl mx-auto space-y-6 pb-32"
      >

          {/* ── 1. Basic Information ── */}
          <SectionCard
            iconBg="bg-indigo-600"
            icon={<FileText className="h-4.5 w-4.5 text-white" />}
            title="Basic Information"
            subtitle="Proposal details and client"
            className="z-50 relative"
          >
            <div className="space-y-4">
              {/* Proposal Title */}
              <div>
                <FieldLabel required>Proposal Title / Subject</FieldLabel>
                <StyledInput
                  placeholder="e.g. IT Infrastructure Modernization — ABC Pvt Ltd"
                  value={proposalTitle}
                  onChange={e => setProposalTitle(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Client */}
                <div>
                  <FieldLabel required>Client (Account Name)</FieldLabel>
                  <div className="relative" ref={clientRef}>
                    <StyledInput
                      placeholder="Select or type client name..."
                      value={clientSearch}
                      onChange={e => { setClientSearch(e.target.value); setClientId(''); setClientOpen(true) }}
                      onFocus={() => setClientOpen(true)}
                      className="pr-9"
                    />
                    <ChevronDown className={`absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none transition-transform ${clientOpen ? 'rotate-180' : ''}`} />
                    {clientOpen && (
                      <div className="absolute z-50 mt-1 w-full bg-white dark:bg-slate-900 border border-border rounded-xl shadow-xl overflow-hidden max-h-56 overflow-y-auto animate-in fade-in duration-100">
                        {customers.filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase())).length === 0
                          ? <p className="px-4 py-3 text-xs text-muted-foreground">No matches — will create new client</p>
                          : customers.filter(c => !clientSearch || c.name.toLowerCase().includes(clientSearch.toLowerCase())).map(c => (
                            <button key={c.id} type="button"
                              onClick={() => { setClientId(c.id); setClientSearch(c.name); setClientOpen(false) }}
                              className={`w-full text-left px-4 py-2.5 text-sm hover:bg-primary/5 transition-colors ${c.id === clientId ? 'text-primary font-semibold bg-primary/5' : 'text-foreground'}`}
                            >{c.name}</button>
                          ))
                        }
                      </div>
                    )}
                  </div>
                </div>

                {/* Attention To */}
                <div>
                  <FieldLabel>Attention To (Contact Person)</FieldLabel>
                  <StyledInput
                    placeholder="e.g. Mr. Rajesh Kumar, IT Head"
                    value={contactName}
                    onChange={e => setContactName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Currency */}
                <div>
                  <FieldLabel required>Currency</FieldLabel>
                  <div className="relative">
                    <select
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value)}
                      className="w-full h-11 px-3 text-sm border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 text-foreground font-semibold focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all cursor-pointer appearance-none pr-10"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c} className="bg-white dark:bg-slate-900 text-foreground font-medium py-1">
                          {c}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
                  </div>
                </div>

                {/* Validity */}
                <div>
                  <FieldLabel required>Validity Period (days)</FieldLabel>
                  <StyledInput type="number" min={1} value={validityDays}
                    onChange={e => setValidityDays(Number(e.target.value))} />
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── 2. Address Information (Brought before line items) ── */}
          <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200/50 dark:border-slate-800/60 rounded-[24px] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_8px_30px_-6px_rgba(0,0,0,0.08)] transition-all duration-300 overflow-hidden">
            <button type="button" onClick={() => setAddressExpanded(e => !e)}
              className="w-full flex items-center justify-between px-6 py-4.5 bg-gradient-to-r from-slate-50/70 to-white/30 dark:from-slate-800/40 dark:to-slate-900/10 border-b border-slate-100 dark:border-slate-800/50 cursor-pointer border-0">
              <div className="flex items-center gap-3.5">
                <div className="h-10 w-10 rounded-2xl bg-teal-600 flex items-center justify-center shadow-md shadow-teal-500/10">
                  <Building2 className="h-4.5 w-4.5 text-white" />
                </div>
                <div className="text-left">
                  <span className="font-extrabold text-sm text-slate-800 dark:text-slate-100 block tracking-tight">Address Information</span>
                  <span className="text-[10px] font-medium text-slate-400 dark:text-slate-400 mt-0.5 block uppercase tracking-wider">Billing &amp; Shipping addresses</span>
                </div>
              </div>
              <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${addressExpanded ? 'rotate-180' : ''}`} />
            </button>

            {addressExpanded && (
              <div className="p-5 space-y-4 animate-in slide-in-from-top-1 duration-150">
                <div className="flex justify-end">
                  <button type="button"
                    onClick={() => { setShippingStreet(billingStreet); setShippingCity(billingCity); setShippingState(billingState); setShippingCode(billingCode); setShippingCountry(billingCountry); toast.success('Billing address copied to shipping') }}
                    className="text-xs font-semibold text-primary hover:underline cursor-pointer border-0 bg-transparent">
                    Copy Billing → Shipping
                  </button>
                </div>
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Billing Address</h4>
                    <div><FieldLabel>Street</FieldLabel><StyledInput placeholder="Street / Area" value={billingStreet} onChange={e => setBillingStreet(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><FieldLabel>City</FieldLabel><StyledInput placeholder="City" value={billingCity} onChange={e => setBillingCity(e.target.value)} /></div>
                      <div><FieldLabel>State</FieldLabel><StyledInput placeholder="State" value={billingState} onChange={e => setBillingState(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><FieldLabel>ZIP / PIN</FieldLabel><StyledInput placeholder="560001" value={billingCode} onChange={e => setBillingCode(e.target.value)} /></div>
                      <div><FieldLabel>Country</FieldLabel><StyledInput placeholder="India" value={billingCountry} onChange={e => setBillingCountry(e.target.value)} /></div>
                    </div>
                  </div>
                  <div className="space-y-3">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Shipping Address</h4>
                    <div><FieldLabel>Street</FieldLabel><StyledInput placeholder="Street / Area" value={shippingStreet} onChange={e => setShippingStreet(e.target.value)} /></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><FieldLabel>City</FieldLabel><StyledInput placeholder="City" value={shippingCity} onChange={e => setShippingCity(e.target.value)} /></div>
                      <div><FieldLabel>State</FieldLabel><StyledInput placeholder="State" value={shippingState} onChange={e => setShippingState(e.target.value)} /></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div><FieldLabel>ZIP / PIN</FieldLabel><StyledInput placeholder="560001" value={shippingCode} onChange={e => setShippingCode(e.target.value)} /></div>
                      <div><FieldLabel>Country</FieldLabel><StyledInput placeholder="India" value={shippingCountry} onChange={e => setShippingCountry(e.target.value)} /></div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* ── 3. Line Items ── */}
          <SectionCard
            iconBg="bg-blue-600"
            icon={<ClipboardList className="h-4.5 w-4.5 text-white" />}
            title="Line Items"
            subtitle="Products and services being quoted"
            headerRight={
              <button type="button"
                onClick={() => setLineItems(prev => [...prev, newLineItem()])}
                className="flex items-center gap-1.5 h-8 px-3 rounded-lg bg-primary text-white text-xs font-semibold shadow-sm hover:bg-primary/90 transition-all cursor-pointer border-0"
              >
                <Plus className="h-3.5 w-3.5" /> Add Item
              </button>
            }
          >
            <div className="space-y-4">
              {lineItems.map((li, idx) => (
                <div key={li.id} className="relative border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 shadow-sm hover:border-primary/30 hover:shadow-md transition-all">
                  {/* Item header */}
                  <div className="flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800 rounded-t-xl">
                    <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Item {idx + 1}</span>
                    {lineItems.length > 1 && (
                      <button type="button" onClick={() => removeItem(li.id)}
                        className="h-6 w-6 flex items-center justify-center rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors cursor-pointer border-0">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {/* Description */}
                    <div>
                      <FieldLabel required>Description of Goods / Services</FieldLabel>
                      <StyledTextarea rows={3}
                        placeholder="Enter full product name and specifications (e.g. ArctiCore Forge Server — Dual AMD EPYC 9354 2.9GHz, 256GB DDR5 RAM, 4×3.84TB NVMe SSD)"
                        value={li.description}
                        onChange={e => updateItem(li.id, 'description', e.target.value)}
                      />
                    </div>

                    {/* HSN / Qty / Cost / Price / Subtotal */}
                    <div className="grid gap-3 grid-cols-1 sm:grid-cols-2 md:grid-cols-12">
                      <div className="md:col-span-2 flex flex-col justify-end">
                        <FieldLabel>HSN / SAC Code</FieldLabel>
                        <StyledInput placeholder="8471" value={li.hsnSac} maxLength={10}
                          onChange={e => updateItem(li.id, 'hsnSac', e.target.value)}
                          className="font-mono text-center" />
                      </div>
                      <div className="md:col-span-2 flex flex-col justify-end">
                        <FieldLabel required>Qty</FieldLabel>
                        <StyledInput type="number" min={1} value={li.quantity}
                          onChange={e => updateItem(li.id, 'quantity', Number(e.target.value))}
                          className="text-center font-mono" />
                      </div>
                      <div className="md:col-span-2 flex flex-col justify-end">
                        <FieldLabel required>Transfer Price</FieldLabel>
                        <StyledInput type="number" min={0} step={0.01} placeholder="0.00" value={li.unitCost}
                          onChange={e => updateItem(li.id, 'unitCost', Number(e.target.value))}
                          className="font-mono" />
                      </div>
                      <div className="md:col-span-3 flex flex-col justify-end">
                        <FieldLabel required>Unit Price</FieldLabel>
                        <StyledInput type="number" min={0} step={0.01} value={li.unitPrice}
                          onChange={e => updateItem(li.id, 'unitPrice', Number(e.target.value))}
                          className="font-mono" />
                      </div>
                      <div className="col-span-1 sm:col-span-2 md:col-span-3 flex flex-col justify-end">
                        <FieldLabel>Subtotal</FieldLabel>
                        <div className="h-11 flex items-center justify-end px-3 rounded-xl border border-primary/30 bg-gradient-to-r from-primary/8 to-primary/5 font-bold font-mono text-primary text-sm overflow-hidden select-all truncate whitespace-nowrap" title={fmt(li.quantity * li.unitPrice, currency)}>
                          {fmt(li.quantity * li.unitPrice, currency)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </SectionCard>

          {/* ── 4. Pricing & Taxes (Zoho CRM-Style Calculations Block) ── */}
          <SectionCard
            iconBg="bg-emerald-600"
            icon={<DollarSign className="h-4.5 w-4.5 text-white" />}
            title="Pricing &amp; Taxes"
            subtitle="Configure discount, taxes, shipping and view summary"
          >
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-8">
              {/* Left Column: Form Controls */}
              <div className="space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Discount */}
                  <div>
                    <FieldLabel>Discount (%) <span className="normal-case font-normal text-slate-400 font-medium">(negative = surcharge)</span></FieldLabel>
                    <StyledInput type="number" step={0.1} value={discount} onChange={e => setDiscount(Number(e.target.value))} />
                  </div>
                  {/* Shipping */}
                  <div>
                    <FieldLabel>Shipping Charges</FieldLabel>
                    <StyledInput type="number" min={0} step={1} value={shipping} onChange={e => setShipping(Number(e.target.value))} />
                  </div>
                </div>

                <div className="border-t border-slate-100 dark:border-slate-800/60 my-2" />

                {/* Quick Tax Preset */}
                <div className="space-y-1.5">
                  <FieldLabel>Quick Apply Tax Rate</FieldLabel>
                  <div className="relative" ref={presetRef}>
                    <button type="button" onClick={() => setPresetOpen(o => !o)}
                      className="w-full h-11 px-3.5 text-sm border border-slate-200 dark:border-slate-800 rounded-xl bg-white dark:bg-slate-900 flex items-center justify-between text-foreground focus:outline-none focus:ring-4 focus:ring-primary/10 transition-all font-semibold">
                      <span className="truncate">{TAX_PRESETS[selectedPreset].label}</span>
                      <ChevronDown className={`h-4 w-4 text-slate-400 shrink-0 ml-1 transition-transform ${presetOpen ? 'rotate-180' : ''}`} />
                    </button>
                    {presetOpen && (
                      <div className="absolute z-50 mt-1.5 w-full bg-white dark:bg-slate-900 border border-border rounded-xl shadow-xl overflow-hidden animate-in fade-in duration-100">
                        {TAX_PRESETS.map((p, i) => (
                          <button key={i} type="button" onClick={() => applyPreset(i)}
                            className={`w-full text-left px-4 py-3 text-xs hover:bg-primary/5 transition-colors ${i === selectedPreset ? 'text-primary font-semibold bg-primary/5' : 'text-foreground'}`}>
                            {p.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Manual Taxes */}
                <div className="space-y-2">
                  <FieldLabel>Manual Tax Overrides (CGST, SGST, IGST)</FieldLabel>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">CGST (%)</label>
                      <StyledInput type="number" min={0} max={100} step={0.5} value={cgst} onChange={e => setCgst(Number(e.target.value))} className="h-10 text-xs px-2.5 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">SGST (%)</label>
                      <StyledInput type="number" min={0} max={100} step={0.5} value={sgst} onChange={e => setSgst(Number(e.target.value))} className="h-10 text-xs px-2.5 font-mono" />
                    </div>
                    <div>
                      <label className="block text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">IGST (%)</label>
                      <StyledInput type="number" min={0} max={100} step={0.5} value={igst} onChange={e => setIgst(Number(e.target.value))} className="h-10 text-xs px-2.5 font-mono" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Zoho-Style Calculations Summary */}
              <div className="bg-slate-50/50 dark:bg-slate-900/50 p-5 rounded-[20px] border border-slate-100 dark:border-slate-800/80 flex flex-col justify-between space-y-3.5">
                <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest block border-b border-slate-100 dark:border-slate-800 pb-2">Calculation Summary</span>
                
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500 font-medium">Sub Total</span>
                    <span className="font-semibold font-mono text-slate-700 dark:text-slate-300">{fmt(subtotal, currency)}</span>
                  </div>

                  {discount !== 0 && (
                    <div className="flex justify-between items-center text-sm">
                      <span className="text-red-500 font-medium">Discount ({discount}%)</span>
                      <span className="font-semibold font-mono text-red-500">−{fmt(discountAmt, currency)}</span>
                    </div>
                  )}

                  <div className="flex justify-between items-center text-sm border-t border-slate-200/40 dark:border-slate-800/40 pt-2">
                    <span className="text-slate-800 dark:text-slate-200 font-bold">Total</span>
                    <span className="font-bold font-mono text-slate-800 dark:text-slate-200">{fmt(subtotal - discountAmt, currency)}</span>
                  </div>

                  {cgst > 0 && (
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>CGST ({cgst}%)</span>
                      <span className="font-mono">{fmt(cgstAmt, currency)}</span>
                    </div>
                  )}

                  {sgst > 0 && (
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>SGST ({sgst}%)</span>
                      <span className="font-mono">{fmt(sgstAmt, currency)}</span>
                    </div>
                  )}

                  {igst > 0 && (
                    <div className="flex justify-between items-center text-xs text-slate-500">
                      <span>IGST ({igst}%)</span>
                      <span className="font-mono">{fmt(igstAmt, currency)}</span>
                    </div>
                  )}

                  {shipping > 0 && (
                    <div className="flex justify-between items-center text-sm text-slate-500 border-t border-slate-200/40 dark:border-slate-800/40 pt-2">
                      <span>Shipping Charges</span>
                      <span className="font-semibold font-mono text-slate-700 dark:text-slate-300">{fmt(shipping, currency)}</span>
                    </div>
                  )}
                </div>

                <div className="bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl p-3.5 flex justify-between items-center shadow-md shadow-emerald-500/10">
                  <span className="text-xs font-black uppercase tracking-wider">Grand Total</span>
                  <span className="text-base font-black font-mono">{fmt(total, currency)}</span>
                </div>
              </div>
            </div>
          </SectionCard>

          {/* ── 5. Additional Information ── */}
          <SectionCard
            iconBg="bg-violet-600"
            icon={<MessageSquare className="h-4.5 w-4.5 text-white" />}
            title="Additional Information"
            subtitle="Notes and terms"
          >
            <div className="space-y-4">
              <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/40">
                <FieldLabel>
                  <span className="flex items-center gap-1.5 text-blue-800 dark:text-blue-300"><MessageSquare className="h-3.5 w-3.5" /> Internal Notes</span>
                </FieldLabel>
                <StyledTextarea rows={3} placeholder="Internal notes (not shown on PDF)..." value={notes}
                  onChange={e => setNotes(e.target.value)} className="border-blue-200 dark:border-blue-800 mt-1 bg-white dark:bg-slate-900" />
              </div>
              <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40">
                <FieldLabel>
                  <span className="flex items-center gap-1.5 text-amber-800 dark:text-amber-300"><FileCheck2 className="h-3.5 w-3.5" /> Terms &amp; Conditions</span>
                </FieldLabel>
                <StyledTextarea rows={5} placeholder="Payment terms, delivery, warranty..." value={terms}
                  onChange={e => setTerms(e.target.value)} className="border-amber-200 dark:border-amber-800 mt-1 bg-white dark:bg-slate-900" />
              </div>
              <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/40">
                <FieldLabel>
                  <span className="flex items-center gap-1.5 text-indigo-800 dark:text-indigo-300"><FileText className="h-3.5 w-3.5" /> Declaration</span>
                </FieldLabel>
                <StyledTextarea rows={3} placeholder="We declare that this quotation shows..." value={declaration}
                  onChange={e => setDeclaration(e.target.value)} className="border-indigo-200 dark:border-indigo-800 mt-1 bg-white dark:bg-slate-900" />
              </div>
            </div>
          </SectionCard>

          {/* ── 5. Advanced Sections ── */}
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-slate-50 to-white dark:from-slate-800/60 dark:to-slate-900 border-b border-slate-100 dark:border-slate-800">
              <div className="h-9 w-9 rounded-xl bg-slate-700 dark:bg-slate-600 flex items-center justify-center shadow-sm">
                <Settings2 className="h-4.5 w-4.5 text-white" />
              </div>
              <div>
                <span className="font-bold text-sm text-slate-800 dark:text-slate-100 block">Advanced Sections</span>
                <span className="text-[11px] text-slate-500">Technical BOM (auto-generated from above), SLA &amp; Timeline</span>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 px-4 pt-3 gap-1">
              {(['bom', 'sla', 'timeline'] as const).map(tab => (
                <button key={tab} type="button" onClick={() => setAdvancedTab(tab)}
                  className={`flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-t-lg transition-all ${advancedTab === tab ? 'bg-white dark:bg-slate-900 text-primary border border-b-0 border-slate-200 dark:border-slate-700' : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'}`}>
                  {tab === 'bom' && <Layers className="h-3.5 w-3.5" />}
                  {tab === 'sla' && <ClipboardList className="h-3.5 w-3.5" />}
                  {tab === 'timeline' && <Calendar className="h-3.5 w-3.5" />}
                  {tab === 'bom' ? 'Bill of Material' : tab === 'sla' ? 'SLA' : 'Timeline'}
                </button>
              ))}
            </div>

            <div className="p-5">
              {/* BOM Tab */}
              {advancedTab === 'bom' && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div>
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">Bill of Materials (Annexure)</p>
                      <p className="text-xs text-slate-500 mt-0.5">Auto-generated from product components above, or upload/paste manually</p>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      <button type="button" onClick={() => setBomData(prev => [...prev, { section: 'Untitled', module: '', description: '', quantity: 1 }])}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-xs font-semibold text-indigo-600 cursor-pointer transition-colors border-0">
                        <Plus className="h-3.5 w-3.5" /> Add Row
                      </button>
                      <label className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer transition-colors">
                        <Upload className="h-3.5 w-3.5" /> Upload XLSX
                        <input type="file" accept=".xlsx,.xls,.csv" onChange={handleExcelUpload} className="hidden" />
                      </label>
                      <button type="button" onClick={() => setPasteModalOpen(true)}
                        className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-slate-300 dark:border-slate-600 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 cursor-pointer transition-colors border-solid">
                        <Clipboard className="h-3.5 w-3.5" /> Paste from Excel
                      </button>
                      {bomData.length > 0 && (
                        <button type="button" onClick={() => setBomData([])}
                          className="flex items-center gap-1.5 px-3 h-8 rounded-lg border border-red-200 bg-red-50 text-xs font-medium text-red-600 hover:bg-red-100 cursor-pointer transition-colors border-solid">
                          <Trash2 className="h-3.5 w-3.5" /> Clear Manual BOM
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Auto BOM Preview */}
                  {bomData.length === 0 && (
                    <div className="rounded-xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 p-4">
                      <div className="flex items-start gap-2 mb-3">
                        <Layers className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
                        <div>
                          <p className="text-xs font-semibold text-indigo-700 dark:text-indigo-300">Auto-Generated BOM Preview</p>
                          <p className="text-[11px] text-indigo-600/70 dark:text-indigo-400/70">Based on product components added above. Upload XLSX or add rows manually to override.</p>
                        </div>
                      </div>
                      {lineItems.some(li => (li.sub_items?.length ?? 0) > 0) ? (
                        <div className="space-y-2">
                          {lineItems.filter(li => (li.sub_items?.length ?? 0) > 0).map(li => (
                            <div key={li.id}>
                              <p className="text-[11px] font-bold text-slate-600 dark:text-slate-400 uppercase mb-1 px-1">{li.description || 'Product'}</p>
                              {li.sub_items!.map(sub => (
                                <div key={sub.id} className="flex items-center gap-3 px-3 py-1.5 bg-white dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
                                  <span className="font-mono text-slate-400 w-20 shrink-0 truncate">{sub.part_number || '—'}</span>
                                  <span className="font-medium w-24 shrink-0 truncate">{sub.brand || '—'}</span>
                                  <span className="flex-1 truncate">{sub.description}</span>
                                  <span className="font-bold tabular-nums w-8 text-right shrink-0">×{sub.quantity * li.quantity}</span>
                                </div>
                              ))}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-4 text-xs text-slate-500">
                          <Layers className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                          No components added yet. Add product components under each line item, upload XLSX, or click "+ Add Row" to define custom BOM.
                        </div>
                      )}
                    </div>
                  )}

                  {/* Manual BOM Table */}
                  {bomData.length > 0 && (
                    <div className="border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden">
                      <table className="w-full text-xs">
                        <thead className="bg-slate-100 dark:bg-slate-800">
                          <tr className="text-[10px] font-bold text-slate-500 uppercase">
                            <th className="px-3 py-2 text-left w-8">#</th>
                            <th className="px-3 py-2 text-left w-36">Module / Part No</th>
                            <th className="px-3 py-2 text-left">Technical Description &amp; Specifications</th>
                            <th className="px-3 py-2 text-center w-20">Qty</th>
                            <th className="px-3 py-2 w-8"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                          {bomData.map((item, i) => (
                            <tr key={i} className="hover:bg-slate-50 dark:hover:bg-slate-800/30">
                              <td className="px-3 py-2 text-slate-400 align-middle">{i + 1}</td>
                              <td className="px-2 py-1.5">
                                <input type="text" placeholder="Module" value={item.module || ''}
                                  onChange={e => {
                                    const val = e.target.value
                                    setBomData(prev => prev.map((x, j) => j === i ? { ...x, module: val } : x))
                                  }}
                                  className="w-full h-8 px-2 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 font-medium focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
                              </td>
                              <td className="px-2 py-1.5">
                                <input type="text" placeholder="e.g. Cisco Catalyst 9300 48-Port PoE+" value={item.description || ''}
                                  onChange={e => {
                                    const val = e.target.value
                                    setBomData(prev => prev.map((x, j) => j === i ? { ...x, description: val } : x))
                                  }}
                                  className="w-full h-8 px-2 text-xs border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
                              </td>
                              <td className="px-2 py-1.5">
                                <input type="number" min={1} value={item.quantity}
                                  onFocus={(e) => e.target.select()}
                                  onChange={e => {
                                    const val = Number(e.target.value)
                                    setBomData(prev => prev.map((x, j) => j === i ? { ...x, quantity: val } : x))
                                  }}
                                  className="w-full h-8 px-2 text-xs text-center border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 font-mono focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20" />
                              </td>
                              <td className="px-2 py-1.5 align-middle">
                                <button type="button" onClick={() => setBomData(d => d.filter((_, j) => j !== i))}
                                  className="h-7 w-7 flex items-center justify-center rounded text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/20 border-0 cursor-pointer transition-colors">
                                  <X className="h-3.5 w-3.5" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* SLA Tab */}
              {advancedTab === 'sla' && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><ClipboardList className="h-4 w-4 text-primary" /> SLA Terms &amp; Configuration</p>
                  <StyledTextarea rows={6} placeholder="Describe Service Level Agreement terms..." value={slaData} onChange={e => setSlaData(e.target.value)} />
                  <p className="text-[11px] text-slate-500">This details the support response levels, replacement details, and general coverage parameters.</p>
                </div>
              )}

              {/* Timeline Tab */}
              {advancedTab === 'timeline' && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 flex items-center gap-1.5"><Calendar className="h-4 w-4 text-primary" /> Project Timeline / Delivery Phases</p>
                  <StyledTextarea rows={6} placeholder="Enter project milestones or delivery schedules..." value={timelineData} onChange={e => setTimelineData(e.target.value)} />
                  <p className="text-[11px] text-slate-500">Define milestones such as Delivery, Installation, Testing, and Handover times.</p>
                </div>
              )}
            </div>
          </div>

      {/* ── Floating Bottom Action Bar ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-white/85 dark:bg-slate-950/85 backdrop-blur-lg border-t border-slate-200/60 dark:border-slate-800/60 py-4.5 px-6 shadow-[0_-8px_30px_rgba(0,0,0,0.06)] lg:left-64 transition-all animate-in slide-in-from-bottom duration-300">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap items-center gap-4 sm:gap-6">
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Subtotal</span>
              <span className="text-xs font-semibold font-mono text-slate-600 dark:text-slate-400 mt-0.5">{fmt(subtotal, currency)}</span>
            </div>
            {discount !== 0 && (
              <>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-red-500 uppercase tracking-widest">Discount ({discount}%)</span>
                  <span className="text-xs font-semibold font-mono text-red-500 mt-0.5">−{fmt(discountAmt, currency)}</span>
                </div>
              </>
            )}
            {shipping > 0 && (
              <>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">Shipping</span>
                  <span className="text-xs font-semibold font-mono text-slate-600 dark:text-slate-400 mt-0.5">{fmt(shipping, currency)}</span>
                </div>
              </>
            )}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-blue-600 dark:text-blue-400 uppercase tracking-widest">Total</span>
              <span className="text-xs font-semibold font-mono text-blue-600 dark:text-blue-400 mt-0.5">{fmt(subtotal - discountAmt, currency)}</span>
            </div>
            {cgst > 0 && (
              <>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">CGST</span>
                  <span className="text-xs font-mono text-slate-500 mt-0.5">{fmt(cgstAmt, currency)}</span>
                </div>
              </>
            )}
            {sgst > 0 && (
              <>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">SGST</span>
                  <span className="text-xs font-mono text-slate-500 mt-0.5">{fmt(sgstAmt, currency)}</span>
                </div>
              </>
            )}
            {igst > 0 && (
              <>
                <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-extrabold text-slate-400 dark:text-slate-500 uppercase tracking-widest">IGST</span>
                  <span className="text-xs font-mono text-slate-500 mt-0.5">{fmt(igstAmt, currency)}</span>
                </div>
              </>
            )}
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div className="flex flex-col">
              <span className="text-[10px] font-extrabold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest font-black">Grand Total</span>
              <span className="text-base font-black font-mono text-slate-900 dark:text-white mt-0.5">{fmt(total, currency)}</span>
            </div>
          </div>

          <div className="flex items-center gap-3.5 ml-auto">
            {!isEditMode && (
              <span className="hidden lg:inline text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                Saved as draft
              </span>
            )}
            <button type="button" onClick={handleCreate} disabled={saving}
              className="h-11 px-6 flex items-center justify-center gap-2 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-indigo-600 to-primary shadow-lg shadow-primary/20 hover:shadow-primary/45 hover:scale-[1.01] transition-all disabled:opacity-60 disabled:cursor-not-allowed cursor-pointer border-0">
              <Rocket className="h-3.5 w-3.5" />
              {saving ? (isEditMode ? 'Saving...' : 'Creating...') : (isEditMode ? 'Save Changes' : 'Create Quote')}
            </button>
          </div>
        </div>
      </div>

    </motion.div>

      {/* ── Paste Modal ── */}
      {pasteModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center">
              <div>
                <p className="font-bold text-base text-foreground">Paste Excel Data — BOM</p>
                <p className="text-xs text-slate-500 mt-0.5">Copy rows from Excel and paste them here</p>
              </div>
              <button type="button" onClick={() => setPasteModalOpen(false)} className="text-slate-400 hover:text-foreground cursor-pointer border-0 bg-transparent"><X className="h-5 w-5" /></button>
            </div>
            <div className="p-5 space-y-4 overflow-y-auto">
              <p className="text-xs text-slate-600 dark:text-slate-400">
                Copy cells from Excel containing <strong>MODULE</strong>, <strong>DESCRIPTION</strong>, and <strong>QTY</strong> columns and paste below:
              </p>
              <textarea
                className="w-full h-48 p-3 text-xs font-mono border border-slate-300 dark:border-slate-600 rounded-xl bg-white dark:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-primary/30 placeholder:text-slate-400 resize-none"
                placeholder={"CPU\tAMD EPYC 9354 Processor 2.9GHz 16-Core\t2\nRAM\t64GB DDR5 4800MHz ECC RDIMM\t4\nStorage\t3.84TB NVMe SSD U.2\t2"}
                value={pasteText}
                onChange={e => setPasteText(e.target.value)}
              />
              <div className="flex justify-end gap-3">
                <button type="button" onClick={() => setPasteModalOpen(false)}
                  className="h-9 px-4 rounded-lg border border-slate-300 dark:border-slate-600 text-sm text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer transition-colors">
                  Cancel
                </button>
                <button type="button" onClick={handlePasteImport}
                  className="h-9 px-4 rounded-lg bg-primary text-white text-sm font-semibold hover:bg-primary/90 cursor-pointer transition-colors border-0">
                  Import Data
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
