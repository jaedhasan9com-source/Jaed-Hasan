import React, { useMemo, useState } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import {
  ScanBarcode,
  ShoppingCart,
  PackagePlus,
  Truck,
  BarChart3,
  AlertTriangle,
  PackageX,
  ArrowUpRight,
  Database,
  Smartphone,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { calculateProfitSummary, roundCurrency } from '../lib/calculations';
import { formatCurrency, formatDateTime, t } from '../lib/i18n';

export const DashboardView: React.FC = () => {
  const { state, setActiveTab, language, currentUser, resetStoreDataMode, setShowApkModal } = useShop();
  const [chartDays, setChartDays] = useState<7 | 30>(7);
  const [togglingDemo, setTogglingDemo] = useState(false);

  if (!state) return null;
  const { shop, products, sales, purchases, expenses } = state;

  const todayPrefix = new Date().toISOString().slice(0, 10);

  const todaySales = useMemo(
    () => sales.filter((s) => s.createdAt.slice(0, 10) === todayPrefix),
    [sales, todayPrefix]
  );

  const todayExpenses = useMemo(
    () => expenses.filter((e) => e.expenseDate === todayPrefix),
    [expenses, todayPrefix]
  );

  const todayMetrics = useMemo(
    () => calculateProfitSummary(todaySales, todayExpenses),
    [todaySales, todayExpenses]
  );

  const allTimeMetrics = useMemo(
    () => calculateProfitSummary(sales, expenses),
    [sales, expenses]
  );

  const totalStockUnits = useMemo(
    () => products.reduce((sum, p) => sum + Math.max(0, p.stock), 0),
    [products]
  );

  const lowStockProducts = useMemo(
    () => products.filter((p) => p.stock > 0 && p.stock <= p.minStockThreshold),
    [products]
  );

  const outOfStockProducts = useMemo(
    () => products.filter((p) => p.stock <= 0),
    [products]
  );

  const chartData = useMemo(() => {
    const days: { date: string; label: string; sales: number; profit: number }[] = [];
    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    for (let i = chartDays - 1; i >= 0; i--) {
      const d = new Date(now.getTime() - i * dayMs);
      const isoDate = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

      const daySales = sales.filter(
        (s) => s.createdAt.slice(0, 10) === isoDate && s.status !== 'voided' && s.status !== 'refunded'
      );

      const dayRevenue = roundCurrency(
        daySales.reduce((acc, s) => acc + (s.total - s.refundedAmount), 0)
      );
      const dayProfit = roundCurrency(
        daySales.reduce((acc, s) => acc + s.grossProfit, 0)
      );

      days.push({
        date: isoDate,
        label,
        sales: dayRevenue,
        profit: dayProfit,
      });
    }
    return days;
  }, [sales, chartDays]);

  const bestSellers = useMemo(() => {
    const map = new Map<
      string,
      { id: string; name: string; sku: string; qtySold: number; revenue: number; profit: number }
    >();

    for (const sale of sales) {
      if (sale.status === 'voided' || sale.status === 'refunded') continue;
      for (const item of sale.items) {
        const existing = map.get(item.productId) || {
          id: item.productId,
          name: item.productName,
          sku: item.sku,
          qtySold: 0,
          revenue: 0,
          profit: 0,
        };
        existing.qtySold += item.quantity;
        existing.revenue = roundCurrency(existing.revenue + item.lineTotal);
        existing.profit = roundCurrency(
          existing.profit + (item.netLineAmount - item.quantity * item.unitCost)
        );
        map.set(item.productId, existing);
      }
    }

    return Array.from(map.values())
      .sort((a, b) => b.qtySold - a.qtySold)
      .slice(0, 5);
  }, [sales]);

  const handleToggleDemoMode = async (loadDemo: boolean) => {
    setTogglingDemo(true);
    try {
      await resetStoreDataMode(loadDemo);
    } finally {
      setTogglingDemo(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Android Mobile / APK Alert Banner */}
      <div className="rounded-2xl bg-gradient-to-r from-emerald-900 to-slate-900 text-white p-4 border border-emerald-700/50 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-white">
              {language === 'bn' ? 'অ্যান্ড্রয়েড ফোন বা ট্যাবলেটে অ্যাপ ইনস্টল করুন' : 'Install SmartShop Pro on Android Phone or Tablet'}
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-300">
              {language === 'bn'
                ? 'ফোনে কোনো APK ছাড়াই সরাসরি Chrome থেকে ফুল-স্ক্রিন অ্যাপ হিসেবে ইনস্টল করা যায়, অথবা PWABuilder দিয়ে APK তৈরি করা যায়।'
                : 'Install directly from your Android browser as a fullscreen app, or generate a standalone APK.'}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowApkModal(true)}
          className="px-4 py-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs transition whitespace-nowrap shadow-sm"
        >
          {language === 'bn' ? 'ইনস্টল ও APK গাইড দেখুন' : 'View Install & APK Guide'}
        </button>
      </div>

      {shop.isDemoData && (
        <div className="rounded-xl bg-slate-900 text-slate-200 px-4 py-3 flex flex-wrap items-center justify-between gap-3 border border-slate-800">
          <div className="flex items-center gap-2.5 text-xs">
            <Database className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              <strong className="text-white">Sample Retail Dataset Active:</strong> All figures below are dynamically calculated from the saved database.
            </span>
          </div>
          {currentUser?.role === 'owner' && (
            <button
              type="button"
              disabled={togglingDemo}
              onClick={() => handleToggleDemoMode(false)}
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors whitespace-nowrap shrink-0"
            >
              {togglingDemo ? 'Resetting...' : 'Clear Sample Data (Start Blank)'}
            </button>
          )}
        </div>
      )}

      {/* Quick Actions Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
        <button
          type="button"
          onClick={() => setActiveTab('scanner')}
          className="flex items-center justify-center gap-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3.5 text-xs sm:text-sm font-semibold shadow-xs transition-colors min-h-[48px]"
        >
          <ScanBarcode className="w-4 h-4 shrink-0" />
          <span className="truncate">{t(language, 'scanBarcode')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('pos')}
          className="flex items-center justify-center gap-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-4 py-3.5 text-xs sm:text-sm font-semibold shadow-xs transition-colors min-h-[48px]"
        >
          <ShoppingCart className="w-4 h-4 shrink-0" />
          <span className="truncate">{t(language, 'newSale')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('products')}
          className="flex items-center justify-center gap-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-4 py-3.5 text-xs sm:text-sm font-semibold transition-colors min-h-[48px]"
        >
          <PackagePlus className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="truncate">{t(language, 'addProduct')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('purchases')}
          className="flex items-center justify-center gap-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-4 py-3.5 text-xs sm:text-sm font-semibold transition-colors min-h-[48px]"
        >
          <Truck className="w-4 h-4 text-slate-600 shrink-0" />
          <span className="truncate">{t(language, 'addPurchase')}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('reports')}
          className="col-span-2 sm:col-span-1 flex items-center justify-center gap-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 px-4 py-3.5 text-xs sm:text-sm font-semibold transition-colors min-h-[48px]"
        >
          <BarChart3 className="w-4 h-4 text-slate-600 shrink-0" />
          <span className="truncate">{t(language, 'viewReports')}</span>
        </button>
      </div>

      {/* Primary KPI Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white p-5 border border-slate-200">
          <div className="text-xs font-medium text-slate-500">{t(language, 'todaySales')}</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {formatCurrency(todayMetrics.grossSalesIncludingTax, shop.currency)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>{todayMetrics.transactionCount} transactions</span>
            <span className="mx-1.5">·</span>
            <span>All-time: {formatCurrency(allTimeMetrics.grossSalesIncludingTax, shop.currency)}</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200">
          <div className="text-xs font-medium text-slate-500">{t(language, 'todayGrossProfit')}</div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {formatCurrency(todayMetrics.grossProfit, shop.currency)}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>Net: {formatCurrency(todayMetrics.operatingNetProfit, shop.currency)}</span>
            <span className="mx-1.5">·</span>
            <span>Excl. VAT</span>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200">
          <div className="text-xs font-medium text-slate-500">{t(language, 'totalProducts')}</div>
          <div className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {products.length}
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <span>{t(language, 'totalStockUnits')}: </span>
            <strong className="font-mono text-slate-700">{totalStockUnits}</strong>
          </div>
        </div>

        <div className="rounded-2xl bg-white p-5 border border-slate-200">
          <div className="text-xs font-medium text-slate-500">Inventory Health Alerts</div>
          <div className="mt-2 flex items-baseline gap-4 font-mono tabular-nums">
            <div>
              <span className="text-2xl font-bold text-amber-600">{lowStockProducts.length}</span>
              <span className="ml-1 text-xs text-slate-500">Low</span>
            </div>
            <div>
              <span className="text-2xl font-bold text-red-600">{outOfStockProducts.length}</span>
              <span className="ml-1 text-xs text-slate-500">Out</span>
            </div>
          </div>
          <div className="mt-2 text-xs text-slate-500">
            <button
              type="button"
              onClick={() => setActiveTab('inventory')}
              className="text-slate-900 font-medium hover:underline inline-flex items-center gap-1"
            >
              <span>Review stock ledger</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Charts & Best Sellers Row */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-8 rounded-2xl bg-white p-5 sm:p-6 border border-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <h2 className="text-base font-bold text-slate-900">{t(language, 'salesTrend')}</h2>
              <p className="text-xs text-slate-500">
                Revenue vs Gross Profit ({shop.currency}) from completed invoices
              </p>
            </div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-lg">
              <button
                type="button"
                onClick={() => setChartDays(7)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartDays === 7
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(language, 'last7Days')}
              </button>
              <button
                type="button"
                onClick={() => setChartDays(30)}
                className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${
                  chartDays === 30
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {t(language, 'last30Days')}
              </button>
            </div>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="salesGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0f172a" stopOpacity={0.22} />
                    <stop offset="95%" stopColor="#0f172a" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.28} />
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tick={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: '12px',
                    borderColor: '#e2e8f0',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="sales"
                  name={`Sales (${shop.currency})`}
                  stroke="#0f172a"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#salesGrad)"
                />
                <Area
                  type="monotone"
                  dataKey="profit"
                  name={`Gross Profit (${shop.currency})`}
                  stroke="#10b981"
                  strokeWidth={2}
                  fillOpacity={1}
                  fill="url(#profitGrad)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Best Selling Products */}
        <div className="lg:col-span-4 rounded-2xl bg-white p-5 sm:p-6 border border-slate-200 flex flex-col justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 mb-1">
              {t(language, 'bestSellingProducts')}
            </h2>
            <p className="text-xs text-slate-500 mb-4">Ranked by units sold</p>

            {bestSellers.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-400">
                No completed sales yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {bestSellers.map((item, idx) => (
                  <div key={item.id} className="py-3 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-semibold text-slate-900 truncate">
                        {idx + 1}. {item.name}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono">
                        SKU: {item.sku} · {item.qtySold} sold
                      </div>
                    </div>
                    <div className="text-right shrink-0 font-mono tabular-nums">
                      <div className="text-xs font-bold text-slate-900">
                        {formatCurrency(item.revenue, shop.currency)}
                      </div>
                      <div className="text-[11px] text-emerald-700">
                        +{formatCurrency(item.profit, shop.currency)} profit
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setActiveTab('reports')}
            className="mt-4 w-full py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            Open Full Product Sales Report
          </button>
        </div>
      </div>
    </div>
  );
};
