export type UserRole = 'owner' | 'manager' | 'cashier';

export type LanguageCode = 'en' | 'bn';

export type CurrencyCode = 'SAR' | 'USD' | 'BDT' | 'AED' | 'EUR' | 'GBP';

export type TaxCategory = 'standard' | 'zero' | 'exempt';

export type PaymentMethod = 'cash' | 'card' | 'credit' | 'split';

export type StockMovementType = 'sale' | 'purchase' | 'return' | 'damage' | 'adjustment';

export interface Shop {
  id: string;
  name: string;
  logoUrl?: string;
  address: string;
  phone: string;
  email?: string;
  vatNumber: string;
  currency: CurrencyCode;
  language: LanguageCode;
  timezone: string;
  defaultTaxRate: number; // e.g. 15 for 15% VAT
  taxInclusivePricing: boolean;
  invoicePrefix: string;
  nextInvoiceNumber: number;
  receiptFooter: string;
  lowStockDefaultThreshold: number;
  barcodeLabelWidthMm: number;
  barcodeLabelHeightMm: number;
  showPriceOnBarcode: boolean;
  showShopNameOnBarcode: boolean;
  ownerId: string;
  isDemoData?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: string;
  shopId: string;
  name: string;
  email: string;
  phone?: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface Membership {
  id: string; // `${userId}_${shopId}`
  userId: string;
  shopId: string;
  role: UserRole;
  active: boolean;
  createdAt: string;
}

export interface Category {
  id: string;
  shopId: string;
  name: string;
  description?: string;
  createdAt: string;
}

export interface Product {
  id: string;
  shopId: string;
  name: string;
  sku: string;
  barcode: string;
  category: string;
  brand: string;
  imageUrl?: string;
  purchaseCost: number; // Weighted-average cost per unit
  sellingPrice: number;
  stock: number;
  minStockThreshold: number;
  unit: string; // pcs, kg, ltr, box, pack
  supplierId?: string;
  supplierName?: string;
  batchNumber?: string;
  expiryDate?: string; // YYYY-MM-DD
  taxRate: number; // e.g., 15
  taxCategory: TaxCategory;
  createdAt: string;
  updatedAt: string;
}

export interface Supplier {
  id: string;
  shopId: string;
  name: string;
  contactPerson?: string;
  phone: string;
  email?: string;
  address: string;
  taxNumber?: string;
  outstandingBalance: number;
  totalPurchased: number;
  createdAt: string;
  updatedAt: string;
}

export interface Customer {
  id: string;
  shopId: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  vatNumber?: string;
  creditLimit: number;
  outstandingBalance: number;
  totalSpent: number;
  loyaltyPoints: number;
  createdAt: string;
  updatedAt: string;
}

export interface SaleItem {
  id: string;
  shopId: string;
  saleId: string;
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

export interface Sale {
  id: string;
  shopId: string;
  invoiceNumber: string;
  customerId?: string;
  customerName?: string;
  customerPhone?: string;
  items: SaleItem[];
  subtotal: number;
  itemDiscountTotal: number;
  orderDiscount: number;
  netRevenue: number;
  taxTotal: number;
  total: number;
  totalCost: number;
  grossProfit: number;
  taxInclusive: boolean;
  paymentMethod: PaymentMethod;
  cashPaid: number;
  cardPaid: number;
  creditAmount: number;
  changeDue: number;
  status: 'completed' | 'voided' | 'refunded' | 'partial_refund';
  refundedAmount: number;
  notes?: string;
  managerOverrideBy?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
  updatedAt?: string;
}

export interface PurchaseItem {
  id: string;
  shopId: string;
  purchaseId: string;
  productId: string;
  productName: string;
  sku: string;
  quantity: number;
  unitCost: number;
  discount: number;
  taxRate: number;
  taxAmount: number;
  lineTotal: number;
  batchNumber?: string;
  expiryDate?: string;
}

export interface Purchase {
  id: string;
  shopId: string;
  purchaseNumber: string;
  supplierId: string;
  supplierName: string;
  supplierInvoiceRef?: string;
  status: 'ordered' | 'received' | 'returned';
  items: PurchaseItem[];
  subtotal: number;
  discountTotal: number;
  taxTotal: number;
  total: number;
  amountPaid: number;
  balanceDue: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer' | 'credit';
  notes?: string;
  receivedAt?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface StockMovement {
  id: string;
  shopId: string;
  productId: string;
  productName: string;
  sku: string;
  type: StockMovementType;
  quantityChange: number;
  previousStock: number;
  newStock: number;
  unitCost: number;
  referenceId?: string;
  reason: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface Expense {
  id: string;
  shopId: string;
  category: 'Rent' | 'Electricity' | 'Salaries' | 'Transport' | 'Maintenance' | 'Marketing' | 'Supplies' | 'Other';
  title: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  referenceNote?: string;
  expenseDate: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface PaymentRecord {
  id: string;
  shopId: string;
  receiptNumber: string;
  partyType: 'customer' | 'supplier';
  partyId: string;
  partyName: string;
  amount: number;
  paymentMethod: 'cash' | 'card' | 'bank_transfer';
  previousBalance: number;
  newBalance: number;
  referenceId?: string;
  notes?: string;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface RefundRecord {
  id: string;
  shopId: string;
  saleId: string;
  invoiceNumber: string;
  type: 'void' | 'full_refund' | 'partial_refund';
  amount: number;
  taxRefunded: number;
  netRevenueReversed: number;
  cogsReversed: number;
  reason: string;
  restockItems: boolean;
  createdBy: string;
  createdByName: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  shopId: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId?: string;
  details: string;
  createdAt: string;
}

export interface ShopDatabaseState {
  shop: Shop;
  users: User[];
  memberships: Membership[];
  categories: Category[];
  products: Product[];
  suppliers: Supplier[];
  customers: Customer[];
  sales: Sale[];
  purchases: Purchase[];
  stockMovements: StockMovement[];
  expenses: Expense[];
  payments: PaymentRecord[];
  refunds: RefundRecord[];
  auditLogs: AuditLog[];
}
