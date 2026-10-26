import { Expense, Product, Sale, TaxCategory } from '../types';

export interface CartCalculationInputItem {
  product: Product;
  quantity: number;
  itemDiscount: number;
}

export interface CalculatedSaleItemResult {
  productId: string;
  productName: string;
  sku: string;
  barcode: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  unitCost: number;
  itemDiscount: number;
  taxRate: number;
  taxCategory: TaxCategory;
  taxAmount: number;
  netLineAmount: number;
  lineTotal: number;
}

export interface CalculatedSaleResult {
  items: CalculatedSaleItemResult[];
  subtotal: number;
  itemDiscountTotal: number;
  orderDiscount: number;
  netRevenue: number;
  taxTotal: number;
  total: number;
  totalCost: number;
  grossProfit: number;
}

export function roundCurrency(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export function calculateWeightedAverageCost(
  existingStock: number,
  currentUnitCost: number,
  receivedQty: number,
  receivedUnitCost: number
): number {
  if (receivedQty <= 0) return roundCurrency(currentUnitCost);
  if (existingStock <= 0) return roundCurrency(receivedUnitCost);
  const totalExistingValue = existingStock * currentUnitCost;
  const totalNewValue = receivedQty * receivedUnitCost;
  const combinedQty = existingStock + receivedQty;
  return roundCurrency((totalExistingValue + totalNewValue) / combinedQty);
}

export function calculateSaleTotals(
  cartItems: CartCalculationInputItem[],
  orderDiscountInput: number,
  taxInclusive: boolean
): CalculatedSaleResult {
  let rawSubtotal = 0;
  let itemDiscountTotal = 0;

  const preliminaryLines = cartItems.map((entry) => {
    const qty = Math.max(0, Number(entry.quantity) || 0);
    const unitPrice = Math.max(0, Number(entry.product.sellingPrice) || 0);
    const unitCost = Math.max(0, Number(entry.product.purchaseCost) || 0);
    const grossLine = roundCurrency(qty * unitPrice);
    const clampedItemDiscount = Math.min(grossLine, Math.max(0, Number(entry.itemDiscount) || 0));
    const afterItemDiscount = roundCurrency(grossLine - clampedItemDiscount);

    rawSubtotal = roundCurrency(rawSubtotal + grossLine);
    itemDiscountTotal = roundCurrency(itemDiscountTotal + clampedItemDiscount);

    return {
      entry,
      qty,
      unitPrice,
      unitCost,
      grossLine,
      clampedItemDiscount,
      afterItemDiscount,
    };
  });

  const subtotalAfterItemDiscounts = roundCurrency(rawSubtotal - itemDiscountTotal);
  const clampedOrderDiscount = Math.min(
    subtotalAfterItemDiscounts,
    Math.max(0, Number(orderDiscountInput) || 0)
  );

  let netRevenueTotal = 0;
  let taxTotal = 0;
  let payableTotal = 0;
  let totalCost = 0;

  const calculatedItems: CalculatedSaleItemResult[] = preliminaryLines.map((line) => {
    const proportion =
      subtotalAfterItemDiscounts > 0
        ? line.afterItemDiscount / subtotalAfterItemDiscounts
        : 0;
    const allocatedOrderDiscount = roundCurrency(clampedOrderDiscount * proportion);
    const discountedLineBase = Math.max(
      0,
      roundCurrency(line.afterItemDiscount - allocatedOrderDiscount)
    );

    const effectiveTaxRate =
      line.entry.product.taxCategory === 'standard'
        ? Math.max(0, Number(line.entry.product.taxRate) || 0)
        : 0;

    let netLineAmount = 0;
    let taxAmount = 0;
    let lineTotal = 0;

    if (taxInclusive) {
      lineTotal = discountedLineBase;
      netLineAmount =
        effectiveTaxRate > 0
          ? roundCurrency(lineTotal / (1 + effectiveTaxRate / 100))
          : lineTotal;
      taxAmount = roundCurrency(lineTotal - netLineAmount);
    } else {
      netLineAmount = discountedLineBase;
      taxAmount = roundCurrency(netLineAmount * (effectiveTaxRate / 100));
      lineTotal = roundCurrency(netLineAmount + taxAmount);
    }

    const lineCogs = roundCurrency(line.qty * line.unitCost);

    netRevenueTotal = roundCurrency(netRevenueTotal + netLineAmount);
    taxTotal = roundCurrency(taxTotal + taxAmount);
    payableTotal = roundCurrency(payableTotal + lineTotal);
    totalCost = roundCurrency(totalCost + lineCogs);

    return {
      productId: line.entry.product.id,
      productName: line.entry.product.name,
      sku: line.entry.product.sku,
      barcode: line.entry.product.barcode,
      quantity: line.qty,
      unit: line.entry.product.unit || 'pcs',
      unitPrice: line.unitPrice,
      unitCost: line.unitCost,
      itemDiscount: line.clampedItemDiscount,
      taxRate: effectiveTaxRate,
      taxCategory: line.entry.product.taxCategory,
      taxAmount,
      netLineAmount,
      lineTotal,
    };
  });

  const grossProfit = roundCurrency(netRevenueTotal - totalCost);

  return {
    items: calculatedItems,
    subtotal: rawSubtotal,
    itemDiscountTotal,
    orderDiscount: clampedOrderDiscount,
    netRevenue: netRevenueTotal,
    taxTotal,
    total: payableTotal,
    totalCost,
    grossProfit,
  };
}

export interface ProfitAndLossSummary {
  grossSalesIncludingTax: number;
  netRevenueExclTax: number;
  taxCollected: number;
  cogs: number;
  grossProfit: number;
  operatingExpenses: number;
  operatingNetProfit: number;
  cashReceived: number;
  cardReceived: number;
  unpaidCreditSales: number;
  refundedTotal: number;
  transactionCount: number;
}

export function calculateProfitSummary(
  sales: Sale[],
  expenses: Expense[]
): ProfitAndLossSummary {
  let grossSalesIncludingTax = 0;
  let netRevenueExclTax = 0;
  let taxCollected = 0;
  let cogs = 0;
  let cashReceived = 0;
  let cardReceived = 0;
  let unpaidCreditSales = 0;
  let refundedTotal = 0;
  let activeTransactionCount = 0;

  for (const sale of sales) {
    if (sale.status === 'voided' || sale.status === 'refunded') {
      refundedTotal = roundCurrency(refundedTotal + (sale.refundedAmount || sale.total));
      continue;
    }

    activeTransactionCount += 1;
    const activeRatio =
      sale.total > 0 && sale.refundedAmount > 0
        ? Math.max(0, (sale.total - sale.refundedAmount) / sale.total)
        : 1;

    if (sale.refundedAmount > 0) {
      refundedTotal = roundCurrency(refundedTotal + sale.refundedAmount);
    }

    const effectiveTotal = roundCurrency(sale.total * activeRatio);
    const effectiveNetRevenue = roundCurrency(sale.netRevenue * activeRatio);
    const effectiveTax = roundCurrency(sale.taxTotal * activeRatio);
    const effectiveCogs = roundCurrency(sale.totalCost * activeRatio);

    grossSalesIncludingTax = roundCurrency(grossSalesIncludingTax + effectiveTotal);
    netRevenueExclTax = roundCurrency(netRevenueExclTax + effectiveNetRevenue);
    taxCollected = roundCurrency(taxCollected + effectiveTax);
    cogs = roundCurrency(cogs + effectiveCogs);

    const netCashForSale = Math.max(0, roundCurrency((sale.cashPaid - sale.changeDue) * activeRatio));
    const netCardForSale = roundCurrency(sale.cardPaid * activeRatio);
    const netCreditForSale = roundCurrency(sale.creditAmount * activeRatio);

    cashReceived = roundCurrency(cashReceived + netCashForSale);
    cardReceived = roundCurrency(cardReceived + netCardForSale);
    unpaidCreditSales = roundCurrency(unpaidCreditSales + netCreditForSale);
  }

  const grossProfit = roundCurrency(netRevenueExclTax - cogs);
  const operatingExpenses = roundCurrency(
    expenses.reduce((sum, exp) => sum + (Number(exp.amount) || 0), 0)
  );
  const operatingNetProfit = roundCurrency(grossProfit - operatingExpenses);

  return {
    grossSalesIncludingTax,
    netRevenueExclTax,
    taxCollected,
    cogs,
    grossProfit,
    operatingExpenses,
    operatingNetProfit,
    cashReceived,
    cardReceived,
    unpaidCreditSales,
    refundedTotal,
    transactionCount: activeTransactionCount,
  };
}

export interface SelfTestResult {
  id: string;
  name: string;
  passed: boolean;
  expected: string;
  actual: string;
}

export function runFinancialAndStockTests(): SelfTestResult[] {
  const sampleProduct: Product = {
    id: 'test-prod-1',
    shopId: 'shop-1',
    name: 'Test Basmati Rice 5kg',
    sku: 'RICE-001',
    barcode: '6281000000015',
    category: 'Grains',
    brand: 'Al-Noor',
    purchaseCost: 30,
    sellingPrice: 46,
    stock: 20,
    minStockThreshold: 5,
    unit: 'bag',
    taxRate: 15,
    taxCategory: 'standard',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const results: SelfTestResult[] = [];

  const calcInclusive = calculateSaleTotals(
    [{ product: sampleProduct, quantity: 2, itemDiscount: 0 }],
    0,
    true
  );
  results.push({
    id: 'tax-inclusive',
    name: 'Tax-Inclusive VAT Extraction & Gross Profit (15% VAT)',
    passed:
      calcInclusive.total === 92 &&
      calcInclusive.netRevenue === 80 &&
      calcInclusive.taxTotal === 12 &&
      calcInclusive.totalCost === 60 &&
      calcInclusive.grossProfit === 20,
    expected: 'Total: 92.00, Net: 80.00, Tax: 12.00, COGS: 60.00, Profit: 20.00',
    actual: `Total: ${calcInclusive.total.toFixed(2)}, Net: ${calcInclusive.netRevenue.toFixed(2)}, Tax: ${calcInclusive.taxTotal.toFixed(2)}, COGS: ${calcInclusive.totalCost.toFixed(2)}, Profit: ${calcInclusive.grossProfit.toFixed(2)}`,
  });

  const exclusiveProd = { ...sampleProduct, sellingPrice: 50, purchaseCost: 35 };
  const calcExclusive = calculateSaleTotals(
    [{ product: exclusiveProd, quantity: 2, itemDiscount: 0 }],
    0,
    false
  );
  results.push({
    id: 'tax-exclusive',
    name: 'Tax-Exclusive VAT Addition & Tax Excluded from Profit',
    passed:
      calcExclusive.netRevenue === 100 &&
      calcExclusive.taxTotal === 15 &&
      calcExclusive.total === 115 &&
      calcExclusive.grossProfit === 30,
    expected: 'Net: 100.00, Tax: 15.00, Total: 115.00, Gross Profit: 30.00',
    actual: `Net: ${calcExclusive.netRevenue.toFixed(2)}, Tax: ${calcExclusive.taxTotal.toFixed(2)}, Total: ${calcExclusive.total.toFixed(2)}, Gross Profit: ${calcExclusive.grossProfit.toFixed(2)}`,
  });

  const wac = calculateWeightedAverageCost(10, 20, 10, 30);
  results.push({
    id: 'wac-calculation',
    name: 'Weighted-Average Cost (WAC) on Goods Received',
    passed: wac === 25,
    expected: '25.00 SAR',
    actual: `${wac.toFixed(2)} SAR`,
  });

  return results;
}
