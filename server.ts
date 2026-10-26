import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import { createRealisticSeedData } from './src/lib/seedData';
import {
  calculateSaleTotals,
  calculateWeightedAverageCost,
  roundCurrency,
} from './src/lib/calculations';
import {
  AuditLog,
  Customer,
  Expense,
  PaymentRecord,
  Product,
  Purchase,
  RefundRecord,
  Sale,
  Shop,
  ShopDatabaseState,
  StockMovement,
  Supplier,
  User,
  UserRole,
} from './src/types';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// In-Memory Multi-Tenant Store keyed by ShopId
const stores: Map<string, ShopDatabaseState> = new Map();

// Seed initial demo store
const defaultDemoData = createRealisticSeedData('bn');
stores.set(defaultDemoData.shop.id, defaultDemoData);

function getStore(shopId: string): ShopDatabaseState {
  const store = stores.get(shopId);
  if (store) return store;

  const initial = createRealisticSeedData('bn');
  initial.shop.id = shopId;
  initial.shop.name = 'Retail Store';
  stores.set(shopId, initial);
  return initial;
}

function logAudit(
  store: ShopDatabaseState,
  user: { id: string; name: string; role: UserRole },
  action: string,
  entityType: string,
  entityId: string,
  details: string
) {
  const audit: AuditLog = {
    id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
    shopId: store.shop.id,
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action,
    entityType,
    entityId,
    details,
    createdAt: new Date().toISOString(),
  };
  store.auditLogs.unshift(audit);
  if (store.auditLogs.length > 500) {
    store.auditLogs = store.auditLogs.slice(0, 500);
  }
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT || '3000', 10);
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json());

  // Request auth/context extraction helper
  const getContext = (req: Request) => {
    const shopId = (req.headers['x-shop-id'] as string) || defaultDemoData.shop.id;
    const userId = (req.headers['x-user-id'] as string) || defaultDemoData.users[0].id;
    const store = getStore(shopId);
    const user =
      store.users.find((u) => u.id === userId) ||
      store.users[0] || {
        id: userId,
        shopId,
        name: 'Staff Member',
        email: 'staff@smartshop.sa',
        role: 'cashier' as UserRole,
        active: true,
        createdAt: new Date().toISOString(),
      };
    return { store, user };
  };

  // --- API ROUTES ---

  // Health check
  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', time: new Date().toISOString() });
  });

  // Get full shop state
  app.get('/api/state', (req, res) => {
    const { store } = getContext(req);
    res.json({
      shop: store.shop,
      users: store.users,
      categories: store.categories,
      products: store.products,
      suppliers: store.suppliers,
      customers: store.customers,
      sales: store.sales,
      purchases: store.purchases,
      stockMovements: store.stockMovements,
      expenses: store.expenses,
      payments: store.payments,
      refunds: store.refunds,
      auditLogs: store.auditLogs,
    });
  });

  // Authentication: Login
  app.post('/api/auth/login', (req, res) => {
    const { email, password } = req.body;
    for (const [, store] of stores.entries()) {
      const matched = store.users.find((u) => u.email.toLowerCase() === (email || '').toLowerCase());
      if (matched) {
        logAudit(
          store,
          matched,
          'LOGIN',
          'user',
          matched.id,
          `User ${matched.name} signed in successfully`
        );
        return res.json({ user: matched, shop: store.shop });
      }
    }

    // Default fallback mock login if demo credentials
    if (email === 'owner@smartshop.sa' || email.includes('owner')) {
      const owner = defaultDemoData.users[0];
      return res.json({ user: owner, shop: defaultDemoData.shop });
    }

    res.status(401).json({ error: 'Invalid email or password' });
  });

  // Authentication: Register Shop
  app.post('/api/auth/register', (req, res) => {
    const {
      shopName,
      ownerName,
      email,
      phone,
      address,
      vatNumber,
      currency,
      timezone,
      includeDemoData,
    } = req.body;

    const shopId = `shop_${Date.now()}`;
    const ownerId = `user_${Date.now()}`;

    const newShop: Shop = {
      id: shopId,
      name: shopName || 'My Retail Shop',
      address: address || '',
      phone: phone || '',
      email,
      vatNumber: vatNumber || '300000000000003',
      currency: currency || 'SAR',
      language: 'bn',
      timezone: timezone || 'Asia/Riyadh',
      defaultTaxRate: 15,
      taxInclusivePricing: true,
      invoicePrefix: 'INV-',
      nextInvoiceNumber: 1001,
      receiptFooter: 'Thank you for shopping with us!',
      lowStockDefaultThreshold: 5,
      barcodeLabelWidthMm: 50,
      barcodeLabelHeightMm: 30,
      showPriceOnBarcode: true,
      showShopNameOnBarcode: true,
      ownerId,
      isDemoData: !!includeDemoData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const ownerUser: User = {
      id: ownerId,
      shopId,
      name: ownerName || 'Shop Owner',
      email,
      phone,
      role: 'owner',
      active: true,
      createdAt: new Date().toISOString(),
    };

    let newStore: ShopDatabaseState;
    if (includeDemoData) {
      newStore = createRealisticSeedData('bn');
      newStore.shop = { ...newStore.shop, ...newShop };
      newStore.users = [ownerUser, ...newStore.users.slice(1)];
    } else {
      newStore = {
        shop: newShop,
        users: [ownerUser],
        memberships: [
          {
            id: `${ownerId}_${shopId}`,
            userId: ownerId,
            shopId,
            role: 'owner',
            active: true,
            createdAt: new Date().toISOString(),
          },
        ],
        categories: [
          { id: 'cat_1', shopId, name: 'Grocery', createdAt: new Date().toISOString() },
          { id: 'cat_2', shopId, name: 'Beverages', createdAt: new Date().toISOString() },
        ],
        products: [],
        suppliers: [],
        customers: [],
        sales: [],
        purchases: [],
        stockMovements: [],
        expenses: [],
        payments: [],
        refunds: [],
        auditLogs: [],
      };
    }

    stores.set(shopId, newStore);
    logAudit(newStore, ownerUser, 'REGISTER', 'shop', shopId, `Created shop ${newShop.name}`);

    res.json({ user: ownerUser, shop: newShop });
  });

  // Authentication: Password Reset
  app.post('/api/auth/reset-password', (req, res) => {
    const { email } = req.body;
    res.json({
      message: `Password reset link and temporary security code generated for ${email}.`,
    });
  });

  // POS: Complete Sale
  app.post('/api/pos/checkout', (req, res) => {
    const { store, user } = getContext(req);
    const {
      cartItems,
      orderDiscount,
      taxInclusive,
      paymentMethod,
      cashPaid,
      cardPaid,
      creditAmount,
      customerId,
      notes,
    } = req.body;

    if (!cartItems || cartItems.length === 0) {
      return res.status(400).json({ error: 'Cart cannot be empty' });
    }

    // Calculate totals server-side
    const totals = calculateSaleTotals(cartItems, orderDiscount || 0, taxInclusive ?? true);

    const invoiceNumber = `${store.shop.invoicePrefix || 'INV-'}${store.shop.nextInvoiceNumber || 1001}`;
    store.shop.nextInvoiceNumber = (store.shop.nextInvoiceNumber || 1001) + 1;

    let customerName: string | undefined;
    let customerPhone: string | undefined;

    if (customerId) {
      const cust = store.customers.find((c) => c.id === customerId);
      if (cust) {
        customerName = cust.name;
        customerPhone = cust.phone;
        cust.totalSpent = roundCurrency((cust.totalSpent || 0) + totals.total);
        cust.loyaltyPoints = (cust.loyaltyPoints || 0) + Math.floor(totals.total / 10);
        if (paymentMethod === 'credit' || creditAmount > 0) {
          const addedDue = paymentMethod === 'credit' ? totals.total : creditAmount;
          cust.outstandingBalance = roundCurrency((cust.outstandingBalance || 0) + addedDue);
        }
      }
    }

    const saleId = `sale_${Date.now()}`;
    const saleItems = totals.items.map((item, idx) => ({
      ...item,
      id: `${saleId}_item_${idx}`,
      shopId: store.shop.id,
      saleId,
    }));

    const newSale: Sale = {
      id: saleId,
      shopId: store.shop.id,
      invoiceNumber,
      customerId,
      customerName,
      customerPhone,
      items: saleItems,
      subtotal: totals.subtotal,
      itemDiscountTotal: totals.itemDiscountTotal,
      orderDiscount: totals.orderDiscount,
      netRevenue: totals.netRevenue,
      taxTotal: totals.taxTotal,
      total: totals.total,
      totalCost: totals.totalCost,
      grossProfit: totals.grossProfit,
      taxInclusive: taxInclusive ?? true,
      paymentMethod: paymentMethod || 'cash',
      cashPaid: cashPaid || 0,
      cardPaid: cardPaid || 0,
      creditAmount: creditAmount || 0,
      changeDue: Math.max(0, (cashPaid || 0) + (cardPaid || 0) - totals.total),
      status: 'completed',
      refundedAmount: 0,
      notes,
      createdBy: user.id,
      createdByName: user.name,
      createdAt: new Date().toISOString(),
    };

    // Deduct stock and log movements
    for (const item of saleItems) {
      const prod = store.products.find((p) => p.id === item.productId);
      if (prod) {
        const previousStock = prod.stock;
        prod.stock -= item.quantity;
        prod.updatedAt = new Date().toISOString();

        const movement: StockMovement = {
          id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          shopId: store.shop.id,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          type: 'sale',
          quantityChange: -item.quantity,
          previousStock,
          newStock: prod.stock,
          unitCost: item.unitCost,
          referenceId: invoiceNumber,
          reason: `POS Sale ${invoiceNumber}`,
          createdBy: user.id,
          createdByName: user.name,
          createdAt: new Date().toISOString(),
        };
        store.stockMovements.unshift(movement);
      }
    }

    store.sales.unshift(newSale);
    logAudit(
      store,
      user,
      'SALE_COMPLETED',
      'sale',
      saleId,
      `Invoice ${invoiceNumber} completed for ${totals.total}`
    );

    res.json(newSale);
  });

  // POS: Void / Refund Sale
  app.post('/api/pos/refund', (req, res) => {
    const { store, user } = getContext(req);
    const { saleId, type, reason, restockItems } = req.body;

    const sale = store.sales.find((s) => s.id === saleId);
    if (!sale) return res.status(404).json({ error: 'Sale not found' });

    sale.status = type === 'void' ? 'voided' : 'refunded';
    sale.refundedAmount = sale.total;
    sale.updatedAt = new Date().toISOString();

    if (restockItems) {
      for (const item of sale.items) {
        const prod = store.products.find((p) => p.id === item.productId);
        if (prod) {
          const previousStock = prod.stock;
          prod.stock += item.quantity;
          prod.updatedAt = new Date().toISOString();

          const movement: StockMovement = {
            id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
            shopId: store.shop.id,
            productId: prod.id,
            productName: prod.name,
            sku: prod.sku,
            type: 'return',
            quantityChange: item.quantity,
            previousStock,
            newStock: prod.stock,
            unitCost: item.unitCost,
            referenceId: sale.invoiceNumber,
            reason: `Refund restock for ${sale.invoiceNumber}`,
            createdBy: user.id,
            createdByName: user.name,
            createdAt: new Date().toISOString(),
          };
          store.stockMovements.unshift(movement);
        }
      }
    }

    const refundRec: RefundRecord = {
      id: `ref_${Date.now()}`,
      shopId: store.shop.id,
      saleId: sale.id,
      invoiceNumber: sale.invoiceNumber,
      type: type || 'full_refund',
      amount: sale.total,
      taxRefunded: sale.taxTotal,
      netRevenueReversed: sale.netRevenue,
      cogsReversed: sale.totalCost,
      reason: reason || 'Customer return',
      restockItems: !!restockItems,
      createdBy: user.id,
      createdByName: user.name,
      createdAt: new Date().toISOString(),
    };
    store.refunds.unshift(refundRec);

    logAudit(
      store,
      user,
      'REFUND_PROCESSED',
      'sale',
      sale.id,
      `Refunded ${sale.invoiceNumber} for ${sale.total}. Restocked: ${restockItems}`
    );

    res.json({ success: true, refund: refundRec });
  });

  // Products: Create
  app.post('/api/products', (req, res) => {
    const { store, user } = getContext(req);
    const body = req.body;

    // Check duplicate barcode
    const dup = store.products.find((p) => p.barcode === body.barcode);
    if (dup) {
      return res.status(400).json({ error: `Barcode ${body.barcode} already in use by ${dup.name}` });
    }

    const newProd: Product = {
      id: `prod_${Date.now()}`,
      shopId: store.shop.id,
      name: body.name,
      sku: body.sku || `SKU-${Date.now().toString().slice(-6)}`,
      barcode: body.barcode,
      category: body.category || 'General',
      brand: body.brand || 'Generic',
      purchaseCost: body.purchaseCost || 0,
      sellingPrice: body.sellingPrice || 0,
      stock: body.stock || 0,
      minStockThreshold: body.minStockThreshold || 5,
      unit: body.unit || 'pcs',
      supplierId: body.supplierId,
      supplierName: body.supplierName,
      batchNumber: body.batchNumber,
      expiryDate: body.expiryDate,
      taxRate: body.taxRate ?? 15,
      taxCategory: body.taxCategory || 'standard',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.products.unshift(newProd);

    // Initial stock movement
    if (newProd.stock > 0) {
      store.stockMovements.unshift({
        id: `mov_${Date.now()}`,
        shopId: store.shop.id,
        productId: newProd.id,
        productName: newProd.name,
        sku: newProd.sku,
        type: 'adjustment',
        quantityChange: newProd.stock,
        previousStock: 0,
        newStock: newProd.stock,
        unitCost: newProd.purchaseCost,
        reason: 'Initial product stock creation',
        createdBy: user.id,
        createdByName: user.name,
        createdAt: new Date().toISOString(),
      });
    }

    logAudit(store, user, 'CREATE_PRODUCT', 'product', newProd.id, `Created product ${newProd.name}`);
    res.json(newProd);
  });

  // Products: Update
  app.put('/api/products/:id', (req, res) => {
    const { store, user } = getContext(req);
    const prod = store.products.find((p) => p.id === req.params.id);
    if (!prod) return res.status(404).json({ error: 'Product not found' });

    Object.assign(prod, req.body, { updatedAt: new Date().toISOString() });
    logAudit(store, user, 'UPDATE_PRODUCT', 'product', prod.id, `Updated product ${prod.name}`);
    res.json(prod);
  });

  // Products: Delete
  app.delete('/api/products/:id', (req, res) => {
    const { store, user } = getContext(req);
    const idx = store.products.findIndex((p) => p.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Product not found' });

    const [deleted] = store.products.splice(idx, 1);
    logAudit(store, user, 'DELETE_PRODUCT', 'product', deleted.id, `Deleted product ${deleted.name}`);
    res.json({ success: true });
  });

  // Inventory: Adjust
  app.post('/api/inventory/adjust', (req, res) => {
    const { store, user } = getContext(req);
    const { productId, type, quantityChange, reason } = req.body;

    const prod = store.products.find((p) => p.id === productId);
    if (!prod) return res.status(404).json({ error: 'Product not found' });

    const previousStock = prod.stock;
    prod.stock += quantityChange;
    prod.updatedAt = new Date().toISOString();

    const movement: StockMovement = {
      id: `mov_${Date.now()}`,
      shopId: store.shop.id,
      productId: prod.id,
      productName: prod.name,
      sku: prod.sku,
      type: type || 'adjustment',
      quantityChange,
      previousStock,
      newStock: prod.stock,
      unitCost: prod.purchaseCost,
      reason: reason || 'Manual inventory adjustment',
      createdBy: user.id,
      createdByName: user.name,
      createdAt: new Date().toISOString(),
    };
    store.stockMovements.unshift(movement);

    logAudit(
      store,
      user,
      'ADJUST_STOCK',
      'product',
      prod.id,
      `Adjusted ${prod.name} by ${quantityChange}. Reason: ${reason}`
    );

    res.json({ success: true, movement, product: prod });
  });

  // Purchases: Create PO
  app.post('/api/purchases', (req, res) => {
    const { store, user } = getContext(req);
    const body = req.body;

    const poNumber = `PO-${Date.now().toString().slice(-6)}`;
    const newPurchase: Purchase = {
      id: `po_${Date.now()}`,
      shopId: store.shop.id,
      purchaseNumber: poNumber,
      supplierId: body.supplierId,
      supplierName: body.supplierName,
      supplierInvoiceRef: body.supplierInvoiceRef,
      status: 'ordered',
      items: body.items || [],
      subtotal: body.subtotal,
      discountTotal: body.discountTotal || 0,
      taxTotal: body.taxTotal || 0,
      total: body.total,
      amountPaid: body.amountPaid || 0,
      balanceDue: body.balanceDue || 0,
      paymentMethod: body.paymentMethod || 'credit',
      notes: body.notes,
      createdBy: user.id,
      createdByName: user.name,
      createdAt: new Date().toISOString(),
    };

    store.purchases.unshift(newPurchase);

    // Update supplier outstanding balance if balance due
    if (newPurchase.balanceDue > 0) {
      const supp = store.suppliers.find((s) => s.id === body.supplierId);
      if (supp) {
        supp.outstandingBalance = roundCurrency((supp.outstandingBalance || 0) + newPurchase.balanceDue);
        supp.totalPurchased = roundCurrency((supp.totalPurchased || 0) + newPurchase.total);
      }
    }

    logAudit(store, user, 'CREATE_PO', 'purchase', newPurchase.id, `Created PO ${poNumber}`);
    res.json(newPurchase);
  });

  // Purchases: Receive PO & Recalculate WAC
  app.post('/api/purchases/:id/receive', (req, res) => {
    const { store, user } = getContext(req);
    const po = store.purchases.find((p) => p.id === req.params.id);
    if (!po) return res.status(404).json({ error: 'Purchase order not found' });
    if (po.status === 'received') {
      return res.status(400).json({ error: 'PO already received' });
    }

    po.status = 'received';
    po.receivedAt = new Date().toISOString();

    for (const item of po.items) {
      const prod = store.products.find((p) => p.id === item.productId);
      if (prod) {
        const previousStock = prod.stock;
        const currentCost = prod.purchaseCost;

        // Recalculate Weighted Average Cost (WAC)
        const newWacCost = calculateWeightedAverageCost(
          previousStock,
          currentCost,
          item.quantity,
          item.unitCost
        );

        prod.purchaseCost = newWacCost;
        prod.stock += item.quantity;
        prod.updatedAt = new Date().toISOString();

        store.stockMovements.unshift({
          id: `mov_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          shopId: store.shop.id,
          productId: prod.id,
          productName: prod.name,
          sku: prod.sku,
          type: 'purchase',
          quantityChange: item.quantity,
          previousStock,
          newStock: prod.stock,
          unitCost: item.unitCost,
          referenceId: po.purchaseNumber,
          reason: `Goods receipt from PO ${po.purchaseNumber} (WAC updated to ${newWacCost})`,
          createdBy: user.id,
          createdByName: user.name,
          createdAt: new Date().toISOString(),
        });
      }
    }

    logAudit(
      store,
      user,
      'RECEIVE_PO',
      'purchase',
      po.id,
      `Received goods for PO ${po.purchaseNumber}. WAC recalculated across all items.`
    );

    res.json(po);
  });

  // Suppliers: Create
  app.post('/api/suppliers', (req, res) => {
    const { store, user } = getContext(req);
    const newSupp: Supplier = {
      id: `supp_${Date.now()}`,
      shopId: store.shop.id,
      name: req.body.name,
      phone: req.body.phone || '',
      email: req.body.email,
      address: req.body.address || '',
      taxNumber: req.body.taxNumber,
      outstandingBalance: 0,
      totalPurchased: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.suppliers.unshift(newSupp);
    logAudit(store, user, 'CREATE_SUPPLIER', 'supplier', newSupp.id, `Added supplier ${newSupp.name}`);
    res.json(newSupp);
  });

  // Customers: Create
  app.post('/api/customers', (req, res) => {
    const { store, user } = getContext(req);
    const newCust: Customer = {
      id: `cust_${Date.now()}`,
      shopId: store.shop.id,
      name: req.body.name,
      phone: req.body.phone,
      address: req.body.address,
      vatNumber: req.body.vatNumber,
      creditLimit: req.body.creditLimit || 1000,
      outstandingBalance: 0,
      totalSpent: 0,
      loyaltyPoints: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    store.customers.unshift(newCust);
    logAudit(store, user, 'CREATE_CUSTOMER', 'customer', newCust.id, `Created customer ${newCust.name}`);
    res.json(newCust);
  });

  // Customers: Update
  app.put('/api/customers/:id', (req, res) => {
    const { store, user } = getContext(req);
    const cust = store.customers.find((c) => c.id === req.params.id);
    if (!cust) return res.status(404).json({ error: 'Customer not found' });
    Object.assign(cust, req.body, { updatedAt: new Date().toISOString() });
    logAudit(store, user, 'UPDATE_CUSTOMER', 'customer', cust.id, `Updated customer ${cust.name}`);
    res.json(cust);
  });

  // Expenses: Create
  app.post('/api/expenses', (req, res) => {
    const { store, user } = getContext(req);
    const newExp: Expense = {
      id: `exp_${Date.now()}`,
      shopId: store.shop.id,
      title: req.body.title,
      category: req.body.category,
      amount: req.body.amount,
      paymentMethod: req.body.paymentMethod || 'cash',
      referenceNote: req.body.referenceNote,
      expenseDate: req.body.expenseDate || new Date().toISOString(),
      createdBy: user.id,
      createdByName: user.name,
      createdAt: new Date().toISOString(),
    };
    store.expenses.unshift(newExp);
    logAudit(store, user, 'CREATE_EXPENSE', 'expense', newExp.id, `Expense: ${newExp.title} (${newExp.amount})`);
    res.json(newExp);
  });

  // Expenses: Delete
  app.delete('/api/expenses/:id', (req, res) => {
    const { store, user } = getContext(req);
    const idx = store.expenses.findIndex((e) => e.id === req.params.id);
    if (idx === -1) return res.status(404).json({ error: 'Expense not found' });
    const [deleted] = store.expenses.splice(idx, 1);
    logAudit(store, user, 'DELETE_EXPENSE', 'expense', deleted.id, `Deleted expense ${deleted.title}`);
    res.json({ success: true });
  });

  // Payments: Record Party Payment (Customer repayment or Supplier payment voucher)
  app.post('/api/payments', (req, res) => {
    const { store, user } = getContext(req);
    const { partyType, partyId, amount, paymentMethod, notes } = req.body;

    let partyName = 'Party';
    let previousBalance = 0;
    let newBalance = 0;

    if (partyType === 'customer') {
      const cust = store.customers.find((c) => c.id === partyId);
      if (!cust) return res.status(404).json({ error: 'Customer not found' });
      partyName = cust.name;
      previousBalance = cust.outstandingBalance || 0;
      cust.outstandingBalance = roundCurrency(Math.max(0, previousBalance - amount));
      newBalance = cust.outstandingBalance;
    } else {
      const supp = store.suppliers.find((s) => s.id === partyId);
      if (!supp) return res.status(404).json({ error: 'Supplier not found' });
      partyName = supp.name;
      previousBalance = supp.outstandingBalance || 0;
      supp.outstandingBalance = roundCurrency(Math.max(0, previousBalance - amount));
      newBalance = supp.outstandingBalance;
    }

    const receiptNumber = `RCP-${Date.now().toString().slice(-6)}`;
    const paymentRecord: PaymentRecord = {
      id: `pay_${Date.now()}`,
      shopId: store.shop.id,
      receiptNumber,
      partyType,
      partyId,
      partyName,
      amount,
      paymentMethod,
      previousBalance,
      newBalance,
      notes,
      createdBy: user.id,
      createdByName: user.name,
      createdAt: new Date().toISOString(),
    };

    store.payments.unshift(paymentRecord);
    logAudit(
      store,
      user,
      'RECORD_PAYMENT',
      partyType,
      partyId,
      `Payment voucher ${receiptNumber} recorded: ${amount} for ${partyName}`
    );

    res.json(paymentRecord);
  });

  // Settings: Update Shop Profile
  app.put('/api/settings', (req, res) => {
    const { store, user } = getContext(req);
    Object.assign(store.shop, req.body, { updatedAt: new Date().toISOString() });
    logAudit(store, user, 'UPDATE_SETTINGS', 'shop', store.shop.id, `Updated store settings`);
    res.json(store.shop);
  });

  // Reset Store Data
  app.post('/api/reset-data', (req, res) => {
    const { store, user } = getContext(req);
    const { includeDemoData } = req.body;

    let fresh: ShopDatabaseState;
    if (includeDemoData) {
      fresh = createRealisticSeedData('bn');
      fresh.shop.id = store.shop.id;
      fresh.shop.name = store.shop.name;
    } else {
      fresh = {
        shop: { ...store.shop, isDemoData: false },
        users: store.users,
        memberships: store.memberships,
        categories: store.categories,
        products: [],
        suppliers: [],
        customers: [],
        sales: [],
        purchases: [],
        stockMovements: [],
        expenses: [],
        payments: [],
        refunds: [],
        auditLogs: [],
      };
    }

    stores.set(store.shop.id, fresh);
    logAudit(fresh, user, 'RESET_DATA', 'shop', fresh.shop.id, `Reset database. Demo: ${includeDemoData}`);
    res.json({ success: true, state: fresh });
  });

  // --- VITE MIDDLEWARE OR STATIC SERVING ---
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SmartShop Pro server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start SmartShop Pro server:', err);
  process.exit(1);
});
