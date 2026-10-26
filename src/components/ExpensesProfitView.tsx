import React, { useState, useMemo } from 'react';
import {
  Wallet,
  Plus,
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Download,
  Trash2,
  PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { useShop } from '../context/ShopContext';
import { formatCurrency, formatDateTime } from '../lib/i18n';
import { exportToCSV } from '../lib/pdfGenerator';
import { Expense } from '../types';

const CATEGORY_COLORS: Record<string, string> = {
  Rent: '#3b82f6',
  Electricity: '#f59e0b',
  Salaries: '#10b981',
  Transport: '#8b5cf6',
  Maintenance: '#ec4899',
  Marketing: '#06b6d4',
  Supplies: '#64748b',
  Other: '#94a3b8',
};

export const ExpensesProfitView: React.FC = () => {
  const { state, currentUser, apiRequest, refreshState } = useShop();

  const shop = state?.shop;
  const expenses = state?.expenses || [];
  const sales = state?.sales || [];

  const [showAddModal, setShowAddModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('all');

  // Form
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<Expense['category']>('Rent');
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [referenceNote, setReferenceNote] = useState('');

  // Calculate Net Profit & Financials
  const financials = useMemo(() => {
    let grossSales = 0;
    let netRevenue = 0;
    let cogs = 0;
    let taxCollected = 0;

    for (const sale of sales) {
      if (sale.status === 'completed' || sale.status === 'partial_refund') {
        grossSales += sale.total;
        netRevenue += sale.netRevenue;
        cogs += sale.totalCost;
        taxCollected += sale.taxTotal;
      }
    }

    const grossProfit = netRevenue - cogs;
    const totalExpenses = expenses.reduce((sum, e) => sum + e.amount, 0);
    const netProfit = grossProfit - totalExpenses;
    const netMarginPercent =
      netRevenue > 0 ? Math.round((netProfit / netRevenue) * 100) : 0;

    return {
      grossSales,
      netRevenue,
      cogs,
      taxCollected,
      grossProfit,
      totalExpenses,
      netProfit,
      netMarginPercent,
    };
  }, [sales, expenses]);

  // Expenses by category for PieChart
  const categoryData = useMemo(() => {
    const map: Record<string, number> = {};
    for (const exp of expenses) {
      map[exp.category] = (map[exp.category] || 0) + exp.amount;
    }
    return Object.entries(map).map(([name, value]) => ({
      name,
      value,
    }));
  }, [expenses]);

  const filteredExpenses = useMemo(() => {
    if (filterCategory === 'all') return expenses;
    return expenses.filter((e) => e.category === filterCategory);
  }, [expenses, filterCategory]);

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(amount) || 0;
    if (amt <= 0 || !title.trim()) {
      alert('Please enter a valid title and amount');
      return;
    }

    try {
      setIsSubmitting(true);
      await apiRequest('/expenses', 'POST', {
        title: title.trim(),
        category,
        amount: amt,
        paymentMethod,
        referenceNote,
        expenseDate: new Date().toISOString(),
      });
      await refreshState();
      setShowAddModal(false);
      setTitle('');
      setAmount('');
      setReferenceNote('');
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to save expense');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await apiRequest(`/expenses/${id}`, 'DELETE');
      await refreshState();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to delete expense');
    }
  };

  const handleExportCSV = () => {
    const headers = ['Date', 'Title', 'Category', 'Amount', 'Payment Method', 'Notes', 'Created By'];
    const rows = filteredExpenses.map((e) => [
      formatDateTime(e.expenseDate, shop?.timezone),
      e.title,
      e.category,
      e.amount,
      e.paymentMethod.toUpperCase(),
      e.referenceNote || '—',
      e.createdByName,
    ]);
    exportToCSV('Operating-Expenses', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Expenses & Net Profit
          </h1>
          <p className="text-xs text-slate-500">
            Track operational store overheads, P&L calculations, and bottom-line margins
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            Export CSV
          </button>
          {currentUser?.role !== 'cashier' && (
            <button
              type="button"
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Expense
            </button>
          )}
        </div>
      </div>

      {/* P&L Financial Highlights */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Net Sales Revenue
          </div>
          <div className="text-xl font-bold text-slate-900 mt-1 font-mono">
            {formatCurrency(financials.netRevenue, shop?.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Excluding discounts & VAT</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Cost of Goods Sold (COGS)
          </div>
          <div className="text-xl font-bold text-slate-700 mt-1 font-mono">
            {formatCurrency(financials.cogs, shop?.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">Weighted average cost basis</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Operating Expenses
          </div>
          <div className="text-xl font-bold text-red-600 mt-1 font-mono">
            {formatCurrency(financials.totalExpenses, shop?.currency)}
          </div>
          <div className="text-[11px] text-slate-400 mt-0.5">{expenses.length} expense items</div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Net Operating Profit
          </div>
          <div
            className={`text-xl font-bold mt-1 font-mono ${
              financials.netProfit >= 0 ? 'text-emerald-700' : 'text-red-600'
            }`}
          >
            {formatCurrency(financials.netProfit, shop?.currency)}
          </div>
          <div className="text-[11px] font-semibold text-emerald-600 mt-0.5">
            {financials.netMarginPercent}% net margin
          </div>
        </div>
      </div>

      {/* Chart Section */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        {/* Category Breakdown */}
        <div className="md:col-span-5 bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            Expense Allocation
          </h3>
          {categoryData.length === 0 ? (
            <div className="h-48 flex items-center justify-center text-xs text-slate-400">
              No expenses recorded
            </div>
          ) : (
            <div className="h-48">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={75}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry) => (
                      <Cell
                        key={entry.name}
                        fill={CATEGORY_COLORS[entry.name] || '#94a3b8'}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: any) => [
                      formatCurrency(Number(val) || 0, shop?.currency),
                      'Spent',
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-100 text-[10px]">
            {categoryData.map((c) => (
              <span key={c.name} className="flex items-center gap-1 text-slate-600">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: CATEGORY_COLORS[c.name] || '#94a3b8' }}
                />
                {c.name} ({formatCurrency(c.value, shop?.currency)})
              </span>
            ))}
          </div>
        </div>

        {/* Expenses Table */}
        <div className="md:col-span-7 bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden flex flex-col justify-between">
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Expense Log
            </h3>
            <select
              value={filterCategory}
              onChange={(e) => setFilterCategory(e.target.value)}
              className="text-xs py-1 px-2 rounded-lg border border-slate-200 bg-white"
            >
              <option value="all">All Categories</option>
              {[
                'Rent',
                'Electricity',
                'Salaries',
                'Transport',
                'Maintenance',
                'Marketing',
                'Supplies',
                'Other',
              ].map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>

          <div className="flex-1 overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                <tr>
                  <th className="px-4 py-2.5 font-semibold">Date</th>
                  <th className="px-4 py-2.5 font-semibold">Expense</th>
                  <th className="px-4 py-2.5 font-semibold">Category</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Amount</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredExpenses.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      No expenses in this filter
                    </td>
                  </tr>
                ) : (
                  filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/60">
                      <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                        {formatDateTime(exp.expenseDate, shop?.timezone)}
                      </td>
                      <td className="px-4 py-2.5">
                        <div className="font-semibold text-slate-900">{exp.title}</div>
                        {exp.referenceNote && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[160px]">
                            {exp.referenceNote}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-2.5">
                        <span
                          className="inline-block px-2 py-0.5 rounded text-[10px] font-semibold"
                          style={{
                            backgroundColor: `${CATEGORY_COLORS[exp.category] || '#94a3b8'}20`,
                            color: CATEGORY_COLORS[exp.category] || '#475569',
                          }}
                        >
                          {exp.category}
                        </span>
                      </td>
                      <td className="px-4 py-2.5 text-right font-bold font-mono text-slate-900">
                        {formatCurrency(exp.amount, shop?.currency)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {currentUser?.role !== 'cashier' && (
                          <button
                            type="button"
                            onClick={() => handleDeleteExpense(exp.id)}
                            className="p-1 text-slate-400 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Add Expense Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Add Store Expense</h3>
            <form onSubmit={handleSaveExpense} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Expense Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Store AC Maintenance & Freon Gas"
                  className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as Expense['category'])}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                >
                  {[
                    'Rent',
                    'Electricity',
                    'Salaries',
                    'Transport',
                    'Maintenance',
                    'Marketing',
                    'Supplies',
                    'Other',
                  ].map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Amount ({shop?.currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full p-2 border border-slate-200 rounded-xl font-mono text-xs focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as 'cash' | 'card' | 'bank_transfer')
                  }
                  className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                >
                  <option value="cash">Cash from Register</option>
                  <option value="card">Company Debit Card</option>
                  <option value="bank_transfer">Bank Wire</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reference Notes</label>
                <input
                  type="text"
                  value={referenceNote}
                  onChange={(e) => setReferenceNote(e.target.value)}
                  placeholder="Receipt / Voucher #204"
                  className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  {isSubmitting ? 'Saving...' : 'Post Expense'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
