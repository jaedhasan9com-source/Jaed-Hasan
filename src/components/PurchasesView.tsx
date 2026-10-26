import React, { useState } from 'react';
import {
  Truck,
  Plus,
  CheckCircle,
  Clock,
  Printer,
  Search,
  DollarSign,
  Trash2,
  FileText,
  AlertCircle,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { formatCurrency, formatDateTime } from '../lib/i18n';
import { generatePartyPaymentReceiptPDF } from '../lib/pdfGenerator';
import { Purchase, PurchaseItem } from '../types';

export const PurchasesView: React.FC = () => {
  const {
    state,
    currentUser,
    apiRequest,
    refreshState,
    createPurchaseOrder,
    receivePurchaseOrder,
    recordPartyPayment,
  } = useShop();

  const shop = state?.shop;
  const purchases = state?.purchases || [];
  const suppliers = state?.suppliers || [];
  const products = state?.products || [];

  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // New PO form state
  const [supplierId, setSupplierId] = useState('');
  const [invoiceRef, setInvoiceRef] = useState('');
  const [poNotes, setPoNotes] = useState('');
  const [poItems, setPoItems] = useState<
    {
      productId: string;
      quantity: number;
      unitCost: number;
      taxRate: number;
      discount: number;
      batchNumber?: string;
      expiryDate?: string;
    }[]
  >([]);
  const [amountPaid, setAmountPaid] = useState<string>('0');
  const [poPaymentMethod, setPoPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer' | 'credit'>(
    'credit'
  );

  // Supplier Quick Add state
  const [newSupplierName, setNewSupplierName] = useState('');
  const [newSupplierPhone, setNewSupplierPhone] = useState('');
  const [newSupplierAddress, setNewSupplierAddress] = useState('');

  // Payment form state
  const [paymentAmount, setPaymentAmount] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('bank_transfer');
  const [paymentNotes, setPaymentNotes] = useState('Supplier invoice settlement');

  const filteredPurchases = purchases.filter(
    (p) =>
      p.purchaseNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.supplierName.toLowerCase().includes(search.toLowerCase()) ||
      (p.supplierInvoiceRef && p.supplierInvoiceRef.toLowerCase().includes(search.toLowerCase()))
  );

  const handleAddItemToPO = (productId: string) => {
    const prod = products.find((p) => p.id === productId);
    if (!prod) return;
    setPoItems((prev) => [
      ...prev,
      {
        productId: prod.id,
        quantity: 10,
        unitCost: prod.purchaseCost,
        taxRate: shop?.defaultTaxRate ?? 15,
        discount: 0,
      },
    ]);
  };

  const handleUpdateItem = (
    index: number,
    field: string,
    value: string | number
  ) => {
    setPoItems((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleRemoveItem = (index: number) => {
    setPoItems((prev) => prev.filter((_, i) => i !== index));
  };

  // PO Totals
  const poCalculations = React.useMemo(() => {
    let subtotal = 0;
    let taxTotal = 0;
    let discountTotal = 0;

    for (const item of poItems) {
      const lineCost = item.quantity * item.unitCost;
      const disc = item.discount || 0;
      const net = Math.max(0, lineCost - disc);
      const tax = (net * (item.taxRate || 0)) / 100;
      subtotal += lineCost;
      discountTotal += disc;
      taxTotal += tax;
    }

    const total = subtotal - discountTotal + taxTotal;
    return { subtotal, discountTotal, taxTotal, total };
  }, [poItems]);

  const handleSavePO = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supplierId) {
      alert('Please select a supplier');
      return;
    }
    if (poItems.length === 0) {
      alert('Add at least one product item to this purchase order');
      return;
    }

    const matchedSupplier = suppliers.find((s) => s.id === supplierId);

    const itemsPayload = poItems.map((item) => {
      const prod = products.find((p) => p.id === item.productId);
      const lineCost = item.quantity * item.unitCost;
      const lineTotal = lineCost - (item.discount || 0);
      const taxAmount = (lineTotal * (item.taxRate || 0)) / 100;

      return {
        productId: item.productId,
        productName: prod?.name || 'Product',
        sku: prod?.sku || 'SKU',
        quantity: item.quantity,
        unitCost: item.unitCost,
        discount: item.discount,
        taxRate: item.taxRate,
        taxAmount,
        lineTotal: lineTotal + taxAmount,
        batchNumber: item.batchNumber,
        expiryDate: item.expiryDate,
      };
    });

    const paidNum = parseFloat(amountPaid) || 0;

    try {
      setIsSubmitting(true);
      await createPurchaseOrder({
        supplierId,
        supplierName: matchedSupplier?.name || 'Supplier',
        supplierInvoiceRef: invoiceRef,
        items: itemsPayload,
        subtotal: poCalculations.subtotal,
        discountTotal: poCalculations.discountTotal,
        taxTotal: poCalculations.taxTotal,
        total: poCalculations.total,
        amountPaid: paidNum,
        balanceDue: Math.max(0, poCalculations.total - paidNum),
        paymentMethod: poPaymentMethod,
        notes: poNotes,
      });

      setShowAddModal(false);
      setPoItems([]);
      setAmountPaid('0');
      setInvoiceRef('');
      setPoNotes('');
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to create purchase order');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReceiveOrder = async (purchase: Purchase) => {
    if (
      !confirm(
        `Receive goods for ${purchase.purchaseNumber}? This will automatically recalculate Weighted Average Cost (WAC) and increment inventory stock.`
      )
    ) {
      return;
    }

    try {
      await receivePurchaseOrder(purchase.id);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to receive goods');
    }
  };

  const handleCreateSupplier = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) return;

    try {
      setIsSubmitting(true);
      await apiRequest('/suppliers', 'POST', {
        name: newSupplierName.trim(),
        phone: newSupplierPhone.trim(),
        address: newSupplierAddress.trim(),
      });
      await refreshState();
      setShowSupplierModal(false);
      setNewSupplierName('');
      setNewSupplierPhone('');
      setNewSupplierAddress('');
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to create supplier');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordSupplierPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!showPaymentModal) return;
    const sId = showPaymentModal;
    const amt = parseFloat(paymentAmount) || 0;
    if (amt <= 0) {
      alert('Payment amount must be greater than 0');
      return;
    }

    try {
      setIsSubmitting(true);
      const record = await recordPartyPayment({
        partyType: 'supplier',
        partyId: sId,
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
      alert((err as Error).message || 'Failed to record payment');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            Purchases & Supplier Payables
          </h1>
          <p className="text-xs text-slate-500">
            Automated Weighted Average Cost (WAC) updates, receiving workflow, and payment vouchers
          </p>
        </div>
        <div className="flex items-center gap-2">
          {currentUser?.role !== 'cashier' && (
            <>
              <button
                type="button"
                onClick={() => setShowSupplierModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-semibold transition-colors"
              >
                + Add Supplier
              </button>
              <button
                type="button"
                onClick={() => {
                  setSupplierId(suppliers[0]?.id || '');
                  setShowAddModal(true);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
              >
                <Plus className="w-4 h-4" />
                New Purchase Order
              </button>
            </>
          )}
        </div>
      </div>

      {/* Supplier Outstanding Balances Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {suppliers.map((s) => (
          <div
            key={s.id}
            className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col justify-between"
          >
            <div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-900 text-sm truncate">{s.name}</span>
                <span className="text-[10px] text-slate-400 font-mono">{s.phone}</span>
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5 truncate">{s.address}</div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
              <div>
                <div className="text-[10px] text-slate-400 uppercase font-semibold">
                  Payable Balance
                </div>
                <div
                  className={`text-sm font-bold font-mono ${
                    s.outstandingBalance > 0 ? 'text-red-600' : 'text-slate-700'
                  }`}
                >
                  {formatCurrency(s.outstandingBalance, shop?.currency)}
                </div>
              </div>
              {s.outstandingBalance > 0 && currentUser?.role !== 'cashier' && (
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(s.id);
                    setPaymentAmount(String(s.outstandingBalance));
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-900 text-white text-[11px] font-semibold hover:bg-slate-800"
                >
                  Pay Bill
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Search and Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
            <input
              type="text"
              placeholder="Search purchases by PO# or supplier..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none"
            />
          </div>
          <span className="text-xs text-slate-400">{filteredPurchases.length} Purchase Orders</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 font-semibold">PO #</th>
                <th className="px-4 py-3 font-semibold">Date</th>
                <th className="px-4 py-3 font-semibold">Supplier</th>
                <th className="px-4 py-3 font-semibold">Items</th>
                <th className="px-4 py-3 font-semibold text-right">Total</th>
                <th className="px-4 py-3 font-semibold text-right">Paid</th>
                <th className="px-4 py-3 font-semibold text-center">Status</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Truck className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <div className="text-xs font-semibold">No purchase orders found</div>
                    <div className="text-[11px] text-slate-400">Create purchase orders to restock store items</div>
                  </td>
                </tr>
              ) : (
                filteredPurchases.map((po) => {
                  const isReceived = po.status === 'received';
                  return (
                    <tr key={po.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">
                        {po.purchaseNumber}
                      </td>
                      <td className="px-4 py-3 text-slate-500 whitespace-nowrap">
                        {formatDateTime(po.createdAt, shop?.timezone)}
                      </td>
                      <td className="px-4 py-3 text-slate-800 font-medium">{po.supplierName}</td>
                      <td className="px-4 py-3 text-slate-600 font-mono">
                        {po.items.reduce((s, i) => s + i.quantity, 0)} units ({po.items.length} lines)
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(po.total, shop?.currency)}
                      </td>
                      <td className="px-4 py-3 text-right font-mono text-emerald-700">
                        {formatCurrency(po.amountPaid, shop?.currency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                            isReceived
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : 'bg-amber-50 text-amber-700 border border-amber-200'
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        {!isReceived && currentUser?.role !== 'cashier' && (
                          <button
                            type="button"
                            onClick={() => handleReceiveOrder(po)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] shadow-xs"
                          >
                            <CheckCircle className="w-3 h-3" />
                            Receive & WAC Update
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Purchase Order Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">New Purchase Order</h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSavePO} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Supplier *</label>
                  <select
                    value={supplierId}
                    onChange={(e) => setSupplierId(e.target.value)}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                  >
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Supplier Invoice Ref #
                  </label>
                  <input
                    type="text"
                    value={invoiceRef}
                    onChange={(e) => setInvoiceRef(e.target.value)}
                    placeholder="INV-SUP-982"
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                  />
                </div>
                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Payment Method</label>
                  <select
                    value={poPaymentMethod}
                    onChange={(e) =>
                      setPoPaymentMethod(e.target.value as 'cash' | 'card' | 'bank_transfer' | 'credit')
                    }
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                  >
                    <option value="credit">Supplier Credit (Pay Later)</option>
                    <option value="cash">Cash on Delivery</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="card">Card / POS</option>
                  </select>
                </div>
              </div>

              {/* Items Line selector */}
              <div className="border border-slate-200 rounded-2xl p-4 bg-slate-50/60 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900">Order Line Items</span>
                  <select
                    onChange={(e) => {
                      if (e.target.value) {
                        handleAddItemToPO(e.target.value);
                        e.target.value = '';
                      }
                    }}
                    className="text-xs p-1.5 border border-slate-200 rounded-xl bg-white focus:outline-none"
                  >
                    <option value="">+ Add Product Line...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} (Current Cost: {formatCurrency(p.purchaseCost, shop?.currency)})
                      </option>
                    ))}
                  </select>
                </div>

                {poItems.length === 0 ? (
                  <div className="text-center py-6 text-slate-400 text-xs">
                    No items added to this PO yet. Pick products from the selector above.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {poItems.map((item, idx) => {
                      const prod = products.find((p) => p.id === item.productId);
                      return (
                        <div
                          key={idx}
                          className="p-3 bg-white rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-6 gap-2 items-center"
                        >
                          <div className="sm:col-span-2">
                            <div className="font-semibold text-slate-900 truncate">
                              {prod?.name}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              SKU: {prod?.sku}
                            </div>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block">Qty</label>
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'quantity', parseInt(e.target.value) || 1)
                              }
                              className="w-full p-1 border border-slate-200 rounded text-center font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block">Unit Cost</label>
                            <input
                              type="number"
                              step="0.01"
                              value={item.unitCost}
                              onChange={(e) =>
                                handleUpdateItem(idx, 'unitCost', parseFloat(e.target.value) || 0)
                              }
                              className="w-full p-1 border border-slate-200 rounded text-right font-semibold"
                            />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 block">Line Total</label>
                            <div className="font-bold text-slate-900 pt-1 text-right">
                              {formatCurrency(item.quantity * item.unitCost, shop?.currency)}
                            </div>
                          </div>
                          <div className="text-right">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 text-slate-400 hover:text-red-500"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Calculation summary */}
                <div className="pt-2 border-t border-slate-200 flex flex-col sm:flex-row justify-between items-end gap-3 text-xs">
                  <div className="w-full sm:w-1/2">
                    <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                      Amount Paid Now ({shop?.currency})
                    </label>
                    <input
                      type="number"
                      step="0.5"
                      value={amountPaid}
                      onChange={(e) => setAmountPaid(e.target.value)}
                      className="w-full p-2 border border-slate-200 rounded-xl bg-white font-mono"
                    />
                  </div>
                  <div className="w-full sm:w-1/2 space-y-1 text-right font-medium">
                    <div className="text-slate-500">
                      Subtotal: {formatCurrency(poCalculations.subtotal, shop?.currency)}
                    </div>
                    <div className="text-slate-500">
                      VAT ({shop?.defaultTaxRate ?? 15}%):{' '}
                      {formatCurrency(poCalculations.taxTotal, shop?.currency)}
                    </div>
                    <div className="text-sm font-bold text-slate-900">
                      Grand Total: {formatCurrency(poCalculations.total, shop?.currency)}
                    </div>
                  </div>
                </div>
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
                  disabled={isSubmitting || poItems.length === 0}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs"
                >
                  {isSubmitting ? 'Creating...' : 'Save Purchase Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Supplier Modal */}
      {showSupplierModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Add New Supplier</h3>
            <form onSubmit={handleCreateSupplier} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Company / Supplier Name *</label>
                <input
                  type="text"
                  required
                  value={newSupplierName}
                  onChange={(e) => setNewSupplierName(e.target.value)}
                  placeholder="e.g. Al-Riyadh FMCG Wholesale"
                  className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={newSupplierPhone}
                  onChange={(e) => setNewSupplierPhone(e.target.value)}
                  placeholder="+966 50 123 4567"
                  className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Warehouse Address</label>
                <input
                  type="text"
                  value={newSupplierAddress}
                  onChange={(e) => setNewSupplierAddress(e.target.value)}
                  placeholder="Exit 14, Al Malaz, Riyadh"
                  className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowSupplierModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-emerald-600 text-white hover:bg-emerald-700"
                >
                  Create Supplier
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Record Supplier Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Record Supplier Payment Voucher</h3>
            <p className="text-xs text-slate-500">
              Clear outstanding accounts payable balance and download official receipt voucher.
            </p>

            <form onSubmit={handleRecordSupplierPayment} className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Payment Amount ({shop?.currency}) *
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
                  <option value="bank_transfer">Bank Wire Transfer</option>
                  <option value="cash">Cash</option>
                  <option value="card">Company Debit / Credit Card</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Voucher Notes</label>
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
                  <FileText className="w-3.5 h-3.5" />
                  Post Payment & PDF Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
