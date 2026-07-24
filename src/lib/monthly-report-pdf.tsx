import React from 'react'
import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import type { Deal, Order } from '@/types'
import { formatCurrency } from '@/lib/utils'

const styles = StyleSheet.create({
  page: { padding: 36, fontFamily: 'Helvetica', fontSize: 10, color: '#1e293b', backgroundColor: '#ffffff' },
  header: { borderBottomWidth: 2, borderBottomColor: '#1e1b4b', paddingBottom: 12, marginBottom: 20 },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1e1b4b' },
  headerSub: { fontSize: 10, color: '#64748b', marginTop: 4 },
  section: { marginBottom: 18 },
  sectionTitle: { fontSize: 12, fontWeight: 'bold', color: '#1e1b4b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: 0.5 },
  kpiRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
  kpiCard: { width: '23%', backgroundColor: '#f8fafc', borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 4, padding: 10 },
  kpiLabel: { fontSize: 8, color: '#64748b', textTransform: 'uppercase', marginBottom: 4 },
  kpiValue: { fontSize: 14, fontWeight: 'bold', color: '#1e1b4b' },
  table: { width: '100%', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 4, marginBottom: 15 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#e2e8f0', minHeight: 24, alignItems: 'center' },
  tableHeaderRow: { backgroundColor: '#1e1b4b', minHeight: 26 },
  tableHeaderCell: { color: '#ffffff', fontWeight: 'bold', fontSize: 9, paddingHorizontal: 8 },
  tableCell: { fontSize: 9, paddingHorizontal: 8 },
  colWide: { width: '35%' },
  colMedium: { width: '25%' },
  colNarrow: { width: '20%' },
  footer: { position: 'absolute', bottom: 24, left: 36, right: 36, borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, flexDirection: 'row', justifyContent: 'space-between' },
  footerText: { fontSize: 8, color: '#94a3b8' }
})

interface MonthlyReportPDFProps {
  monthName: string
  deals: Deal[]
  orders: Order[]
}

export function MonthlyReportDocument({ monthName, deals, orders }: MonthlyReportPDFProps) {
  const approvedDeals = deals.filter((d) => d.status === 'approved')
  const totalQuoted = deals.reduce((s, d) => s + (d.quoted_value || 0), 0)
  const approvedValue = approvedDeals.reduce((s, d) => s + (d.quoted_value || 0), 0)
  const closedOrders = orders.filter((o) => o.order_status === 'Closed')
  const winRate = deals.length > 0 ? Math.round((approvedDeals.length / deals.length) * 100) : 0

  return (
    <Document title={`Monthly_Report_${monthName}`}>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>PriceDesk — Executive Monthly Report</Text>
          <Text style={styles.headerSub}>Period: {monthName} | Generated: {new Date().toLocaleDateString('en-IN')}</Text>
        </View>

        {/* Executive KPI Summary */}
        <View style={styles.kpiRow}>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Total Pipeline</Text>
            <Text style={styles.kpiValue}>{formatCurrency(totalQuoted)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Approved Revenue</Text>
            <Text style={styles.kpiValue}>{formatCurrency(approvedValue)}</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Win Rate</Text>
            <Text style={styles.kpiValue}>{winRate}%</Text>
          </View>
          <View style={styles.kpiCard}>
            <Text style={styles.kpiLabel}>Closed Orders</Text>
            <Text style={styles.kpiValue}>{closedOrders.length}</Text>
          </View>
        </View>

        {/* Deals Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Key Deals Summary ({monthName})</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text style={[styles.tableHeaderCell, styles.colNarrow]}>Deal Ref</Text>
              <Text style={[styles.tableHeaderCell, styles.colWide]}>Customer & Title</Text>
              <Text style={[styles.tableHeaderCell, styles.colNarrow]}>Status</Text>
              <Text style={[styles.tableHeaderCell, styles.colMedium]}>Quoted Value</Text>
            </View>
            {deals.slice(0, 10).map((d) => (
              <View key={d.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colNarrow]}>{d.deal_number}</Text>
                <Text style={[styles.tableCell, styles.colWide]}>{d.customer_name} — {d.title}</Text>
                <Text style={[styles.tableCell, styles.colNarrow]}>{d.status.toUpperCase()}</Text>
                <Text style={[styles.tableCell, styles.colMedium]}>{formatCurrency(d.quoted_value || 0)}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Orders Execution Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Active Orders Execution</Text>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHeaderRow]}>
              <Text style={[styles.tableHeaderCell, styles.colNarrow]}>Order #</Text>
              <Text style={[styles.tableHeaderCell, styles.colWide]}>Customer Name</Text>
              <Text style={[styles.tableHeaderCell, styles.colNarrow]}>Ops Owner</Text>
              <Text style={[styles.tableHeaderCell, styles.colMedium]}>Checklist Progress</Text>
            </View>
            {orders.slice(0, 10).map((o) => (
              <View key={o.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.colNarrow]}>{o.order_number}</Text>
                <Text style={[styles.tableCell, styles.colWide]}>{o.customer_name}</Text>
                <Text style={[styles.tableCell, styles.colNarrow]}>{o.ops_owner || 'Unassigned'}</Text>
                <Text style={[styles.tableCell, styles.colMedium]}>{o.pct_complete || 0}% ({o.order_status || 'Processing'})</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>PriceDesk SI CRM — Executive Reporting Engine</Text>
          <Text style={styles.footerText}>Confidential Document</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function downloadMonthlyReportPDF(monthName: string, deals: Deal[], orders: Order[]) {
  const blob = await pdf(<MonthlyReportDocument monthName={monthName} deals={deals} orders={orders} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Executive_Monthly_Report_${monthName.replace(/\s+/g, '_')}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
