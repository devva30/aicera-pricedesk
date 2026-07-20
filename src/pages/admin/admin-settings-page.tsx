import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { toast } from 'sonner'
import { DEFAULT_CURRENCY, setGlobalCurrency, formatCurrency } from '@/lib/currency'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { fetchSettings, saveSettings } from '@/services/targets-service'
import type { SalesSettings } from '@/types'
import { cn } from '@/lib/utils'

const THEMES = [
  { name: 'Classic Navy Blue', theme: '#1e3a5f', accent: '#f7f9fc', text: '#FFFFFF', class: 'bg-[#1e3a5f]' },
  { name: 'Emerald Green', theme: '#065f46', accent: '#f0fdf4', text: '#FFFFFF', class: 'bg-[#065f46]' },
  { name: 'Crimson Red', theme: '#991b1b', accent: '#fef2f2', text: '#FFFFFF', class: 'bg-[#991b1b]' },
  { name: 'Charcoal Dark', theme: '#1e293b', accent: '#f8fafc', text: '#FFFFFF', class: 'bg-[#1e293b]' },
  { name: 'Sleek Black & White', theme: '#000000', accent: '#ffffff', text: '#FFFFFF', class: 'bg-[#000000]' },
]


import { ArrowDown, ArrowUp, Code, Sparkles, HelpCircle, Info } from 'lucide-react'

const SECTION_LABELS: Record<string, string> = {
  titleBanner: 'Title Banner ("Commercial Proposal")',
  header: 'Supplier Header (Logo, Name & Quote Info)',
  from: 'FROM supplier Box details',
  addresses: 'Consignee / Buyer Shipping & Billing Addresses',
  subject: 'Subject Line / Deal Title',
  table: 'Itemized Goods & Services Table',
  summary: 'Chargeable Amount Words, Terms & Totals',
  declBank: 'Declaration & Bank Details Box',
  signatures: 'Client Acceptance & Supplier Signatures',
}

const COLUMN_LABELS: Record<string, string> = {
  sl: 'SL (Serial No.)',
  desc: 'Item Description',
  hsn: 'HSN / SAC',
  uom: 'UOM',
  qty: 'Quantity',
  unitPrice: 'Unit Price',
  total: 'Total Price',
}

const PO_COLUMN_LABELS: Record<string, string> = {
  sl: 'SL (Serial No.)',
  desc: 'Product Description',
  qty: 'Quantity',
  unitCost: 'Unit Price (Cost)',
  totalCost: 'Line Total (Cost)',
}

const CHALLAN_COLUMN_LABELS: Record<string, string> = {
  sl: 'SL (Serial No.)',
  desc: 'Product Description',
  hsn: 'HSN / SAC',
  orderedQty: 'Ordered Qty',
  deliveredQty: 'Delivered Qty',
  unitPrice: 'Unit Price',
  subtotal: 'Line Total',
}

export function AdminSettingsPage() {
  const [currency, setCurrency] = useState(DEFAULT_CURRENCY)
  const [styleJsonError, setStyleJsonError] = useState<string | null>(null)
  const [activeTemplateTab, setActiveTemplateTab] = useState<'quote' | 'po' | 'challan'>('quote')
  const [salesSettings, setSalesSettings] = useState<SalesSettings>({
    financial_year: 'FY 2026-27',
    bottom_line_pct: 0.08,
    incentive_pct: 0.05,
    floor_margin_pct: 0.06,
  })

  useEffect(() => {
    setSalesSettings(fetchSettings())
  }, [])

  const handleSave = () => {
    setGlobalCurrency(currency)
    saveSettings(salesSettings)
    toast.success('Settings saved successfully!')
    setTimeout(() => {
      window.location.reload()
    }, 800)
  }

  const moveSection = (index: number, direction: 'up' | 'down') => {
    const sections = [...(salesSettings.pdf_section_order || [])]
    if (direction === 'up' && index > 0) {
      const temp = sections[index]
      sections[index] = sections[index - 1]
      sections[index - 1] = temp
    } else if (direction === 'down' && index < sections.length - 1) {
      const temp = sections[index]
      sections[index] = sections[index + 1]
      sections[index + 1] = temp
    }
    setSalesSettings((s) => ({ ...s, pdf_section_order: sections }))
  }

  const toggleColumn = (colId: string) => {
    if (activeTemplateTab === 'quote') {
      let cols = [...(salesSettings.pdf_visible_columns || [])]
      if (cols.includes(colId)) {
        if (colId === 'desc') return
        cols = cols.filter((c) => c !== colId)
      } else {
        cols.push(colId)
      }
      setSalesSettings((s) => ({ ...s, pdf_visible_columns: cols }))
    } else if (activeTemplateTab === 'po') {
      let cols = [...(salesSettings.po_visible_columns || [])]
      if (cols.includes(colId)) {
        if (colId === 'desc') return
        cols = cols.filter((c) => c !== colId)
      } else {
        cols.push(colId)
      }
      setSalesSettings((s) => ({ ...s, po_visible_columns: cols }))
    } else {
      let cols = [...(salesSettings.challan_visible_columns || [])]
      if (cols.includes(colId)) {
        if (colId === 'desc') return
        cols = cols.filter((c) => c !== colId)
      } else {
        cols.push(colId)
      }
      setSalesSettings((s) => ({ ...s, challan_visible_columns: cols }))
    }
  }

  const handleStyleJsonChange = (val: string) => {
    try {
      if (val.trim()) {
        JSON.parse(val)
      }
      setStyleJsonError(null)
      if (activeTemplateTab === 'quote') {
        setSalesSettings((s) => ({ ...s, pdf_developer_styles: val }))
      } else if (activeTemplateTab === 'po') {
        setSalesSettings((s) => ({ ...s, po_developer_styles: val }))
      } else {
        setSalesSettings((s) => ({ ...s, challan_developer_styles: val }))
      }
    } catch (e: any) {
      setStyleJsonError(e.message || 'Invalid JSON format')
    }
  }

  // PO mock renderer
  const mockRenderPoPreview = () => {
    const themeColor = salesSettings.po_theme_color || '#1e1b4b'
    const accentColor = salesSettings.po_accent_color || 'rgba(238,242,255,0.1)'
    const showCol = (id: string) => (salesSettings.po_visible_columns || []).includes(id)

    return (
      <div className="space-y-2 text-[6px]">
        {/* PO Header */}
        <div className="flex justify-between border-b pb-1 items-start">
          <div className="flex items-center gap-1">
            <div className="h-5 w-5 rounded bg-zinc-200" />
            <div>
              <p className="font-bold text-[7px]" style={{ color: themeColor }}>{salesSettings.company_name || 'Company Name'}</p>
              <p className="text-[5px] text-zinc-500">GSTIN: {salesSettings.company_gstin || '29AAX...'}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="font-bold text-[8px] uppercase tracking-wider" style={{ color: themeColor }}>Purchase Order</h2>
            <p className="text-[5px] text-zinc-500">PO-2026-1002</p>
          </div>
        </div>

        {/* PO Address info */}
        <div className="grid grid-cols-2 gap-2 text-[5px] border-b pb-1 text-zinc-600">
          <div>
            <span className="font-bold uppercase tracking-wider block" style={{ color: themeColor }}>Supplier</span>
            <p className="font-bold text-zinc-800">Acme Supplier Corp</p>
          </div>
          <div>
            <span className="font-bold uppercase tracking-wider block" style={{ color: themeColor }}>Ship To</span>
            <p className="font-bold text-zinc-800">{salesSettings.company_name}</p>
          </div>
        </div>

        {/* PO Items Table */}
        <div className="border border-zinc-200 rounded overflow-hidden">
          <div
            style={{ backgroundColor: themeColor }}
            className="flex p-1 text-[6px] font-bold text-white"
          >
            {showCol('sl') && <span className="w-[10%] text-center">SL</span>}
            {showCol('desc') && <span className="flex-1">Product Description</span>}
            {showCol('qty') && <span className="w-[15%] text-center">Qty</span>}
            {showCol('unitCost') && <span className="w-[20%] text-right font-semibold">Unit Cost</span>}
            {showCol('totalCost') && <span className="w-[20%] text-right font-semibold">Line Total</span>}
          </div>
          <div className="flex p-1 bg-white border-b border-zinc-100 text-[5px] text-zinc-700">
            {showCol('sl') && <span className="w-[10%] text-center">1</span>}
            {showCol('desc') && <span className="flex-1 font-medium text-zinc-900">ArctiCore™ Server Base</span>}
            {showCol('qty') && <span className="w-[15%] text-center">2</span>}
            {showCol('unitCost') && <span className="w-[20%] text-right">3,10,000</span>}
            {showCol('totalCost') && <span className="w-[20%] text-right font-bold text-zinc-900">6,20,000</span>}
          </div>
          <div
            style={{ backgroundColor: accentColor }}
            className="flex p-1 border-b border-zinc-100 text-[5px] text-zinc-700 transition-all duration-300"
          >
            {showCol('sl') && <span className="w-[10%] text-center">2</span>}
            {showCol('desc') && <span className="flex-1 font-medium text-zinc-900">Memory Modules 32GB</span>}
            {showCol('qty') && <span className="w-[15%] text-center">8</span>}
            {showCol('unitCost') && <span className="w-[20%] text-right">12,000</span>}
            {showCol('totalCost') && <span className="w-[20%] text-right font-bold text-zinc-900">96,000</span>}
          </div>
        </div>

        {/* PO Totals */}
        <div className="flex justify-end">
          <div className="w-[45%] border rounded overflow-hidden">
            <div style={{ backgroundColor: themeColor }} className="p-0.5 text-center text-white font-bold text-[5px]">PO Summary</div>
            <div className="flex justify-between p-1 bg-white text-[5px] border-b">
              <span>Subtotal</span>
              <span>Rs. 7,16,000.00</span>
            </div>
            <div style={{ backgroundColor: themeColor }} className="flex justify-between p-1 text-white font-bold text-[5px]">
              <span>Total Cost</span>
              <span>Rs. 8,44,880.00</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Challan mock renderer
  const mockRenderChallanPreview = () => {
    const themeColor = salesSettings.challan_theme_color || '#115e59'
    const accentColor = salesSettings.challan_accent_color || 'rgba(240,253,250,0.1)'
    const showCol = (id: string) => (salesSettings.challan_visible_columns || []).includes(id)

    return (
      <div className="space-y-2 text-[6px]">
        {/* Challan Header */}
        <div className="flex justify-between border-b pb-1 items-start">
          <div className="flex items-center gap-1">
            <div className="h-5 w-5 rounded bg-zinc-200" />
            <div>
              <p className="font-bold text-[7px]" style={{ color: themeColor }}>{salesSettings.company_name || 'Company Name'}</p>
              <p className="text-[5px] text-zinc-500">GSTIN: {salesSettings.company_gstin || '29AAX...'}</p>
            </div>
          </div>
          <div className="text-right">
            <h2 className="font-bold text-[8px] uppercase tracking-wider" style={{ color: themeColor }}>Delivery Challan</h2>
            <p className="text-[5px] text-zinc-500">DC-2026-0419</p>
          </div>
        </div>

        {/* Challan Address info */}
        <div className="grid grid-cols-2 gap-2 text-[5px] border-b pb-1 text-zinc-600">
          <div>
            <span className="font-bold uppercase tracking-wider block" style={{ color: themeColor }}>Deliver To (Customer)</span>
            <p className="font-bold text-zinc-800">Acme Corp Client</p>
          </div>
          <div>
            <span className="font-bold uppercase tracking-wider block" style={{ color: themeColor }}>Dispatched From</span>
            <p className="font-bold text-zinc-800">{salesSettings.company_name}</p>
          </div>
        </div>

        {/* Challan Items Table */}
        <div className="border border-zinc-200 rounded overflow-hidden">
          <div
            style={{ backgroundColor: themeColor }}
            className="flex p-1 text-[6px] font-bold text-white"
          >
            {showCol('sl') && <span className="w-[10%] text-center">SL</span>}
            {showCol('desc') && <span className="flex-1">Product Description</span>}
            {showCol('hsn') && <span className="w-[15%] text-center">HSN</span>}
            {showCol('orderedQty') && <span className="w-[12%] text-center">Ordered</span>}
            {showCol('deliveredQty') && <span className="w-[12%] text-center">Delivered</span>}
            {showCol('unitPrice') && <span className="w-[15%] text-right font-semibold">Unit Price</span>}
            {showCol('subtotal') && <span className="w-[15%] text-right font-semibold">Total</span>}
          </div>
          <div className="flex p-1 bg-white border-b border-zinc-100 text-[5px] text-zinc-700">
            {showCol('sl') && <span className="w-[10%] text-center">1</span>}
            {showCol('desc') && <span className="flex-1 font-medium text-zinc-900">ArctiCore™ Server Bundle</span>}
            {showCol('hsn') && <span className="w-[15%] text-center">84713010</span>}
            {showCol('orderedQty') && <span className="w-[12%] text-center">1</span>}
            {showCol('deliveredQty') && <span className="w-[12%] text-center">1</span>}
            {showCol('unitPrice') && <span className="w-[15%] text-right">4,50,000</span>}
            {showCol('subtotal') && <span className="w-[15%] text-right font-bold text-zinc-900">4,50,000</span>}
          </div>
          <div
            style={{ backgroundColor: accentColor }}
            className="flex p-1 border-b border-zinc-100 text-[5px] text-zinc-700 transition-all duration-300"
          >
            {showCol('sl') && <span className="w-[10%] text-center">2</span>}
            {showCol('desc') && <span className="flex-1 font-medium text-zinc-900">Annual Service SLA Tier 1</span>}
            {showCol('hsn') && <span className="w-[15%] text-center">998313</span>}
            {showCol('orderedQty') && <span className="w-[12%] text-center">1</span>}
            {showCol('deliveredQty') && <span className="w-[12%] text-center">1</span>}
            {showCol('unitPrice') && <span className="w-[15%] text-right">90,000</span>}
            {showCol('subtotal') && <span className="w-[15%] text-right font-bold text-zinc-900">90,000</span>}
          </div>
        </div>

        {/* Challan Footer */}
        <div className="flex justify-end pt-1 border-t text-[5px] text-zinc-400 font-mono">
          <span>Challan Value: Rs. 5,40,000.00</span>
        </div>
      </div>
    )
  }

  // --- Live Mockup Renderers ---
  const mockRenderTitleBanner = () => (
    <div
      key="titleBanner"
      style={{ backgroundColor: salesSettings.pdf_theme_color || '#1e3a5f' }}
      className="py-1.5 text-center rounded transition-all duration-300"
    >
      <span
        style={{ color: salesSettings.pdf_header_text_color || '#FFFFFF' }}
        className="font-bold text-[9px] tracking-widest uppercase transition-all duration-300"
      >
        Commercial Proposal
      </span>
    </div>
  )

  const mockRenderHeaderRow = () => (
    <div key="header" className="flex justify-between border-b pb-1">
      <div className="flex items-center gap-1">
        <div className="h-5 w-5 rounded bg-zinc-200" />
        <div>
          <p className="font-bold text-[8px]">{salesSettings.company_name || 'Company Name'}</p>
          <p className="text-[6px] text-zinc-500">GSTIN: {salesSettings.company_gstin || '29AAXCA8...'}</p>
        </div>
      </div>
      <div className="text-right text-[6px] text-zinc-500">
        <p className="font-bold text-zinc-800">Quote: QT-2026-001</p>
        <p>Date: 19/07/2026</p>
      </div>
    </div>
  )

  const mockRenderFromBox = () => (
    <div key="from" className="border border-zinc-200 p-1.5 rounded bg-white">
      <p className="font-bold text-[5px] text-zinc-500 uppercase tracking-wide">FROM (Supplier)</p>
      <p className="font-bold text-[7px]">{salesSettings.company_name || 'Company Name'}</p>
      <p className="text-[5px] text-zinc-400 truncate">{salesSettings.company_address_long || '123 Supply St...'}</p>
    </div>
  )

  const mockRenderAddresses = () => (
    <div key="addresses" className="grid grid-cols-2 gap-2 text-[6px]">
      <div className="border border-zinc-200 p-1 rounded">
        <p className="font-bold text-[5px] text-zinc-500 uppercase">Ship To</p>
        <p className="font-bold text-zinc-800">Consignee Client Name</p>
      </div>
      <div className="border border-zinc-200 p-1 rounded">
        <p className="font-bold text-[5px] text-zinc-500 uppercase">Bill To</p>
        <p className="font-bold text-zinc-800">Buyer Client Name</p>
      </div>
    </div>
  )

  const mockRenderSubject = () => (
    <div key="subject" className="text-[6px]">
      <span className="font-bold">Sub: </span>
      <span className="text-zinc-600">Enterprise Core Server Hardware Quotation</span>
    </div>
  )

  const mockRenderTable = () => {
    const showCol = (id: string) => (salesSettings.pdf_visible_columns || []).includes(id)
    return (
      <div key="table" className="border border-zinc-200 rounded overflow-hidden">
        <div
          style={{ backgroundColor: salesSettings.pdf_theme_color || '#1e3a5f' }}
          className="flex p-1 transition-all duration-300 text-[6px] font-bold"
        >
          {showCol('sl') && <span style={{ color: salesSettings.pdf_header_text_color || '#FFFFFF' }} className="w-[10%] text-center">SL</span>}
          {showCol('desc') && <span style={{ color: salesSettings.pdf_header_text_color || '#FFFFFF' }} className="flex-1">Item Description</span>}
          {showCol('hsn') && <span style={{ color: salesSettings.pdf_header_text_color || '#FFFFFF' }} className="w-[15%] text-center">HSN/SAC</span>}
          {showCol('uom') && <span style={{ color: salesSettings.pdf_header_text_color || '#FFFFFF' }} className="w-[10%] text-center">UoM</span>}
          {showCol('qty') && <span style={{ color: salesSettings.pdf_header_text_color || '#FFFFFF' }} className="w-[10%] text-center">Qty</span>}
          {showCol('unitPrice') && <span style={{ color: salesSettings.pdf_header_text_color || '#FFFFFF' }} className="w-[15%] text-right font-semibold">Unit Price</span>}
          {showCol('total') && <span style={{ color: salesSettings.pdf_header_text_color || '#FFFFFF' }} className="w-[15%] text-right font-semibold">Total</span>}
        </div>
        <div className="flex p-1 bg-white border-b border-zinc-100 text-[5px] text-zinc-700">
          {showCol('sl') && <span className="w-[10%] text-center">1</span>}
          {showCol('desc') && <span className="flex-1 font-medium text-zinc-900">ArctiCore™ Forge Server</span>}
          {showCol('hsn') && <span className="w-[15%] text-center">84713010</span>}
          {showCol('uom') && <span className="w-[10%] text-center">EA</span>}
          {showCol('qty') && <span className="w-[10%] text-center">1</span>}
          {showCol('unitPrice') && <span className="w-[15%] text-right">4,50,000</span>}
          {showCol('total') && <span className="w-[15%] text-right font-bold text-zinc-900">4,50,000</span>}
        </div>
        <div
          style={{ backgroundColor: salesSettings.pdf_accent_color || '#f7f9fc' }}
          className="flex p-1 border-b border-zinc-100 text-[5px] text-zinc-700 transition-all duration-300"
        >
          {showCol('sl') && <span className="w-[10%] text-center">2</span>}
          {showCol('desc') && <span className="flex-1 font-medium text-zinc-900">Annual SLA Tier 1 Support</span>}
          {showCol('hsn') && <span className="w-[15%] text-center">998313</span>}
          {showCol('uom') && <span className="w-[10%] text-center">EA</span>}
          {showCol('qty') && <span className="w-[10%] text-center">1</span>}
          {showCol('unitPrice') && <span className="w-[15%] text-right">90,000</span>}
          {showCol('total') && <span className="w-[15%] text-right font-bold text-zinc-900">90,000</span>}
        </div>
      </div>
    )
  }

  const mockRenderSummary = () => (
    <div key="summary" className="grid grid-cols-5 gap-2 text-[5px]">
      <div className="col-span-3 border border-zinc-200 p-1 rounded bg-white">
        <p className="font-bold text-[5px] text-zinc-500 uppercase">Amount in Words</p>
        <p className="font-medium text-zinc-800">Rupees Six Lakh Thirty Seven Thousand Only</p>
      </div>
      <div className="col-span-2 border border-zinc-200 rounded overflow-hidden">
        <div style={{ backgroundColor: salesSettings.pdf_theme_color }} className="p-0.5 text-center text-white font-bold">Price Summary</div>
        <div className="flex justify-between p-1 bg-white border-b border-zinc-100">
          <span>Subtotal</span>
          <span className="font-bold">Rs. 5,40,000.00</span>
        </div>
        <div style={{ backgroundColor: salesSettings.pdf_theme_color }} className="flex justify-between p-1 text-white font-bold">
          <span>Total</span>
          <span>Rs. 6,37,200.00</span>
        </div>
      </div>
    </div>
  )

  const mockRenderDeclBank = () => (
    <div key="declBank" className="grid grid-cols-2 gap-2 text-[5px]">
      {salesSettings.pdf_show_declaration !== false ? (
        <div className="border border-zinc-200 rounded p-1.5 bg-zinc-50/50">
          <p className="font-bold mb-0.5">Supplier Declaration</p>
          <p className="text-[5px] text-zinc-500 leading-tight">We declare that this quotation shows the actual price...</p>
        </div>
      ) : (
        <div className="border border-dashed border-zinc-200 rounded p-1.5 flex items-center justify-center text-zinc-300 text-[5px]">
          Declaration Block Hidden
        </div>
      )}

      {salesSettings.pdf_show_bank_details !== false ? (
        <div className="border border-zinc-200 rounded p-1.5 bg-zinc-50/50">
          <p className="font-bold mb-0.5">Payment Bank Details</p>
          <p className="text-[5px] text-zinc-500 leading-tight">
            A/c: {salesSettings.bank_ac_name || 'Bank Account Name'}<br />
            IFSC: {salesSettings.bank_ifsc || 'BANKIFSC123'}<br />
            No: {salesSettings.bank_ac_no || '123456789'}
          </p>
        </div>
      ) : (
        <div className="border border-dashed border-zinc-200 rounded p-1.5 flex items-center justify-center text-zinc-300 text-[5px]">
          Bank Details Hidden
        </div>
      )}
    </div>
  )

  const mockRenderSignatures = () => (
    <div key="signatures" className="grid grid-cols-2 gap-2 text-[5px]">
      <div className="border border-zinc-200 p-1 bg-white rounded flex flex-col justify-between h-10">
        <p className="font-bold text-zinc-500 uppercase text-[5px]">Client Acceptance Signature</p>
        <span className="font-['Brush_Script_MT',cursive] text-zinc-800 text-center italic text-xs leading-none">Customer</span>
      </div>
      <div className="border border-zinc-200 p-1 bg-white rounded flex flex-col justify-between h-10">
        <p className="font-bold text-zinc-500 uppercase text-[5px]">Authorized Signature</p>
        <span className="text-[5px] text-zinc-400 text-center border-t border-dashed pt-1">Company Signatory</span>
      </div>
    </div>
  )

  const mockRenderers: Record<string, () => React.ReactNode> = {
    titleBanner: mockRenderTitleBanner,
    header: mockRenderHeaderRow,
    from: mockRenderFromBox,
    addresses: mockRenderAddresses,
    subject: mockRenderSubject,
    table: mockRenderTable,
    summary: mockRenderSummary,
    declBank: mockRenderDeclBank,
    signatures: mockRenderSignatures,
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold font-display">Settings</h1>
        <p className="text-muted-foreground mt-1">
          Organization configuration and approval policies
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* ── Sales Performance Settings ── */}
        <Card className="lg:col-span-2 border-violet-200/60 bg-gradient-to-br from-violet-50/40 to-indigo-50/20 dark:from-violet-950/10 dark:to-indigo-950/5">
          <CardHeader>
            <CardTitle className="text-violet-800 dark:text-violet-300">Sales Performance Settings</CardTitle>
            <CardDescription>Global parameters used by the Incentive Engine and Price Desk. Changes apply immediately to all dashboards and calculations.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Financial Year</Label>
                <Input
                  value={salesSettings.financial_year}
                  onChange={(e) => setSalesSettings((s) => ({ ...s, financial_year: e.target.value }))}
                  placeholder="FY 2026-27"
                  className="h-9 text-sm"
                />
                <p className="text-[10px] text-muted-foreground">Applied to targets and dashboard filters</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Bottom Line % of Top Line</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={(salesSettings.bottom_line_pct * 100).toFixed(1)}
                    onChange={(e) => setSalesSettings((s) => ({ ...s, bottom_line_pct: Number(e.target.value) / 100 }))}
                    className="h-9 text-sm font-mono max-w-[100px]"
                  />
                  <span className="text-sm font-bold text-muted-foreground">%</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Margin target = Revenue × this %</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Incentive % of Margin Earned</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={(salesSettings.incentive_pct * 100).toFixed(1)}
                    onChange={(e) => setSalesSettings((s) => ({ ...s, incentive_pct: Number(e.target.value) / 100 }))}
                    className="h-9 text-sm font-mono max-w-[100px]"
                  />
                  <span className="text-sm font-bold text-muted-foreground">%</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Incentive paid on actual gross margin</p>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Price Desk Floor Margin %</Label>
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    min={0}
                    max={100}
                    step={0.5}
                    value={(salesSettings.floor_margin_pct * 100).toFixed(1)}
                    onChange={(e) => setSalesSettings((s) => ({ ...s, floor_margin_pct: Number(e.target.value) / 100 }))}
                    className="h-9 text-sm font-mono max-w-[100px]"
                  />
                  <span className="text-sm font-bold text-muted-foreground">%</span>
                </div>
                <p className="text-[10px] text-muted-foreground">Quotes below this need Sales Head approval</p>
              </div>
            </div>

            {/* Live preview row */}
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Bottom Line (on ₹1 Cr revenue)', value: formatCurrency(10000000 * salesSettings.bottom_line_pct) },
                { label: 'Incentive Potential (on ₹1 Cr)', value: formatCurrency(10000000 * salesSettings.bottom_line_pct * salesSettings.incentive_pct) },
                { label: 'Current Floor Margin', value: `${(salesSettings.floor_margin_pct * 100).toFixed(1)}%` },
                { label: 'Current FY', value: salesSettings.financial_year },
              ].map((p) => (
                <div key={p.label} className="bg-white/60 dark:bg-white/5 border border-border/40 rounded-lg px-3 py-2">
                  <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">{p.label}</p>
                  <p className="text-sm font-bold font-mono text-foreground mt-0.5">{p.value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* ── Company Profile ── */}
        <Card className="lg:col-span-2 border-violet-200/60 bg-gradient-to-br from-violet-50/40 to-indigo-50/20 dark:from-violet-950/10 dark:to-indigo-950/5">
          <CardHeader>
            <CardTitle className="text-violet-800 dark:text-violet-300">Company Profile</CardTitle>
            <CardDescription>Company identity, logo, contact information, and billing address printed on PDFs.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Company Name</Label>
                <Input
                  value={salesSettings.company_name || ''}
                  onChange={(e) => setSalesSettings((s) => ({ ...s, company_name: e.target.value }))}
                  placeholder="e.g. Aicera Systems Pvt Ltd"
                  className="h-9 text-sm bg-white dark:bg-zinc-950"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Logo URL</Label>
                <Input
                  value={salesSettings.company_logo_url || ''}
                  onChange={(e) => setSalesSettings((s) => ({ ...s, company_logo_url: e.target.value }))}
                  placeholder="e.g. https://domain.com/logo.png"
                  className="h-9 text-sm bg-white dark:bg-zinc-950"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Email Address</Label>
                <Input
                  value={salesSettings.company_email || ''}
                  onChange={(e) => setSalesSettings((s) => ({ ...s, company_email: e.target.value }))}
                  placeholder="e.g. sales@company.com"
                  className="h-9 text-sm bg-white dark:bg-zinc-950"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Phone Number</Label>
                <Input
                  value={salesSettings.company_phone || ''}
                  onChange={(e) => setSalesSettings((s) => ({ ...s, company_phone: e.target.value }))}
                  placeholder="e.g. 9945073777"
                  className="h-9 text-sm bg-white dark:bg-zinc-950"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-2">
                <Label className="text-xs font-semibold">GSTIN</Label>
                <Input
                  value={salesSettings.company_gstin || ''}
                  onChange={(e) => setSalesSettings((s) => ({ ...s, company_gstin: e.target.value }))}
                  placeholder="e.g. 29AAXCA8339E1Z1"
                  className="h-9 text-sm bg-white dark:bg-zinc-950 font-mono"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label className="text-xs font-semibold">Short Address (for Page Header)</Label>
                <Input
                  value={salesSettings.company_address_short || ''}
                  onChange={(e) => setSalesSettings((s) => ({ ...s, company_address_short: e.target.value }))}
                  placeholder="e.g. # 214, Ground Floor, 24th Main Road, Near JSS School"
                  className="h-9 text-sm bg-white dark:bg-zinc-950"
                />
              </div>

              <div className="space-y-1.5 sm:col-span-2 lg:col-span-3">
                <Label className="text-xs font-semibold">Long Address (for FROM Box / Invoice Billing Address)</Label>
                <Input
                  value={salesSettings.company_address_long || ''}
                  onChange={(e) => setSalesSettings((s) => ({ ...s, company_address_long: e.target.value }))}
                  placeholder="e.g. # 214, Ground Floor, 24th Main Road, Near JSS School, BSK 6th Stage, 11th BLOCK, Bengaluru - 560060"
                  className="h-9 text-sm bg-white dark:bg-zinc-950"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Company Bank Details ── */}
        <Card className="lg:col-span-2 border-violet-200/60 bg-gradient-to-br from-violet-50/40 to-indigo-50/20 dark:from-violet-950/10 dark:to-indigo-950/5">
          <CardHeader>
            <CardTitle className="text-violet-800 dark:text-violet-300">Company Bank Details</CardTitle>
            <CardDescription>Bank account details printed on generated quotes and commercial proposals.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Name</Label>
                <Input
                  value={salesSettings.bank_ac_name || ''}
                  onChange={(e) => setSalesSettings((s) => ({ ...s, bank_ac_name: e.target.value }))}
                  placeholder="e.g. Aicera Systems Pvt Ltd"
                  className="h-9 text-sm bg-white dark:bg-zinc-950"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Bank Name</Label>
                <Input
                  value={salesSettings.bank_name || ''}
                  onChange={(e) => setSalesSettings((s) => ({ ...s, bank_name: e.target.value }))}
                  placeholder="e.g. Karnataka Bank Ltd"
                  className="h-9 text-sm bg-white dark:bg-zinc-950"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Account Number</Label>
                <Input
                  value={salesSettings.bank_ac_no || ''}
                  onChange={(e) => setSalesSettings((s) => ({ ...s, bank_ac_no: e.target.value }))}
                  placeholder="e.g. 0914702500101801"
                  className="h-9 text-sm bg-white dark:bg-zinc-950 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">IFSC Code</Label>
                <Input
                  value={salesSettings.bank_ifsc || ''}
                  onChange={(e) => setSalesSettings((s) => ({ ...s, bank_ifsc: e.target.value }))}
                  placeholder="e.g. KARB0000914"
                  className="h-9 text-sm bg-white dark:bg-zinc-950 font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">Branch</Label>
                <Input
                  value={salesSettings.bank_branch || ''}
                  onChange={(e) => setSalesSettings((s) => ({ ...s, bank_branch: e.target.value }))}
                  placeholder="e.g. Herohalli Branch"
                  className="h-9 text-sm bg-white dark:bg-zinc-950"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs font-semibold">SWIFT Code</Label>
                <Input
                  value={salesSettings.bank_swift || ''}
                  onChange={(e) => setSalesSettings((s) => ({ ...s, bank_swift: e.target.value }))}
                  placeholder="e.g. KARBINBBBNG"
                  className="h-9 text-sm bg-white dark:bg-zinc-950 font-mono"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── Currency ── */}
        <Card>
          <CardHeader>
            <CardTitle>Currency</CardTitle>
            <CardDescription>Configure the active global currency format</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select active currency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="INR">INR (₹ · Indian Rupee)</SelectItem>
                <SelectItem value="USD">USD ($ · US Dollar)</SelectItem>
                <SelectItem value="EUR">EUR (€ · Euro)</SelectItem>
                <SelectItem value="GBP">GBP (£ · British Pound)</SelectItem>
                <SelectItem value="JPY">JPY (¥ · Japanese Yen)</SelectItem>
              </SelectContent>
            </Select>
            <div className="flex items-center gap-2.5 text-xs text-muted-foreground bg-muted/20 border border-border/40 p-2.5 rounded-lg">
              <span className="font-semibold text-foreground">Preview:</span>
              <span>15,000 becomes</span>
              <span className="font-mono font-medium text-foreground bg-background px-1.5 py-0.5 rounded border border-border/40">
                {formatCurrency(15000, currency)}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Units of measure</CardTitle>
            <CardDescription>Available UoM for line items</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {['EA', 'KG', 'LB', 'HR', 'LOT', 'BOX'].map((u) => (
              <span key={u} className="rounded-lg border px-3 py-1.5 text-sm font-mono bg-muted/30">
                {u}
              </span>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Approval policies</CardTitle>
            <CardDescription>Workflow thresholds and rules</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>Require comment on rejection</Label>
                <p className="text-xs text-muted-foreground">Mandatory feedback for sales reps</p>
              </div>
              <Switch defaultChecked />
            </div>
            <div className="flex items-center justify-between">
              <div>
                <Label>Auto-route technical deals</Label>
                <p className="text-xs text-muted-foreground">When technical flag is enabled</p>
              </div>
              <Switch defaultChecked />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Audit &amp; compliance</CardTitle>
            <CardDescription>Export and retention</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Audit log retention (days)</Label>
              <Input type="number" defaultValue={2555} className="mt-1.5 max-w-[160px]" />
            </div>
            <Button
              variant="outline"
              onClick={() => toast.success('Export queued — download from Audit Log page')}
            >
              Open Audit Log exports
            </Button>
          </CardContent>
        </Card>

        {/* ── PDF Layout & Theme Customizer ── */}
        <Card className="lg:col-span-2 border-violet-200/60 bg-gradient-to-br from-violet-50/40 to-indigo-50/20 dark:from-violet-950/10 dark:to-indigo-950/5">
          <CardHeader>
            <CardTitle className="text-violet-800 dark:text-violet-300 flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-violet-600" />
              Dynamic Document PDF Layout &amp; Theme Customizer
            </CardTitle>
            <CardDescription>
              Completely customize generated commercial documents. Switch tabs to organize layout, select columns, configure dynamic merge tags, and preview in real-time.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Template Selector Tabs */}
            <div className="flex border-b border-violet-100 dark:border-violet-900 pb-2 gap-4">
              <button
                type="button"
                onClick={() => { setActiveTemplateTab('quote'); setStyleJsonError(null); }}
                className={cn(
                  "pb-2 text-sm font-semibold border-b-2 transition-all relative top-[2px]",
                  activeTemplateTab === 'quote'
                    ? "border-violet-600 text-violet-800 dark:text-violet-300"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Commercial Proposal (Quote)
              </button>
              <button
                type="button"
                onClick={() => { setActiveTemplateTab('po'); setStyleJsonError(null); }}
                className={cn(
                  "pb-2 text-sm font-semibold border-b-2 transition-all relative top-[2px]",
                  activeTemplateTab === 'po'
                    ? "border-violet-600 text-violet-800 dark:text-violet-300"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Purchase Order (PO)
              </button>
              <button
                type="button"
                onClick={() => { setActiveTemplateTab('challan'); setStyleJsonError(null); }}
                className={cn(
                  "pb-2 text-sm font-semibold border-b-2 transition-all relative top-[2px]",
                  activeTemplateTab === 'challan'
                    ? "border-violet-600 text-violet-800 dark:text-violet-300"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                )}
              >
                Delivery Challan
              </button>
            </div>

            <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
              
              {/* Left Side: Controls (xl:col-span-7) */}
              <div className="xl:col-span-7 space-y-6">
                
                {/* 1. Color Theme Selection */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-violet-800 dark:text-violet-300">1. Color Theme</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {THEMES.map((t) => {
                      const isSelected = activeTemplateTab === 'quote'
                        ? salesSettings.pdf_theme_color === t.theme
                        : activeTemplateTab === 'po'
                          ? salesSettings.po_theme_color === t.theme
                          : salesSettings.challan_theme_color === t.theme

                      return (
                        <button
                          key={t.name}
                          type="button"
                          onClick={() => setSalesSettings((s) => {
                            if (activeTemplateTab === 'quote') {
                              return {
                                ...s,
                                pdf_theme_color: t.theme,
                                pdf_accent_color: t.accent,
                                pdf_header_text_color: t.text
                              }
                            } else if (activeTemplateTab === 'po') {
                              return {
                                ...s,
                                po_theme_color: t.theme,
                                po_accent_color: t.accent,
                                po_header_text_color: t.text
                              }
                            } else {
                              return {
                                ...s,
                                challan_theme_color: t.theme,
                                challan_accent_color: t.accent,
                                challan_header_text_color: t.text
                              }
                            }
                          })}
                          className={cn(
                            "flex items-center gap-2 p-2 rounded-lg border text-left text-xs transition-all active:scale-95",
                            isSelected
                              ? "border-primary bg-background shadow-sm ring-1 ring-primary"
                              : "border-border/60 bg-white/40 dark:bg-zinc-900/30 hover:bg-white/80"
                          )}
                        >
                          <span className={cn("h-4 w-4 rounded-full border border-black/10 shrink-0", t.class)} />
                          <span className="font-medium truncate">{t.name}</span>
                        </button>
                      )
                    })}
                  </div>
                </div>

                {/* 2. Drag & Drop Section Ordering (Quotes Only) */}
                {activeTemplateTab === 'quote' && (
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
                      2. Section Layout Organizer (Reorder)
                      <span title="Use arrows to place sections in your preferred order" className="cursor-help">
                        <HelpCircle className="h-3.5 w-3.5 text-muted-foreground" />
                      </span>
                    </Label>
                    <div className="border border-border/40 rounded-lg p-2 bg-white/30 dark:bg-zinc-900/10 space-y-1.5 max-h-[300px] overflow-y-auto">
                      {(salesSettings.pdf_section_order || []).map((secId, idx) => (
                        <div
                          key={secId}
                          className="flex items-center justify-between p-2 rounded bg-white dark:bg-zinc-900 border border-border/40 text-xs shadow-sm hover:border-violet-300/80 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                              {idx + 1}
                            </span>
                            <span className="font-medium text-foreground">{SECTION_LABELS[secId] || secId}</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              disabled={idx === 0}
                              onClick={() => moveSection(idx, 'up')}
                              className="h-6 w-6 rounded hover:bg-muted"
                            >
                              <ArrowUp className="h-3.5 w-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              type="button"
                              disabled={idx === (salesSettings.pdf_section_order || []).length - 1}
                              onClick={() => moveSection(idx, 'down')}
                              className="h-6 w-6 rounded hover:bg-muted"
                            >
                              <ArrowDown className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 2. Extra Options (For PO & Challan Layouts) */}
                {activeTemplateTab !== 'quote' && (
                  <div className="space-y-4 pt-2">
                    <Label className="text-xs font-bold uppercase tracking-wider text-violet-800 dark:text-violet-300">2. Layout Blocks Visibility</Label>
                    
                    {activeTemplateTab === 'po' && (
                      <>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-white/40 dark:bg-zinc-900/30">
                          <div>
                            <Label className="text-sm font-medium">Show Declarations Box</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Toggle general terms declaration at document bottom</p>
                          </div>
                          <Switch
                            checked={salesSettings.pdf_show_declaration !== false}
                            onCheckedChange={(checked) => setSalesSettings((s) => ({ ...s, pdf_show_declaration: checked }))}
                          />
                        </div>
                        <div className="flex items-center justify-between p-3 rounded-lg border border-border/40 bg-white/40 dark:bg-zinc-900/30">
                          <div>
                            <Label className="text-sm font-medium">Show Supplier Bank Coordinates</Label>
                            <p className="text-xs text-muted-foreground mt-0.5">Include bank instructions for settlement</p>
                          </div>
                          <Switch
                            checked={salesSettings.pdf_show_bank_details !== false}
                            onCheckedChange={(checked) => setSalesSettings((s) => ({ ...s, pdf_show_bank_details: checked }))}
                          />
                        </div>
                      </>
                    )}
                    {activeTemplateTab === 'challan' && (
                      <div className="p-3 rounded-lg border border-dashed border-border/60 bg-muted/20 text-xs text-muted-foreground">
                        <Info className="h-4 w-4 text-violet-600 inline mr-1" />
                        Challan header, company coordinates, dispatched info, transport logs, and signatory spaces are locked to comply with standard transportation formats.
                      </div>
                    )}
                  </div>
                )}

                {/* 3. Table Column Visibility Toggles */}
                <div className="space-y-2">
                  <Label className="text-xs font-bold uppercase tracking-wider text-violet-800 dark:text-violet-300">3. Table Column Selection</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3 rounded-lg border border-border/40 bg-white/40 dark:bg-zinc-900/30">
                    {activeTemplateTab === 'quote' && Object.entries(COLUMN_LABELS).map(([colId, label]) => (
                      <label
                        key={colId}
                        className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={(salesSettings.pdf_visible_columns || []).includes(colId)}
                          disabled={colId === 'desc'}
                          onChange={() => toggleColumn(colId)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={colId === 'desc' ? 'opacity-60' : ''}>{label}</span>
                      </label>
                    ))}
                    {activeTemplateTab === 'po' && Object.entries(PO_COLUMN_LABELS).map(([colId, label]) => (
                      <label
                        key={colId}
                        className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={(salesSettings.po_visible_columns || []).includes(colId)}
                          disabled={colId === 'desc'}
                          onChange={() => toggleColumn(colId)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={colId === 'desc' ? 'opacity-60' : ''}>{label}</span>
                      </label>
                    ))}
                    {activeTemplateTab === 'challan' && Object.entries(CHALLAN_COLUMN_LABELS).map(([colId, label]) => (
                      <label
                        key={colId}
                        className="flex items-center gap-2 text-xs font-medium text-foreground cursor-pointer select-none"
                      >
                        <input
                          type="checkbox"
                          checked={(salesSettings.challan_visible_columns || []).includes(colId)}
                          disabled={colId === 'desc'}
                          onChange={() => toggleColumn(colId)}
                          className="h-3.5 w-3.5 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className={colId === 'desc' ? 'opacity-60' : ''}>{label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* 4. Custom Message notes with Merge Tags */}
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold uppercase tracking-wider text-violet-800 dark:text-violet-300">4. Dynamic Message Notes (Merge Tags)</Label>
                    <span className="text-[10px] text-muted-foreground bg-zinc-100 dark:bg-zinc-800 rounded px-1.5 py-0.5 leading-none">
                      Support: #QuoteNo# · #Customer# · #Date# · #Company# · #Total#
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Custom Top Header Banner (Optional)</Label>
                      <Input
                        value={
                          activeTemplateTab === 'quote'
                            ? (salesSettings.pdf_custom_header_note || '')
                            : activeTemplateTab === 'po'
                              ? (salesSettings.po_custom_header_note || '')
                              : (salesSettings.challan_custom_header_note || '')
                        }
                        onChange={(e) => setSalesSettings((s) => {
                          if (activeTemplateTab === 'quote') return { ...s, pdf_custom_header_note: e.target.value }
                          if (activeTemplateTab === 'po') return { ...s, po_custom_header_note: e.target.value }
                          return { ...s, challan_custom_header_note: e.target.value }
                        })}
                        placeholder="e.g. #Customer# Proposal — Valid for this financial year"
                        className="h-9 text-xs"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs font-medium">Custom Bottom Footer Notice (Optional)</Label>
                      <Input
                        value={
                          activeTemplateTab === 'quote'
                            ? (salesSettings.pdf_custom_footer_note || '')
                            : activeTemplateTab === 'po'
                              ? (salesSettings.po_custom_footer_note || '')
                              : (salesSettings.challan_custom_footer_note || '')
                        }
                        onChange={(e) => setSalesSettings((s) => {
                          if (activeTemplateTab === 'quote') return { ...s, pdf_custom_footer_note: e.target.value }
                          if (activeTemplateTab === 'po') return { ...s, po_custom_footer_note: e.target.value }
                          return { ...s, challan_custom_footer_note: e.target.value }
                        })}
                        placeholder="e.g. Prepared By: #PreparedBy# | Generated on: #Date#"
                        className="h-9 text-xs"
                      />
                    </div>
                  </div>
                </div>

                {/* 5. Developer CSS/JSON Override Code Editor */}
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold uppercase tracking-wider text-violet-800 dark:text-violet-300 flex items-center gap-1.5">
                      <Code className="h-3.5 w-3.5 text-zinc-500" />
                      5. Developer Style Editor (JSON Override)
                    </Label>
                    {styleJsonError && (
                      <span className="text-[10px] text-red-600 font-medium">{styleJsonError}</span>
                    )}
                  </div>
                  <textarea
                    rows={4}
                    value={
                      activeTemplateTab === 'quote'
                        ? (salesSettings.pdf_developer_styles || '')
                        : activeTemplateTab === 'po'
                          ? (salesSettings.po_developer_styles || '')
                          : (salesSettings.challan_developer_styles || '')
                    }
                    onChange={(e) => handleStyleJsonChange(e.target.value)}
                    className="font-mono text-xs w-full p-2.5 rounded-lg border bg-zinc-950 text-emerald-400 border-zinc-800 focus:outline-none focus:ring-1 focus:ring-violet-500"
                    placeholder={`{\n  "fontSize": 9,\n  "tableCellPadding": 6\n}`}
                  />
                  <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                    <Info className="h-3 w-3 shrink-0" /> Override stylesheet properties (e.g. fontSize, lineHeight, tableCellPadding, annexurePadding).
                  </p>
                </div>

              </div>

              {/* Right Side: Live Mockup Preview (xl:col-span-5) */}
              <div className="xl:col-span-5 flex flex-col border border-border/60 rounded-xl bg-white dark:bg-zinc-950 p-4 shadow-sm min-h-[450px]">
                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-3">Live PDF Design Mockup Workspace</span>
                
                <div className="flex-1 flex flex-col border border-border/30 rounded-lg p-3 text-[8px] space-y-2.5 overflow-hidden bg-white text-zinc-800 shadow-inner min-h-[450px]">
                  
                  {/* Custom Header banner preview */}
                  {(() => {
                    const headerNote = activeTemplateTab === 'quote'
                      ? salesSettings.pdf_custom_header_note
                      : activeTemplateTab === 'po'
                        ? salesSettings.po_custom_header_note
                        : salesSettings.challan_custom_header_note

                    if (!headerNote) return null

                    return (
                      <div className="border border-zinc-200 p-1 rounded bg-zinc-50 text-[6px] text-zinc-500 leading-tight">
                        {headerNote
                          .replace(/#QuoteNo#/g, 'QT-2026-001')
                          .replace(/#Customer#/g, 'Acme Corp')
                          .replace(/#Date#/g, '19/07/2026')
                          .replace(/#Company#/g, salesSettings.company_name || 'Aicera Systems')}
                      </div>
                    )
                  })()}

                  {/* Render mockup sections in the exact custom ordered list depending on active template selection */}
                  {activeTemplateTab === 'quote' && (salesSettings.pdf_section_order || []).map((secId) => {
                    const renderer = mockRenderers[secId]
                    return renderer ? renderer() : null
                  })}

                  {activeTemplateTab === 'po' && mockRenderPoPreview()}
                  {activeTemplateTab === 'challan' && mockRenderChallanPreview()}

                  {/* Custom Footer banner preview */}
                  <div className="border-t pt-1 flex justify-between text-[5px] text-zinc-400 font-mono mt-auto">
                    <span>
                      {(() => {
                        const footerNote = activeTemplateTab === 'quote'
                          ? salesSettings.pdf_custom_footer_note
                          : activeTemplateTab === 'po'
                            ? salesSettings.po_custom_footer_note
                            : salesSettings.challan_custom_footer_note

                        if (footerNote) {
                          return footerNote
                            .replace(/#QuoteNo#/g, 'QT-2026-001')
                            .replace(/#Customer#/g, 'Acme Corp')
                            .replace(/#Date#/g, '19/07/2026')
                            .replace(/#PreparedBy#/g, 'Alex Sales')
                            .replace(/#Company#/g, salesSettings.company_name || 'Aicera Systems')
                            .replace(/#Total#/g, 'Rs. 6,37,200.00')
                        } else {
                          return `${salesSettings.company_name || 'Aicera Systems'} | GSTIN: ${salesSettings.company_gstin || '29AAX...'}`
                        }
                      })()}
                    </span>
                    <span>Page 1 of 1</span>
                  </div>

                </div>
              </div>

            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex justify-end">
        <Button onClick={handleSave}>Save changes</Button>
      </div>
    </div>
  )
}
