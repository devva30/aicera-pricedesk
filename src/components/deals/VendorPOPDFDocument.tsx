import {
  Page,
  Text,
  View,
  Document,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import type { Order } from '../../types'
import { fetchSettings } from '../../services/targets-service'

// ─── Helpers ──────────────────────────────────────────────────────────────────
function formatCurrency(amount: number | string | null | undefined): string {
  const val = Number(amount)
  const safeAmt = isNaN(val) ? 0 : val
  return `Rs. ${safeAmt.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
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

// ─── Style Creator ───────────────────────────────────────────────────────────
function createStyles(themeColor: string, accentColor: string, headerTextColor: string, devStyles: any) {
  const base = StyleSheet.create({
    page: {
      paddingTop: 28,
      paddingBottom: 55,
      paddingHorizontal: 28,
      fontFamily: 'Helvetica',
      fontSize: devStyles?.fontSize || 8.5,
      lineHeight: devStyles?.lineHeight || 1.35,
      color: '#000000',
      backgroundColor: '#ffffff',
    },
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
    metaBox: {
      width: '30%',
      alignItems: 'flex-end',
    },
    metaRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      width: '100%',
      marginBottom: 2,
    },
    metaLabel: { fontSize: 7.5, color: '#555555' },
    metaValue: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#000000' },

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
    boxLabel: {
      fontSize: 7,
      fontFamily: 'Helvetica-Bold',
      color: '#000000',
      textTransform: 'uppercase',
      letterSpacing: 0.5,
      marginBottom: 3,
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
      minHeight: 20,
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
      padding: devStyles?.tableCellPadding || 5,
      fontSize: 7.5,
      fontFamily: 'Helvetica-Bold',
      color: headerTextColor,
      borderRightWidth: 0.5,
      borderRightColor: themeColor === '#000000' ? '#444444' : '#ffffff',
      textTransform: 'uppercase',
    },
    tableCell: {
      padding: devStyles?.tableCellPadding || 5,
      fontSize: 8,
      color: '#000000',
      borderRightWidth: 0.5,
      borderRightColor: '#DDDDDD',
      lineHeight: 1.3,
    },

    totalsBox: {
      borderWidth: 0.75,
      borderColor: '#000000',
      overflow: 'hidden',
      backgroundColor: '#ffffff',
      marginLeft: 'auto',
      width: '42%',
      marginBottom: 10,
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
      marginBottom: 8,
    },
    termsText: { fontSize: 7.5, color: '#333333', lineHeight: 1.4 },

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
      height: 80,
      backgroundColor: '#ffffff',
    },
    signatureLabel: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: '#000000', textTransform: 'uppercase', marginBottom: 3 },
    signatureTitle: { fontSize: 8.5, fontFamily: 'Helvetica-Bold', color: '#000000', marginBottom: 16 },
    signatureFooter: { fontSize: 7.5, color: '#444444', borderTopWidth: 0.5, borderTopColor: '#AAAAAA', paddingTop: 4 },

    customNoteBanner: {
      padding: 8,
      borderWidth: 0.75,
      borderColor: '#000000',
      marginBottom: 8,
      backgroundColor: '#f8fafc',
    },
    customNoteText: { fontSize: 7.5, color: '#333333', lineHeight: 1.4 },
  })
  return base
}

// ─── Main Component ───────────────────────────────────────────────────────────
export function VendorPOPDFDocument({ order, settings: propSettings }: { order: Order; settings?: any }) {
  const settings = propSettings || fetchSettings()

  let devStyles: any = {}
  try {
    if (settings.po_developer_styles) devStyles = JSON.parse(settings.po_developer_styles)
  } catch {}

  const themeColor = settings.po_theme_color || '#1e1b4b'
  const accentColor = settings.po_accent_color || '#eef2ff'
  const headerTextColor = settings.po_header_text_color || '#FFFFFF'

  const styles = createStyles(themeColor, accentColor, headerTextColor, devStyles)

  const safeNum = (val: any) => { const n = Number(val); return isNaN(n) ? 0 : n }

  const items = order.items || []
  const subtotal = items.reduce((s, i) => s + safeNum(i.quantity) * safeNum(i.transfer_price), 0)
  const discPct = safeNum(order.discount_pct)
  const discountAmt = subtotal * (discPct / 100)
  const discountedSubtotal = subtotal - discountAmt
  const cgstPct = safeNum(order.cgst_pct)
  const sgstPct = safeNum(order.sgst_pct)
  const igstPct = safeNum(order.igst_pct)
  const shipping = safeNum(order.shipping_charge)
  const cgstAmt = discountedSubtotal * (cgstPct / 100)
  const sgstAmt = discountedSubtotal * (sgstPct / 100)
  const igstAmt = discountedSubtotal * (igstPct / 100)
  const grandTotal = discountedSubtotal + cgstAmt + sgstAmt + igstAmt + shipping

  const companyName = settings.company_name || 'Aicera Systems Pvt Ltd'
  const companyLogo = settings.company_logo_url || 'https://framerusercontent.com/images/AlNvsxkJzF8SFWwwytH2xsnL8uM.png'
  const companyGstin = settings.company_gstin || '29AAXCA8339E1Z1'
  const companyPhone = settings.company_phone || '9945073777'
  const companyEmail = settings.company_email || 'sales@aicera.co.in'
  const companyAddrShort = settings.company_address_short || '# 214, Ground Floor, 24th Main Road, BSK 6th Stage, Bengaluru - 560060'
  const companyAddrLong = settings.company_address_long || '# 214, Ground Floor, 24th Main Road, BSK 6th Stage, 11th BLOCK, Bengaluru - 560060'

  const poNumber = order.vendor_po_number || `PO-${order.order_number?.replace('ORD-', '') || '2026-001'}`
  const poDate = formatDate(order.vendor_po_generated_at || order.created_at)

  const visibleCols = settings.po_visible_columns || ['sl', 'desc', 'qty', 'unitCost', 'totalCost']
  const hasCol = (id: string) => visibleCols.includes(id)

  const defaultColWidths: Record<string, number> = {
    sl: 6,
    desc: 52,
    qty: 10,
    unitCost: 16,
    totalCost: 16,
  }
  let descWidth = defaultColWidths.desc
  Object.keys(defaultColWidths).forEach((colId) => {
    if (colId !== 'desc' && !hasCol(colId)) {
      descWidth += defaultColWidths[colId]
    }
  })
  const getColWidth = (colId: string) => ({ width: `${colId === 'desc' ? descWidth : defaultColWidths[colId]}%` })

  const resolveNoteTags = (text?: string) => {
    if (!text) return ''
    return text
      .replace(/#QuoteNo#/g, order.quote_number || 'N/A')
      .replace(/#Customer#/g, order.customer_name || 'N/A')
      .replace(/#Date#/g, poDate)
      .replace(/#Company#/g, companyName)
      .replace(/#Total#/g, formatCurrency(grandTotal))
  }

  const headerNote = settings.po_custom_header_note
  const footerNote = settings.po_custom_footer_note

  return (
    <Document title={`Purchase Order - ${poNumber}`} author={companyName}>
      <Page size="A4" style={styles.page}>

        {/* Custom Header Note */}
        {headerNote && (
          <View style={styles.customNoteBanner}>
            <Text style={styles.customNoteText}>{resolveNoteTags(headerNote)}</Text>
          </View>
        )}

        {/* Title Banner */}
        <View style={styles.titleBanner}>
          <Text style={styles.titleBannerText}>Purchase Order</Text>
        </View>

        {/* Header Row */}
        <View style={styles.headerRow}>
          <View style={styles.logoBox}>
            <Image src={companyLogo} style={styles.logo} />
            <View style={styles.companyTextBox}>
              <Text style={styles.companyName}>{companyName}</Text>
              <Text style={styles.companyContact}>{companyAddrShort}</Text>
              <Text style={styles.companyContact}>Ph: {companyPhone} | Email: {companyEmail}</Text>
              <Text style={styles.companyContact}>GSTIN: {companyGstin}</Text>
            </View>
          </View>
          <View style={styles.metaBox}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>PO Number</Text>
              <Text style={styles.metaValue}>{poNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{poDate}</Text>
            </View>
            {order.quote_number && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Quote Ref.</Text>
                <Text style={styles.metaValue}>{order.quote_number}</Text>
              </View>
            )}
            {order.oem && (
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>OEM Brand</Text>
                <Text style={styles.metaValue}>{order.oem}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Vendor + Deliver To + Meta */}
        <View style={styles.splitRow}>
          <View style={styles.addressBlock}>
            <Text style={styles.boxLabel}>Vendor / Supplier</Text>
            <Text style={styles.addressName}>{order.supplier_name || 'N/A'}</Text>
            {order.contact_person && <Text style={styles.addressText}>Contact: {order.contact_person}</Text>}
            {order.email && <Text style={styles.addressText}>Email: {order.email}</Text>}
            {order.phone && <Text style={styles.addressText}>Phone: {order.phone}</Text>}
            {order.vendor_address && <Text style={styles.addressText}>Address: {order.vendor_address}</Text>}
          </View>
          <View style={styles.addressBlock}>
            <Text style={styles.boxLabel}>Deliver / Bill To</Text>
            <Text style={styles.addressName}>{companyName}</Text>
            <Text style={styles.addressText}>{companyAddrLong}</Text>
            <Text style={styles.addressText}>GSTIN: {companyGstin}</Text>
          </View>
          <View style={styles.metaBlock}>
            {order.payment_terms ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaItemLabel}>Payment</Text>
                <Text style={styles.metaItemValue}>{order.payment_terms}</Text>
              </View>
            ) : null}
            {order.expected_delivery_date ? (
              <View style={styles.metaItem}>
                <Text style={styles.metaItemLabel}>Delivery</Text>
                <Text style={styles.metaItemValue}>{order.expected_delivery_date}</Text>
              </View>
            ) : null}
            {order.sales_rep_name ? (
              <View style={[styles.metaItem, { borderBottomWidth: 0 }]}>
                <Text style={styles.metaItemLabel}>Sales Rep</Text>
                <Text style={styles.metaItemValue}>{order.sales_rep_name}</Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Items Table */}
        <Text style={styles.tableTitle}>Purchase Order Items</Text>
        <View style={styles.table}>
          <View style={styles.tableHeaderRow}>
            {hasCol('sl') && <Text style={[styles.tableHeaderCell, getColWidth('sl'), { textAlign: 'center' }]}>#</Text>}
            {hasCol('desc') && <Text style={[styles.tableHeaderCell, getColWidth('desc')]}>Description</Text>}
            {hasCol('qty') && <Text style={[styles.tableHeaderCell, getColWidth('qty'), { textAlign: 'center' }]}>Qty</Text>}
            {hasCol('unitCost') && <Text style={[styles.tableHeaderCell, getColWidth('unitCost'), { textAlign: 'right' }]}>Unit Cost</Text>}
            {hasCol('totalCost') && <Text style={[styles.tableHeaderCell, getColWidth('totalCost'), { textAlign: 'right', borderRightWidth: 0 }]}>Total</Text>}
          </View>
          {items.map((item, idx) => {
            const lineTotal = safeNum(item.quantity) * safeNum(item.transfer_price)
            const isAlt = idx % 2 === 1
            return (
              <View key={idx} style={isAlt ? styles.tableBodyRowAlt : styles.tableBodyRow}>
                {hasCol('sl') && <Text style={[styles.tableCell, getColWidth('sl'), { textAlign: 'center' }]}>{idx + 1}</Text>}
                {hasCol('desc') && (
                  <View style={[styles.tableCell, getColWidth('desc')]}>
                    <Text style={{ fontFamily: 'Helvetica-Bold' }}>{item.product_name}</Text>
                    {item.sku && <Text style={{ fontSize: 7, color: '#666666' }}>SKU: {item.sku}</Text>}
                  </View>
                )}
                {hasCol('qty') && <Text style={[styles.tableCell, getColWidth('qty'), { textAlign: 'center', fontFamily: 'Helvetica-Bold' }]}>{item.quantity}</Text>}
                {hasCol('unitCost') && <Text style={[styles.tableCell, getColWidth('unitCost'), { textAlign: 'right' }]}>{formatCurrency(item.transfer_price)}</Text>}
                {hasCol('totalCost') && <Text style={[styles.tableCell, getColWidth('totalCost'), { textAlign: 'right', borderRightWidth: 0, fontFamily: 'Helvetica-Bold' }]}>{formatCurrency(lineTotal)}</Text>}
              </View>
            )
          })}
        </View>

        {/* Totals */}
        <View style={styles.totalsBox}>
          <View style={styles.totalsHeaderRow}>
            <Text style={styles.totalsHeaderText}>Cost Summary</Text>
          </View>
          <View style={styles.totalsRow}>
            <Text style={styles.totalsLabel}>Subtotal</Text>
            <Text style={styles.totalsValue}>{formatCurrency(subtotal)}</Text>
          </View>
          {discPct > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Discount ({discPct}%)</Text>
              <Text style={[styles.totalsValue, { color: '#cc0000' }]}>- {formatCurrency(discountAmt)}</Text>
            </View>
          )}
          {cgstPct > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>CGST ({cgstPct}%)</Text>
              <Text style={styles.totalsValue}>{formatCurrency(cgstAmt)}</Text>
            </View>
          )}
          {sgstPct > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>SGST ({sgstPct}%)</Text>
              <Text style={styles.totalsValue}>{formatCurrency(sgstAmt)}</Text>
            </View>
          )}
          {igstPct > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>IGST ({igstPct}%)</Text>
              <Text style={styles.totalsValue}>{formatCurrency(igstAmt)}</Text>
            </View>
          )}
          {shipping > 0 && (
            <View style={styles.totalsRow}>
              <Text style={styles.totalsLabel}>Shipping</Text>
              <Text style={styles.totalsValue}>{formatCurrency(shipping)}</Text>
            </View>
          )}
          <View style={styles.grandTotalRow}>
            <Text style={styles.grandTotalLabel}>Grand Total (INR)</Text>
            <Text style={styles.grandTotalValue}>{formatCurrency(grandTotal)}</Text>
          </View>
        </View>

        {/* Amount in Words */}
        <View style={styles.amtWordsBox}>
          <Text style={styles.amtWordsLabel}>Amount in Words</Text>
          <Text style={styles.amtWordsValue}>{numberToWords(grandTotal)}</Text>
        </View>

        {/* Notes & Terms */}
        {(order.notes || order.terms_conditions) && (
          <View style={[styles.splitRow, { marginBottom: 8 }]}>
            {order.notes && (
              <View style={[styles.termsBox, { flex: 1 }]}>
                <Text style={styles.boxLabel}>Notes</Text>
                <Text style={styles.termsText}>{order.notes}</Text>
              </View>
            )}
            {order.terms_conditions && (
              <View style={[styles.termsBox, { flex: 1 }]}>
                <Text style={styles.boxLabel}>Terms & Conditions</Text>
                <Text style={styles.termsText}>{order.terms_conditions}</Text>
              </View>
            )}
          </View>
        )}

        {/* Signatures */}
        <View style={styles.signatureRow}>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Authorized Signatory</Text>
            <Text style={styles.signatureTitle}>{companyName}</Text>
            <Text style={styles.signatureFooter}>Signature & Company Stamp</Text>
          </View>
          <View style={styles.signatureBox}>
            <Text style={styles.signatureLabel}>Supplier Acknowledgment</Text>
            <Text style={styles.signatureTitle}>{order.supplier_name || '—'}</Text>
            <Text style={styles.signatureFooter}>Sign & Return for Acceptance</Text>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text style={styles.footerLeft}>
            {footerNote ? resolveNoteTags(footerNote) : `PO: ${poNumber} | ${companyName}`}
          </Text>
          <Text style={styles.footerRight} render={({ pageNumber, totalPages }) => `Page ${pageNumber} of ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}
