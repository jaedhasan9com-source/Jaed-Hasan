import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import JsBarcode from 'jsbarcode';
import { PaymentRecord, Product, Sale, Shop } from '../types';
import { formatCurrency, formatDateTime } from './i18n';

export function generateSaleReceiptPDF(sale: Sale, shop: Shop): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: [80, 210],
  });

  let y = 10;
  const centerX = 40;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(12);
  doc.text(shop.name || 'SmartShop Pro', centerX, y, { align: 'center' });
  y += 5;

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  if (shop.address) {
    doc.text(shop.address, centerX, y, { align: 'center' });
    y += 4;
  }
  if (shop.phone) {
    doc.text(`Tel: ${shop.phone}`, centerX, y, { align: 'center' });
    y += 4;
  }
  if (shop.vatNumber) {
    doc.text(`VAT Reg: ${shop.vatNumber}`, centerX, y, { align: 'center' });
    y += 4;
  }

  doc.setLineWidth(0.2);
  doc.line(5, y, 75, y);
  y += 4;

  doc.setFont('helvetica', 'bold');
  doc.text(`Invoice: ${sale.invoiceNumber}`, 5, y);
  y += 4;
  doc.setFont('helvetica', 'normal');
  doc.text(`Date: ${formatDateTime(sale.createdAt, shop.timezone)}`, 5, y);
  y += 4;
  doc.text(`Cashier: ${sale.createdByName}`, 5, y);
  y += 4;
  if (sale.customerName) {
    doc.text(`Customer: ${sale.customerName}`, 5, y);
    y += 4;
  }
  if (sale.status !== 'completed') {
    doc.setFont('helvetica', 'bold');
    doc.text(`STATUS: ${sale.status.toUpperCase()}`, 5, y);
    y += 4;
  }

  doc.line(5, y, 75, y);
  y += 2;

  autoTable(doc, {
    startY: y,
    margin: { left: 4, right: 4 },
    theme: 'plain',
    styles: { fontSize: 7, cellPadding: 1 },
    headStyles: { fontStyle: 'bold' },
    head: [['Item', 'Qty', 'Price', 'Total']],
    body: sale.items.map((item) => [
      item.productName.slice(0, 18),
      `${item.quantity}`,
      item.unitPrice.toFixed(2),
      item.lineTotal.toFixed(2),
    ]),
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  y = (doc as any).lastAutoTable.finalY + 3;
  doc.line(5, y, 75, y);
  y += 4;

  const rightAlign = (label: string, val: string, bold = false) => {
    doc.setFont('helvetica', bold ? 'bold' : 'normal');
    doc.text(label, 5, y);
    doc.text(val, 75, y, { align: 'right' });
    y += 4;
  };

  rightAlign('Subtotal:', formatCurrency(sale.subtotal, shop.currency));
  if (sale.itemDiscountTotal + sale.orderDiscount > 0) {
    rightAlign(
      'Total Discount:',
      `-${formatCurrency(sale.itemDiscountTotal + sale.orderDiscount, shop.currency)}`
    );
  }
  rightAlign('Net (Excl. VAT):', formatCurrency(sale.netRevenue, shop.currency));
  rightAlign('VAT Amount:', formatCurrency(sale.taxTotal, shop.currency));
  rightAlign('TOTAL PAYABLE:', formatCurrency(sale.total, shop.currency), true);

  y += 1;
  doc.line(5, y, 75, y);
  y += 4;

  rightAlign('Payment Method:', sale.paymentMethod.toUpperCase());
  if (sale.cashPaid > 0) {
    rightAlign('Cash Tendered:', formatCurrency(sale.cashPaid, shop.currency));
  }
  if (sale.cardPaid > 0) {
    rightAlign('Card Paid:', formatCurrency(sale.cardPaid, shop.currency));
  }
  if (sale.creditAmount > 0) {
    rightAlign('On Customer Credit:', formatCurrency(sale.creditAmount, shop.currency));
  }
  if (sale.changeDue > 0) {
    rightAlign('Change Due:', formatCurrency(sale.changeDue, shop.currency), true);
  }

  try {
    const canvas = document.createElement('canvas');
    JsBarcode(canvas, sale.invoiceNumber, {
      format: 'CODE128',
      width: 1.2,
      height: 28,
      displayValue: false,
      margin: 2,
    });
    const imgData = canvas.toDataURL('image/png');
    doc.addImage(imgData, 'PNG', 12, y + 1, 56, 12);
    y += 16;
  } catch {
    y += 3;
  }

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text(shop.receiptFooter || 'Thank you for shopping with us!', centerX, y, {
    align: 'center',
  });

  doc.save(`${sale.invoiceNumber}.pdf`);
}

export function generatePaymentReceiptPDF(payment: PaymentRecord, shop: Shop): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a5',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(shop.name, 15, 18);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(`${shop.address} | Tel: ${shop.phone}`, 15, 24);
  doc.text(`VAT Registration: ${shop.vatNumber}`, 15, 29);

  doc.setLineWidth(0.4);
  doc.line(15, 33, 133, 33);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(
    payment.partyType === 'customer' ? 'CUSTOMER PAYMENT RECEIPT' : 'SUPPLIER PAYMENT VOUCHER',
    15,
    42
  );

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(10);
  doc.text(`Receipt #: ${payment.receiptNumber}`, 15, 50);
  doc.text(`Date: ${formatDateTime(payment.createdAt, shop.timezone)}`, 15, 56);
  doc.text(
    `${payment.partyType === 'customer' ? 'Received From' : 'Paid To'}: ${payment.partyName}`,
    15,
    62
  );
  doc.text(`Payment Method: ${payment.paymentMethod.toUpperCase()}`, 15, 68);
  doc.text(`Recorded By: ${payment.createdByName}`, 15, 74);

  autoTable(doc, {
    startY: 82,
    margin: { left: 15, right: 15 },
    theme: 'grid',
    headStyles: { fillColor: [15, 23, 42] },
    head: [['Description', 'Amount']],
    body: [
      ['Previous Outstanding Balance', formatCurrency(payment.previousBalance, shop.currency)],
      ['Amount Paid / Received', formatCurrency(payment.amount, shop.currency)],
      ['New Remaining Balance', formatCurrency(payment.newBalance, shop.currency)],
    ],
  });

  if (payment.notes) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const finalY = (doc as any).lastAutoTable.finalY + 10;
    doc.setFontSize(9);
    doc.text(`Notes: ${payment.notes}`, 15, finalY);
  }

  doc.save(`${payment.receiptNumber}.pdf`);
}

export const generatePartyPaymentReceiptPDF = generatePaymentReceiptPDF;

export function generateBarcodeLabelsPDF(
  products: { product: Product; copies: number }[],
  shop: Shop
): void {
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const labelWidth = 60;
  const labelHeight = 32;
  const startX = 12;
  const startY = 14;
  const gapX = 4;
  const gapY = 4;
  const cols = 3;
  const rowsPerPage = 8;

  let slotIndex = 0;

  for (const entry of products) {
    const { product, copies } = entry;
    const count = Math.max(1, Math.min(100, copies));

    for (let i = 0; i < count; i++) {
      if (slotIndex > 0 && slotIndex % (cols * rowsPerPage) === 0) {
        doc.addPage();
      }

      const pageSlot = slotIndex % (cols * rowsPerPage);
      const col = pageSlot % cols;
      const row = Math.floor(pageSlot / cols);

      const x = startX + col * (labelWidth + gapX);
      const y = startY + row * (labelHeight + gapY);

      doc.setDrawColor(203, 213, 225);
      doc.setLineWidth(0.2);
      doc.roundedRect(x, y, labelWidth, labelHeight, 2, 2);

      let textY = y + 4.5;
      if (shop.showShopNameOnBarcode) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(6.5);
        doc.text(shop.name.slice(0, 30), x + labelWidth / 2, textY, { align: 'center' });
        textY += 3.5;
      }

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.text(product.name.slice(0, 26), x + labelWidth / 2, textY, { align: 'center' });
      textY += 2;

      try {
        const canvas = document.createElement('canvas');
        JsBarcode(canvas, product.barcode || product.sku, {
          format: 'CODE128',
          width: 1.5,
          height: 36,
          displayValue: true,
          fontSize: 12,
          margin: 2,
        });
        const imgData = canvas.toDataURL('image/png');
        doc.addImage(imgData, 'PNG', x + 5, textY, labelWidth - 10, 14);
        textY += 16.5;
      } catch {
        doc.setFont('courier', 'bold');
        doc.text(product.barcode || product.sku, x + labelWidth / 2, textY + 8, {
          align: 'center',
        });
        textY += 14;
      }

      if (shop.showPriceOnBarcode) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.text(
          `${formatCurrency(product.sellingPrice, shop.currency)}  (SKU: ${product.sku})`,
          x + labelWidth / 2,
          y + labelHeight - 2.5,
          { align: 'center' }
        );
      }

      slotIndex++;
    }
  }

  doc.save(`SmartShop-Barcode-Labels-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportReportToPDF(
  title: string,
  subtitle: string,
  headers: string[],
  rows: (string | number)[][],
  shop: Shop
): void {
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(`${shop.name} — ${title}`, 14, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.text(
    `${subtitle} | Generated: ${formatDateTime(new Date().toISOString(), shop.timezone)} | VAT: ${shop.vatNumber}`,
    14,
    22
  );

  autoTable(doc, {
    startY: 27,
    head: [headers],
    body: rows.map((r) => r.map((cell) => String(cell))),
    styles: { fontSize: 8.5, cellPadding: 2.5 },
    headStyles: { fillColor: [15, 23, 42], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 250, 252] },
  });

  doc.save(`${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`);
}

export function exportToCSV(filename: string, headers: string[], rows: (string | number)[][]): void {
  const escapeCell = (val: string | number) => {
    const str = String(val ?? '');
    if (str.includes(',') || str.includes('"') || str.includes('\n')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const csvLines = [
    headers.map(escapeCell).join(','),
    ...rows.map((row) => row.map(escapeCell).join(',')),
  ];

  const blob = new Blob([csvLines.join('\n')], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
