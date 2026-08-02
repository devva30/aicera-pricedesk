import React from 'react'
import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image
} from '@react-pdf/renderer'
import type { Deal, BOMItem } from '../../types'
import { fetchSettings } from '../../services/targets-service'

// ─── Dynamic Styles Creator ──────────────────────────────────────────────────
function createStyles(themeColor: string, accentColor: string, headerTextColor: string, devStyles: any) {
  const base = StyleSheet.create({
    page: {
      paddingTop: 28,
      paddingBottom: 55,
      paddingHorizontal: 28,
      fontFamily: 'Helvetica',
      fontSize: 8.5,
      lineHeight: 1.35,
      color: '#000000',
      backgroundColor: '#ffffff',
    },

    // ── Footer
    footer: {
      position: 'absolute',
      bottom: 16,
      left: 28,
      right: 28,
      borderTopWidth: 0.75,
      borderTopColor: '#000000',
      paddingTop: 4,
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    footerLeft: { fontSize: 6.5, color: '#444444' },
    footerRight: { fontSize: 6.5, color: '#444444' },

    // ── Title Banner
    titleBanner: {
      backgroundColor: themeColor,
      paddingVertical: 7,
      paddingHorizontal: 0,
      marginBottom: 10,
      alignItems: 'center',
    },
    titleBannerText: {
      fontSize: 13,
      fontFamily: 'Helvetica-Bold',
      color: headerTextColor,
      letterSpacing: 2,
      textTransform: 'uppercase',
    },

    // ── Header Row (Logo left, Company info center, Quote No right) ──────────────────
    headerRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 8,
      paddingBottom: 8,
      borderBottomWidth: 1,
      borderBottomColor: '#000000',
    },
    logoBox: {
      width: '35%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
    },
    logo: { width: 40, height: 40, objectFit: 'contain' },
    companyTextBox: { flex: 1 },
    companyName: {
      fontSize: 11,
      fontFamily: 'Helvetica-Bold',
      color: '#000000',
      textTransform: 'uppercase',
      marginBottom: 2,
    },
    companyContact: { fontSize: 7, color: '#333333', lineHeight: 1.4 },
    quoteMetaBox: {
      width: '28%',
      alignItems: 'flex-end',
    },
    quoteMetaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 2,
    },
    quoteMetaLabel: { fontSize: 7.5, color: '#555555' },
    quoteMetaValue: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#000000' },

    // ── FROM box ─────────────────────────────────────────────────────────────────────
    fromBox: {
      borderWidth: 0.75,
      borderColor: '#000000',
      padding: 7,
      marginBottom: 8,
      backgroundColor: '#ffffff',
    },
    boxLabel: {
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      color: '#000000',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 3,
    },
    fromName: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#000000', marginBottom: 1.5 },
    fromDetails: { fontSize: 7.5, color: '#333333', lineHeight: 1.3 },

    splitRow: {
      flexDirection: 'row',
      gap: 8,
      marginBottom: 8,
    },
    addressBlock: {
      flex: 1,
      borderWidth: 0.75,
      borderColor: '#000000',
      padding: 7,
      backgroundColor: '#ffffff',
    },
    addressName: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#000000', marginBottom: 1.5 },
    addressText: { fontSize: 7.5, color: '#333333', lineHeight: 1.3 },
    metaBlock: {
      width: '36%',
      borderWidth: 0.75,
      borderColor: '#000000',
      overflow: 'hidden',
    },
    metaItem: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: '#AAAAAA',
      minHeight: 22,
    },
    metaItemLabel: {
      width: '50%',
      backgroundColor: '#f0f4f8',
      padding: 5,
      fontSize: 7,
      color: '#000000',
      fontFamily: 'Helvetica-Bold',
      textTransform: 'uppercase',
      borderRightWidth: 0.5,
      borderRightColor: '#AAAAAA',
    },
    metaItemValue: {
      flex: 1,
      padding: 5,
      fontSize: 7.5,
      fontFamily: 'Helvetica-Bold',
      color: '#000000',
    },

    // ── Subject line ─────────────────────────────────────────────────────────────────
    subjectRow: {
      flexDirection: 'row',
      marginBottom: 8,
      alignItems: 'flex-start',
      gap: 4,
    },
    subjectLabel: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: '#000000' },
    subjectText: { fontSize: 8, color: '#000000', flex: 1 },

    // ── Table ─────────────────────────────────────────────────────────────────────────
    tableTitle: {
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: '#000',
      marginBottom: 3,
      textTransform: 'uppercase',
      letterSpacing: 0.3,
    },
    table: {
      borderWidth: 0.5,
      borderColor: '#999',
      marginBottom: 10,
    },
    tableHeaderRow: {
      flexDirection: 'row',
      backgroundColor: themeColor,
      borderBottomWidth: 0.5,
      borderBottomColor: '#333333',
    },
    tableBodyRow: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: '#DDDDDD',
    },
    tableBodyRowAlt: {
      flexDirection: 'row',
      borderBottomWidth: 0.5,
      borderBottomColor: '#DDDDDD',
      backgroundColor: accentColor,
    },
    tableHeaderCell: {
      padding: 5,
      fontSize: 7.5,
      fontFamily: 'Helvetica-Bold',
      color: headerTextColor,
      borderRightWidth: 0.5,
      borderRightColor: themeColor === '#000000' || themeColor === '#ffffff' ? '#444444' : '#ffffff',
      textTransform: 'uppercase',
    },
    tableCell: {
      padding: 5,
      fontSize: 8,
      color: '#000000',
      borderRightWidth: 0.5,
      borderRightColor: '#DDDDDD',
      lineHeight: 1.3,
    },
    // Column widths styles
    colSl: { textAlign: 'center' },
    colDesc: {},
    colHsn: { textAlign: 'center' },
    colUom: { textAlign: 'center' },
    colQty: { textAlign: 'center' },
    colUnitPrice: { textAlign: 'right' },
    colTotal: { textAlign: 'right', borderRightWidth: 0 },

    // ── Summary / Totals ──────────────────────────────────────────────────────────────
    summaryRow: {
      flexDirection: 'row',
      gap: 10,
      marginBottom: 8,
      alignItems: 'stretch',
    },
    summaryLeft: { flex: 1 },
    summaryRight: { width: '42%' },

    amtWordsBox: {
      borderWidth: 0.75,
      borderColor: '#000000',
      padding: 7,
      marginBottom: 8,
      backgroundColor: '#ffffff',
    },
    amtWordsLabel: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#000000', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
    amtWordsValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#000000' },

    termsBox: {
      borderWidth: 0.75,
      borderColor: '#000000',
      padding: 7,
      backgroundColor: '#ffffff',
    },
    termsText: { fontSize: 7.5, color: '#333333', lineHeight: 1.4 },

    totalsBox: {
      borderWidth: 0.75,
      borderColor: '#000000',
      overflow: 'hidden',
      backgroundColor: '#ffffff',
    },
    totalsHeaderRow: {
      backgroundColor: themeColor,
      borderBottomWidth: 1.5,
      borderBottomColor: '#000000',
      paddingVertical: 5,
      paddingHorizontal: 7,
    },
    totalsHeaderText: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: headerTextColor, textTransform: 'uppercase' },
    totalsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 7,
      paddingVertical: 4,
      borderBottomWidth: 0.5,
      borderBottomColor: '#AAAAAA',
    },
    totalsLabel: { fontSize: 7.5, color: '#333333' },
    totalsValue: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#000000' },
    grandTotalRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      paddingHorizontal: 7,
      paddingVertical: 6,
      backgroundColor: themeColor,
      borderTopWidth: 1.5,
      borderTopColor: '#000000',
    },
    grandTotalLabel: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: headerTextColor },
    grandTotalValue: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: headerTextColor },

    // ── Declaration & Bank Details ─────────────────────────────────────────────────
    declBankRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    declBox: {
      flex: 1,
      borderWidth: 0.75,
      borderColor: '#000000',
      padding: 7,
      backgroundColor: '#ffffff',
    },
    bankBox: {
      width: '42%',
      borderWidth: 0.75,
      borderColor: '#000000',
      padding: 7,
      backgroundColor: '#ffffff',
    },
    declText: { fontSize: 7.5, color: '#333333', lineHeight: 1.4 },
    bankText: { fontSize: 7.5, color: '#333333', lineHeight: 1.5 },
    bankLabel: { fontFamily: 'Helvetica-Bold', color: '#000000' },
    signatureRow: {
      flexDirection: 'row',
      gap: 8,
      marginTop: 8,
    },
    signatureBox: {
      flex: 1,
      borderWidth: 0.75,
      borderColor: '#000000',
      padding: 10,
      height: 90, // Taller signature box to fit embedded signature images
      backgroundColor: '#ffffff',
    },
    signatureLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#000000', textTransform: 'uppercase', marginBottom: 3 },
    signatureTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#000000', marginBottom: 16 },
    signatureFooter: { fontSize: 7.5, color: '#444444', borderTopWidth: 0.5, borderTopColor: '#AAAAAA', paddingTop: 4 },

    // Custom Note banner styled similarly to title banner
    customNoteBanner: {
      padding: 8,
      borderWidth: 0.75,
      borderColor: '#000000',
      marginBottom: 8,
      backgroundColor: '#f8fafc',
    },

    annexurePage: {
      paddingTop: 30,
      paddingBottom: 55,
      paddingHorizontal: 30,
      fontFamily: 'Helvetica',
      fontSize: 8.5,
      lineHeight: 1.35,
      color: '#000000',
      backgroundColor: '#ffffff',
    },
    annexureHeaderRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-end',
      marginBottom: 10,
      paddingBottom: 6,
      borderBottomWidth: 1.5,
      borderBottomColor: '#000000',
    },
    annexureTitleBlock: {},
    annexureTitle: { fontSize: 13, fontFamily: 'Helvetica-Bold', color: '#000000', textTransform: 'uppercase', letterSpacing: 0.5 },
    annexureSubtitle: { fontSize: 8.5, color: '#444444', marginTop: 2 },
    annexureMetaBlock: { alignItems: 'flex-end' },
    annexureMetaText: { fontSize: 8, color: '#444444' },

    bomTable: {
      borderWidth: 0.75,
      borderColor: '#000000',
      marginBottom: 12,
    },
    bomColModule: { width: '25%', paddingLeft: 6 },
    bomColDesc: { width: '67%', paddingLeft: 6 },
    bomColQty: { width: '8%', textAlign: 'center', fontFamily: 'Helvetica-Bold', borderRightWidth: 0 },
    bomHeaderCell: {
      padding: 6,
      fontSize: 8,
      fontFamily: 'Helvetica-Bold',
      color: headerTextColor,
      backgroundColor: themeColor,
      borderBottomWidth: 1.5,
      borderBottomColor: '#000000',
      borderRightWidth: 0.5,
      borderRightColor: themeColor === '#000000' || themeColor === '#ffffff' ? '#444444' : '#ffffff',
      textTransform: 'uppercase',
    },
    bomCell: {
      padding: 6,
      fontSize: 8,
      color: '#000000',
      borderRightWidth: 0.5,
      borderRightColor: '#AAAAAA',
      lineHeight: 1.3,
    },
    bomSectionRow: {
      backgroundColor: themeColor,
      borderBottomWidth: 1,
      borderBottomColor: '#000000',
      borderTopWidth: 1,
      borderTopColor: '#000000',
      paddingVertical: 5,
      paddingHorizontal: 6,
      flexDirection: 'row',
    },
    bomSectionText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: headerTextColor, textTransform: 'uppercase' },
    bomParentRow: {
      backgroundColor: accentColor === '#ffffff' || accentColor === '#FFF' ? '#f0f4f8' : accentColor,
      borderBottomWidth: 0.5,
      borderBottomColor: '#AAAAAA',
      paddingVertical: 5,
      paddingHorizontal: 12,
    },
    bomParentText: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: themeColor === '#ffffff' ? '#000000' : themeColor },
  })

  // Apply Developer Override Styles (JSON parsed)
  if (devStyles) {
    if (devStyles.page) Object.assign(base.page, devStyles.page)
    if (devStyles.tableCell) Object.assign(base.tableCell, devStyles.tableCell)
    if (devStyles.tableHeaderCell) Object.assign(base.tableHeaderCell, devStyles.tableHeaderCell)
    if (devStyles.titleBanner) Object.assign(base.titleBanner, devStyles.titleBanner)
    if (devStyles.titleBannerText) Object.assign(base.titleBannerText, devStyles.titleBannerText)
    if (devStyles.signatureBox) Object.assign(base.signatureBox, devStyles.signatureBox)
  }

  return base
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(amount: number | string | null | undefined, currency: string = 'INR'): string {
  const val = Number(amount)
  const safeAmt = isNaN(val) ? 0 : val
  const symbol = currency === 'USD' ? '$' : currency === 'EUR' ? '\u20ac' : currency === 'GBP' ? '\u00a3' : currency === 'AED' ? '\u062f.\u0625' : 'Rs. '
  return `${symbol}${safeAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
}

function formatDate(dateString?: string): string {
  const date = dateString ? new Date(dateString) : new Date()
  const day = String(date.getDate()).padStart(2, '0')
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const year = date.getFullYear()
  return `${day}/${month}/${year}`
}

function numberToWords(num: number): string {
  const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine']
  const teens = ['Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen']
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety']

  function toWords(n: number): string {
    if (n === 0) return ''
    if (n < 10) return ones[n]
    if (n < 20) return teens[n - 10]
    if (n < 100) return `${tens[Math.floor(n / 10)]}${n % 10 > 0 ? ' ' + ones[n % 10] : ''}`
    if (n < 1000) return `${ones[Math.floor(n / 100)]} Hundred${n % 100 > 0 ? ' ' + toWords(n % 100) : ''}`
    if (n < 100000) return `${toWords(Math.floor(n / 1000))} Thousand${n % 1000 > 0 ? ' ' + toWords(n % 1000) : ''}`
    if (n < 10000000) return `${toWords(Math.floor(n / 100000))} Lakh${n % 100000 > 0 ? ' ' + toWords(n % 100000) : ''}`
    return `${toWords(Math.floor(n / 10000000))} Crore${n % 10000000 > 0 ? ' ' + toWords(n % 10000000) : ''}`
  }

  const intPart = Math.floor(num)
  const decPart = Math.round((num - intPart) * 100)
  const intWords = intPart === 0 ? 'Zero' : toWords(intPart)
  const decWords = decPart === 0 ? 'Zero' : toWords(decPart)
  return `Indian Rupees ${intWords} and ${decWords} Paise Only`
}

// ─── Merge Tag Parser ────────────────────────────────────────────────────────
function resolveMergeTags(text: string, deal: Deal, settings: any, grandTotal: number): string {
  if (!text) return ''
  const quoteNo = deal.quote_number || deal.deal_number || 'QT-2026-001'
  const dateStr = formatDate(deal.created_at)
  const preparedBy = deal.creator?.full_name || 'Sales Team'
  const clientName = deal.customer_name || 'Client'
  const companyName = settings.company_name || 'Aicera Systems'

  return text
    .replace(/#QuoteNo#/g, quoteNo)
    .replace(/#Customer#/g, clientName)
    .replace(/#Date#/g, dateStr)
    .replace(/#PreparedBy#/g, preparedBy)
    .replace(/#Company#/g, companyName)
    .replace(/#Total#/g, formatCurrency(grandTotal, deal.currency))
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function QuotePDFDocument({ deal, settings: propSettings }: { deal: Deal; settings?: any }) {
  const settings = propSettings || fetchSettings()

  // Parse Developer style overrides
  let devStyles = {}
  try {
    if (settings.pdf_developer_styles) {
      devStyles = JSON.parse(settings.pdf_developer_styles)
    }
  } catch {}
  
  // Extract custom configuration
  const themeColor = settings.pdf_theme_color || '#1e3a5f'
  const accentColor = settings.pdf_accent_color || '#f7f9fc'
  const headerTextColor = settings.pdf_header_text_color || '#FFFFFF'
  const showBankDetails = settings.pdf_show_bank_details !== false
  const showDeclaration = settings.pdf_show_declaration !== false

  const styles = createStyles(themeColor, accentColor, headerTextColor, devStyles)

  const safeNum = (val: any) => { const n = Number(val); return isNaN(n) ? 0 : n }

  const itemsList = deal.items ?? []
  const sub = itemsList.reduce((s, item) => s + safeNum(item.quantity) * safeNum(item.quoted_price), 0)
  const discPct = safeNum(deal.discount_pct)
  const discountAmt = sub * (discPct / 100)
  const shippingAmt = safeNum(deal.shipping_charge)
  const taxableAmt = sub - discountAmt + shippingAmt
  const cgstPct = safeNum(deal.cgst_pct)
  const sgstPct = safeNum(deal.sgst_pct)
  const igstPct = safeNum(deal.igst_pct)
  const cgstAmt = taxableAmt * (cgstPct / 100)
  const sgstAmt = taxableAmt * (sgstPct / 100)
  const igstAmt = taxableAmt * (igstPct / 100)
  const grandTotal = taxableAmt + cgstAmt + sgstAmt + igstAmt

  const validityDays = deal.validity_period || 30
  const termsText = deal.terms_conditions !== undefined && deal.terms_conditions !== null ? deal.terms_conditions : 'Payment Terms: Net 30 days\nDelivery: 4-5 weeks'
  const preparedBy = deal.creator?.full_name || 'Sales Team'
  const isQuote = deal.is_quote_only ?? false
  const docTypeLabel = isQuote ? 'Commercial Proposal' : 'Commercial Deal Summary'
  const docNumberLabel = isQuote ? 'Quote No.' : 'Deal No.'
  const quoteNo = isQuote ? (deal.quote_number || deal.deal_number || 'QT-2026-001') : (deal.deal_number || deal.quote_number || 'PD-2026-001')
  const quoteDate = formatDate(deal.created_at)

  // ── Use ONLY explicitly uploaded BOM data — no auto-generated fallback ────────
  let rawBomData: BOMItem[] = []
  if (Array.isArray(deal.bom_data)) {
    rawBomData = deal.bom_data
  } else if (typeof deal.bom_data === 'string' && (deal.bom_data as string).trim()) {
    try {
      rawBomData = JSON.parse(deal.bom_data as string)
    } catch {}
  }

  // NOTE: BOM inheritance from linked quotes is handled by deal-detail-page.tsx before this
  // component is rendered — deal.bom_data is already populated with the uploaded BOM from
  // the linked quote. No further lookup is needed here.

  // Only use the uploaded BOM — page 2 is hidden entirely when no BOM was uploaded
  const bomData: BOMItem[] = rawBomData
  const showPage2 = bomData.length > 0

  // Group BOM by section
  interface GroupedBOMSection {
    sectionName: string
    parentProducts: Array<{
      productName: string
      items: BOMItem[]
    }>
  }

  const bomGrouped: GroupedBOMSection[] = []
  const sectionMap: Record<string, Record<string, BOMItem[]>> = {}

  for (const item of bomData) {
    const sec = item.section || 'General'
    const isAuto = !!(item.brand || item.part_number)
    const parentProdName = isAuto ? (item.module || 'Product') : ''

    if (!sectionMap[sec]) sectionMap[sec] = {}
    if (!sectionMap[sec][parentProdName]) sectionMap[sec][parentProdName] = []
    sectionMap[sec][parentProdName].push(item)
  }

  for (const [secName, parents] of Object.entries(sectionMap)) {
    const parentProducts: Array<{ productName: string; items: BOMItem[] }> = []
    for (const [prodName, items] of Object.entries(parents)) {
      parentProducts.push({ productName: prodName, items })
    }
    bomGrouped.push({ sectionName: secName, parentProducts })
  }

  // Build address strings
  const getShipAddr = () => {
    const p = [deal.shipping_street, deal.shipping_city, deal.shipping_state, deal.shipping_code, deal.shipping_country].map(x => x?.trim()).filter(Boolean)
    return p.length > 0 ? p.join(', ') : ''
  }
  const getBillAddr = () => {
    const p = [deal.billing_street, deal.billing_city, deal.billing_state, deal.billing_code, deal.billing_country].map(x => x?.trim()).filter(Boolean)
    return p.length > 0 ? p.join(', ') : ''
  }

  const companyName = settings.company_name || 'Aicera Systems Pvt Ltd'
  const companyLogo = settings.company_logo_url || 'https://framerusercontent.com/images/AlNvsxkJzF8SFWwwytH2xsnL8uM.png'
  const companyGstin = settings.company_gstin || '29AAXCA8339E1Z1'
  const companyPhone = settings.company_phone || '9945073777'
  const companyEmail = settings.company_email || 'sales@aicera.co.in'
  const companyAddrShort = settings.company_address_short || '# 214, Ground Floor, 24th Main Road, Near JSS School, BSK 6th Stage, Bengaluru - 560060'
  const companyAddrLong = settings.company_address_long || '# 214, Ground Floor, 24th Main Road, Near JSS School, BSK 6th Stage, 11th BLOCK, Bengaluru - 560060'

  // Determine Visible Columns and Widths
  const visibleCols = settings.pdf_visible_columns || ['sl', 'desc', 'hsn', 'uom', 'qty', 'unitPrice', 'total']
  const hasCol = (id: string) => visibleCols.includes(id)

  const defaultColWidths: Record<string, number> = {
    sl: 5,
    desc: 49,
    hsn: 9,
    uom: 5,
    qty: 5,
    unitPrice: 13,
    total: 14,
  }

  // Redistribute space from hidden columns to the description column
  let redistributedDescWidth = defaultColWidths.desc
  Object.keys(defaultColWidths).forEach((colId) => {
    if (colId !== 'desc' && !hasCol(colId)) {
      redistributedDescWidth += defaultColWidths[colId]
    }
  })

  const getColStyle = (colId: string) => {
    const w = colId === 'desc' ? redistributedDescWidth : defaultColWidths[colId]
    return { width: `${w}%` }
  }

  // --- Dynamic Layout Renderers ---
  const renderTitleBanner = () => (
    <View key="titleBanner" style={styles.titleBanner}>
      <Text style={styles.titleBannerText}>{docTypeLabel}</Text>
    </View>
  )

  const renderHeaderRow = () => (
    <View key="header" style={styles.headerRow}>
      <View style={styles.logoBox}>
        <Image src={companyLogo} style={styles.logo} />
        <View style={styles.companyTextBox}>
          <Text style={styles.companyName}>{companyName}</Text>
          <Text style={styles.companyContact}>{companyAddrShort}</Text>
          <Text style={styles.companyContact}>Ph: {companyPhone} | Email: {companyEmail}</Text>
          <Text style={styles.companyContact}>GSTIN: {companyGstin}</Text>
        </View>
      </View>

      <View style={styles.quoteMetaBox}>
        <View style={styles.quoteMetaRow}>
          <Text style={styles.quoteMetaLabel}>{docNumberLabel}</Text>
          <Text style={styles.quoteMetaValue}>{quoteNo}</Text>
        </View>
        <View style={styles.quoteMetaRow}>
          <Text style={styles.quoteMetaLabel}>Date</Text>
          <Text style={styles.quoteMetaValue}>{quoteDate}</Text>
        </View>
        <View style={styles.quoteMetaRow}>
          <Text style={styles.quoteMetaLabel}>Valid Until</Text>
          <Text style={styles.quoteMetaValue}>
            {deal.valid_till ? formatDate(deal.valid_till) : `${validityDays} days from date`}
          </Text>
        </View>
      </View>
    </View>
  )

  const renderFromBox = () => (
    <View key="from" style={styles.fromBox}>
      <Text style={styles.boxLabel}>FROM (Supplier)</Text>
      <Text style={styles.fromName}>{companyName}</Text>
      <Text style={styles.fromDetails}>{companyAddrLong}</Text>
      <Text style={styles.fromDetails}>Ph: {companyPhone} | Email: {settings.company_email || 'sales@aicera.co.in'} | GSTIN: {companyGstin}</Text>
    </View>
  )

  const renderAddresses = () => (
    <View key="addresses" style={styles.splitRow}>
      <View style={styles.addressBlock}>
        <Text style={styles.boxLabel}>Consignee – Ship To</Text>
        <Text style={styles.addressName}>{deal.customer_name || 'Client'}</Text>
        <Text style={styles.addressText}>{getShipAddr()}</Text>
      </View>
      <View style={styles.addressBlock}>
        <Text style={styles.boxLabel}>Buyer – Bill To</Text>
        <Text style={styles.addressName}>{deal.customer_name || 'Client'}</Text>
        <Text style={styles.addressText}>{getBillAddr()}</Text>
      </View>
      <View style={styles.metaBlock}>
        <View style={styles.metaItem}>
          <Text style={styles.metaItemLabel}>Quote Date</Text>
          <Text style={styles.metaItemValue}>{quoteDate}</Text>
        </View>
        <View style={styles.metaItem}>
          <Text style={styles.metaItemLabel}>Validity</Text>
          <Text style={styles.metaItemValue}>{validityDays} Days</Text>
        </View>
        {deal.contact_name && (
          <View style={styles.metaItem}>
            <Text style={styles.metaItemLabel}>Attn To</Text>
            <Text style={styles.metaItemValue}>{deal.contact_name}</Text>
          </View>
        )}
        <View style={[styles.metaItem, { borderBottomWidth: 0 }]}>
          <Text style={styles.metaItemLabel}>Prepared By</Text>
          <Text style={styles.metaItemValue}>{preparedBy}</Text>
        </View>
      </View>
    </View>
  )

  const renderSubject = () => deal.title ? (
    <View key="subject" style={styles.subjectRow}>
      <Text style={styles.subjectLabel}>Sub: </Text>
      <Text style={styles.subjectText}>{deal.title}</Text>
    </View>
  ) : null

  const renderTable = () => (
    <View key="table">
      <Text style={styles.tableTitle}>Description of Goods / Services</Text>
      <View style={styles.table}>
        {/* Header */}
        <View style={styles.tableHeaderRow}>
          {hasCol('sl') && <View style={[styles.tableHeaderCell, getColStyle('sl'), styles.colSl]}><Text>SL</Text></View>}
          {hasCol('desc') && <View style={[styles.tableHeaderCell, getColStyle('desc'), styles.colDesc]}><Text>Description of Goods / Services</Text></View>}
          {hasCol('hsn') && <View style={[styles.tableHeaderCell, getColStyle('hsn'), styles.colHsn]}><Text>HSN / SAC</Text></View>}
          {hasCol('uom') && <View style={[styles.tableHeaderCell, getColStyle('uom'), styles.colUom]}><Text>UOM</Text></View>}
          {hasCol('qty') && <View style={[styles.tableHeaderCell, getColStyle('qty'), styles.colQty]}><Text>Qty</Text></View>}
          {hasCol('unitPrice') && <View style={[styles.tableHeaderCell, getColStyle('unitPrice'), styles.colUnitPrice]}><Text>Unit Price</Text></View>}
          {hasCol('total') && <View style={[styles.tableHeaderCell, getColStyle('total'), styles.colTotal]}><Text>Total Price</Text></View>}
        </View>
        {/* Body */}
        {itemsList.map((item, index) => (
          <View key={index} style={index % 2 === 0 ? styles.tableBodyRow : styles.tableBodyRowAlt}>
            {hasCol('sl') && <View style={[styles.tableCell, getColStyle('sl'), styles.colSl]}><Text>{index + 1}</Text></View>}
            {hasCol('desc') && <View style={[styles.tableCell, getColStyle('desc'), styles.colDesc]}><Text>{item.product_name || item.sku}</Text></View>}
            {hasCol('hsn') && <View style={[styles.tableCell, getColStyle('hsn'), styles.colHsn]}><Text style={{ fontFamily: 'Helvetica-Bold' }}>{item.sku && item.sku.match(/^\d+$/) ? item.sku : (item.sku || '—')}</Text></View>}
            {hasCol('uom') && <View style={[styles.tableCell, getColStyle('uom'), styles.colUom]}><Text>{item.unit_of_measure || 'EA'}</Text></View>}
            {hasCol('qty') && <View style={[styles.tableCell, getColStyle('qty'), styles.colQty]}><Text style={{ fontFamily: 'Helvetica-Bold' }}>{item.quantity}</Text></View>}
            {hasCol('unitPrice') && <View style={[styles.tableCell, getColStyle('unitPrice'), styles.colUnitPrice]}><Text style={{ fontFamily: 'Helvetica-Bold' }}>{formatCurrency(item.quoted_price, deal.currency)}</Text></View>}
            {hasCol('total') && <View style={[styles.tableCell, getColStyle('total'), styles.colTotal]}><Text style={{ fontFamily: 'Helvetica-Bold' }}>{formatCurrency(safeNum(item.quantity) * safeNum(item.quoted_price), deal.currency)}</Text></View>}
          </View>
        ))}
      </View>
    </View>
  )

  const renderSummary = () => (
    <View key="summary" style={styles.summaryRow} wrap={false}>
      {/* Left: Amount Words + T&C */}
      <View style={styles.summaryLeft}>
        <View style={styles.amtWordsBox}>
          <Text style={styles.amtWordsLabel}>Amount Chargeable (In Words)</Text>
          <Text style={styles.amtWordsValue}>{numberToWords(grandTotal)}</Text>
        </View>
        <View style={styles.termsBox}>
          <Text style={[styles.boxLabel, { marginBottom: 4 }]}>Terms &amp; Conditions</Text>
          {termsText.split('\n').map((line, i) => (
            <Text key={i} style={styles.termsText}>{line}</Text>
          ))}
        </View>
      </View>

      {/* Right: Totals */}
      <View style={styles.summaryRight}>
        <View style={styles.totalsBox}>
          <View style={styles.totalsHeaderRow}><Text style={styles.totalsHeaderText}>Price Summary</Text></View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatCurrency(sub, deal.currency)}</Text>
          </View>
          {discPct !== 0 && (
            <View style={styles.totalsRow}>
              <Text style={[styles.totalsLabel, { color: '#dc2626' }]}>Discount ({discPct}%)</Text>
              <Text style={[styles.totalsValue, { color: '#dc2626' }]}>-{formatCurrency(discountAmt, deal.currency)}</Text>
            </View>
          )}
          {shippingAmt > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Shipping Charges</Text>
              <Text style={styles.totalsValue}>{formatCurrency(shippingAmt, deal.currency)}</Text>
            </View>
          )}
          <View style={[styles.totalsRow, { borderTopWidth: 1, borderTopColor: '#000000' }]}>
            <Text style={[styles.totalsLabel, { fontFamily: 'Helvetica-Bold' }]}>Taxable Amount</Text>
            <Text style={[styles.totalsValue, { color: '#000000' }]}>{formatCurrency(taxableAmt, deal.currency)}</Text>
          </View>
          {cgstPct > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>CGST @ {cgstPct}%</Text>
              <Text style={styles.totalsValue}>{formatCurrency(cgstAmt, deal.currency)}</Text>
            </View>
          )}
          {sgstPct > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>SGST @ {sgstPct}%</Text>
              <Text style={styles.totalsValue}>{formatCurrency(sgstAmt, deal.currency)}</Text>
            </View>
          )}
          {igstPct > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>IGST @ {igstPct}%</Text>
              <Text style={styles.totalsValue}>{formatCurrency(igstAmt, deal.currency)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>GRAND TOTAL</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal, deal.currency)}</Text>
          </View>
        </View>
      </View>
    </View>
  )

  const renderDeclBank = () => (showDeclaration || showBankDetails) ? (
    <View key="declBank" style={styles.declBankRow} wrap={false}>
      {showDeclaration ? (
        <View style={styles.declBox}>
          <Text style={styles.boxLabel}>Declaration</Text>
          <Text style={styles.declText}>
            {deal.declaration !== undefined && deal.declaration !== null ? deal.declaration : 'We declare that this quotation shows the actual price of the goods / services described and that all particulars are true and correct to the best of our knowledge. Prices are subject to change without notice. Refer the Annexure for technical specifications and Bill of Material.'}
          </Text>
        </View>
      ) : (
        <View style={{ flex: 1 }} />
      )}
      {showBankDetails ? (
        <View style={styles.bankBox}>
          <Text style={styles.boxLabel}>Company Bank Details – For Payment</Text>
          <Text style={styles.bankText}>
            <Text style={styles.bankLabel}>A/c Name:  </Text>{settings.bank_ac_name || companyName}{'\n'}
            <Text style={styles.bankLabel}>Bank:       </Text>{settings.bank_name || 'Karnataka Bank Ltd'}{'\n'}
            <Text style={styles.bankLabel}>A/c No:    </Text>{settings.bank_ac_no || '0914702500101801'}{'\n'}
            <Text style={styles.bankLabel}>IFSC:       </Text>{settings.bank_ifsc || 'KARB0000914'}{'\n'}
            <Text style={styles.bankLabel}>Branch:    </Text>{settings.bank_branch || 'Herohalli Branch'}{'\n'}
            <Text style={styles.bankLabel}>SWIFT:     </Text>{settings.bank_swift || 'KARBINBBBNG'}
          </Text>
        </View>
      ) : (
        <View style={{ width: '42%' }} />
      )}
    </View>
  ) : null

  const renderSignatures = () => (
    <View key="signatures" style={styles.signatureRow} wrap={false}>
      <View style={styles.signatureBox}>
        <Text style={styles.signatureLabel}>Client Acceptance</Text>
        {deal.signature_base64 ? (
          <Image src={deal.signature_base64} style={{ height: 40, width: '100%', objectFit: 'contain', marginVertical: 3 }} />
        ) : (
          <Text style={styles.signatureTitle}>Customer Seal &amp; Signature</Text>
        )}
        <Text style={styles.signatureFooter}>Name &amp; Designation: ________________     Date: ________</Text>
      </View>
      <View style={styles.signatureBox}>
        <Text style={styles.signatureLabel}>For {companyName}</Text>
        <Text style={styles.signatureTitle}>Authorised Signatory</Text>
        <Text style={styles.signatureFooter}>Prepared by: {preparedBy}     Date: {quoteDate}</Text>
      </View>
    </View>
  )

  // Map of layouts mapping section ID to its rendering output
  const sectionRenderers: Record<string, () => React.ReactNode> = {
    titleBanner: renderTitleBanner,
    header: renderHeaderRow,
    from: renderFromBox,
    addresses: renderAddresses,
    subject: renderSubject,
    table: renderTable,
    summary: renderSummary,
    declBank: renderDeclBank,
    signatures: renderSignatures,
  }

  const defaultSectionOrder = ['titleBanner', 'header', 'from', 'addresses', 'subject', 'table', 'summary', 'declBank', 'signatures']
  const finalSectionOrder = settings.pdf_section_order || defaultSectionOrder

  return (
    <Document>
      {/* ═══════════════════════════════════════════════════════════════════════
          PAGE 1 – COMMERCIAL PROPOSAL (With Custom Order)
      ═══════════════════════════════════════════════════════════════════════ */}
      <Page size="A4" style={styles.page}>

        {/* Footer – fixed on every page */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>
            {settings.pdf_custom_footer_note
              ? resolveMergeTags(settings.pdf_custom_footer_note, deal, settings, grandTotal)
              : `${companyName} | GSTIN: ${companyGstin}`}
          </Text>
          <Text style={styles.footerRight} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages} | This is a Computer Generated Document`} />
        </View>

        {/* Render custom header note if provided */}
        {settings.pdf_custom_header_note && (
          <View style={styles.customNoteBanner}>
            <Text style={{ fontSize: 7, color: '#333333', lineHeight: 1.3 }}>
              {resolveMergeTags(settings.pdf_custom_header_note, deal, settings, grandTotal)}
            </Text>
          </View>
        )}

        {/* Render Page 1 Sections dynamically based on custom ordering */}
        {finalSectionOrder.map((sectionId: string) => {
          const renderer = sectionRenderers[sectionId]
          return renderer ? renderer() : null
        })}
      </Page>

      {/* ═══════════════════════════════════════════════════════════════════════
          PAGE 2 – ANNEXURE 1: TECHNICAL & BOM SPECIFICATIONS (if BOM, SLA or Timeline data exists)
      ═══════════════════════════════════════════════════════════════════════ */}
      {showPage2 && (
        <Page size="A4" style={styles.annexurePage}>

          {/* Footer */}
          <View style={styles.footer} fixed>
            <Text style={styles.footerLeft}>
              {settings.pdf_custom_footer_note
                ? resolveMergeTags(settings.pdf_custom_footer_note, deal, settings, grandTotal)
                : `${companyName} | GSTIN: ${companyGstin}`}
            </Text>
            <Text style={styles.footerRight} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages} | This is a Computer Generated Document`} />
          </View>

          {/* Title Banner */}
          <View style={[styles.titleBanner, { marginBottom: 0 }]}>
            <Text style={styles.titleBannerText}>Annexure – 1</Text>
          </View>

          {/* Annexure Header */}
          <View style={styles.annexureHeaderRow}>
            <View style={styles.annexureTitleBlock}>
              <Text style={styles.annexureTitle}>Bill of Material (BOM) &amp; Technical Specifications</Text>
              <Text style={styles.annexureSubtitle}>Technical Specifications, SLA &amp; Timeline Details</Text>
            </View>
            <View style={styles.annexureMetaBlock}>
              <Text style={styles.annexureMetaText}>{docNumberLabel}: {quoteNo}</Text>
              <Text style={styles.annexureMetaText}>Client: {deal.customer_name}</Text>
              <Text style={styles.annexureMetaText}>Date: {quoteDate}</Text>
            </View>
          </View>

          {/* BOM Table (rendered if BOM items exist) */}
          {bomData.length > 0 && (
            <View style={styles.bomTable}>
              {/* Header */}
              <View style={styles.tableHeaderRow} fixed>
                <View style={[styles.bomHeaderCell, styles.bomColModule]}><Text>Module</Text></View>
                <View style={[styles.bomHeaderCell, styles.bomColDesc]}><Text>Description</Text></View>
                <View style={[styles.bomHeaderCell, styles.bomColQty]}><Text>Qty</Text></View>
              </View>

            {/* Rows grouped by section & parent product */}
            {bomGrouped.map((section, sectionIdx) => (
              <React.Fragment key={sectionIdx}>
                {/* Section header row */}
                <View style={styles.bomSectionRow} wrap={false}>
                  <Text style={styles.bomSectionText}>{section.sectionName}</Text>
                </View>
                {section.parentProducts.map((parent, parentIdx) => (
                  <React.Fragment key={parentIdx}>
                    {/* Parent product row */}
                    {parent.productName ? (
                      <View style={styles.bomParentRow} wrap={false}>
                        <Text style={styles.bomParentText}>{parent.productName}</Text>
                      </View>
                    ) : null}
                    {/* Components under it */}
                    {parent.items.map((item, itemIdx) => (
                      <View key={itemIdx} style={itemIdx % 2 === 0 ? styles.tableBodyRow : styles.tableBodyRowAlt} wrap={false}>
                        <View style={[styles.bomCell, styles.bomColModule]}><Text style={{ fontFamily: 'Helvetica-Bold' }}>{item.brand || item.module || '—'}</Text></View>
                        <View style={[styles.bomCell, styles.bomColDesc]}><Text>{item.description}</Text></View>
                        <View style={[styles.bomCell, styles.bomColQty, { borderRightWidth: 0 }]}><Text style={{ fontFamily: 'Helvetica-Bold', textAlign: 'center' }}>{item.quantity}</Text></View>
                      </View>
                    ))}
                  </React.Fragment>
                ))}
              </React.Fragment>
            ))}
          </View>
          )}

          {/* SLA & Timeline if available */}
          {(deal.sla_data || deal.timeline_data) && (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 8 }} wrap={false}>
              {deal.sla_data && (
                <View style={[styles.declBox, { flex: 1 }]}>
                  <Text style={styles.boxLabel}>Service Level Agreement (SLA)</Text>
                  {deal.sla_data.split('\n').map((line, i) => (
                    <Text key={i} style={styles.declText}>{line}</Text>
                  ))}
                </View>
              )}
              {deal.timeline_data && (
                <View style={[styles.declBox, { flex: 1 }]}>
                  <Text style={styles.boxLabel}>Project Timeline &amp; Delivery</Text>
                  {deal.timeline_data.split('\n').map((line, i) => (
                    <Text key={i} style={styles.declText}>{line}</Text>
                  ))}
                </View>
              )}
            </View>
          )}

          {/* Signature Row */}
          <View style={styles.signatureRow} wrap={false}>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>Client Acceptance</Text>
              <Text style={styles.signatureTitle}>Customer Seal &amp; Signature</Text>
              <Text style={styles.signatureFooter}>Name &amp; Designation: ________________     Date: ________</Text>
            </View>
            <View style={styles.signatureBox}>
              <Text style={styles.signatureLabel}>For {companyName}</Text>
              <Text style={styles.signatureTitle}>Authorised Signatory</Text>
              <Text style={styles.signatureFooter}>Prepared by: {preparedBy}     Date: {quoteDate}</Text>
            </View>
          </View>
        </Page>
      )}
    </Document>
  )
}
