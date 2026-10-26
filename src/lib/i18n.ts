import { CurrencyCode, LanguageCode } from '../types';

export const CURRENCY_SYMBOLS: Record<CurrencyCode, string> = {
  SAR: 'SAR',
  USD: '$',
  BDT: '৳',
  AED: 'AED',
  EUR: '€',
  GBP: '£',
};

export function formatCurrency(amount: number, currency: CurrencyCode = 'SAR'): string {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const formatted = safeAmount.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  if (currency === 'USD' || currency === 'EUR' || currency === 'GBP' || currency === 'BDT') {
    return `${CURRENCY_SYMBOLS[currency]}${formatted}`;
  }
  return `${CURRENCY_SYMBOLS[currency]} ${formatted}`;
}

export function formatDateTime(isoString: string, timezone: string = 'Asia/Riyadh'): string {
  if (!isoString) return '—';
  try {
    return new Intl.DateTimeFormat('en-GB', {
      timeZone: timezone,
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(isoString));
  } catch {
    return new Date(isoString).toLocaleString();
  }
}

export const TRANSLATIONS: Record<LanguageCode, Record<string, string>> = {
  en: {
    appName: 'SmartShop Pro',
    dashboard: 'Dashboard',
    pos: 'POS Checkout',
    scanner: 'Barcode Scanner',
    products: 'Products',
    inventory: 'Inventory',
    purchases: 'Purchases & Suppliers',
    expenses: 'Expenses & Profit',
    customers: 'Customers & Credit',
    reports: 'Reports',
    settings: 'Settings',
    logout: 'Sign Out',
    todaySales: "Today's Total Sales",
    todayGrossProfit: "Today's Gross Profit",
    todayNetProfit: "Today's Operating Profit",
    transactions: 'Transactions',
    totalProducts: 'Total Products',
    totalStockUnits: 'Total Stock Units',
    lowStock: 'Low Stock Alerts',
    outOfStock: 'Out of Stock',
    scanBarcode: 'Scan Barcode',
    newSale: 'New Sale',
    addProduct: 'Add Product',
    addPurchase: 'New Purchase',
    viewReports: 'View Reports',
    recentSales: 'Recent Sales',
    recentPurchases: 'Recent Purchases',
    salesTrend: 'Sales & Profit Trend',
    last7Days: 'Last 7 Days',
    last30Days: 'Last 30 Days',
    bestSellingProducts: 'Best-Selling Products',
    searchPlaceholder: 'Search by name, barcode, or SKU...',
    completeSale: 'Complete Checkout',
    clearCart: 'Clear',
    subtotal: 'Subtotal',
    discount: 'Discount',
    vatTax: 'VAT / Tax',
    totalPayable: 'Total Payable',
    cash: 'Cash',
    card: 'Card',
    credit: 'Customer Credit',
    split: 'Split Payment',
    changeDue: 'Change Due',
    customer: 'Customer',
    walkInCustomer: 'Walk-in Customer',
    printReceipt: 'Download / Print PDF Receipt',
    apkGuide: 'Android App / APK Guide',
    installPwa: 'Install App (APK)',
  },
  bn: {
    appName: 'স্মার্টশপ প্রো',
    dashboard: 'ড্যাশবোর্ড',
    pos: 'পিওএস চেকআউট',
    scanner: 'বারকোড স্ক্যানার',
    products: 'পণ্য তালিকা',
    inventory: 'ইনভেন্টরি ও স্টক',
    purchases: 'ক্রয় ও সরবরাহকারী',
    expenses: 'খরচ ও মুনাফা',
    customers: 'ক্রেতা ও বাকি হিসাব',
    reports: 'রিপোর্ট ও বিশ্লেষণ',
    settings: 'সেটিংস',
    logout: 'লগ আউট',
    todaySales: 'আজকের মোট বিক্রি',
    todayGrossProfit: 'আজকের মোট লাভ (Gross)',
    todayNetProfit: 'আজকের নিট মুনাফা (Net)',
    transactions: 'লেনদেন সংখ্যা',
    totalProducts: 'মোট পণ্য',
    totalStockUnits: 'মোট স্টক ইউনিট',
    lowStock: 'স্বল্প স্টক সতর্কতা',
    outOfStock: 'স্টক শেষ',
    scanBarcode: 'বারকোড স্ক্যান',
    newSale: 'নতুন বিক্রি',
    addProduct: 'পণ্য যোগ করুন',
    addPurchase: 'নতুন ক্রয়',
    viewReports: 'রিপোর্ট দেখুন',
    recentSales: 'সাম্প্রতিক বিক্রি',
    recentPurchases: 'সাম্প্রতিক ক্রয়',
    salesTrend: 'বিক্রি ও মুনাফার চার্ট',
    last7Days: 'গত ৭ দিন',
    last30Days: 'গত ৩০ দিন',
    bestSellingProducts: 'সর্বাধিক বিক্রিত পণ্য',
    searchPlaceholder: 'নাম, বারকোড বা এসকেইউ দিয়ে খুঁজুন...',
    completeSale: 'বিক্রি সম্পন্ন করুন',
    clearCart: 'মুছুন',
    subtotal: 'উপমোট',
    discount: 'ছাড়',
    vatTax: 'ভ্যাট / ট্যাক্স',
    totalPayable: 'সর্বমোট প্রদেয়',
    cash: 'নগদ (Cash)',
    card: 'কার্ড (Card)',
    credit: 'বাকি (Credit)',
    split: 'যৌথ পেমেন্ট (Split)',
    changeDue: 'ফেরতযোগ্য টাকা',
    customer: 'ক্রেতা',
    walkInCustomer: 'সাধারণ ক্রেতা',
    printReceipt: 'পিডিএফ রশিদ ডাউনলোড / প্রিন্ট',
    apkGuide: 'অ্যান্ড্রয়েড অ্যাপ / APK গাইড',
    installPwa: 'অ্যাপ ইন্সটল করুন (APK)',
  },
};

export function t(lang: LanguageCode, key: string): string {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS.en[key] || key;
}
