import type { Deal, Order } from '@/types'
import { formatCurrency } from '@/lib/utils'

export function exportDealsToExcel(deals: Deal[], filename = 'PriceDesk_Deals_Export') {
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  
  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
      table { border-collapse: collapse; width: 100%; }
      th { background-color: #1e1b4b; color: #ffffff; font-weight: bold; text-align: left; padding: 10px; border: 1px solid #312e81; }
      td { padding: 8px; border: 1px solid #cbd5e1; vertical-align: middle; }
      .header-title { font-size: 16pt; font-weight: bold; color: #1e1b4b; margin-bottom: 5px; }
      .sub-title { font-size: 10pt; color: #64748b; margin-bottom: 15px; }
      .amount { text-align: right; font-weight: bold; }
      .status { font-weight: bold; text-transform: uppercase; }
      .footer-total { background-color: #f1f5f9; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="header-title">PriceDesk — Commercial Deals Worksheet Export</div>
    <div class="sub-title">Generated on: ${dateStr} | Records: ${deals.length} deals</div>
    <table>
      <thead>
        <tr>
          <th>Deal Number</th>
          <th>Quote Ref</th>
          <th>Deal Title</th>
          <th>Customer Name</th>
          <th>OEM / Brand</th>
          <th>Status</th>
          <th>Quoted Value (INR)</th>
          <th>Transfer Price (INR)</th>
          <th>Est. Margin (%)</th>
          <th>Sales Rep</th>
          <th>Assigned Ops Executive</th>
          <th>Submitted Date</th>
        </tr>
      </thead>
      <tbody>
  `

  let totalQuoted = 0
  let totalTransfer = 0

  deals.forEach((d) => {
    const quoted = d.quoted_value || 0
    const transfer = d.total_transfer_price || 0
    totalQuoted += quoted
    totalTransfer += transfer
    const marginPct = d.margin_pct || 0

    html += `
      <tr>
        <td><b>${d.deal_number}</b></td>
        <td>${d.quote_number || 'N/A'}</td>
        <td>${d.title}</td>
        <td>${d.customer_name}</td>
        <td>${d.oem || 'N/A'}</td>
        <td class="status">${d.status.replace(/_/g, ' ')}</td>
        <td class="amount">${formatCurrency(quoted)}</td>
        <td class="amount">${formatCurrency(transfer)}</td>
        <td class="amount">${marginPct.toFixed(1)}%</td>
        <td>${d.creator?.full_name || d.created_by}</td>
        <td>${d.assigned_ops_owner || d.ops_owner || 'Unassigned'}</td>
        <td>${new Date(d.created_at).toLocaleDateString('en-IN')}</td>
      </tr>
    `
  })

  html += `
      <tr class="footer-total">
        <td colspan="6" style="text-align: right;"><b>TOTAL WORKSHEET SUM:</b></td>
        <td class="amount"><b>${formatCurrency(totalQuoted)}</b></td>
        <td class="amount"><b>${formatCurrency(totalTransfer)}</b></td>
        <td colspan="4"></td>
      </tr>
      </tbody>
    </table>
  </body>
  </html>
  `

  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${Date.now()}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export function exportOrdersToExcel(orders: Order[], filename = 'PriceDesk_Orders_Export') {
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
      table { border-collapse: collapse; width: 100%; }
      th { background-color: #312e81; color: #ffffff; font-weight: bold; text-align: left; padding: 10px; border: 1px solid #1e1b4b; }
      td { padding: 8px; border: 1px solid #cbd5e1; vertical-align: middle; }
      .header-title { font-size: 16pt; font-weight: bold; color: #312e81; margin-bottom: 5px; }
      .sub-title { font-size: 10pt; color: #64748b; margin-bottom: 15px; }
      .amount { text-align: right; font-weight: bold; }
      .status { font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="header-title">PriceDesk — Execution & Orders Worksheet Export</div>
    <div class="sub-title">Generated on: ${dateStr} | Records: ${orders.length} order(s)</div>
    <table>
      <thead>
        <tr>
          <th>Order Number</th>
          <th>Version</th>
          <th>Deal Ref</th>
          <th>Order Title</th>
          <th>Customer Name</th>
          <th>Supplier Name</th>
          <th>OEM</th>
          <th>Order Status</th>
          <th>Checklist %</th>
          <th>Quoted Value (INR)</th>
          <th>Ops Executive</th>
          <th>Sales Rep</th>
          <th>Created Date</th>
        </tr>
      </thead>
      <tbody>
  `

  let totalVal = 0

  orders.forEach((o) => {
    const val = o.quoted_value || 0
    totalVal += val

    html += `
      <tr>
        <td><b>${o.order_number}</b></td>
        <td>v${o.version_number || 1}</td>
        <td>${o.deal_number || 'N/A'}</td>
        <td>${o.title}</td>
        <td>${o.customer_name}</td>
        <td>${o.supplier_name || 'N/A'}</td>
        <td>${o.oem || 'N/A'}</td>
        <td class="status">${o.order_status || 'Processing'}</td>
        <td>${o.pct_complete || 0}%</td>
        <td class="amount">${formatCurrency(val)}</td>
        <td><b>${o.ops_owner || 'Unassigned'}</b></td>
        <td>${o.sales_rep_name || 'N/A'}</td>
        <td>${new Date(o.created_at).toLocaleDateString('en-IN')}</td>
      </tr>
    `
  })

  html += `
      <tr style="background-color: #f8fafc; font-weight: bold;">
        <td colspan="9" style="text-align: right;"><b>TOTAL ORDERS VALUE:</b></td>
        <td class="amount"><b>${formatCurrency(totalVal)}</b></td>
        <td colspan="3"></td>
      </tr>
      </tbody>
    </table>
  </body>
  </html>
  `

  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${Date.now()}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

export interface ExportReportOptions {
  title: string
  subtitle?: string
  headers: string[]
  rows: (string | number)[][]
  totalRow?: (string | number)[]
  filename?: string
  alignRightCols?: number[]
}

export function exportReportToExcel({
  title,
  subtitle,
  headers,
  rows,
  totalRow,
  filename = 'PriceDesk_Report_Export',
  alignRightCols = [],
}: ExportReportOptions) {
  const dateStr = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })

  let html = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta charset="utf-8" />
    <style>
      body { font-family: Calibri, Arial, sans-serif; font-size: 11pt; }
      table { border-collapse: collapse; width: 100%; margin-top: 10px; }
      th { background-color: #1e1b4b; color: #ffffff; font-weight: bold; text-align: left; padding: 10px; border: 1px solid #312e81; font-size: 10pt; }
      td { padding: 8px 10px; border: 1px solid #cbd5e1; vertical-align: middle; font-size: 10pt; }
      .header-title { font-size: 16pt; font-weight: bold; color: #1e1b4b; margin-bottom: 4px; }
      .sub-title { font-size: 10pt; color: #64748b; margin-bottom: 12px; }
      .amount { text-align: right; font-weight: bold; }
      .text-right { text-align: right; }
      .footer-total { background-color: #f1f5f9; font-weight: bold; }
    </style>
  </head>
  <body>
    <div class="header-title">${title}</div>
    <div class="sub-title">${subtitle || `Generated on: ${dateStr}`} | Total Records: ${rows.length}</div>
    <table>
      <thead>
        <tr>
          ${headers.map((h, i) => `<th class="${alignRightCols.includes(i) ? 'text-right' : ''}">${h}</th>`).join('')}
        </tr>
      </thead>
      <tbody>
  `

  rows.forEach((row) => {
    html += `<tr>`
    row.forEach((cell, i) => {
      const isRight = alignRightCols.includes(i)
      const valStr = typeof cell === 'number' ? formatCurrency(cell) : String(cell ?? '')
      html += `<td class="${isRight ? 'amount' : ''}">${valStr}</td>`
    })
    html += `</tr>`
  })

  if (totalRow && totalRow.length > 0) {
    html += `<tr class="footer-total">`
    totalRow.forEach((cell, i) => {
      const isRight = alignRightCols.includes(i)
      const valStr = typeof cell === 'number' ? formatCurrency(cell) : String(cell ?? '')
      html += `<td class="${isRight ? 'amount' : ''}">${valStr}</td>`
    })
    html += `</tr>`
  }

  html += `
      </tbody>
    </table>
  </body>
  </html>
  `

  const blob = new Blob(['\ufeff' + html], { type: 'application/vnd.ms-excel' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${filename}_${Date.now()}.xls`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
