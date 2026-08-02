import React, { useMemo, useState, useEffect, Fragment } from 'react'
import { useFieldArray, useForm, useWatch, type Resolver } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { motion, AnimatePresence } from 'framer-motion'
import { Plus, X, ArrowRight, ChevronDown, Upload, Clipboard, FileSpreadsheet, Briefcase, Layers, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useNavigate } from 'react-router-dom'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn, formatCurrency, formatPercent, getMarginBg, getMarginColor } from '@/lib/utils'
import type { Deal, DealItem, DealOverhead } from '@/types'
import { toast } from 'sonner'
import { useAuthStore } from '@/stores/auth-store'
import { fetchCustomers, saveCustomer } from '@/services/customers-service'
import { fetchQuotes } from '@/services/deals-service'

const num = (min = 0) =>
  z.preprocess(
    (v) => (v === '' || v === undefined ? 0 : Number(v)),
    z.number().min(min, 'Must be at least 0')
  )

const lineItemSchema = z.object({
  sku: z.string().min(1, 'Product Name / SKU is required'),
  product_name: z.string().optional(), // Description optional context field
  quantity: z.preprocess(
    (v) => (v === '' || v === undefined ? 0 : Number(v)),
    z.number().min(0, 'Quantity must be at least 0')
  ),
  unit_of_measure: z.string().min(1, 'Unit of Measure is required'),
  transfer_price: num(),
  quoted_price: num(),
})

const dealSchema = z.object({
  title: z.string().min(1, 'Deal Name is required'), // Allow 1+ character names like HP
  customer_name: z.string().min(1, 'Customer is required'), // Allow 1+ character names
  sales_rep_name: z.string().min(1, 'Sales Rep is required'),
  date_str: z.string().optional(),
  currency: z.string(),
  oem: z.string().optional(),
  quote_number: z.string().optional(),
  skip_technical: z.boolean(),
  items: z.array(lineItemSchema).min(1, 'At least one line item is required'),
  overheads: z.array(
    z.object({
      label: z.string().min(1, 'Charge label is required'),
      amount: num(),
      is_percentage: z.boolean(),
      percentage_value: num().optional(),
    })
  ),
})

export type DealFormValues = z.infer<typeof dealSchema>

const UOM_OPTIONS = [
  'Pcs',
  'Units',
  'Kg',
  'Ltr',
  'Box',
  'Set',
  'Hrs',
  'License',
  'Month',
  'Year',
] as const

const OEM_SUGGESTIONS = [
  'Cisco',
  'Aicera Devices',
  'HPE (Hewlett Packard Enterprise)',
  'Dell Technologies',
  'Juniper Networks',
  'Fortinet',
  'Palo Alto Networks',
  'Aruba Networks',
  'Lenovo',
  'IBM',
  'Microsoft',
  'Oracle',
  'VMware',
  'NetApp',
  'Schneider Electric',
  'Siemens',
  'Honeywell',
  'ABB',
  'Bosch',
  'Hikvision',
  'Dahua',
  'Zebra Technologies',
  'Motorola Solutions',
] as const

interface DealBuilderProps {
  initialDeal?: Deal
  onSubmit: (payload: any, submitType: 'draft' | 'submit') => Promise<void>
  isSubmitting: boolean
}

export function DealBuilder({ initialDeal, onSubmit, isSubmitting }: DealBuilderProps) {
  const navigate = useNavigate()
  const currentUser = useAuthStore((s) => s.user)
  const [submitType, setSubmitType] = useState<'draft' | 'submit'>('submit')
  const [customers, setCustomers] = useState<{ id: string; name: string }[]>([])
  const [showSuggestions, setShowSuggestions] = useState(false)
  const [customerSearch, setCustomerSearch] = useState(initialDeal?.customer_name ?? '')
  const [isAddCustomerDialogOpen, setIsAddCustomerDialogOpen] = useState(false)
  const [newCustomerName, setNewCustomerName] = useState('')
  const [oemSearch, setOemSearch] = useState(initialDeal?.oem ?? '')
  const [showOemSuggestions, setShowOemSuggestions] = useState(false)
  const [openOverheadIdx, setOpenOverheadIdx] = useState<number | null>(null)
  const [overheadQuery, setOverheadQuery] = useState('')
  const [quotes, setQuotes] = useState<Deal[]>([])
  const [showQuoteSuggestions, setShowQuoteSuggestions] = useState(false)



  useEffect(() => {
    const load = async () => {
      try {
        const list = await fetchCustomers()
        setCustomers(list)
      } catch (e) {
        console.error('Failed to load customers:', e)
      }
    }
    load()
  }, [])

  useEffect(() => {
    const loadQuotes = async () => {
      if (!currentUser) return
      try {
        const quoteList = await fetchQuotes(currentUser.role, currentUser.id)
        const approvedQuotes = quoteList.filter((q) => q.status === 'approved')
        setQuotes(approvedQuotes)
      } catch (e) {
        console.error('Failed to load quotes for dropdown:', e)
      }
    }
    loadQuotes()
  }, [currentUser])

  // Format current date for the form
  const defaultDateStr = useMemo(() => {
    const d = new Date()
    const dd = String(d.getDate()).padStart(2, '0')
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const yyyy = d.getFullYear()
    return `${dd}-${mm}-${yyyy}`
  }, [])



  const form = useForm<DealFormValues>({
    resolver: zodResolver(dealSchema) as Resolver<DealFormValues>,
    defaultValues: {
      title: initialDeal?.title ?? '',
      customer_name: initialDeal?.customer_name ?? '',
      sales_rep_name: initialDeal?.creator?.full_name ?? currentUser?.full_name ?? '',
      date_str: defaultDateStr,
      currency: initialDeal?.currency ?? 'INR', // Use initial deal currency or default to Indian Rupee (INR)
      oem: initialDeal?.oem ?? '',
      quote_number: initialDeal?.quote_number ?? '',
      skip_technical: initialDeal ? !initialDeal.requires_technical : false,
      items: initialDeal?.items?.length
        ? initialDeal.items.map((item: DealItem) => ({
          sku: item.sku,
          product_name: item.product_name ?? '',
          quantity: item.quantity,
          unit_of_measure: item.unit_of_measure ?? 'Pcs',
          transfer_price: item.transfer_price,
          quoted_price: item.quoted_price,
        }))
        : [
          {
            sku: '',
            product_name: '',
            quantity: 0,
            unit_of_measure: 'Pcs',
            transfer_price: 0,
            quoted_price: 0,
          },
        ],
      overheads: initialDeal?.overheads?.length
        ? initialDeal.overheads.map((o: DealOverhead) => ({
          label: o.label,
          amount: o.amount,
          is_percentage: o.is_percentage,
          percentage_value: o.percentage_value ?? undefined,
        }))
        : [{ label: 'Delivery/Freight', amount: 0, is_percentage: false }],
    },
  })

  const isExactMatch = useMemo(() => {
    return customers.some((c) => c.name.toLowerCase() === customerSearch.toLowerCase())
  }, [customerSearch, customers])

  const handleSelectQuote = (quote: Deal) => {
    form.setValue('quote_number', quote.quote_number || '', { shouldValidate: true })
    form.setValue('title', quote.title || '', { shouldValidate: true })
    form.setValue('customer_name', quote.customer_name || '', { shouldValidate: true })
    if (quote.oem) {
      form.setValue('oem', quote.oem, { shouldValidate: true })
      setOemSearch(quote.oem)
    }
    if (quote.currency) {
      form.setValue('currency', quote.currency, { shouldValidate: true })
    }
    setCustomerSearch(quote.customer_name || '')

    // Fill line items using form.setValue (use original quoted price from quote)
    if (quote.items && quote.items.length > 0) {
      const mappedItems = quote.items.map(item => ({
        sku: item.sku,
        product_name: item.product_name ?? '',
        quantity: item.quantity,
        unit_of_measure: item.unit_of_measure ?? 'Pcs',
        transfer_price: 0, // Force entering manually in deal builder
        quoted_price: Number((item.quoted_price).toFixed(2)),
      }))
      form.setValue('items', mappedItems, { shouldValidate: true })
    }

    // Fill overheads
    if (quote.overheads && quote.overheads.length > 0) {
      const mappedOverheads = quote.overheads.map(o => ({
        label: o.label,
        amount: o.amount,
        is_percentage: o.is_percentage,
        percentage_value: o.percentage_value ?? undefined,
      }))
      form.setValue('overheads', mappedOverheads, { shouldValidate: true })
    } else {
      form.setValue('overheads', [{ label: 'Delivery/Freight', amount: 0, is_percentage: false }], { shouldValidate: true })
    }

    toast.success(`Populated details from Quote ${quote.quote_number}`)
  }

  const handleAddNewCustomer = async (name: string) => {
    const generatedId = 'CUST-' + Math.floor(1000 + Math.random() * 9000)
    const newCust = {
      id: generatedId,
      name: name.trim(),
      created_at: new Date().toISOString()
    }
    try {
      await saveCustomer(newCust)
      setCustomers(prev => [...prev, newCust])
      form.setValue('customer_name', newCust.name, { shouldValidate: true })
      setCustomerSearch(newCust.name)
      setShowSuggestions(false)
      toast.success(`Customer "${newCust.name}" added to registry successfully!`)
    } catch (e) {
      console.error('Failed to add new customer:', e)
      toast.error('Failed to add new customer to registry')
    }
  }

  const filteredSuggestions = useMemo(() => {
    if (!customerSearch) return customers
    return customers.filter((c) =>
      c.name.toLowerCase().includes(customerSearch.toLowerCase())
    )
  }, [customerSearch, customers])

  const { fields: itemFields, append: appendItem, remove: removeItem } = useFieldArray({
    control: form.control,
    name: 'items',
  })

  const { fields: overheadFields, append: appendOverhead, remove: removeOverhead } =
    useFieldArray({ control: form.control, name: 'overheads' })

  const watched = useWatch({ control: form.control })

  // Formatted calculations based on inputs
  const calculatedItems = useMemo(() => {
    const safeNum = (v: any) => {
      const n = Number(v)
      return isNaN(n) ? 0 : n
    }
    return (watched.items ?? []).map((item) => {
      const qty = safeNum(item?.quantity)
      const transfer = safeNum(item?.transfer_price)
      const quoted = safeNum(item?.quoted_price)
      const cost = qty * transfer
      const rev = qty * quoted
      const margin = quoted > 0 ? ((quoted - transfer) / quoted) * 100 : 0
      const marginValue = rev - cost

      return {
        ...item,
        cost,
        rev,
        margin,
        marginValue,
      }
    })
  }, [watched.items])

  const overheadTotal = useMemo(() => {
    return (watched.overheads ?? []).reduce((sum, o) => sum + Number(o?.amount ?? 0), 0)
  }, [watched.overheads])

  const totalLineCost = useMemo(() => {
    return calculatedItems.reduce((sum, item) => sum + item.cost, 0)
  }, [calculatedItems])

  const totalRevenue = useMemo(() => {
    return calculatedItems.reduce((sum, item) => sum + item.rev, 0)
  }, [calculatedItems])

  const totalCost = useMemo(() => {
    return totalLineCost + overheadTotal
  }, [totalLineCost, overheadTotal])

  const netMarginPct = useMemo(() => {
    if (totalRevenue === 0) return 0
    return ((totalRevenue - totalCost) / totalRevenue) * 100
  }, [totalRevenue, totalCost])

  const marginColor = getMarginColor(netMarginPct)
  const marginBg = getMarginBg(netMarginPct)

  const handleFormSubmit = async (data: DealFormValues) => {
    // Map custom fields to database structure
    const selectedCustomer = customers.find(c => c.name.toLowerCase() === data.customer_name.toLowerCase())
    let customerId = initialDeal?.customer_id ?? selectedCustomer?.id
    if (!customerId && data.customer_name) {
      customerId = 'CUST-' + Math.floor(1000 + Math.random() * 9000)
      // Save this brand-new customer to the database asynchronously
      saveCustomer({
        id: customerId,
        name: data.customer_name,
        created_at: new Date().toISOString()
      }).catch(e => console.error('Failed to auto-save new customer:', e))
    }

    const payload = {
      title: data.title,
      customer_name: data.customer_name,
      customer_id: customerId ?? 'CUST-' + Math.floor(1000 + Math.random() * 9000),
      description: data.title + ' commercial pricing sheet',
      currency: data.currency,
      oem: data.oem?.trim() || null,
      quote_number: data.quote_number?.trim() || null,
      requires_technical: !data.skip_technical, // skip active = requires false
      items: data.items.map((item) => ({
        ...item,
        sku: item.sku?.trim() || '',
        product_name: item.product_name?.trim() || item.sku?.trim() || '',
        quantity: Number(item.quantity ?? 0),
        transfer_price: Number(item.transfer_price ?? 0),
        quoted_price: Number(item.quoted_price ?? 0),
      })),
      overheads: data.overheads
        .filter((oh) => oh.label.trim() !== '' || Number(oh.amount) > 0)
        .map((oh, index) => ({
          ...oh,
          label: oh.label.trim() || (
            index === 0
              ? 'Delivery / Freight Charges'
              : index === 1
                ? 'Implementation / Installation Charges'
                : 'Custom Charge'
          ),
          amount: Number(oh.amount ?? 0),
          percentage_value: oh.percentage_value == null ? undefined : Number(oh.percentage_value),
        })),
    }
    await onSubmit(payload, submitType)
  }

  const handleSaveDraft = async () => {
    const values = form.getValues()

    // We only require the deal name (title) to save a draft
    if (!values.title?.trim()) {
      form.setError('title', { type: 'manual', message: 'Deal Name is required to save a draft' })
      toast.error('Please enter a Deal / Opportunity Name to save as draft')
      return
    }

    // Map values to deal payload, setting default values for empty fields so it doesn't break standard deal schema
    const customerName = values.customer_name?.trim() || 'Draft Customer'
    const selectedCustomer = customers.find(c => c.name.toLowerCase() === customerName.toLowerCase())
    let customerId = initialDeal?.customer_id ?? selectedCustomer?.id
    if (!customerId && customerName && customerName !== 'Draft Customer') {
      customerId = 'CUST-' + Math.floor(1000 + Math.random() * 9000)
      saveCustomer({
        id: customerId,
        name: customerName,
        created_at: new Date().toISOString()
      }).catch(e => console.error('Failed to auto-save new customer from draft:', e))
    }

    const payload = {
      title: values.title.trim(),
      customer_name: customerName,
      customer_id: customerId ?? 'CUST-' + Math.floor(1000 + Math.random() * 9000),
      description: values.title.trim() + ' commercial pricing sheet (Draft)',
      currency: values.currency || 'INR',
      oem: values.oem?.trim() || null,
      quote_number: values.quote_number?.trim() || null,
      requires_technical: !values.skip_technical,
      items: (values.items || [])
        .filter((item) => item.sku?.trim() !== '' || Number(item.quantity) > 0 || Number(item.quoted_price) > 0)
        .map((item) => ({
          sku: item.sku?.trim() || 'Draft Item SKU',
          product_name: item.product_name?.trim() || item.sku?.trim() || 'Draft Item',
          quantity: Number(item.quantity ?? 0),
          unit_of_measure: item.unit_of_measure || 'Pcs',
          transfer_price: Number(item.transfer_price ?? 0),
          quoted_price: Number(item.quoted_price ?? 0),
        })),
      overheads: (values.overheads || [])
        .filter((oh) => oh.label?.trim() !== '' || Number(oh.amount) > 0)
        .map((oh, index) => ({
          label: oh.label?.trim() || (
            index === 0
              ? 'Delivery / Freight Charges'
              : index === 1
                ? 'Implementation / Installation Charges'
                : 'Custom Charge'
          ),
          amount: Number(oh.amount ?? 0),
          is_percentage: oh.is_percentage ?? false,
          percentage_value: oh.percentage_value ? Number(oh.percentage_value) : undefined,
        })),
    }

    // Ensure we have at least one line item in draft payload to satisfy schema
    if (payload.items.length === 0) {
      payload.items.push({
        sku: 'Draft SKU',
        product_name: 'Draft Item',
        quantity: 1,
        unit_of_measure: 'Pcs',
        transfer_price: 0,
        quoted_price: 0,
      })
    }

    setSubmitType('draft')
    await onSubmit(payload, 'draft')
  }

  // Margin border helpers for dynamic color highlight changes according to pricing
  const dynamicBorderColor = useMemo(() => {
    if (totalRevenue === 0) return 'border-border/80'
    if (netMarginPct >= 8) return 'border-emerald-500/40 shadow-sm shadow-emerald-500/5'
    return 'border-red-500/40 shadow-sm shadow-red-500/5'
  }, [totalRevenue, netMarginPct])

  return (
    <>
      <form onSubmit={form.handleSubmit(handleFormSubmit)} className="space-y-6 animate-none">
        {/* 1. DEAL INFORMATION */}
        <div className={cn(
          "bg-card border rounded-xl shadow-sm p-6 space-y-4 transition-all duration-300",
          dynamicBorderColor
        )}>
          <div>
            <h2 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
              Deal Profile
            </h2>
          </div>

          <div className="grid gap-x-6 gap-y-4 grid-cols-1 md:grid-cols-3">
            {/* Row 1 */}
            <div className="md:col-span-2">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                Deal / Opportunity Name <span className="text-primary font-bold">*</span>
              </Label>
              <Input
                {...form.register('title')}
                placeholder="e.g. Enterprise Cloud Suite Q3"
                className="mt-1.5 bg-background h-12 border-border text-sm focus:ring-1 focus:ring-primary focus:border-primary rounded-lg transition-all"
              />
              {form.formState.errors.title && (
                <p className="text-[11px] text-destructive mt-1 font-medium">{form.formState.errors.title.message}</p>
              )}
            </div>
            <div className="relative">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                Customer Name <span className="text-primary font-bold">*</span>
              </Label>
              <div className="relative mt-1.5">
                <Input
                  value={form.watch('customer_name')}
                  onChange={(e) => {
                    const val = e.target.value
                    form.setValue('customer_name', val, { shouldValidate: true })
                    setCustomerSearch(val)
                    setShowSuggestions(true)
                  }}
                  onFocus={() => {
                    setShowSuggestions(true)
                    setCustomerSearch(form.getValues('customer_name') || '')
                  }}
                  onBlur={() => {
                    // Delay hiding suggestions to allow list clicks to register
                    setTimeout(() => setShowSuggestions(false), 200)
                  }}
                  placeholder="Type or select customer..."
                  className="bg-background h-12 pr-10 border-border text-sm focus:ring-1 focus:ring-primary focus:border-primary rounded-lg transition-all w-full"
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault() // Prevents input blur
                    setShowSuggestions((prev) => !prev)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ChevronDown className={cn("h-4 w-4 transition-transform duration-200", showSuggestions && "transform rotate-180")} />
                </button>

                <AnimatePresence>
                  {showSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-60 overflow-y-auto"
                    >
                      {filteredSuggestions.length > 0 && (
                        <div className="py-1">
                          {filteredSuggestions.map((cust) => (
                            <button
                              key={cust.id}
                              type="button"
                              className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors flex justify-between items-center"
                              onMouseDown={(e) => {
                                e.preventDefault() // Prevents input blur
                                form.setValue('customer_name', cust.name, { shouldValidate: true })
                                setCustomerSearch(cust.name)
                                setShowSuggestions(false)
                              }}
                            >
                              <span>{cust.name}</span>
                              <span className="text-xs text-muted-foreground font-mono">{cust.id}</span>
                            </button>
                          ))}
                        </div>
                      )}

                      {customerSearch.trim() && !isExactMatch && (
                        <div className={cn(
                          "p-1 border-t border-border bg-muted/5",
                          filteredSuggestions.length === 0 && "border-t-0"
                        )}>
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault() // Prevents input blur
                              handleAddNewCustomer(customerSearch)
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Add &quot;{customerSearch}&quot; as new customer</span>
                          </button>
                        </div>
                      )}

                      {filteredSuggestions.length === 0 && !customerSearch.trim() && (
                        <div className="px-3 py-4 text-sm text-muted-foreground italic text-center">
                          No customers registered.
                        </div>
                      )}

                      {/* Permanent Add Customer Option at the bottom */}
                      <div className={cn(
                        "p-1 border-t border-border bg-muted/5",
                        customerSearch.trim() && !isExactMatch && "border-t-0",
                        filteredSuggestions.length === 0 && !customerSearch.trim() && "border-t-0"
                      )}>
                        <button
                          type="button"
                          onMouseDown={(e) => {
                            e.preventDefault() // Prevents input blur
                            setNewCustomerName('')
                            setIsAddCustomerDialogOpen(true)
                            setShowSuggestions(false)
                          }}
                          className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                        >
                          <Plus className="h-4 w-4" />
                          <span>Add New Customer...</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              {form.formState.errors.customer_name && (
                <p className="text-[11px] text-destructive mt-1 font-medium">{form.formState.errors.customer_name.message}</p>
              )}
            </div>

            {/* Row 2 */}
            <div>
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                Sales Rep Name <span className="text-primary font-bold">*</span>
              </Label>
              <Input
                value={form.watch('sales_rep_name')}
                disabled
                className="mt-1.5 bg-muted/50 h-12 border-border text-sm text-muted-foreground cursor-not-allowed rounded-lg"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                Deal Date <span className="text-primary font-bold">*</span>
              </Label>
              <Input
                {...form.register('date_str')}
                disabled
                className="mt-1.5 bg-muted/40 h-12 border-border text-sm text-muted-foreground cursor-not-allowed rounded-lg font-mono"
              />
            </div>
            <div>
              <Label className="text-xs font-semibold text-foreground block">&nbsp;</Label>
              <div className="flex items-center justify-between p-3 rounded-lg border border-border/80 bg-muted/5 mt-1.5 h-12">
                <div className="space-y-0.5">
                  <Label className="text-xs font-semibold text-foreground cursor-pointer" htmlFor="skip-tech">
                    Skip Technical Review
                  </Label>
                  <p className="text-[9px] text-muted-foreground">
                    {form.watch('skip_technical') ? 'Finance → Sales Head' : 'Technical → Finance → Sales Head'}
                  </p>
                </div>
                <Switch
                  id="skip-tech"
                  checked={form.watch('skip_technical')}
                  onCheckedChange={(v) => form.setValue('skip_technical', v)}
                />
              </div>
            </div>

            {/* Row 3: OEM & Quote Number */}
            <div className="relative">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                OEM
              </Label>
              <div className="relative mt-1.5">
                <Input
                  value={form.watch('oem') || ''}
                  onChange={(e) => {
                    const val = e.target.value
                    form.setValue('oem', val)
                    setOemSearch(val)
                    setShowOemSuggestions(true)
                  }}
                  onFocus={() => {
                    setShowOemSuggestions(true)
                    setOemSearch(form.getValues('oem') || '')
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowOemSuggestions(false), 200)
                  }}
                  placeholder="Type to search OEM..."
                  className="bg-background h-12 border-border text-sm focus:ring-1 focus:ring-primary focus:border-primary rounded-lg transition-all w-full"
                />

                <AnimatePresence>
                  {showOemSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-48 overflow-y-auto"
                    >
                      {OEM_SUGGESTIONS
                        .filter((o) => !oemSearch || o.toLowerCase().includes(oemSearch.toLowerCase()))
                        .map((oem) => (
                          <button
                            key={oem}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground transition-colors"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              form.setValue('oem', oem)
                              setOemSearch(oem)
                              setShowOemSuggestions(false)
                            }}
                          >
                            {oem}
                          </button>
                        ))}
                      {oemSearch.trim() && !OEM_SUGGESTIONS.some((o) => o.toLowerCase() === oemSearch.toLowerCase()) && (
                        <div className="p-1 border-t border-border bg-muted/5">
                          <button
                            type="button"
                            onMouseDown={(e) => {
                              e.preventDefault()
                              form.setValue('oem', oemSearch.trim())
                              setShowOemSuggestions(false)
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-primary hover:bg-primary/10 rounded-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                          >
                            <Plus className="h-4 w-4" />
                            <span>Use "{oemSearch.trim()}"</span>
                          </button>
                        </div>
                      )}
                      {OEM_SUGGESTIONS.filter((o) => !oemSearch || o.toLowerCase().includes(oemSearch.toLowerCase())).length === 0 && !oemSearch.trim() && (
                        <div className="px-3 py-4 text-sm text-muted-foreground italic text-center">
                          No OEM suggestions available.
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
            <div className="relative">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                Quote Number
              </Label>
              <div className="relative mt-1.5">
                <Input
                  {...form.register('quote_number')}
                  placeholder="e.g. QT-2026-001234"
                  className="bg-background h-12 border border-border text-sm focus:ring-1 focus:ring-primary focus:border-primary rounded-lg transition-all font-mono w-full pr-10"
                  onChange={(e) => {
                    const val = e.target.value
                    form.setValue('quote_number', val, { shouldValidate: true })
                    const selectedQuote = quotes.find(q => q.quote_number?.toLowerCase() === val.toLowerCase())
                    if (selectedQuote) {
                      handleSelectQuote(selectedQuote)
                    }
                  }}
                  onFocus={() => setShowQuoteSuggestions(true)}
                  onBlur={() => {
                    setTimeout(() => setShowQuoteSuggestions(false), 200)
                  }}
                />
                <button
                  type="button"
                  onMouseDown={(e) => {
                    e.preventDefault()
                    setShowQuoteSuggestions((prev) => !prev)
                  }}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${showQuoteSuggestions ? 'transform rotate-180' : ''}`} />
                </button>

                <AnimatePresence>
                  {showQuoteSuggestions && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -4 }}
                      className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-48 overflow-y-auto"
                    >
                      {quotes.length === 0 ? (
                        <div className="px-3 py-4 text-xs text-muted-foreground italic text-center">
                          No approved quotes available.
                        </div>
                      ) : (
                        <div className="py-1">
                          {quotes
                            .filter((q) => {
                              const term = form.watch('quote_number') || ''
                              return !term || q.quote_number?.toLowerCase().includes(term.toLowerCase())
                            })
                            .map((q) => (
                              <button
                                key={q.id}
                                type="button"
                                className="w-full text-left px-3 py-2 text-xs hover:bg-accent hover:text-accent-foreground transition-colors flex justify-between items-center"
                                onMouseDown={(e) => {
                                  e.preventDefault()
                                  form.setValue('quote_number', q.quote_number || '', { shouldValidate: true })
                                  handleSelectQuote(q)
                                  setShowQuoteSuggestions(false)
                                }}
                              >
                                <span className="font-mono font-bold text-primary">{q.quote_number}</span>
                                <span className="text-[11px] text-muted-foreground truncate max-w-[200px]">{q.customer_name}</span>
                              </button>
                            ))}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Currency */}
            <div className="relative">
              <Label className="text-xs font-semibold text-foreground flex items-center gap-1">
                Currency <span className="text-primary font-bold">*</span>
              </Label>
              <div className="relative mt-1.5">
                <select
                  value={form.watch('currency') || 'INR'}
                  onChange={(e) => form.setValue('currency', e.target.value, { shouldValidate: true })}
                  className="w-full h-12 px-3 border border-border rounded-lg bg-background text-sm font-semibold text-foreground focus:ring-1 focus:ring-primary focus:border-primary transition-all cursor-pointer appearance-none pr-10"
                >
                  <option value="INR">INR (₹ - Indian Rupee)</option>
                  <option value="USD">USD ($ - US Dollar)</option>
                  <option value="EUR">EUR (€ - Euro)</option>
                  <option value="GBP">GBP (£ - British Pound)</option>
                  <option value="AED">AED (د.إ - UAE Dirham)</option>
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        {/* 2. PRODUCT WORKSHEET */}
        <div className={cn(
          "bg-card border rounded-xl shadow-sm p-6 overflow-hidden transition-all duration-300",
          dynamicBorderColor
        )}>
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-xs font-bold text-foreground uppercase tracking-widest">
                Pricing Worksheet
              </h2>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs min-w-[1000px] border-collapse">
              <thead>
                <tr className="border-b border-border text-left text-muted-foreground/80">
                  <th className="pb-3 pr-4 font-semibold w-48">Product Name / SKU <span className="text-primary font-bold">*</span></th>
                  <th className="pb-3 pr-4 font-semibold w-56">Description (Optional)</th>
                  <th className="pb-3 pr-4 font-semibold w-36">Quantity & UoM <span className="text-primary font-bold">*</span></th>
                  <th className="pb-3 pr-4 font-semibold w-28 text-right">Transfer Price (unit) <span className="text-primary font-bold">*</span></th>
                  <th className="pb-3 pr-4 font-semibold w-28 text-right">Quoted Price (unit) <span className="text-primary font-bold">*</span></th>
                  <th className="pb-3 pr-4 font-semibold w-24 text-right">Total Cost</th>
                  <th className="pb-3 pr-4 font-semibold w-24 text-right">Total Revenue</th>
                  <th className="pb-3 pr-4 font-semibold w-28 text-right">Gross Margin</th>
                  <th className="pb-3 w-8"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                <AnimatePresence initial={false}>
                  {itemFields.map((field, index) => {
                    const qty = Number(watched.items?.[index]?.quantity ?? 0)
                    const transfer = Number(watched.items?.[index]?.transfer_price ?? 0)
                    const quoted = Number(watched.items?.[index]?.quoted_price ?? 0)

                    const cost = qty * transfer
                    const revenue = qty * quoted
                    const margin = quoted > 0 ? ((quoted - transfer) / quoted) * 100 : 0
                    const marginValue = revenue - cost

                    const rowErrors = form.formState.errors.items?.[index]

                    return (
                      <motion.tr
                        key={field.id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0 }}
                        className="group hover:bg-muted/5 transition-colors"
                      >
                        {/* Product Name / SKU details cell */}
                        <td className="py-3 pr-4 align-middle">
                          <div className="flex flex-col">
                            <Input
                              {...form.register(`items.${index}.sku`)}
                              placeholder="e.g. PD-ENT-001"
                              className="h-10 text-[13px] bg-background border-border rounded-md font-medium"
                            />
                            {rowErrors?.sku && (
                              <p className="text-[9px] text-destructive font-medium mt-1">{rowErrors.sku.message}</p>
                            )}
                          </div>
                        </td>

                        {/* Description / Optional context cell */}
                        <td className="py-3 pr-4 align-middle">
                          <Input
                            {...form.register(`items.${index}.product_name`)}
                            placeholder="e.g. Premium Support (Annual)"
                            className="h-10 text-[13px] bg-background/50 border-border rounded-md text-muted-foreground"
                          />
                        </td>

                        {/* Quantity & UOM Cell */}
                        <td className="py-3 pr-4 align-middle">
                          <div className="flex gap-1.5 items-center">
                            <div className="flex flex-col">
                              <Input
                                type="number"
                                min="1"
                                {...form.register(`items.${index}.quantity`)}
                                placeholder="Qty"
                                onFocus={(e) => e.target.select()}
                                className="h-10 w-16 text-center text-[13px] bg-background border-border rounded-md font-mono"
                              />
                              {rowErrors?.quantity && (
                                <p className="text-[9px] text-destructive font-medium mt-1 w-16 text-center">{rowErrors.quantity.message}</p>
                              )}
                            </div>
                            <div className="w-20 flex flex-col">
                              <Select
                                value={form.watch(`items.${index}.unit_of_measure`)}
                                onValueChange={(v) => form.setValue(`items.${index}.unit_of_measure`, v)}
                              >
                                <SelectTrigger className="h-10 text-[12px] bg-background border-border rounded-md px-2">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {UOM_OPTIONS.map((u) => (
                                    <SelectItem key={u} value={u} className="text-[12px]">{u}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                              {rowErrors?.unit_of_measure && (
                                <p className="text-[9px] text-destructive font-medium mt-1">{rowErrors.unit_of_measure.message}</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Transfer Price Input */}
                        <td className="py-3 pr-4 align-middle">
                          <div className="relative flex flex-col">
                            <span className="absolute left-2.5 top-3 text-[11px] text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              step="0.01"
                              {...form.register(`items.${index}.transfer_price`)}
                              placeholder="0.00"
                              onFocus={(e) => e.target.select()}
                              className="h-10 text-[13px] bg-background border-border text-right pl-5 rounded-md font-mono"
                            />
                            {rowErrors?.transfer_price && (
                              <p className="text-[9px] text-destructive font-medium mt-1 text-right">{rowErrors.transfer_price.message}</p>
                            )}
                          </div>
                        </td>

                        {/* Quoted Price Input */}
                        <td className="py-3 pr-4 align-middle">
                          <div className="relative flex flex-col">
                            <span className="absolute left-2.5 top-3 text-[11px] text-muted-foreground">₹</span>
                            <Input
                              type="number"
                              step="0.01"
                              {...form.register(`items.${index}.quoted_price`)}
                              placeholder="0.00"
                              onFocus={(e) => e.target.select()}
                              className="h-10 text-[13px] bg-background border-border text-right pl-5 rounded-md font-mono"
                            />
                            {rowErrors?.quoted_price && (
                              <p className="text-[9px] text-destructive font-medium mt-1 text-right">{rowErrors.quoted_price.message}</p>
                            )}
                          </div>
                        </td>

                        {/* Calculated Total Cost */}
                        <td className="py-3 pr-4 text-right font-medium text-muted-foreground/80 font-mono align-middle text-[11px]">
                          {formatCurrency(cost, 'INR')}
                        </td>

                        {/* Calculated Total Revenue */}
                        <td className="py-3 pr-4 text-right font-semibold text-foreground/80 font-mono align-middle text-[11px]">
                          {formatCurrency(revenue, 'INR')}
                        </td>

                        {/* Calculated Line Margin value & percentage */}
                        <td className="py-3 pr-4 text-right align-middle text-[11px]">
                          {quoted > 0 ? (
                            <div className="flex flex-col items-end justify-center">
                              <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border ${getMarginBg(margin)} ${getMarginColor(margin)}`}>
                                {formatPercent(margin)}
                              </span>
                              <span className="text-[9px] text-muted-foreground mt-0.5 font-mono">
                                {marginValue >= 0 ? '+' : ''}{formatCurrency(marginValue, 'INR')}
                              </span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground/40 font-mono">—</span>
                          )}
                        </td>

                        {/* Delete Action button */}
                        <td className="py-3 text-center align-middle">
                          <button
                            type="button"
                            onClick={() => itemFields.length > 1 && removeItem(index)}
                            className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 p-2 rounded-md transition-colors cursor-pointer"
                            disabled={itemFields.length <= 1}
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </td>
                      </motion.tr>
                    )
                  })}
                </AnimatePresence>
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() =>
              appendItem({
                sku: '',
                product_name: '',
                quantity: 0,
                unit_of_measure: 'Pcs',
                transfer_price: 0,
                quoted_price: 0,
              })
            }
            className="mt-4 flex items-center justify-center gap-1.5 px-4 py-2 border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-lg text-xs font-semibold text-primary transition-all duration-200 w-full cursor-pointer h-10"
          >
            <Plus className="h-4 w-4" />
            <span>Add Product Row</span>
          </button>
        </div>

        {/* 3. OVERHEAD / ADDITIONAL CHARGES */}
        <div className={cn(
          "bg-card border rounded-xl shadow-sm p-6 transition-all duration-300",
          dynamicBorderColor
        )}>
          <div className="flex flex-col mb-4">
            <h2 className="text-xs font-bold text-foreground uppercase tracking-widest">
              Overhead / Additional Charges
            </h2>

          </div>

          <div className="grid gap-3 grid-cols-1 md:grid-cols-2">
            {overheadFields.map((field, index) => {
              const placeholder =
                index === 0
                  ? 'Delivery / Freight Charges'
                  : index === 1
                    ? 'Implementation / Installation Charges'
                    : 'Enter Custom Charge Label'

              const registered = form.register(`overheads.${index}.label`)
              const currentLabel = openOverheadIdx === index ? overheadQuery : (form.watch(`overheads.${index}.label`) || "")
              const suggestionsList = ["Delivery/Freight", "Implementation/Installation", "Miscellaneous", "Additional Components/Software", "Others"]
              const filtered = suggestionsList.filter(opt => opt.toLowerCase().includes(currentLabel.toLowerCase()))

              return (
                <div key={field.id} className="flex items-center gap-3 bg-muted/10 p-3 rounded-lg border border-border/60">
                  <div className="flex-1">
                    <div className="relative w-full">
                      <Input
                        {...registered}
                        onChange={(event) => {
                          registered.onChange(event)
                          const val = event.target.value
                          setOverheadQuery(val)
                          setOpenOverheadIdx(index)
                        }}
                        onFocus={() => {
                          setOpenOverheadIdx(index)
                          setOverheadQuery(form.getValues(`overheads.${index}.label`) || "")
                        }}
                        onBlur={(event) => {
                          registered.onBlur(event)
                          setTimeout(() => setOpenOverheadIdx(null), 200)
                        }}
                        placeholder={placeholder}
                        className="h-10 text-[13px] bg-background border-border rounded-md font-medium w-full"
                      />
                      <AnimatePresence>
                        {openOverheadIdx === index && (
                          <motion.div
                            initial={{ opacity: 0, y: -4 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -4 }}
                            className="absolute z-50 w-full mt-1 bg-popover text-popover-foreground border rounded-md shadow-md max-h-48 overflow-y-auto"
                          >
                            <div className="py-1">
                              {filtered.map((opt) => (
                                <button
                                  type="button"
                                  key={opt}
                                  className={cn(
                                    "w-full text-left px-3 py-2 text-[13px] hover:bg-accent hover:text-accent-foreground transition-colors flex justify-between items-center cursor-pointer",
                                    opt === "Others" && "font-semibold text-primary border-t border-border mt-1 pt-1"
                                  )}
                                  onMouseDown={(event) => {
                                    event.preventDefault()
                                    form.setValue(`overheads.${index}.label`, opt === "Others" ? "" : opt, { shouldValidate: true })
                                    setOverheadQuery(opt === "Others" ? "" : opt)
                                    setOpenOverheadIdx(null)
                                  }}
                                >
                                  {opt}
                                </button>
                              ))}
                              {currentLabel.trim() && !suggestionsList.some(opt => opt.toLowerCase() === currentLabel.toLowerCase()) && (
                                <div className="p-1 border-t border-border bg-muted/5">
                                  <button
                                    type="button"
                                    onMouseDown={(event) => {
                                      event.preventDefault()
                                      form.setValue(`overheads.${index}.label`, currentLabel.trim(), { shouldValidate: true })
                                      setOverheadQuery(currentLabel.trim())
                                      setOpenOverheadIdx(null)
                                    }}
                                    className="w-full text-left px-3 py-2 text-[13px] text-primary hover:bg-primary/10 rounded-sm font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                                  >
                                    <Plus className="h-4 w-4" />
                                    <span>Use "{currentLabel.trim()}"</span>
                                  </button>
                                </div>
                              )}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                  <div className="w-32 relative">
                    <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[11px] text-muted-foreground">₹</span>
                    <Input
                      type="number"
                      {...form.register(`overheads.${index}.amount`)}
                      placeholder="Enter Amount"
                      onFocus={(e) => e.target.select()}
                      className="h-10 text-[13px] bg-background border-border text-right pl-5 rounded-md font-mono"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => removeOverhead(index)}
                    className="text-muted-foreground hover:text-destructive hover:bg-destructive/5 p-1.5 rounded-md transition-colors cursor-pointer"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )
            })}
          </div>

          <button
            type="button"
            onClick={() =>
              appendOverhead({
                label: '',
                amount: 0,
                is_percentage: false,
              })
            }
            className="mt-3 flex items-center justify-center gap-1.5 px-3 py-1.5 border border-dashed border-border hover:border-primary/50 hover:bg-primary/5 rounded-lg text-xs font-semibold text-primary transition-all duration-200 cursor-pointer h-9"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>Add Custom Charge Row</span>
          </button>
        </div>

        {/* 4. FINANCIAL SUMMARY DASHBOARD */}
        <div className={cn(
          "bg-card border rounded-xl shadow-sm p-6 space-y-6 transition-all duration-300",
          dynamicBorderColor
        )}>
          <div>
            <h2 className="text-xs font-bold text-foreground uppercase tracking-widest">
              Commercial Deal Summary
            </h2>
          </div>

          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
            {/* Card 1: Total Cost */}
            <div className="bg-muted/15 border border-border p-4 rounded-xl hover:shadow-sm transition-all duration-200">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Total Cost
              </p>
              <p className="text-2xl font-extrabold font-display text-foreground mt-1 font-mono">
                {formatCurrency(totalCost, 'INR')}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Incl. {formatCurrency(overheadTotal, 'INR')} overheads
              </p>
            </div>

            {/* Card 2: Total Revenue */}
            <div className="bg-muted/15 border border-border p-4 rounded-xl hover:shadow-sm transition-all duration-200">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Total Revenue
              </p>
              <p className="text-2xl font-extrabold font-display text-foreground mt-1 font-mono">
                {formatCurrency(totalRevenue, 'INR')}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {itemFields.length} line item(s) configured
              </p>
            </div>

            {/* Card 3: Net Value */}
            <div className={cn(
              'border p-4 rounded-xl hover:shadow-sm transition-all duration-200',
              (totalRevenue - totalCost) >= 0
                ? 'bg-emerald-500/5 border-emerald-500/25'
                : 'bg-red-500/5 border-red-500/25'
            )}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Net Value
              </p>
              <p className={cn(
                'text-2xl font-extrabold font-display mt-1 font-mono',
                (totalRevenue - totalCost) >= 0 ? 'text-emerald-600' : 'text-red-500'
              )}>
                {formatCurrency(totalRevenue - totalCost, 'INR')}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                Revenue minus total cost
              </p>
            </div>

            {/* Card 4: Net Margin % */}
            <div className={`border p-4 rounded-xl hover:shadow-sm transition-all duration-200 ${marginBg}`}>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                Net Margin %
              </p>
              <p className={`text-2xl font-extrabold font-display mt-1 font-mono ${marginColor}`}>
                {formatPercent(netMarginPct)}
              </p>
              <p className="text-[10px] text-muted-foreground mt-1">
                {netMarginPct >= 8 ? '✅ Above floor margin' : '⚠️ Below floor margin (8%)'}
              </p>
            </div>
          </div>
        </div>

        {/* 5. Footer / Action Bar */}

        {/* 5. Footer / Action Bar */}
        <div className="flex flex-wrap justify-between items-center gap-4 border-t border-border/50 pt-5 mt-6">
          <Button
            type="button"
            variant="outline"
            onClick={() => navigate('/dashboard')}
            className="px-6 h-12 border-border text-foreground hover:bg-muted font-semibold text-sm cursor-pointer rounded-lg"
          >
            Discard
          </Button>
          <div className="flex gap-2.5">
            <Button
              type="button"
              onClick={handleSaveDraft}
              className="px-6 h-12 bg-secondary hover:bg-secondary/80 border border-border text-foreground font-semibold text-sm flex items-center gap-1.5 cursor-pointer rounded-lg"
              disabled={isSubmitting}
            >
              <span>Save as Draft</span>
            </Button>
            <Button
              type="submit"
              onClick={() => setSubmitType('submit')}
              className="px-6 h-12 bg-primary hover:bg-primary/95 text-white font-semibold text-sm shadow-md shadow-primary/10 flex items-center gap-1.5 cursor-pointer rounded-lg"
              disabled={isSubmitting}
            >
              <span>
                {isSubmitting
                  ? 'Submitting...'
                  : form.watch('skip_technical')
                    ? 'Submit for Finance Approval'
                    : 'Submit for Technical Approval'}
              </span>
              <ArrowRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </form>

      <Dialog open={isAddCustomerDialogOpen} onOpenChange={setIsAddCustomerDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="dialog-cust-name" className="text-xs font-semibold">
                Customer Name <span className="text-primary font-bold">*</span>
              </Label>
              <Input
                id="dialog-cust-name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="e.g. Tata Steel Ltd."
                autoFocus
                className="h-10 text-sm bg-background border-border rounded-lg"
              />
            </div>
            <div className="flex justify-end gap-2.5 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddCustomerDialogOpen(false)}
                className="h-10 px-4 text-xs rounded-lg"
              >
                Cancel
              </Button>
              <Button
                type="button"
                onClick={async () => {
                  if (newCustomerName.trim()) {
                    await handleAddNewCustomer(newCustomerName)
                    setIsAddCustomerDialogOpen(false)
                    setNewCustomerName('')
                  } else {
                    toast.error('Customer name is required')
                  }
                }}
                className="h-10 px-4 text-xs rounded-lg bg-primary text-white hover:bg-primary/95"
              >
                Add Customer
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
