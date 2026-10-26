import React, { useState } from 'react';
import {
  Users,
  Plus,
  Search,
  CreditCard,
  DollarSign,
  Download,
  Phone,
  AlertCircle,
  FileText,
  Printer,
  History,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { formatCurrency, formatDateTime } from '../lib/i18n';
import { generatePartyPaymentReceiptPDF, exportToCSV } from '../lib/pdfGenerator';
import { Customer } from '../types';

export const CustomersCreditView: React.FC = () => {
  const { state, currentUser, apiRequest, refreshState, recordPartyPayment } = useShop();

  const shop = state?.shop;
  const customers = state?.customers || [];
  const sales = state?.sales || [];

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [showPaymentModal, setShowPaymentModal] = useState<Customer | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [vatNumber, setVatNumber] = useState('');
  const [creditLimit, setCreditLimit] = useState('1000');

  // Payment Form State
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [paymentNotes, setPaymentNotes] = useState('Due credit settlement');

  const filteredCustomers = customers.filter(
    (c) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.toLowerCase().includes(search.toLowerCase())
  );

  const handleOpenAdd = () => {
    setEditingCustomer(null);
    setName('');
    setPhone('');
    setAddress('');
    setVatNumber('');
    setCreditLimit('1000');
    setShowAddModal(true);
  };

  const handleOpenEdit = (c: Customer) => {
    setEditingCustomer(c);
    setName(c.name);
    setPhone(c.phone);
    setAddress(c.address || '');
    setVatNumber(c.vatNumber || '');
    setCreditLimit(String(c.creditLimit));
    setShowAddModal(true);
  };

  const handleSaveCustomer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !phone.trim()) {
      alert('Customer name and phone number are required');
      return;
    }

    const payload = {
      name: name.trim(),
      phone: phone.trim(),
      address: address.trim(),
      vatNumber: vatNumber.trim() || undefined,
      creditLimit: Math.max(0, parseFloat(creditLimit) || 0),
    };

    try {
      setIsSubmitting(true);
      if (editingCustomer) {
        await apiRequest(`/customers/${editingCustomer.id}`, 'PUT', payload);
      } else {
        await apiRequest('/customers', 'POST', payload);
      }
      await refreshState();
      setShowAddModal(false);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to save customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;
    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) {
      alert('Enter a valid payment amount');
      return;
    }

    try {
      setIsSubmitting(true);
      const record = await recordPartyPayment({
        partyType: 'customer',
        partyId: showPaymentModal.id,
        amount: amt,
        paymentMethod,
        notes: paymentNotes,
      });

      if (shop) {
        generatePartyPaymentReceiptPDF(record, shop);
      }

      setShowPaymentModal(null);
      setPaymentAmount('');
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to post payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleExportCSV = () => {
    const headers = [
      'Customer Name',
      'Phone',
      'Outstanding Balance',
      'Credit Limit',
      'Total Spent',
      'Loyalty Points',
    ];
    const rows = filteredCustomers.map((c) => [
      c.name,
      c.phone,
      c.outstandingBalance,
      c.creditLimit,
      c.totalSpent,
      c.loyaltyPoints,
    ]);
    exportToCSV('Customer-Accounts-Ledger', headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Customers & Due Accounts
          </h1>
          <p className="text-xs text-slate-500">
            Manage credit sales ledger, limits, repayments, and official payment receipts
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
          <button
            type="button"
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      {/* Customer Cards & Search */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search by customer name or phone..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-400">{filteredCustomers.length} Customers</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">Customer</th>
                <th className="px-4 py-3 font-semibold">Phone & Address</th>
                <th className="px-4 py-3 font-semibold text-right">Outstanding Due</th>
                <th className="px-4 py-3 font-semibold text-right">Credit Limit</th>
                <th className="px-4 py-3 font-semibold text-right">Total Spent</th>
                <th className="px-4 py-3 font-semibold text-center">Loyalty Points</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredCustomers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Users className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <div className="text-xs font-semibold">No customers found</div>
                    <div className="text-[11px] text-slate-400">Add regular customers to offer credit ledger accounts</div>
                  </td>
                </tr>
              ) : (
                filteredCustomers.map((c) => {
                  const hasDue = c.outstandingBalance > 0;
                  return (
                    <tr key={c.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{c.name}</div>
                        {c.vatNumber && (
                          <div className="text-[10px] text-slate-400">VAT: {c.vatNumber}</div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700 font-mono">{c.phone}</div>
                        <div className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {c.address || '—'}
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <span
                          className={`font-mono font-bold ${
                            hasDue ? 'text-red-600' : 'text-slate-600'
                          }`}
                        >
                          {formatCurrency(c.outstandingBalance, shop?.currency)}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-600">
                        {formatCurrency(c.creditLimit, shop?.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-slate-800">
                        {formatCurrency(c.totalSpent, shop?.currency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 font-mono font-semibold text-[10px]">
                          {c.loyaltyPoints} pts
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasDue && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowPaymentModal(c);
                                setPaymentAmount(String(c.outstandingBalance));
                              }}
                              className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-xs"
                            >
                              Receive Payment
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(c)}
                            className="px-2 py-1 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-100 text-[11px]"
                          >
                            Edit
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              {editingCustomer ? 'Edit Customer' : 'Add New Customer'}
            </h3>
            <form onSubmit={handleSaveCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Customer Full Name *</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Mohammed Al-Otaibi"
                  className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Mobile Number *</label>
                <input
                  type="text"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+966 55 987 6543"
                  className="w-full p-2 border border-slate-200 rounded-xl font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Delivery Address</label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="Street / District / City"
                  className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">VAT Number (Optional)</label>
                <input
                  type="text"
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  placeholder="300XXXXXXXXXXXX"
                  className="w-full p-2 border border-slate-200 rounded-xl font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Credit Limit ({shop?.currency})
                </label>
                <input
                  type="number"
                  step="50"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl font-mono focus:outline-none"
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
                  {isSubmitting ? 'Saving...' : editingCustomer ? 'Update' : 'Create Customer'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Customer Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              Receive Due Repayment from {showPaymentModal.name}
            </h3>
            <p className="text-xs text-slate-500">
              Current Outstanding Balance:{' '}
              <span className="font-bold text-red-600 font-mono">
                {formatCurrency(showPaymentModal.outstandingBalance, shop?.currency)}
              </span>
            </p>

            <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Amount Received ({shop?.currency}) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  required
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
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
                  <option value="cash">Cash Tendered</option>
                  <option value="card">Mada / Credit Card POS</option>
                  <option value="bank_transfer">Bank Wire</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Receipt Notes</label>
                <input
                  type="text"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowPaymentModal(null)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 flex items-center gap-1.5"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Post & Download Receipt PDF
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
