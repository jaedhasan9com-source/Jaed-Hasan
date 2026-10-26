import React, { useState, useMemo } from 'react';
import {
  BarChart3,
  Download,
  Printer,
  Calendar,
  DollarSign,
  TrendingUp,
  FileSpreadsheet,
  CheckCircle,
  FileText,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
} from 'recharts';
import { useShop } from '../context/ShopContext';
import { formatCurrency, formatDateTime } from '../lib/i18n';
import { exportReportToPDF, exportToCSV } from '../lib/pdfGenerator';
import { Sale } from '../types';

export const ReportsView: React.FC = () => {
  const { state } = useShop();

  const shop = state?.shop;
  const sales = state?.sales || [];
  const expenses = state?.expenses || [];
  const products = state?.products || [];
  const customers = state?.customers || [];
  const suppliers = state?.suppliers || [];

  const [dateRange, setDateRange] = useState<'today' | '7days' | '30days' | 'all'>('30days');
  const [reportType, setReportType] = useState<'sales' | 'pl' | 'inventory' | 'tax'>('sales');

  // Filter sales by date range
  const filteredSales = useMemo(() => {
    const now = new Date();
    return sales.filter((s) => {
      if (s.status === 'voided') return false;
      const saleDate = new Date(s.createdAt);
      if (dateRange === 'today') {
        return (
          saleDate.getDate() === now.getDate() &&
          saleDate.getMonth() === now.getMonth() &&
          saleDate.getFullYear() === now.getFullYear()
        );
      }
      if (dateRange === '7days') {
        const past7 = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        return saleDate >= past7;
      }
      if (dateRange === '30days') {
        const past30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        return saleDate >= past30;
      }
      return true;
    });
  }, [sales, dateRange]);

  // Aggregate daily totals for chart
  const dailyChartData = useMemo(() => {
    const map: Record<string, { date: string; sales: number; profit: number }> = {};

    for (const s of filteredSales) {
      const dateKey = s.createdAt.slice(0, 10);
      if (!map[dateKey]) {
        map[dateKey] = { date: dateKey.slice(5), sales: 0, profit: 0 };
      }
      map[dateKey].sales += s.total;
      map[dateKey].profit += s.grossProfit;
    }

    return Object.values(map).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredSales]);

  // Summary figures
  const summary = useMemo(() => {
    let totalSales = 0;
    let netRevenue = 0;
    let totalCogs = 0;
    let totalTax = 0;
    let totalDiscounts = 0;

    for (const s of filteredSales) {
      totalSales += s.total;
      netRevenue += s.netRevenue;
      totalCogs += s.totalCost;
      totalTax += s.taxTotal;
      totalDiscounts += s.itemDiscountTotal + s.orderDiscount;
    }

    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const grossProfit = netRevenue - totalCogs;
    const netProfit = grossProfit - totalExpenses;

    return {
      totalSales,
      netRevenue,
      totalCogs,
      totalTax,
      totalDiscounts,
      grossProfit,
      totalExpenses,
      netProfit,
      count: filteredSales.length,
    };
  }, [filteredSales, expenses]);

  // Handle PDF Export
  const handleExportPDF = () => {
    if (!shop) return;

    if (reportType === 'sales') {
      const headers = ['Invoice #', 'Date & Time', 'Customer', 'Payment', 'Subtotal', 'Tax', 'Total', 'Profit'];
      const rows = filteredSales.map((s) => [
        s.invoiceNumber,
        formatDateTime(s.createdAt, shop.timezone),
        s.customerName || 'Walk-in',
        s.paymentMethod.toUpperCase(),
        formatCurrency(s.subtotal, shop.currency),
        formatCurrency(s.taxTotal, shop.currency),
        formatCurrency(s.total, shop.currency),
        formatCurrency(s.grossProfit, shop.currency),
      ]);
      exportReportToPDF(
        'Sales Summary Ledger',
        `Reporting Window: ${dateRange.toUpperCase()} | Total Transactions: ${filteredSales.length}`,
        headers,
        rows,
        shop
      );
    } else if (reportType === 'inventory') {
      const headers = ['Product', 'SKU', 'Barcode', 'Category', 'Unit Cost', 'Selling Price', 'Stock', 'Cost Value'];
      const rows = products.map((p) => [
        p.name,
        p.sku,
        p.barcode,
        p.category,
        formatCurrency(p.purchaseCost, shop.currency),
        formatCurrency(p.sellingPrice, shop.currency),
        `${p.stock} ${p.unit}`,
        formatCurrency(p.stock * p.purchaseCost, shop.currency),
      ]);
      exportReportToPDF(
        'Inventory Valuation & Stock Report',
        `Total Products: ${products.length} SKUs`,
        headers,
        rows,
        shop
      );
    } else if (reportType === 'tax') {
      const headers = ['Invoice #', 'Date', 'Customer VAT', 'Net Taxable', 'VAT Rate', 'VAT Collected', 'Gross Total'];
      const rows = filteredSales.map((s) => [
        s.invoiceNumber,
        formatDateTime(s.createdAt, shop.timezone),
        'Walk-in / Consumer',
        formatCurrency(s.netRevenue, shop.currency),
        `${shop.defaultTaxRate}%`,
        formatCurrency(s.taxTotal, shop.currency),
        formatCurrency(s.total, shop.currency),
      ]);
      exportReportToPDF(
        'VAT & Tax Authority Return Ledger',
        `Official VAT Reg: ${shop.vatNumber}`,
        headers,
        rows,
        shop
      );
    } else {
      // P&L Report
      const headers = ['Financial Metric', 'Value'];
      const rows = [
        ['Gross Sales Revenue', formatCurrency(summary.totalSales, shop.currency)],
        ['Discounts Given', formatCurrency(summary.totalDiscounts, shop.currency)],
        ['Net Sales Revenue (Excl Tax)', formatCurrency(summary.netRevenue, shop.currency)],
        ['Cost of Goods Sold (COGS)', formatCurrency(summary.totalCogs, shop.currency)],
        ['Gross Profit Margin', formatCurrency(summary.grossProfit, shop.currency)],
        ['Total Operating Expenses', formatCurrency(summary.totalExpenses, shop.currency)],
        ['Net Operating Profit', formatCurrency(summary.netProfit, shop.currency)],
        ['VAT Collected (Payable to Zakat/Tax Authority)', formatCurrency(summary.totalTax, shop.currency)],
      ];
      exportReportToPDF('Profit and Loss Statement', `Reporting Period: ${dateRange.toUpperCase()}`, headers, rows, shop);
    }
  };

  // Handle CSV Export
  const handleExportCSV = () => {
    if (reportType === 'sales') {
      const headers = ['Invoice', 'Date', 'Customer', 'Payment', 'Subtotal', 'Tax', 'Total', 'Profit'];
      const rows = filteredSales.map((s) => [
        s.invoiceNumber,
        s.createdAt,
        s.customerName || 'Walk-in',
        s.paymentMethod,
        s.subtotal,
        s.taxTotal,
        s.total,
        s.grossProfit,
      ]);
      exportToCSV('Sales-Report', headers, rows);
    } else if (reportType === 'inventory') {
      const headers = ['Product', 'SKU', 'Barcode', 'Category', 'Cost', 'Price', 'Stock', 'CostValue'];
      const rows = products.map((p) => [
        p.name,
        p.sku,
        p.barcode,
        p.category,
        p.purchaseCost,
        p.sellingPrice,
        p.stock,
        p.stock * p.purchaseCost,
      ]);
      exportToCSV('Inventory-Valuation', headers, rows);
    } else {
      const headers = ['Metric', 'Amount'];
      const rows = [
        ['Gross Sales', summary.totalSales],
        ['Net Revenue', summary.netRevenue],
        ['COGS', summary.totalCogs],
        ['Gross Profit', summary.grossProfit],
        ['Operating Expenses', summary.totalExpenses],
        ['Net Profit', summary.netProfit],
        ['VAT Collected', summary.totalTax],
      ];
      exportToCSV('Financial-Report', headers, rows);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Reports & Business Intelligence
          </h1>
          <p className="text-xs text-slate-500">
            Export certified PDF statements, tax authority ledgers, and inventory valuation sheets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-slate-500" />
            CSV Export
          </button>
          <button
            type="button"
            onClick={handleExportPDF}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            Download PDF Report
          </button>
        </div>
      </div>

      {/* Control Tabs & Timeframe */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        {/* Report Category */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto">
          {[
            { id: 'sales', label: 'Sales Ledger' },
            { id: 'pl', label: 'P&L Statement' },
            { id: 'inventory', label: 'Inventory Valuation' },
            { id: 'tax', label: 'VAT / Tax Audit' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setReportType(tab.id as any)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                reportType === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Date Range Selector */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium w-full md:w-auto">
          {[
            { id: 'today', label: 'Today' },
            { id: '7days', label: 'Last 7 Days' },
            { id: '30days', label: 'Last 30 Days' },
            { id: 'all', label: 'All History' },
          ].map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => setDateRange(r.id as any)}
              className={`flex-1 md:flex-none px-3 py-1 rounded-lg transition-colors ${
                dateRange === r.id ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Period Gross Sales
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {formatCurrency(summary.totalSales, shop?.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{summary.count} invoices issued</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Gross Profit Margin
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">
            {formatCurrency(summary.grossProfit, shop?.currency)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            {summary.netRevenue > 0
              ? `${Math.round((summary.grossProfit / summary.netRevenue) * 100)}% on net sales`
              : '0%'}
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            VAT Collected (15%)
          </div>
          <div className="text-xl font-bold text-blue-600 mt-1 font-mono">
            {formatCurrency(summary.totalTax, shop?.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Zakat / Tax authority liability</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Net Profit (After Exp)
          </div>
          <div
            className={`text-xl font-bold mt-1 font-mono ${
              summary.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {formatCurrency(summary.netProfit, shop?.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">
            Operating overhead: {formatCurrency(summary.totalExpenses, shop?.currency)}
          </div>
        </div>
      </div>

      {/* Daily Performance Chart */}
      {dailyChartData.length > 0 && (
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-4">
            Daily Sales Revenue vs Gross Profit Trend
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dailyChartData}>
                <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(val: any) => [
                    formatCurrency(Number(val) || 0, shop?.currency),
                    '',
                  ]}
                />
                <Legend />
                <Bar dataKey="sales" name="Sales Revenue" fill="#0f172a" radius={[4, 4, 0, 0]} />
                <Bar dataKey="profit" name="Gross Profit" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Selected Report Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            {reportType === 'sales' && 'Itemized Sales Journal'}
            {reportType === 'pl' && 'Profit & Loss Line-by-Line Breakdown'}
            {reportType === 'inventory' && 'Inventory Valuation Schedule'}
            {reportType === 'tax' && 'VAT & Tax Compliance Ledger'}
          </h3>
          <span className="text-[11px] text-slate-400 font-mono">
            {dateRange.toUpperCase()} View
          </span>
        </div>

        <div className="overflow-x-auto">
          {reportType === 'sales' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Invoice #</th>
                  <th className="px-4 py-3 font-semibold">Date & Time</th>
                  <th className="px-4 py-3 font-semibold">Customer</th>
                  <th className="px-4 py-3 font-semibold">Payment</th>
                  <th className="px-4 py-3 font-semibold text-right">Subtotal</th>
                  <th className="px-4 py-3 font-semibold text-right">VAT</th>
                  <th className="px-4 py-3 font-semibold text-right">Total</th>
                  <th className="px-4 py-3 font-semibold text-right">Gross Profit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                      {s.invoiceNumber}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                      {formatDateTime(s.createdAt, shop?.timezone)}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{s.customerName || 'Walk-in'}</td>
                    <td className="px-4 py-2.5 text-slate-600 capitalize">{s.paymentMethod}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {formatCurrency(s.subtotal, shop?.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-slate-500">
                      {formatCurrency(s.taxTotal, shop?.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                      {formatCurrency(s.total, shop?.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-bold text-emerald-700">
                      {formatCurrency(s.grossProfit, shop?.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'pl' && (
            <div className="p-6 space-y-4 max-w-2xl text-xs">
              <div className="flex justify-between py-2 border-b border-slate-200">
                <span className="font-semibold text-slate-700">1. Gross Retail Sales</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(summary.totalSales, shop?.currency)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                <span>Less: Customer Discounts</span>
                <span className="font-mono text-red-600">
                  -{formatCurrency(summary.totalDiscounts, shop?.currency)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 bg-slate-50 px-2 rounded-lg">
                <span className="font-bold text-slate-900">2. Net Operating Revenue</span>
                <span className="font-mono font-bold text-slate-900">
                  {formatCurrency(summary.netRevenue, shop?.currency)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                <span>Less: Cost of Goods Sold (COGS - Weighted Average)</span>
                <span className="font-mono text-red-600">
                  -{formatCurrency(summary.totalCogs, shop?.currency)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-200 bg-emerald-50/60 px-2 rounded-lg">
                <span className="font-bold text-emerald-900">3. Gross Margin / Profit</span>
                <span className="font-mono font-bold text-emerald-700">
                  {formatCurrency(summary.grossProfit, shop?.currency)}
                </span>
              </div>
              <div className="flex justify-between py-2 border-b border-slate-100 text-slate-600">
                <span>Less: Total Store Operating Expenses</span>
                <span className="font-mono text-red-600">
                  -{formatCurrency(summary.totalExpenses, shop?.currency)}
                </span>
              </div>
              <div className="flex justify-between py-3 border-t-2 border-slate-900 bg-slate-900 text-white px-3 rounded-xl text-sm">
                <span className="font-bold">4. Final Net Operating Profit</span>
                <span className="font-mono font-bold">
                  {formatCurrency(summary.netProfit, shop?.currency)}
                </span>
              </div>
            </div>
          )}

          {reportType === 'inventory' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Product Name</th>
                  <th className="px-4 py-3 font-semibold">SKU / Barcode</th>
                  <th className="px-4 py-3 font-semibold">Category</th>
                  <th className="px-4 py-3 font-semibold text-right">Unit Cost</th>
                  <th className="px-4 py-3 font-semibold text-right">Retail Price</th>
                  <th className="px-4 py-3 font-semibold text-center">Stock</th>
                  <th className="px-4 py-3 font-semibold text-right">Total Cost Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-bold text-slate-900">{p.name}</td>
                    <td className="px-4 py-2.5 font-mono text-slate-500">
                      {p.sku} · {p.barcode}
                    </td>
                    <td className="px-4 py-2.5 text-slate-700">{p.category}</td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {formatCurrency(p.purchaseCost, shop?.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {formatCurrency(p.sellingPrice, shop?.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono font-bold">
                      {p.stock} {p.unit}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(p.stock * p.purchaseCost, shop?.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}

          {reportType === 'tax' && (
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-3 font-semibold">Invoice #</th>
                  <th className="px-4 py-3 font-semibold">Date</th>
                  <th className="px-4 py-3 font-semibold text-right">Net Taxable Revenue</th>
                  <th className="px-4 py-3 font-semibold text-center">Tax Rate</th>
                  <th className="px-4 py-3 font-semibold text-right">VAT Amount</th>
                  <th className="px-4 py-3 font-semibold text-right">Invoice Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredSales.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/70">
                    <td className="px-4 py-2.5 font-mono font-bold text-slate-900">
                      {s.invoiceNumber}
                    </td>
                    <td className="px-4 py-2.5 text-slate-500">
                      {formatDateTime(s.createdAt, shop?.timezone)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">
                      {formatCurrency(s.netRevenue, shop?.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-center font-mono">{shop?.defaultTaxRate}%</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-blue-600">
                      {formatCurrency(s.taxTotal, shop?.currency)}
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-900">
                      {formatCurrency(s.total, shop?.currency)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
