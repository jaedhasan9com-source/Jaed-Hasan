import React, { useState, useMemo } from 'react';
import {
  Boxes,
  PlusCircle,
  AlertTriangle,
  ArrowDownUp,
  Download,
  Search,
  TrendingDown,
  DollarSign,
  Package,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { formatCurrency, formatDateTime } from '../lib/i18n';
import { exportToCSV } from '../lib/pdfGenerator';
import { StockMovementType } from '../types';

export const InventoryView: React.FC = () => {
  const { state, currentUser, apiRequest, refreshState } = useShop();

  const shop = state?.shop;
  const products = state?.products || [];
  const movements = state?.stockMovements || [];

  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [showAdjustModal, setShowAdjustModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Adjustment Form
  const [selectedProductId, setSelectedProductId] = useState('');
  const [adjustType, setAdjustType] = useState<StockMovementType>('adjustment');
  const [quantityChange, setQuantityChange] = useState<string>('1');
  const [adjustReason, setAdjustReason] = useState('Physical stock count audit');

  // Inventory Valuation Metrics
  const metrics = useMemo(() => {
    let totalUnits = 0;
    let totalCostValue = 0;
    let totalRetailValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;

    for (const p of products) {
      totalUnits += p.stock;
      totalCostValue += p.stock * p.purchaseCost;
      totalRetailValue += p.stock * p.sellingPrice;
      if (p.stock <= 0) outOfStockCount++;
      else if (p.stock <= p.minStockThreshold) lowStockCount++;
    }

    const potentialMargin =
      totalRetailValue > 0
        ? Math.round(((totalRetailValue - totalCostValue) / totalRetailValue) * 100)
        : 0;

    return {
      totalUnits,
      totalCostValue,
      totalRetailValue,
      potentialMargin,
      lowStockCount,
      outOfStockCount,
    };
  }, [products]);

  // Filtered movements
  const filteredMovements = useMemo(() => {
    return movements.filter((m) => {
      const matchSearch =
        m.productName.toLowerCase().includes(search.toLowerCase()) ||
        m.sku.toLowerCase().includes(search.toLowerCase()) ||
        m.reason.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === 'all' || m.type === typeFilter;
      return matchSearch && matchType;
    });
  }, [movements, search, typeFilter]);

  const handleAdjustStock = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      alert('Please select a product');
      return;
    }

    const prod = products.find((p) => p.id === selectedProductId);
    if (!prod) return;

    const change = parseInt(quantityChange) || 0;
    if (change === 0) {
      alert('Quantity change cannot be 0');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiRequest('/inventory/adjust', 'POST', {
        productId: prod.id,
        type: adjustType,
        quantityChange: change,
        reason: adjustReason,
      });
      await refreshState();
      setShowAdjustModal(false);
      setQuantityChange('1');
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to adjust stock');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Product', 'SKU', 'Type', 'Quantity Change', 'New Stock', 'Reason', 'User'];
    const rows = filteredMovements.map((m) => [
      formatDateTime(m.createdAt, shop?.timezone),
      m.productName,
      m.sku,
      m.type.toUpperCase(),
      m.quantityChange > 0 ? `+${m.quantityChange}` : m.quantityChange,
      m.newStock,
      m.reason,
      m.createdByName,
    ]);
    exportToCSV('Inventory-Movements', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Inventory Ledger</h1>
          <p className="text-xs text-slate-500">
            Real-time stock valuation, audit counts, damages, and automated movement ledger
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export Ledger CSV
          </button>
          {currentUser?.role !== 'cashier' && (
            <button
              type="button"
              onClick={() => {
                setSelectedProductId(products[0]?.id || '');
                setShowAdjustModal(true);
              }}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <PlusCircle className="w-4 h-4" />
              Adjust Stock
            </button>
          )}
        </div>
      </div>

      {/* Valuation KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Total Stock Units
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {metrics.totalUnits.toLocaleString()}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Across {products.length} SKUs</div>
        </div>

        {currentUser?.role !== 'cashier' && (
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Cost Valuation (Asset)
            </div>
            <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
              {formatCurrency(metrics.totalCostValue, shop?.currency)}
            </div>
            <div className="text-[11px] text-slate-400 mt-0.5">Weighted Average Cost basis</div>
          </div>
        )}

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Retail Valuation
          </div>
          <div className="text-xl font-bold text-emerald-700 mt-1 font-mono">
            {formatCurrency(metrics.totalRetailValue, shop?.currency)}
          </div>
          <div className="text-[11px] text-emerald-600 font-semibold mt-0.5">
            ~{metrics.potentialMargin}% potential gross margin
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Alerts & Thresholds
          </div>
          <div className="flex items-center gap-3 mt-1">
            <span className="text-base font-bold text-amber-600">
              {metrics.lowStockCount} Low
            </span>
            <span className="text-slate-300">|</span>
            <span className="text-base font-bold text-red-600">
              {metrics.outOfStockCount} Out
            </span>
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Requires replenishment</div>
        </div>
      </div>

      {/* Movements Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by product, SKU, or audit reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          {['all', 'sale', 'purchase', 'adjustment', 'damage', 'return'].map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setTypeFilter(type)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize whitespace-nowrap transition-colors ${
                typeFilter === type
                  ? 'bg-slate-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {type}
            </button>
          ))}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Date & Time</th>
                <th className="px-4 py-3 font-semibold">Product & SKU</th>
                <th className="px-4 py-3 font-semibold">Type</th>
                <th className="px-4 py-3 font-semibold text-center">Change</th>
                <th className="px-4 py-3 font-semibold text-center">Balance Stock</th>
                <th className="px-4 py-3 font-semibold">Reason / Audit Trail</th>
                <th className="px-4 py-3 font-semibold text-right">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Boxes className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <div className="text-xs font-semibold">No stock movements recorded</div>
                    <div className="text-[11px] text-slate-400">Sales and purchases will log entries here automatically</div>
                  </td>
                </tr>
              ) : (
                filteredMovements.map((m) => {
                  const isPositive = m.quantityChange > 0;
                  return (
                    <tr key={m.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 whitespace-nowrap text-slate-500">
                        {formatDateTime(m.createdAt, shop?.timezone)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900">{m.productName}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.sku}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            m.type === 'purchase' || m.type === 'return'
                              ? 'bg-emerald-50 text-emerald-700'
                              : m.type === 'sale'
                              ? 'bg-blue-50 text-blue-700'
                              : m.type === 'damage'
                              ? 'bg-red-50 text-red-700'
                              : 'bg-purple-50 text-purple-700'
                          }`}
                        >
                          {m.type}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-bold">
                        <span className={isPositive ? 'text-emerald-600' : 'text-red-600'}>
                          {isPositive ? `+${m.quantityChange}` : m.quantityChange}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center font-mono font-semibold text-slate-800">
                        {m.newStock}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-[200px] truncate" title={m.reason}>
                        {m.reason}
                      </td>
                      <td className="px-4 py-3 text-right text-slate-500 truncate">{m.createdByName}</td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Manual Stock Adjustment Modal */}
      {showAdjustModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Adjust Inventory Units</h3>
            <p className="text-xs text-slate-500">
              Manually alter inventory on-hand count for damages, theft, or periodic physical inventory count.
            </p>

            <form onSubmit={handleAdjustStock} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Select Product *</label>
                <select
                  required
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} (Current Stock: {p.stock} {p.unit})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Adjustment Type</label>
                <select
                  value={adjustType}
                  onChange={(e) => setAdjustType(e.target.value as StockMovementType)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                >
                  <option value="adjustment">Stock Adjustment (Audit Count)</option>
                  <option value="damage">Damage / Expired Write-off</option>
                  <option value="return">Customer / Supplier Return</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Quantity Change (use negative for reductions) *
                </label>
                <input
                  type="number"
                  required
                  value={quantityChange}
                  onChange={(e) => setQuantityChange(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none"
                  placeholder="e.g. -2 for 2 damaged units, +5 for count discrepancy"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason / Notes *</label>
                <textarea
                  required
                  rows={2}
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAdjustModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                >
                  {isSubmitting ? 'Posting...' : 'Commit Adjustment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
