import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import { OrderItem } from '../components/OrdersHistory';

export interface ExportFilterOptions {
  rangeType: 'all' | 'today' | 'yesterday' | '7days' | '30days' | 'this_month' | 'custom';
  customStart?: string; // YYYY-MM-DDTHH:mm
  customEnd?: string;   // YYYY-MM-DDTHH:mm
  statusFilter?: string; // 'ALL' or specific status
  username?: string;
}

export interface SpendSummary {
  totalOrders: number;
  totalSpent: number;
  totalRefunded: number;
  netSpent: number;
  completedCount: number;
  completedSpent: number;
  processingCount: number;
  processingSpent: number;
  inProgressCount: number;
  inProgressSpent: number;
  pendingCount: number;
  pendingSpent: number;
  canceledCount: number;
  canceledRefunded: number;
}

/**
 * Filter orders by date/time range and status
 */
export function filterOrdersForExport(
  orders: OrderItem[],
  options: ExportFilterOptions
): OrderItem[] {
  let filtered = [...orders];

  // 1. Status Filter
  if (options.statusFilter && options.statusFilter.toUpperCase() !== 'ALL') {
    const target = options.statusFilter.toUpperCase().replace(/[\s-]+/g, '_');
    filtered = filtered.filter(
      (o) => o.status.toUpperCase().replace(/[\s-]+/g, '_') === target
    );
  }

  // 2. Date/Time Range Filter
  if (options.rangeType === 'all') {
    return filtered;
  }

  const now = new Date();

  if (options.rangeType === 'today') {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    filtered = filtered.filter((o) => new Date(o.createdAt) >= startOfToday);
  } else if (options.rangeType === 'yesterday') {
    const startOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0, 0);
    const endOfYesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
    filtered = filtered.filter((o) => {
      const d = new Date(o.createdAt);
      return d >= startOfYesterday && d < endOfYesterday;
    });
  } else if (options.rangeType === '7days') {
    const past7Days = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    filtered = filtered.filter((o) => new Date(o.createdAt) >= past7Days);
  } else if (options.rangeType === '30days') {
    const past30Days = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    filtered = filtered.filter((o) => new Date(o.createdAt) >= past30Days);
  } else if (options.rangeType === 'this_month') {
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
    filtered = filtered.filter((o) => new Date(o.createdAt) >= startOfMonth);
  } else if (options.rangeType === 'custom') {
    if (options.customStart) {
      const start = new Date(options.customStart);
      filtered = filtered.filter((o) => new Date(o.createdAt) >= start);
    }
    if (options.customEnd) {
      const end = new Date(options.customEnd);
      filtered = filtered.filter((o) => new Date(o.createdAt) <= end);
    }
  }

  return filtered;
}

/**
 * Calculate spend breakdown & totals from a set of orders
 */
export function calculateSpendSummary(orders: OrderItem[]): SpendSummary {
  let totalSpent = 0;
  let totalRefunded = 0;
  let completedCount = 0;
  let completedSpent = 0;
  let processingCount = 0;
  let processingSpent = 0;
  let inProgressCount = 0;
  let inProgressSpent = 0;
  let pendingCount = 0;
  let pendingSpent = 0;
  let canceledCount = 0;
  let canceledRefunded = 0;

  for (const order of orders) {
    const charge = order.charge || 0;
    const isRefunded = order.isRefunded || order.status === 'CANCELED';
    const refundAmt = order.refundAmount !== undefined ? order.refundAmount : (order.status === 'CANCELED' ? charge : 0);

    if (order.status === 'CANCELED') {
      canceledCount++;
      canceledRefunded += refundAmt;
      totalRefunded += refundAmt;
    } else {
      totalSpent += charge;
      if (order.isRefunded && order.refundAmount) {
        totalRefunded += order.refundAmount;
      }

      if (order.status === 'COMPLETED') {
        completedCount++;
        completedSpent += charge;
      } else if (order.status === 'PROCESSING') {
        processingCount++;
        processingSpent += charge;
      } else if (order.status === 'IN_PROGRESS') {
        inProgressCount++;
        inProgressSpent += charge;
      } else if (order.status === 'PENDING') {
        pendingCount++;
        pendingSpent += charge;
      } else if (order.status === 'PARTIAL') {
        completedCount++;
        completedSpent += (charge - (order.refundAmount || 0));
      }
    }
  }

  const netSpent = Number(Math.max(0, totalSpent - totalRefunded).toFixed(4));

  return {
    totalOrders: orders.length,
    totalSpent: Number(totalSpent.toFixed(4)),
    totalRefunded: Number(totalRefunded.toFixed(4)),
    netSpent,
    completedCount,
    completedSpent: Number(completedSpent.toFixed(4)),
    processingCount,
    processingSpent: Number(processingSpent.toFixed(4)),
    inProgressCount,
    inProgressSpent: Number(inProgressSpent.toFixed(4)),
    pendingCount,
    pendingSpent: Number(pendingSpent.toFixed(4)),
    canceledCount,
    canceledRefunded: Number(canceledRefunded.toFixed(4)),
  };
}

/**
 * Format date range label for headers
 */
export function getRangeLabel(options: ExportFilterOptions): string {
  switch (options.rangeType) {
    case 'all':
      return 'All Time (Full History)';
    case 'today':
      return 'Today';
    case 'yesterday':
      return 'Yesterday';
    case '7days':
      return 'Last 7 Days';
    case '30days':
      return 'Last 30 Days';
    case 'this_month':
      return 'This Month';
    case 'custom':
      return `Custom: ${options.customStart ? options.customStart.replace('T', ' ') : 'Start'} to ${
        options.customEnd ? options.customEnd.replace('T', ' ') : 'Now'
      }`;
    default:
      return 'All Time';
  }
}

/**
 * Clean & format SMM service names for PDF export:
 * 1. Decodes HTML entities (&amp;, etc.)
 * 2. Strips emojis and unsupported Unicode symbols that break standard PDF font glyphs
 *    (preventing the "F a c e b o o k" character spacing bug and "Ø<ÝûØ<Ýø" mojibake)
 * 3. Formats into a clean Title + concise specs subtitle
 */
export function cleanPdfServiceName(rawName?: string): string {
  if (!rawName) return 'Service';

  // 1. Decode HTML entities
  let str = rawName
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ');

  // 2. Remove emojis, surrogate pairs, and non-ASCII symbols that break standard PDF fonts
  str = str
    .replace(/[\uD800-\uDBFF][\uDC00-\uDFFF]/g, '') // Emojis & surrogate pairs
    .replace(/[\u2600-\u27BF]/g, '') // Dingbats & symbols (⏱, 👥, ✅, ⚡, 🚀, etc.)
    .replace(/[\uE000-\uF8FF]/g, '') // Private use
    .replace(/[\uFE00-\uFE0F]/g, '') // Variation selectors
    .replace(/[\u200D\u200B\u200E\u200F]/g, '') // Zero-width characters
    .replace(/[\u2018\u2019]/g, "'") // Curly single quotes
    .replace(/[\u201C\u201D]/g, '"') // Curly double quotes
    .replace(/[\u2013\u2014]/g, '-') // En-dash & em-dash
    .replace(/[^\x20-\x7E]/g, '') // Keep only clean standard printable ASCII
    .trim();

  // 3. Parse pipe-separated segments: Title | Spec1 | Spec2 | ...
  const parts = str.split('|').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return 'Service';

  const baseTitle = parts[0].replace(/\s+/g, ' ').trim();
  if (parts.length === 1) return baseTitle;

  const keySpecs: string[] = [];
  for (let i = 1; i < parts.length; i++) {
    let p = parts[i];
    p = p.replace(/^Refill Button:/i, 'Refill:');
    p = p.replace(/^Quality:\s*/i, '');
    p = p.replace(/^Speed:\s*/i, '');
    p = p.replace(/^Duration:\s*/i, '');
    p = p.replace(/^Location:\s*/i, '');
    p = p.replace(/\s+/g, ' ').trim();

    // Skip empty or noisy tags like "MAX 100K", "0% Drop", "New", "Cheapest"
    if (!p || p.toLowerCase().startsWith('max') || p.toLowerCase() === 'new' || p.toLowerCase() === 'cheapest') {
      continue;
    }
    keySpecs.push(p);
  }

  if (keySpecs.length === 0) return baseTitle;
  return `${baseTitle}\n(${keySpecs.slice(0, 3).join(' • ')})`;
}

/**
 * EXPORT TO PDF
 * Generates an executive, branded Statement & Spend Report
 */
export function exportOrdersToPdf(orders: OrderItem[], options: ExportFilterOptions): void {
  const summary = calculateSpendSummary(orders);
  const rangeLabel = getRangeLabel(options);
  const generatedAt = new Date().toLocaleString();

  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();

  // 1. Header Banner
  doc.setFillColor(22, 35, 153); // #162399 primary brand color
  doc.rect(0, 0, pageWidth, 60, 'F');

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('DIGITALSMM - ORDERS & SPEND STATEMENT', 40, 36);

  // Subtitle
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(220, 230, 255);
  doc.text(`Official Account Activity & Financial Ledger • DigitalSMM Hub`, 40, 50);

  // Meta Info (Right side of header)
  doc.setFontSize(8.5);
  doc.setTextColor(230, 240, 255);
  doc.text(`Generated: ${generatedAt}`, pageWidth - 40, 28, { align: 'right' });
  if (options.username) {
    doc.text(`User: ${options.username}`, pageWidth - 40, 42, { align: 'right' });
  }
  doc.text(`Range: ${rangeLabel}`, pageWidth - 40, 54, { align: 'right' });

  // 2. Summary KPI Cards
  const cardY = 74;
  const cardHeight = 44;
  const cardWidth = (pageWidth - 80 - 36) / 4;

  const kpis = [
    { label: 'TOTAL ORDERS', value: summary.totalOrders.toLocaleString(), color: '#162399', bg: '#eef2ff' },
    { label: 'GROSS CHARGE', value: `$${summary.totalSpent.toFixed(3)}`, color: '#0369a1', bg: '#f0f9ff' },
    { label: 'TOTAL REFUNDED', value: `$${summary.totalRefunded.toFixed(3)}`, color: '#059669', bg: '#ecfdf5' },
    { label: 'NET SPENT', value: `$${summary.netSpent.toFixed(3)}`, color: '#1e293b', bg: '#f8fafc' },
  ];

  kpis.forEach((kpi, idx) => {
    const x = 40 + idx * (cardWidth + 12);
    doc.setFillColor(kpi.bg);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 4, 4, 'F');
    doc.setDrawColor(226, 232, 240);
    doc.roundedRect(x, cardY, cardWidth, cardHeight, 4, 4, 'S');

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(100, 116, 139);
    doc.text(kpi.label, x + 10, cardY + 16);

    doc.setFontSize(13);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(kpi.color);
    doc.text(kpi.value, x + 10, cardY + 34);
  });

  // Status breakdown chip text
  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(71, 85, 105);
  const breakdownStr = `Breakdown: Completed: ${summary.completedCount} ($${summary.completedSpent.toFixed(3)})  |  Processing/In Progress: ${summary.processingCount + summary.inProgressCount} ($${(summary.processingSpent + summary.inProgressSpent).toFixed(3)})  |  Canceled/Refunded: ${summary.canceledCount} ($${summary.canceledRefunded.toFixed(3)})`;
  doc.text(breakdownStr, 40, cardY + cardHeight + 16);

  // 3. Orders Table
  const tableData = orders.map((o) => {
    const isCanceled = o.status === 'CANCELED';
    const isRefunded = o.isRefunded || isCanceled;
    let chargeStr = `$${(o.charge || 0).toFixed(3)}`;
    if (isRefunded) {
      chargeStr = `$0.00\n(Ref: $${(o.refundAmount || o.charge || 0).toFixed(3)})`;
    } else if (o.status === 'PARTIAL' && o.refundAmount) {
      chargeStr = `$${((o.charge || 0) - o.refundAmount).toFixed(3)}\n(Ref: $${o.refundAmount.toFixed(3)})`;
    }

    const dateStr = new Date(o.createdAt).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    const displayLink = o.link
      ? o.link.replace(/^https?:\/\//i, '').replace(/^www\./i, '').slice(0, 30)
      : '';

    return [
      `#${(o.externalOrderId || o.id.slice(0, 7)).toString()}`,
      dateStr,
      o.platform || 'General',
      cleanPdfServiceName(o.serviceName),
      displayLink,
      (o.quantity || 0).toLocaleString(),
      chargeStr,
      (o.remains ?? '0').toString(),
      o.status,
    ];
  });

  autoTable(doc, {
    startY: cardY + cardHeight + 24,
    margin: { left: 35, right: 35 },
    head: [['Order ID', 'Date & Time', 'Platform', 'Service Name', 'Target Link', 'Qty', 'Charge', 'Remains', 'Status']],
    body: tableData,
    theme: 'grid',
    styles: {
      fontSize: 8,
      cellPadding: 4,
      textColor: [30, 41, 59],
      lineColor: [226, 232, 240],
      lineWidth: 0.5,
      overflow: 'linebreak',
    },
    headStyles: {
      fillColor: [22, 35, 153],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 8,
      halign: 'left',
    },
    alternateRowStyles: {
      fillColor: [248, 250, 252],
    },
    columnStyles: {
      0: { cellWidth: 58, fontStyle: 'bold' },
      1: { cellWidth: 90, fontSize: 7.5 },
      2: { cellWidth: 54 },
      3: { cellWidth: 'auto', fontStyle: 'bold' }, // Clean Service Name - plenty of space
      4: { cellWidth: 120, fontSize: 7.5 },
      5: { cellWidth: 46, halign: 'right' },
      6: { cellWidth: 65, halign: 'right', fontStyle: 'bold' },
      7: { cellWidth: 46, halign: 'right' },
      8: { cellWidth: 70, halign: 'center', fontStyle: 'bold' },
    },
    didParseCell: (data) => {
      // Color status badges
      if (data.section === 'body' && data.column.index === 8) {
        const val = data.cell.raw;
        if (val === 'COMPLETED') {
          data.cell.styles.textColor = [21, 128, 61];
        } else if (val === 'PROCESSING' || val === 'IN_PROGRESS') {
          data.cell.styles.textColor = [3, 105, 161];
        } else if (val === 'PENDING') {
          data.cell.styles.textColor = [180, 83, 9];
        } else if (val === 'CANCELED') {
          data.cell.styles.textColor = [185, 28, 28];
        }
      }
    },
    didDrawPage: (data) => {
      // Footer page numbering
      const str = `Page ${data.pageNumber} of ${doc.getNumberOfPages()} • DigitalSMM Statement Report • https://digitalsmm.com`;
      doc.setFontSize(7.5);
      doc.setTextColor(148, 163, 184);
      doc.text(str, pageWidth / 2, pageHeight - 14, { align: 'center' });
    },
  });

  const timestamp = new Date().toISOString().slice(0, 10);
  doc.save(`DigitalSMM_Orders_${timestamp}.pdf`);
}

/**
 * EXPORT TO EXCEL (.xlsx)
 * Generates formatted spreadsheet with Summary Header & Detailed Order Records
 */
export function exportOrdersToExcel(orders: OrderItem[], options: ExportFilterOptions): void {
  const summary = calculateSpendSummary(orders);
  const rangeLabel = getRangeLabel(options);
  const generatedAt = new Date().toLocaleString();

  // Create worksheet data
  const wsData: any[][] = [
    ['DIGITALSMM - ORDERS HISTORY & SPEND STATEMENT'],
    ['Generated At:', generatedAt, 'User:', options.username || 'Authenticated User', 'Filter Range:', rangeLabel],
    [],
    ['--- SPEND SUMMARY ---'],
    ['Total Orders', 'Gross Spend (USD)', 'Total Refunded (USD)', 'Net Spend (USD)', 'Completed Orders', 'In Progress / Processing', 'Canceled Orders'],
    [
      summary.totalOrders,
      summary.totalSpent,
      summary.totalRefunded,
      summary.netSpent,
      summary.completedCount,
      summary.processingCount + summary.inProgressCount,
      summary.canceledCount,
    ],
    [],
    ['--- ORDER RECORDS ---'],
    [
      'Order ID',
      'Date & Time',
      'Platform',
      'Category',
      'Service ID',
      'Service Name',
      'Target Link',
      'Quantity',
      'Charge (USD)',
      'Start Count',
      'Remains',
      'Status',
      'Is Refunded',
      'Refund Amount (USD)',
    ],
  ];

  for (const o of orders) {
    const isCanceled = o.status === 'CANCELED';
    const isRefunded = o.isRefunded || isCanceled;
    const refundAmt = o.refundAmount !== undefined ? o.refundAmount : (isCanceled ? o.charge : 0);

    wsData.push([
      o.externalOrderId ? o.externalOrderId.toString() : o.id,
      new Date(o.createdAt).toLocaleString(),
      o.platform || '',
      o.category || '',
      o.externalServiceId ? o.externalServiceId.toString() : (o.serviceId || ''),
      cleanPdfServiceName(o.serviceName).replace('\n', ' - '),
      o.link || '',
      o.quantity || 0,
      o.charge || 0,
      o.startCount ?? '0',
      o.remains ?? '0',
      o.status,
      isRefunded ? 'YES' : 'NO',
      refundAmt || 0,
    ]);
  }

  // Summary footer row
  wsData.push([]);
  wsData.push([
    'TOTALS',
    '',
    '',
    '',
    '',
    '',
    '',
    orders.reduce((sum, o) => sum + (o.quantity || 0), 0),
    summary.totalSpent,
    '',
    '',
    '',
    '',
    summary.totalRefunded,
  ]);

  const ws = XLSX.utils.aoa_to_sheet(wsData);

  // Set column widths
  ws['!cols'] = [
    { wch: 16 }, // Order ID
    { wch: 22 }, // Date & Time
    { wch: 14 }, // Platform
    { wch: 24 }, // Category
    { wch: 12 }, // Service ID
    { wch: 45 }, // Service Name
    { wch: 38 }, // Link
    { wch: 12 }, // Quantity
    { wch: 14 }, // Charge
    { wch: 12 }, // Start count
    { wch: 10 }, // Remains
    { wch: 14 }, // Status
    { wch: 12 }, // Is Refunded
    { wch: 18 }, // Refund Amount
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Orders_Statement');

  const timestamp = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `DigitalSMM_Orders_${timestamp}.xlsx`);
}

/**
 * EXPORT TO TXT
 * Generates an ASCII tabular summary statement report
 */
export function exportOrdersToTxt(orders: OrderItem[], options: ExportFilterOptions): void {
  const summary = calculateSpendSummary(orders);
  const rangeLabel = getRangeLabel(options);
  const generatedAt = new Date().toLocaleString();

  const lines: string[] = [];
  const divider = '='.repeat(84);
  const subDivider = '-'.repeat(84);

  lines.push(divider);
  lines.push('                      DIGITALSMM - ORDERS & SPEND REPORT');
  lines.push(divider);
  lines.push(`Generated On : ${generatedAt}`);
  lines.push(`Account User : ${options.username || 'Authenticated User'}`);
  lines.push(`Filter Range : ${rangeLabel}`);
  lines.push(`Status Filter: ${options.statusFilter || 'ALL'}`);
  lines.push(subDivider);
  lines.push('SPEND SUMMARY & TOTALS:');
  lines.push(`  • Total Orders Placed     : ${summary.totalOrders.toLocaleString()}`);
  lines.push(`  • Gross Charged Amount    : $${summary.totalSpent.toFixed(3)} USD`);
  lines.push(`  • Total Refunded Amount   : $${summary.totalRefunded.toFixed(3)} USD`);
  lines.push(`  • Net Realized Spend      : $${summary.netSpent.toFixed(3)} USD`);
  lines.push('');
  lines.push('STATUS BREAKDOWN:');
  lines.push(`  • Completed               : ${summary.completedCount} orders ($${summary.completedSpent.toFixed(3)})`);
  lines.push(`  • Processing              : ${summary.processingCount} orders ($${summary.processingSpent.toFixed(3)})`);
  lines.push(`  • In Progress             : ${summary.inProgressCount} orders ($${summary.inProgressSpent.toFixed(3)})`);
  lines.push(`  • Pending                 : ${summary.pendingCount} orders ($${summary.pendingSpent.toFixed(3)})`);
  lines.push(`  • Canceled (Refunded)     : ${summary.canceledCount} orders ($${summary.canceledRefunded.toFixed(3)})`);
  lines.push(divider);
  lines.push('ORDER RECORDS:');
  lines.push(subDivider);

  if (orders.length === 0) {
    lines.push('No orders found matching the selected filter criteria.');
  } else {
    orders.forEach((o, i) => {
      const isCanceled = o.status === 'CANCELED';
      const isRefunded = o.isRefunded || isCanceled;
      const refAmt = o.refundAmount !== undefined ? o.refundAmount : (isCanceled ? o.charge : 0);

      lines.push(`[#${i + 1}] Order ID: #${o.externalOrderId || o.id}`);
      lines.push(`     Date     : ${new Date(o.createdAt).toLocaleString()}`);
      lines.push(`     Platform : ${o.platform} | Status: ${o.status}`);
      lines.push(`     Service  : ${cleanPdfServiceName(o.serviceName).replace('\n', ' - ')}`);
      lines.push(`     Link     : ${o.link}`);
      lines.push(`     Quantity : ${(o.quantity || 0).toLocaleString()} | Charge: $${(o.charge || 0).toFixed(3)} USD`);
      lines.push(`     Remains  : ${o.remains ?? '0'} | Start Count: ${o.startCount ?? '0'}`);
      if (isRefunded) {
        lines.push(`     * REFUND : Refunded $${refAmt.toFixed(3)} USD to wallet`);
      }
      lines.push(subDivider);
    });
  }

  lines.push(divider);
  lines.push('                     End of Report • Powered by DigitalSMM');
  lines.push(divider);

  const content = lines.join('\r\n');
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  const timestamp = new Date().toISOString().slice(0, 10);
  a.href = url;
  a.download = `DigitalSMM_Orders_${timestamp}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
