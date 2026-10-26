import React, { useState, useMemo } from 'react';
import {
  Package,
  Plus,
  Search,
  Filter,
  Edit2,
  Trash2,
  Printer,
  Barcode,
  AlertTriangle,
  Check,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { formatCurrency } from '../lib/i18n';
import { generateBarcodeLabelsPDF } from '../lib/pdfGenerator';
import { Product, TaxCategory } from '../types';

export const ProductsView: React.FC = () => {
  const {
    state,
    currentUser,
    apiRequest,
    refreshState,
    prefilledBarcodeForNewProduct,
    setPrefilledBarcodeForNewProduct,
    setActiveTab,
  } = useShop();

  const shop = state?.shop;
  const products = state?.products || [];
  const categories = state?.categories || [];
  const suppliers = state?.suppliers || [];

  const [search, setSearch] = useState('');
  const [selectedCat, setSelectedCat] = useState('all');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedForLabels, setSelectedForLabels] = useState<Record<string, number>>({});
  const [showLabelModal, setShowLabelModal] = useState(false);

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category: '',
    brand: '',
    purchaseCost: '10',
    sellingPrice: '15',
    stock: '25',
    minStockThreshold: '5',
    unit: 'pcs',
    supplierId: '',
    batchNumber: '',
    expiryDate: '',
    taxRate: '15',
    taxCategory: 'standard' as TaxCategory,
  });

  // Open add modal if prefilled barcode exists from scanner
  React.useEffect(() => {
    if (prefilledBarcodeForNewProduct) {
      setFormData((prev) => ({
        ...prev,
        barcode: prefilledBarcodeForNewProduct,
        sku: `SKU-${Date.now().toString().slice(-6)}`,
        category: categories[0]?.name || 'Grocery',
      }));
      setShowAddModal(true);
      setPrefilledBarcodeForNewProduct('');
    }
  }, [prefilledBarcodeForNewProduct, categories, setPrefilledBarcodeForNewProduct]);

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchSearch =
        p.name.toLowerCase().includes(search.toLowerCase()) ||
        p.barcode.toLowerCase().includes(search.toLowerCase()) ||
        p.sku.toLowerCase().includes(search.toLowerCase()) ||
        p.brand.toLowerCase().includes(search.toLowerCase());
      const matchCat = selectedCat === 'all' || p.category === selectedCat;
      const matchStock =
        stockFilter === 'all' ||
        (stockFilter === 'low' && p.stock <= p.minStockThreshold && p.stock > 0) ||
        (stockFilter === 'out' && p.stock <= 0);
      return matchSearch && matchCat && matchStock;
    });
  }, [products, search, selectedCat, stockFilter]);

  const handleOpenAdd = () => {
    setFormData({
      name: '',
      sku: `SKU-${Date.now().toString().slice(-6)}`,
      barcode: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
      category: categories[0]?.name || 'Grocery',
      brand: '',
      purchaseCost: '10',
      sellingPrice: '15',
      stock: '20',
      minStockThreshold: '5',
      unit: 'pcs',
      supplierId: suppliers[0]?.id || '',
      batchNumber: '',
      expiryDate: '',
      taxRate: String(shop?.defaultTaxRate ?? 15),
      taxCategory: 'standard',
    });
    setEditingProduct(null);
    setShowAddModal(true);
  };

  const handleOpenEdit = (p: Product) => {
    setEditingProduct(p);
    setFormData({
      name: p.name,
      sku: p.sku,
      barcode: p.barcode,
      category: p.category,
      brand: p.brand,
      purchaseCost: String(p.purchaseCost),
      sellingPrice: String(p.sellingPrice),
      stock: String(p.stock),
      minStockThreshold: String(p.minStockThreshold),
      unit: p.unit,
      supplierId: p.supplierId || '',
      batchNumber: p.batchNumber || '',
      expiryDate: p.expiryDate || '',
      taxRate: String(p.taxRate),
      taxCategory: p.taxCategory,
    });
    setShowAddModal(true);
  };

  const handleSaveProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.barcode.trim()) {
      alert('Product name and barcode are required');
      return;
    }

    // Duplicate barcode validation
    const existingWithBarcode = products.find(
      (p) => p.barcode === formData.barcode.trim() && p.id !== editingProduct?.id
    );
    if (existingWithBarcode) {
      alert(`Barcode "${formData.barcode}" is already assigned to "${existingWithBarcode.name}"!`);
      return;
    }

    const matchedSupplier = suppliers.find((s) => s.id === formData.supplierId);

    const payload = {
      name: formData.name.trim(),
      sku: formData.sku.trim() || `SKU-${Date.now().toString().slice(-6)}`,
      barcode: formData.barcode.trim(),
      category: formData.category || 'General',
      brand: formData.brand.trim() || 'Generic',
      purchaseCost: Math.max(0, parseFloat(formData.purchaseCost) || 0),
      sellingPrice: Math.max(0, parseFloat(formData.sellingPrice) || 0),
      stock: parseInt(formData.stock) || 0,
      minStockThreshold: Math.max(0, parseInt(formData.minStockThreshold) || 5),
      unit: formData.unit || 'pcs',
      supplierId: formData.supplierId || undefined,
      supplierName: matchedSupplier?.name || undefined,
      batchNumber: formData.batchNumber || undefined,
      expiryDate: formData.expiryDate || undefined,
      taxRate: Math.max(0, parseFloat(formData.taxRate) || 0),
      taxCategory: formData.taxCategory,
    };

    try {
      setIsSubmitting(true);
      if (editingProduct) {
        await apiRequest(`/products/${editingProduct.id}`, 'PUT', payload);
      } else {
        await apiRequest('/products', 'POST', payload);
      }
      await refreshState();
      setShowAddModal(false);
      setEditingProduct(null);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to save product');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteProduct = async (p: Product) => {
    if (!confirm(`Are you sure you want to permanently delete "${p.name}"?`)) return;
    try {
      await apiRequest(`/products/${p.id}`, 'DELETE');
      await refreshState();
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to delete product');
    }
  };

  const toggleSelectForLabel = (id: string) => {
    setSelectedForLabels((prev) => {
      const copy = { ...prev };
      if (copy[id]) {
        delete copy[id];
      } else {
        copy[id] = 6; // default 6 copies per product label
      }
      return copy;
    });
  };

  const handlePrintLabels = () => {
    if (!shop) return;
    const selectedEntries = Object.entries(selectedForLabels)
      .map(([id, copies]) => {
        const prod = products.find((p) => p.id === id);
        return prod ? { product: prod, copies } : null;
      })
      .filter(Boolean) as { product: Product; copies: number }[];

    if (selectedEntries.length === 0) {
      alert('Please select at least one product to print barcode labels.');
      return;
    }

    generateBarcodeLabelsPDF(selectedEntries, shop);
    setShowLabelModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">Products & Catalog</h1>
          <p className="text-xs text-slate-500">
            Maintain retail SKUs, barcodes, unit costs, pricing, and label generation
          </p>
        </div>
        <div className="flex items-center gap-2">
          {Object.keys(selectedForLabels).length > 0 && (
            <button
              type="button"
              onClick={() => setShowLabelModal(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 text-white text-xs font-semibold hover:bg-slate-800 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Labels ({Object.keys(selectedForLabels).length})
            </button>
          )}
          {currentUser?.role !== 'cashier' && (
            <button
              type="button"
              onClick={handleOpenAdd}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Product
            </button>
          )}
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
          <input
            type="text"
            placeholder="Search by name, SKU, or barcode..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto">
          {/* Category Dropdown */}
          <select
            value={selectedCat}
            onChange={(e) => setSelectedCat(e.target.value)}
            className="text-xs py-2 px-3 rounded-xl border border-slate-200 bg-white font-medium text-slate-700 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.name}>
                {c.name}
              </option>
            ))}
          </select>

          {/* Stock Filter Pills */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl text-xs font-medium">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                stockFilter === 'all' ? 'bg-white shadow-xs text-slate-900 font-bold' : 'text-slate-600'
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('low')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                stockFilter === 'low' ? 'bg-white shadow-xs text-amber-700 font-bold' : 'text-slate-600'
              }`}
            >
              Low Stock
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('out')}
              className={`px-3 py-1 rounded-lg transition-colors ${
                stockFilter === 'out' ? 'bg-white shadow-xs text-red-700 font-bold' : 'text-slate-600'
              }`}
            >
              Out of Stock
            </button>
          </div>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
              <tr>
                <th className="px-4 py-3 w-10 text-center">
                  <span className="sr-only">Select</span>
                </th>
                <th className="px-4 py-3 font-semibold">Product & SKU</th>
                <th className="px-4 py-3 font-semibold">Barcode</th>
                <th className="px-4 py-3 font-semibold">Category / Brand</th>
                {currentUser?.role !== 'cashier' && (
                  <th className="px-4 py-3 font-semibold text-right">Cost (WAC)</th>
                )}
                <th className="px-4 py-3 font-semibold text-right">Selling Price</th>
                <th className="px-4 py-3 font-semibold text-center">Stock Units</th>
                <th className="px-4 py-3 font-semibold text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 text-slate-300 stroke-1" />
                    <div className="text-xs font-semibold">No products found</div>
                    <div className="text-[11px] text-slate-400">Try adjusting your search criteria</div>
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p) => {
                  const isLow = p.stock <= p.minStockThreshold && p.stock > 0;
                  const isOut = p.stock <= 0;
                  const isSelected = !!selectedForLabels[p.id];

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70">
                      <td className="px-4 py-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectForLabel(p.id)}
                          className="rounded text-emerald-600"
                          title="Select to print barcode label"
                        />
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{p.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          SKU: {p.sku} · {p.unit}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-mono text-slate-600">
                        <span className="px-2 py-0.5 rounded bg-slate-100 border border-slate-200">
                          {p.barcode}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-800">{p.category}</div>
                        <div className="text-[10px] text-slate-400">{p.brand}</div>
                      </td>
                      {currentUser?.role !== 'cashier' && (
                        <td className="px-4 py-3 text-right font-mono text-slate-600">
                          {formatCurrency(p.purchaseCost, shop?.currency)}
                        </td>
                      )}
                      <td className="px-4 py-3 text-right font-bold text-slate-900">
                        {formatCurrency(p.sellingPrice, shop?.currency)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className={`inline-block px-2.5 py-0.5 rounded-full font-mono font-bold text-[10px] ${
                            isOut
                              ? 'bg-red-50 text-red-700 border border-red-200'
                              : isLow
                              ? 'bg-amber-50 text-amber-700 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          }`}
                        >
                          {p.stock} {p.unit}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1">
                          {currentUser?.role !== 'cashier' && (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenEdit(p)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
                                title="Edit Product"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteProduct(p)}
                                className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                                title="Delete Product"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </>
                          )}
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

      {/* Add / Edit Product Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-xl border border-slate-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-sm font-bold text-slate-900">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h3>
              <button
                type="button"
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-slate-600 text-xs font-semibold"
              >
                Cancel
              </button>
            </div>

            <form onSubmit={handleSaveProduct} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="font-semibold text-slate-700 block mb-1">Product Name *</label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                    placeholder="e.g. Almarai Fresh Milk 1L"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Barcode *</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      required
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="w-full p-2 border border-slate-200 rounded-xl font-mono focus:outline-none"
                      placeholder="6281007..."
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          barcode: Math.floor(100000000000 + Math.random() * 900000000000).toString(),
                        })
                      }
                      className="px-2.5 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-100 font-semibold text-[11px]"
                      title="Generate random EAN-13"
                    >
                      Gen
                    </button>
                  </div>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">SKU</label>
                  <input
                    type="text"
                    value={formData.sku}
                    onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl font-mono focus:outline-none"
                    placeholder="SKU-1002"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Category</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.name}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Brand</label>
                  <input
                    type="text"
                    value={formData.brand}
                    onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                    placeholder="e.g. Almarai"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Purchase Cost ({shop?.currency})
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.purchaseCost}
                    onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Selling Price ({shop?.currency}) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={formData.sellingPrice}
                    onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Initial Stock</label>
                  <input
                    type="number"
                    value={formData.stock}
                    onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">
                    Min Stock Threshold
                  </label>
                  <input
                    type="number"
                    value={formData.minStockThreshold}
                    onChange={(e) => setFormData({ ...formData, minStockThreshold: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none font-mono"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Unit of Measure</label>
                  <input
                    type="text"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                    placeholder="pcs, kg, ltr, box"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Default Supplier</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => setFormData({ ...formData, supplierId: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                  >
                    <option value="">None / Unassigned</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Batch / Lot #</label>
                  <input
                    type="text"
                    value={formData.batchNumber}
                    onChange={(e) => setFormData({ ...formData, batchNumber: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none font-mono"
                    placeholder="LOT-2026-X"
                  />
                </div>

                <div>
                  <label className="font-semibold text-slate-700 block mb-1">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.expiryDate}
                    onChange={(e) => setFormData({ ...formData, expiryDate: e.target.value })}
                    className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
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
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Label Print Configuration Modal */}
      {showLabelModal && shop && (
        <div className="fixed inset-0 z-50 bg-slate-950/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 shadow-xl border border-slate-200">
            <h3 className="text-sm font-bold text-slate-900">Print Retail Barcode Labels</h3>
            <p className="text-xs text-slate-500">
              Generate print-ready A4 sticker sheets (3 columns x 8 rows) containing barcode CODE128,
              product name, price, and shop branding.
            </p>

            <div className="max-h-60 overflow-y-auto divide-y divide-slate-100 text-xs">
              {Object.entries(selectedForLabels).map(([id, copies]) => {
                const prod = products.find((p) => p.id === id);
                if (!prod) return null;
                return (
                  <div key={id} className="py-2 flex items-center justify-between">
                    <span className="truncate pr-2 font-medium text-slate-800">{prod.name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="text-[11px] text-slate-500">Copies:</span>
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={copies}
                        onChange={(e) =>
                          setSelectedForLabels((prev) => ({
                            ...prev,
                            [id]: Math.max(1, parseInt(e.target.value) || 1),
                          }))
                        }
                        className="w-14 px-1.5 py-0.5 border border-slate-200 rounded text-center text-xs font-semibold"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLabelModal(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePrintLabels}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 text-white hover:bg-emerald-700 shadow-xs flex items-center gap-1.5"
              >
                <Printer className="w-3.5 h-3.5" />
                Generate PDF Sheet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
