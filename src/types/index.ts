export type UserRole =
  | 'sales_rep'
  | 'finance'
  | 'technical'
  | 'sales_head'
  | 'admin'
  | 'ops'

export type DealStatus =
  | 'draft'
  | 'pending_finance'
  | 'pending_technical'
  | 'pending_sales_head'
  | 'approved'
  | 'rejected'
  | 'changes_requested'

export type AuditAction =
  | 'created'
  | 'updated'
  | 'submitted'
  | 'approved'
  | 'rejected'
  | 'changes_requested'
  | 'commented'
  | 'resubmitted'

export interface User {
  id: string
  email: string
  full_name: string
  role: UserRole
  avatar_url?: string | null
  department?: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface DealVersion {
  version_number: number
  saved_at: string
  saved_by: string
  saved_by_name: string
  status: DealStatus
  total_revenue: number
  total_cost: number
  gross_margin_pct: number
  net_margin_pct: number
  items: DealItem[]
  overheads: DealOverhead[]
  description?: string | null
  title: string
  bom_data?: BOMItem[]
  sla_data?: string
  timeline_data?: string
  discount_pct?: number
  cgst_pct?: number
  sgst_pct?: number
  igst_pct?: number
  shipping_charge?: number
  notes?: string
  terms_conditions?: string
  declaration?: string | null
  validity_period?: number
  contact_name?: string | null
  quote_stage?: string | null
  carrier?: string | null
  valid_till?: string | null
  billing_street?: string | null
  billing_city?: string | null
  billing_state?: string | null
  billing_code?: string | null
  billing_country?: string | null
  shipping_street?: string | null
  shipping_city?: string | null
  shipping_state?: string | null
  shipping_code?: string | null
  shipping_country?: string | null
}

export interface OrderVersion {
  version_number: number
  saved_at: string
  saved_by: string
  saved_by_name: string
  supplier_name: string
  quoted_value: number
  discount_pct?: number
  cgst_pct?: number
  sgst_pct?: number
  igst_pct?: number
  shipping_charge?: number
  items: DealItem[]
  notes?: string
  terms_conditions?: string
}


export interface BOMItem {
  section: string
  module: string
  description: string
  quantity: number | string
  type?: 'standard' | 'non-standard'
  part_number?: string
  brand?: string
  make?: string
  support_type?: string
  support_duration?: string
  warranty?: string
  extra_fields?: Record<string, string>  // catch-all for any unmapped Excel columns
}

export interface Deal {
  id: string
  deal_number: string
  title: string
  customer_name: string
  customer_id?: string | null
  parent_deal_id?: string | null
  description?: string | null
  status: DealStatus
  created_by: string
  assigned_to?: string | null
  currency: string
  requires_technical: boolean
  oem?: string | null
  quote_number?: string | null
  is_quote_only?: boolean
  total_revenue: number
  total_cost: number
  gross_margin_pct: number
  net_margin_pct: number
  rejection_reason?: string | null
  submitted_at?: string | null
  approved_at?: string | null
  approved_by?: string | null
  created_at: string
  updated_at: string
  creator?: User
  items?: DealItem[]
  overheads?: DealOverhead[]
  previous_versions?: DealVersion[]
  discount_pct?: number
  cgst_pct?: number
  sgst_pct?: number
  igst_pct?: number
  shipping_charge?: number
  notes?: string
  terms_conditions?: string
  declaration?: string | null
  validity_period?: number
  bom_data?: BOMItem[]
  sla_data?: string
  timeline_data?: string
  contact_name?: string | null
  quote_stage?: string | null
  carrier?: string | null
  valid_till?: string | null
  billing_street?: string | null
  billing_city?: string | null
  billing_state?: string | null
  billing_code?: string | null
  billing_country?: string | null
  shipping_street?: string | null
  shipping_city?: string | null
  shipping_state?: string | null
  shipping_code?: string | null
  shipping_country?: string | null
  signature_base64?: string | null
}

export interface DealItemSubItem {
  id: string
  part_number?: string
  brand?: string
  description: string
  quantity: number
  unit_cost: number
  unit_price: number
}

export interface DealItem {
  id?: string
  deal_id?: string
  sku: string
  product_name: string
  quantity: number
  unit_of_measure: string
  transfer_price: number
  quoted_price: number
  line_revenue?: number
  line_cost?: number
  sort_order?: number
  sub_items?: DealItemSubItem[]
}

export interface DealOverhead {
  id?: string
  deal_id?: string
  label: string
  amount: number
  is_percentage: boolean
  percentage_value?: number | null
}

export interface DealAudit {
  id: string
  deal_id: string
  user_id: string
  action: AuditAction
  from_status?: DealStatus | null
  to_status?: DealStatus | null
  comment?: string | null
  metadata?: Record<string, unknown>
  created_at: string
  user?: User
  deal_number?: string
  deal_title?: string
}

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  created: 'Deal Created',
  updated: 'Deal Updated',
  submitted: 'Submitted for Approval',
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes Requested',
  commented: 'Comment Added',
  resubmitted: 'Resubmitted',
}

export interface Invite {
  id: string
  email: string
  role: UserRole
  invited_by: string
  token: string
  department?: string | null
  expires_at: string
  accepted_at?: string | null
  accepted_by?: string | null
  created_at: string
  inviter?: User
}

export interface InvitePreview {
  email: string
  role: UserRole
  department?: string | null
  expires_at: string
  is_valid: boolean
}

export interface Notification {
  id: string
  user_id: string
  deal_id?: string | null
  title: string
  message: string
  type: string
  is_read: boolean
  created_at: string
}

export interface MarginSummary {
  totalRevenue: number
  totalCost: number
  overheadTotal: number
  grossMarginPct: number
  netMarginPct: number
}

export const DEAL_STATUS_LABELS: Record<DealStatus, string> = {
  draft: 'Draft',
  pending_finance: 'Finance Review',
  pending_technical: 'Technical Review',
  pending_sales_head: 'Sales Head Review',
  approved: 'Approved',
  rejected: 'Rejected',
  changes_requested: 'Changes Requested',
}

export const ROLE_LABELS: Record<UserRole, string> = {
  sales_rep: 'Sales Rep',
  technical: 'Technical',
  finance: 'Finance',
  sales_head: 'Sales Head',
  ops: 'Sales Ops',
  admin: 'Admin',
}

export const APPROVAL_PIPELINE: DealStatus[] = [
  'draft',
  'pending_technical',
  'pending_finance',
  'pending_sales_head',
  'approved',
]

export interface Customer {
  id: string
  name: string
  created_at: string
}

// ─── M4: Sales Settings (global config, admin-only) ──────────────────────────

export interface SalesSettings {
  financial_year: string       // e.g. "FY 2026-27"
  bottom_line_pct: number      // default 0.08 (8%)
  incentive_pct: number        // default 0.05 (5%)
  floor_margin_pct: number     // default 0.06 (6%)
  bank_name?: string
  bank_ac_name?: string
  bank_ac_no?: string
  bank_ifsc?: string
  bank_branch?: string
  bank_swift?: string
  // Company Profile Details
  company_name?: string
  company_logo_url?: string
  company_email?: string
  company_phone?: string
  company_gstin?: string
  company_address_short?: string
  company_address_long?: string
  // PDF Layout & Theme Customization
  pdf_theme_color?: string       // e.g. '#1e3a5f'
  pdf_accent_color?: string      // e.g. '#f7f9fc'
  pdf_header_text_color?: string // e.g. '#FFFFFF'
  pdf_show_bank_details?: boolean
  pdf_show_declaration?: boolean
  pdf_section_order?: string[]   // Order of layout sections
  pdf_visible_columns?: string[] // Enabled table columns
  pdf_custom_header_note?: string
  pdf_custom_footer_note?: string
  pdf_developer_styles?: string  // Developer overrides JSON

  // PO Customization Settings
  po_theme_color?: string
  po_accent_color?: string
  po_header_text_color?: string
  po_visible_columns?: string[]
  po_custom_header_note?: string
  po_custom_footer_note?: string
  po_developer_styles?: string

  // Challan Customization Settings
  challan_theme_color?: string
  challan_accent_color?: string
  challan_header_text_color?: string
  challan_visible_columns?: string[]
  challan_custom_header_note?: string
  challan_custom_footer_note?: string
  challan_developer_styles?: string
}

export const DEFAULT_SALES_SETTINGS: SalesSettings = {
  financial_year: 'FY 2026-27',
  bottom_line_pct: 0.08,
  incentive_pct: 0.05,
  floor_margin_pct: 0.06,
  bank_name: 'Karnataka Bank Ltd',
  bank_ac_name: 'Aicera Systems Pvt Ltd',
  bank_ac_no: '0914702500101801',
  bank_ifsc: 'KARB0000914',
  bank_branch: 'Herohalli Branch',
  bank_swift: 'KARBINBBBNG',
  company_name: 'Aicera Systems Pvt Ltd',
  company_logo_url: 'https://framerusercontent.com/images/AlNvsxkJzF8SFWwwytH2xsnL8uM.png',
  company_email: 'sales@aicera.co.in',
  company_phone: '9945073777',
  company_gstin: '29AAXCA8339E1Z1',
  company_address_short: '# 214, Ground Floor, 24th Main Road, Near JSS School',
  company_address_long: '# 214, Ground Floor, 24th Main Road, Near JSS School, BSK 6th Stage, 11th BLOCK, Bengaluru - 560060',
  pdf_theme_color: '#1e3a5f',
  pdf_accent_color: '#f7f9fc',
  pdf_header_text_color: '#FFFFFF',
  pdf_show_bank_details: true,
  pdf_show_declaration: true,
  pdf_section_order: ['titleBanner', 'header', 'from', 'addresses', 'subject', 'table', 'summary', 'declBank', 'signatures'],
  pdf_visible_columns: ['sl', 'desc', 'hsn', 'uom', 'qty', 'unitPrice', 'total'],
  pdf_custom_header_note: '',
  pdf_custom_footer_note: 'Prepared By: #PreparedBy# | Generated on: #Date#',
  pdf_developer_styles: '{\n  "fontSize": 8.5,\n  "lineHeight": 1.35,\n  "tableCellPadding": 5,\n  "annexurePadding": 30\n}',
  po_theme_color: '#1e1b4b',
  po_accent_color: 'rgba(238,242,255,0.1)',
  po_header_text_color: '#FFFFFF',
  po_visible_columns: ['sl', 'desc', 'qty', 'unitCost', 'totalCost'],
  po_custom_header_note: '',
  po_custom_footer_note: 'Generated on: #Date#',
  po_developer_styles: '{\n  "fontSize": 9,\n  "lineHeight": 1.4,\n  "tableCellPadding": 6\n}',
  challan_theme_color: '#115e59',
  challan_accent_color: 'rgba(240,253,250,0.1)',
  challan_header_text_color: '#FFFFFF',
  challan_visible_columns: ['sl', 'desc', 'hsn', 'orderedQty', 'deliveredQty', 'unitPrice', 'subtotal'],
  challan_custom_header_note: '',
  challan_custom_footer_note: 'Generated on: #Date#',
  challan_developer_styles: '{\n  "fontSize": 9,\n  "lineHeight": 1.4,\n  "tableCellPadding": 6\n}',
}

// ─── M4: Sales Target (per salesperson, per FY) ───────────────────────────────

export interface SalesTarget {
  id: string
  salesperson_id: string
  salesperson_name: string
  financial_year: string
  topline_target: number       // Revenue target (₹)
  region?: string
  is_active: boolean
  created_at: string
  updated_at: string
}

// ─── M5: Computed per-rep incentive row ───────────────────────────────────────

export interface IncentiveRow {
  salesperson_id: string
  salesperson_name: string
  topline_target: number
  revenue_booked: number
  revenue_to_go: number
  revenue_ach_pct: number
  bottomline_target: number
  margin_earned: number
  margin_to_go: number
  margin_ach_pct: number
  incentive_payable: number
}

export interface OrderChecklist {
  customer_po_received: boolean
  po_value_terms_verified: boolean
  oem_quote_validity_checked: boolean
  distributor_po_placed: boolean
  oem_order_acknowledged: boolean
  delivery_grn_done: boolean
  installation_complete: boolean
  invoice_raised: boolean
  payment_terms_confirmed: boolean
  payment_collected: boolean
  remarks?: Record<string, string>
}

export interface OrderIncentiveDetails {
  aicera_invoice_date: string
  customer_payment_terms: string
  aicera_payment_terms: string
  customer_payment_date: string
  payment_received: boolean
}

export interface Order {
  id: string
  order_number: string
  deal_id: string
  deal_number: string
  title: string
  customer_name: string
  customer_id?: string | null
  sales_rep_id: string
  sales_rep_name: string
  oem: string
  quote_number?: string | null
  po_number?: string | null
  created_at: string
  updated_at: string

  // Products list
  items: DealItem[]

  // Supplier Info
  supplier_name: string
  supplier_invoice: string
  contact_person: string
  email: string
  phone: string
  quoted_value: number
  payment_terms: string
  expected_delivery_date: string

  // Workflow Checklist
  checklist: OrderChecklist
  pct_complete: number
  stage: 'EARLY' | 'IN PROGRESS' | 'ADVANCED' | 'CLOSED'
  ops_owner?: string | null
  order_status: 'Draft' | 'Processing' | 'In Transit' | 'Delivered' | 'Installed' | 'Cancelled' | 'Closed'

  // Incentive Details (manually added by sales rep once checklist is complete)
  incentive_details?: OrderIncentiveDetails | null

  // PO Document attachment & generation fields
  customer_po_file?: {
    name: string
    size: number
    type: string
    uploaded_at: string
    dataUrl?: string
  } | null
  vendor_po_generated_at?: string | null
  vendor_po_number?: string | null

  // Standalone PO specific fields
  is_standalone?: boolean
  discount_pct?: number
  cgst_pct?: number
  sgst_pct?: number
  igst_pct?: number
  shipping_charge?: number
  notes?: string
  terms_conditions?: string
  validity_period?: number
  vendor_address?: string | null
  delivery_challan?: DeliveryChallan | null
  version_number?: number
  previous_versions?: OrderVersion[]
}

export interface DeliveryChallanItem {
  product_name: string
  quantity: number
  delivered_quantity: number
  unit_price: number
  subtotal: number
  hsn_code?: string
}

export interface DeliveryChallan {
  challan_number: string
  challan_type: 'non-returnable' | 'returnable'
  created_at: string
  delivery_date: string
  expected_delivery_date: string
  delivery_address: string
  vehicle_number: string
  driver_name: string
  driver_contact: string
  items: DeliveryChallanItem[]
  additional_notes?: string
}
