import React, { useState, useMemo } from 'react';
import {
  ShoppingCart,
  Trash2,
  Plus,
  Minus,
  Search,
  CheckCircle2,
  Printer,
  RotateCcw,
  AlertTriangle,
  UserCheck,
  CreditCard,
  Banknote,
  Split,
  Tag,
  Percent,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { formatCurrency, formatDateTime } from '../lib/i18n';
import { calculateSaleTotals } from '../lib/calculations';
import { generateSaleReceiptPDF } from '../lib/pdfGenerator';
import { PaymentMethod, Product, Sale } from '../types';

export const PosView: React.FC = () => {
  const {
    state,
    currentUser,
    cart,
    addToCart,
    updateCartQuantity,
    updateCartDiscount,
    removeFromCart,
    clearCart,
    completePosSale,
    refundOrVoidSale,
    setActiveTab,
  } = useShop();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [orderDiscount, setOrderDiscount] = useState<number>(0);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [cashTendered, setCashTendered] = useState<string>('');
  const [cardTendered, setCardTendered] = useState<string>('');
  const [saleNotes, setSaleNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [lastCompletedSale, setLastCompletedSale] = useState<Sale | null>(null);
  const [overrideAllowed, setOverrideAllowed] = useState(false);
  const [showRefundModal, setShowRefundModal] = useState<Sale | null>(null);
  const [refundReason, setRefundReason] = useState('Customer returned item in good condition');
  const [refundRestock, setRefundRestock] = useState(true);

  const shop = state?.shop;
  const products = state?.products || [];
  const categories = state?.categories || [];
  const customers = state?.customers || [];
  const recentSales = (state?.sales || []).slice(0, 8);

  const taxInclusive = shop?.taxInclusivePricing ?? true;

  // Filter products for quick add
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.barcode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesCat = selectedCategory === 'all' || p.category === selectedCategory;
      return matchesSearch && matchesCat;
    });
  }, [products, searchQuery, selectedCategory]);

  // Current calculation result
  const totals = useMemo(() => {
    return calculateSaleTotals(cart, orderDiscount, taxInclusive);
  }, [cart, orderDiscount, taxInclusive]);

  // Selected customer info
  const selectedCustomer = useMemo(() => {
    return customers.find((c) => c.id === selectedCustomerId);
  }, [customers, selectedCustomerId]);

  // Handle cash paid and change due
  const cashAmount = Number(cashTendered) || 0;
  const cardAmount = Number(cardTendered) || 0;

  const changeDue = useMemo(() => {
    if (paymentMethod === 'cash') {
      return Math.max(0, cashAmount - totals.total);
    }
    if (paymentMethod === 'split') {
      return Math.max(0, cashAmount + cardAmount - totals.total);
    }
    return 0;
  }, [paymentMethod, cashAmount, cardAmount, totals.total]);

  // Check if any cart item exceeds available stock
  const stockViolations = useMemo(() => {
    return cart.filter((item) => item.quantity > item.product.stock);
  }, [cart]);

  const canCheckout =
    cart.length > 0 &&
    !isSubmitting &&
    (stockViolations.length === 0 || overrideAllowed || currentUser?.role !== 'cashier') &&
    (paymentMethod !== 'cash' || cashAmount >= totals.total || cashAmount === 0);

  const handleCheckout = async () => {
    if (cart.length === 0) return;

    // Check customer credit limit if credit payment
    if (paymentMethod === 'credit' && selectedCustomer) {
      const newBalance = (selectedCustomer.outstandingBalance || 0) + totals.total;
      if (selectedCustomer.creditLimit > 0 && newBalance > selectedCustomer.creditLimit) {
        alert(
          `Customer credit limit exceeded! Limit: ${formatCurrency(
            selectedCustomer.creditLimit,
            shop?.currency
          )}, Current Balance: ${formatCurrency(
            selectedCustomer.outstandingBalance,
            shop?.currency
          )}`
        );
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const sale = await completePosSale({
        orderDiscount,
        taxInclusive,
        paymentMethod,
        cashPaid:
          paymentMethod === 'cash'
            ? cashAmount || totals.total
            : paymentMethod === 'split'
            ? cashAmount
            : 0,
        cardPaid:
          paymentMethod === 'card'
            ? totals.total
            : paymentMethod === 'split'
            ? cardAmount
            : 0,
        creditAmount: paymentMethod === 'credit' ? totals.total : 0,
        customerId: selectedCustomerId || undefined,
        notes: saleNotes,
        managerOverride: overrideAllowed || currentUser?.role !== 'cashier',
      });

      setLastCompletedSale(sale);
      setOrderDiscount(0);
      setCashTendered('');
      setCardTendered('');
      setSaleNotes('');
      setOverrideAllowed(false);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to complete sale');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessRefund = async () => {
    if (!showRefundModal) return;
    try {
      setIsSubmitting(true);
      await refundOrVoidSale(showRefundModal.id, {
        type: 'full_refund',
        reason: refundReason,
        restockItems: refundRestock,
      });
      setShowRefundModal(null);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to refund transaction');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top action header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">POS Checkout</h1>
          <p className="text-xs text-slate-500">
            Real-time barcode inventory register with automated VAT & discounts
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('scanner')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
          >
            Launch Barcode Scanner
          </button>
          {cart.length > 0 && (
            <button
              type="button"
              onClick={clearCart}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 text-xs font-semibold transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Cart
            </button>
          )}
        </div>
      </div>

      {/* Main Grid: Left Catalog & Right Cart Checkout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Product Search & Quick Grid (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search products by name, barcode, or SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>
            </div>

            {/* Category Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                type="button"
                onClick={() => setSelectedCategory('all')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                All Items ({products.length})
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => setSelectedCategory(c.name)}
                  className={`px-3 py-1 rounded-lg font-medium transition-colors shrink-0 ${
                    selectedCategory === c.name
                      ? 'bg-slate-900 text-white'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {c.name}
                </button>
              ))}
            </div>
          </div>

          {/* Product Items Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {filteredProducts.map((p) => {
              const inCart = cart.find((i) => i.product.id === p.id);
              const isLow = p.stock <= p.minStockThreshold;
              const isOut = p.stock <= 0;

              return (
                <div
                  key={p.id}
                  onClick={() => addToCart(p, 1)}
                  className={`relative p-3 rounded-2xl border transition-all cursor-pointer select-none flex flex-col justify-between ${
                    isOut
                      ? 'bg-red-50/40 border-red-200 opacity-80'
                      : 'bg-white border-slate-200 hover:border-emerald-500 hover:shadow-xs'
                  }`}
                >
                  <div>
                    <div className="flex items-start justify-between gap-1">
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                        {p.sku}
                      </span>
                      {isOut ? (
                        <span className="text-[10px] font-bold text-red-600">Out of Stock</span>
                      ) : isLow ? (
                        <span className="text-[10px] font-bold text-amber-600">Low: {p.stock}</span>
                      ) : (
                        <span className="text-[10px] text-slate-400 font-mono">Qty: {p.stock}</span>
                      )}
                    </div>
                    <div className="mt-2 font-semibold text-xs text-slate-900 line-clamp-2">
                      {p.name}
                    </div>
                    <div className="text-[10px] text-slate-400 mt-0.5 truncate">{p.category}</div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      {formatCurrency(p.sellingPrice, shop?.currency)}
                    </span>
                    {inCart ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white text-[10px] font-bold flex items-center justify-center">
                        {inCart.quantity}
                      </span>
                    ) : (
                      <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-600 text-xs flex items-center justify-center hover:bg-emerald-100 hover:text-emerald-700">
                        +
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Active Cart & Checkout Ledger (5 cols) */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200/80 shadow-xs flex flex-col">
          {/* Cart Header */}
          <div className="p-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <ShoppingCart className="w-4 h-4 text-emerald-600" />
              <h2 className="text-sm font-bold text-slate-900">Current Order</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 text-[10px] font-mono font-bold">
                {cart.reduce((s, i) => s + i.quantity, 0)} items
              </span>
            </div>
            <span className="text-[11px] font-medium text-slate-500">
              {taxInclusive ? 'VAT Incl. (15%)' : 'VAT Excl. (+15%)'}
            </span>
          </div>

          {/* Cart Items List */}
          <div className="p-4 flex-1 overflow-y-auto max-h-[380px] divide-y divide-slate-100">
            {cart.length === 0 ? (
              <div className="text-center py-12 text-slate-400">
                <ShoppingCart className="w-8 h-8 mx-auto mb-2 stroke-1 text-slate-300" />
                <div className="text-xs font-semibold">Your cart is empty</div>
                <div className="text-[11px] text-slate-400 mt-0.5">
                  Click any item or scan a barcode to add
                </div>
              </div>
            ) : (
              cart.map((item) => {
                const isOverStock = item.quantity > item.product.stock;
                const lineTotal = item.quantity * item.product.sellingPrice - item.itemDiscount;

                return (
                  <div key={item.product.id} className="py-3 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-semibold text-slate-900 truncate">
                          {item.product.name}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {formatCurrency(item.product.sellingPrice, shop?.currency)} each · Stock:{' '}
                          {item.product.stock}
                        </div>
                        {isOverStock && (
                          <div className="flex items-center gap-1 text-[10px] font-semibold text-red-600 mt-0.5">
                            <AlertTriangle className="w-3 h-3" />
                            Exceeds stock by {item.quantity - item.product.stock} units
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.product.id)}
                        className="text-slate-300 hover:text-red-500 transition-colors p-1"
                        title="Remove"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-2 text-xs">
                      {/* Qty controls */}
                      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity - 1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) =>
                            updateCartQuantity(item.product.id, Math.max(1, parseInt(e.target.value) || 1))
                          }
                          className="w-12 text-center text-xs font-semibold bg-white py-1 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateCartQuantity(item.product.id, item.quantity + 1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-200 transition-colors"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      {/* Line discount toggle */}
                      <div className="flex items-center gap-1">
                        <Tag className="w-3 h-3 text-slate-400" />
                        <input
                          type="number"
                          placeholder="Disc"
                          value={item.itemDiscount || ''}
                          onChange={(e) =>
                            updateCartDiscount(item.product.id, Math.max(0, parseFloat(e.target.value) || 0))
                          }
                          className="w-14 px-1.5 py-1 text-[11px] rounded border border-slate-200 text-right focus:outline-none"
                        />
                      </div>

                      {/* Net line amount */}
                      <div className="font-bold text-slate-900 text-xs">
                        {formatCurrency(Math.max(0, lineTotal), shop?.currency)}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Cart Settings & Payment Controls */}
          {cart.length > 0 && (
            <div className="p-4 bg-slate-50 border-t border-slate-200 rounded-b-2xl space-y-3">
              {/* Customer Selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Customer
                </label>
                <select
                  value={selectedCustomerId}
                  onChange={(e) => setSelectedCustomerId(e.target.value)}
                  className="w-full text-xs py-1.5 px-2 rounded-xl border border-slate-200 bg-white focus:outline-none"
                >
                  <option value="">Walk-in Customer (General)</option>
                  {customers.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.phone}) - Bal: {formatCurrency(c.outstandingBalance, shop?.currency)}
                    </option>
                  ))}
                </select>
              </div>

              {/* Order discount input */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600 flex items-center gap-1">
                  <Percent className="w-3 h-3 text-slate-400" /> Order Discount
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.5"
                  value={orderDiscount || ''}
                  onChange={(e) => setOrderDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-24 text-right px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:outline-none"
                />
              </div>

              {/* Payment Method Selector */}
              <div>
                <label className="text-[11px] font-semibold text-slate-600 block mb-1">
                  Payment Method
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {(['cash', 'card', 'credit', 'split'] as PaymentMethod[]).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => setPaymentMethod(m)}
                      className={`py-1.5 text-[11px] font-semibold rounded-lg capitalize border transition-all ${
                        paymentMethod === m
                          ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {m === 'cash' && <Banknote className="w-3 h-3 mx-auto mb-0.5" />}
                      {m === 'card' && <CreditCard className="w-3 h-3 mx-auto mb-0.5" />}
                      {m === 'credit' && <UserCheck className="w-3 h-3 mx-auto mb-0.5" />}
                      {m === 'split' && <Split className="w-3 h-3 mx-auto mb-0.5" />}
                      {m}
                    </button>
                  ))}
                </div>
              </div>

              {/* Payment inputs based on method */}
              {paymentMethod === 'cash' && (
                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-600 font-medium">Cash Received:</span>
                  <input
                    type="number"
                    step="1"
                    placeholder={totals.total.toFixed(2)}
                    value={cashTendered}
                    onChange={(e) => setCashTendered(e.target.value)}
                    className="w-28 text-right px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-bold focus:outline-none"
                  />
                </div>
              )}

              {paymentMethod === 'split' && (
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Cash Paid</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={cashTendered}
                      onChange={(e) => setCashTendered(e.target.value)}
                      className="w-full text-right px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] text-slate-500 block mb-0.5">Card Paid</label>
                    <input
                      type="number"
                      placeholder="0.00"
                      value={cardTendered}
                      onChange={(e) => setCardTendered(e.target.value)}
                      className="w-full text-right px-2 py-1 rounded-lg border border-slate-200 bg-white text-xs font-semibold focus:outline-none"
                    />
                  </div>
                </div>
              )}

              {/* Manager override toggle if stock violated */}
              {stockViolations.length > 0 && currentUser?.role === 'cashier' && (
                <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-xs">
                  <div className="text-amber-800 font-semibold flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                    Manager Override Required
                  </div>
                  <label className="flex items-center gap-2 mt-1.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={overrideAllowed}
                      onChange={(e) => setOverrideAllowed(e.target.checked)}
                      className="rounded text-emerald-600"
                    />
                    <span className="text-[11px] text-amber-900 font-medium">
                      Authorize negative inventory sale
                    </span>
                  </label>
                </div>
              )}

              {/* Price summary table */}
              <div className="pt-2 border-t border-slate-200 space-y-1 text-xs">
                <div className="flex justify-between text-slate-500">
                  <span>Subtotal</span>
                  <span>{formatCurrency(totals.subtotal, shop?.currency)}</span>
                </div>
                {(totals.itemDiscountTotal > 0 || totals.orderDiscount > 0) && (
                  <div className="flex justify-between text-emerald-600">
                    <span>Discounts</span>
                    <span>
                      -
                      {formatCurrency(
                        totals.itemDiscountTotal + totals.orderDiscount,
                        shop?.currency
                      )}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-500">
                  <span>VAT ({shop?.defaultTaxRate ?? 15}%)</span>
                  <span>{formatCurrency(totals.taxTotal, shop?.currency)}</span>
                </div>
                <div className="flex justify-between text-slate-900 font-bold text-sm pt-1 border-t border-slate-200">
                  <span>Total Payable</span>
                  <span className="text-emerald-700">
                    {formatCurrency(totals.total, shop?.currency)}
                  </span>
                </div>
                {changeDue > 0 && (
                  <div className="flex justify-between text-blue-700 font-semibold pt-0.5">
                    <span>Change Due</span>
                    <span>{formatCurrency(changeDue, shop?.currency)}</span>
                  </div>
                )}
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                disabled={!canCheckout}
                onClick={handleCheckout}
                className={`w-full py-2.5 rounded-xl text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-2 ${
                  canCheckout
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                    : 'bg-slate-300 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>
                  {isSubmitting
                    ? 'Processing...'
                    : `Complete Sale (${formatCurrency(totals.total, shop?.currency)})`}
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Last completed sale notification banner */}
      {lastCompletedSale && shop && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs font-bold text-emerald-950">
                Sale {lastCompletedSale.invoiceNumber} recorded successfully!
              </div>
              <div className="text-[11px] text-emerald-800">
                Total: {formatCurrency(lastCompletedSale.total, shop.currency)} · Method:{' '}
                {lastCompletedSale.paymentMethod.toUpperCase()}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => generateSaleReceiptPDF(lastCompletedSale, shop)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-emerald-900 border border-emerald-300 text-xs font-semibold hover:bg-emerald-100 transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-emerald-700" />
              Print Receipt (80mm)
            </button>
            <button
              type="button"
              onClick={() => setLastCompletedSale(null)}
              className="px-2 py-1 text-xs text-emerald-700 hover:text-emerald-900"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* Recent Register Transactions */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
            Recent POS Transactions
          </h3>
          <span className="text-[11px] text-slate-400">Last 8 sales</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-100">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Invoice #</th>
                <th className="px-4 py-2.5 font-semibold">Time</th>
                <th className="px-4 py-2.5 font-semibold">Customer</th>
                <th className="px-4 py-2.5 font-semibold">Items</th>
                <th className="px-4 py-2.5 font-semibold">Method</th>
                <th className="px-4 py-2.5 font-semibold text-right">Total</th>
                <th className="px-4 py-2.5 font-semibold text-center">Status</th>
                <th className="px-4 py-2.5 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {recentSales.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60">
                  <td className="px-4 py-2.5 font-mono font-semibold text-slate-900">
                    {s.invoiceNumber}
                  </td>
                  <td className="px-4 py-2.5 text-slate-500 whitespace-nowrap">
                    {formatDateTime(s.createdAt, shop?.timezone)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-700 truncate max-w-[140px]">
                    {s.customerName || 'Walk-in Customer'}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 font-mono">
                    {s.items.reduce((sum, i) => sum + i.quantity, 0)}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600 capitalize">{s.paymentMethod}</td>
                  <td className="px-4 py-2.5 text-right font-bold text-slate-900">
                    {formatCurrency(s.total, shop?.currency)}
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                        s.status === 'completed'
                          ? 'bg-emerald-50 text-emerald-700'
                          : s.status === 'refunded'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-red-50 text-red-700'
                      }`}
                    >
                      {s.status}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {shop && (
                        <button
                          type="button"
                          onClick={() => generateSaleReceiptPDF(s, shop)}
                          className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-100"
                          title="Print Receipt"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>
                      )}
                      {s.status === 'completed' && currentUser?.role !== 'cashier' && (
                        <button
                          type="button"
                          onClick={() => setShowRefundModal(s)}
                          className="p-1 rounded text-slate-500 hover:text-red-600 hover:bg-red-50"
                          title="Refund or Void"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Refund Modal */}
      {showRefundModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">
              Refund Invoice: {showRefundModal.invoiceNumber}
            </h3>
            <p className="text-xs text-slate-500">
              Total to refund:{' '}
              <span className="font-bold text-slate-900">
                {formatCurrency(showRefundModal.total, shop?.currency)}
              </span>
            </p>

            <div className="space-y-3 text-xs">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Reason for refund</label>
                <textarea
                  rows={2}
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={refundRestock}
                  onChange={(e) => setRefundRestock(e.target.checked)}
                  className="rounded text-emerald-600"
                />
                <span className="text-slate-700">Restock inventory units back to catalog</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowRefundModal(null)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleProcessRefund}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-red-600 text-white hover:bg-red-700"
              >
                Confirm Full Refund
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
