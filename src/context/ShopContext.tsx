import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  LanguageCode,
  PaymentMethod,
  PaymentRecord,
  Product,
  Purchase,
  Sale,
  Shop,
  ShopDatabaseState,
  User,
  UserRole,
} from '../types';

export interface CartItem {
  product: Product;
  quantity: number;
  itemDiscount: number;
}

export type ActiveTab =
  | 'dashboard'
  | 'pos'
  | 'scanner'
  | 'products'
  | 'inventory'
  | 'purchases'
  | 'expenses'
  | 'customers'
  | 'reports'
  | 'settings';

interface ShopContextValue {
  state: ShopDatabaseState | null;
  currentUser: User | null;
  isLoading: boolean;
  error: string | null;
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  language: LanguageCode;
  setLanguage: (lang: LanguageCode) => void;

  // Cart & Scanner shared state
  cart: CartItem[];
  addToCart: (product: Product, qty?: number) => void;
  updateCartQuantity: (productId: string, qty: number) => void;
  updateCartDiscount: (productId: string, discount: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  prefilledBarcodeForNewProduct: string;
  setPrefilledBarcodeForNewProduct: (barcode: string) => void;

  // APK modal trigger
  showApkModal: boolean;
  setShowApkModal: (show: boolean) => void;

  // Auth Actions
  login: (email: string, password: string) => Promise<void>;
  registerShop: (payload: {
    shopName: string;
    ownerName: string;
    email: string;
    password: string;
    phone: string;
    address: string;
    vatNumber: string;
    currency: string;
    timezone: string;
    includeDemoData: boolean;
  }) => Promise<void>;
  resetPassword: (email: string, newPassword: string) => Promise<string>;
  logout: () => void;
  switchRoleUser: (user: User) => void;

  // Store Operations
  refreshState: () => Promise<void>;
  apiRequest: <T = unknown>(path: string, method?: string, body?: unknown) => Promise<T>;
  completePosSale: (payload: {
    orderDiscount: number;
    taxInclusive: boolean;
    paymentMethod: PaymentMethod;
    cashPaid: number;
    cardPaid: number;
    creditAmount: number;
    customerId?: string;
    notes?: string;
    managerOverride?: boolean;
  }) => Promise<Sale>;
  refundOrVoidSale: (
    saleId: string,
    payload: {
      type: 'void' | 'full_refund' | 'partial_refund';
      reason: string;
      restockItems: boolean;
      refundAmount?: number;
    }
  ) => Promise<void>;
  createPurchaseOrder: (payload: unknown) => Promise<Purchase>;
  receivePurchaseOrder: (purchaseId: string) => Promise<Purchase>;
  recordPartyPayment: (payload: {
    partyType: 'customer' | 'supplier';
    partyId: string;
    amount: number;
    paymentMethod: 'cash' | 'card' | 'bank_transfer';
    notes?: string;
  }) => Promise<PaymentRecord>;
  updateShopSettings: (updates: Partial<Shop>) => Promise<void>;
  resetStoreDataMode: (includeDemoData: boolean) => Promise<void>;
}

const ShopContext = createContext<ShopContextValue | undefined>(undefined);

const STORAGE_AUTH_KEY = 'smartshop_pro_session_v1';

export const ShopProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<ShopDatabaseState | null>(null);
  const [showApkModal, setShowApkModal] = useState<boolean>(false);
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_AUTH_KEY);
      if (saved) {
        return JSON.parse(saved).user || null;
      }
    } catch {
      // ignore
    }
    return {
      id: 'user_owner_1',
      shopId: 'shop_alnoor_riyadh',
      name: 'Tariq Al-Mansoor (Owner)',
      email: 'owner@smartshop.sa',
      role: 'owner' as UserRole,
      active: true,
      createdAt: new Date().toISOString(),
    };
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>('dashboard');
  const [language, setLanguageState] = useState<LanguageCode>('bn'); // default Bengali
  const [cart, setCart] = useState<CartItem[]>([]);
  const [prefilledBarcodeForNewProduct, setPrefilledBarcodeForNewProduct] = useState<string>('');

  const apiRequest = useCallback(
    async <T = unknown,>(
      path: string,
      method: string = 'GET',
      body?: unknown
    ): Promise<T> => {
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (currentUser) {
        headers['x-shop-id'] = currentUser.shopId;
        headers['x-user-id'] = currentUser.id;
      }

      const res = await fetch(path, {
        method,
        headers,
        body: body !== undefined ? JSON.stringify(body) : undefined,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data.error || `Request failed with status ${res.status}`);
      }
      return data as T;
    },
    [currentUser]
  );

  const refreshState = useCallback(async () => {
    if (!currentUser) {
      setState(null);
      setIsLoading(false);
      return;
    }
    try {
      setError(null);
      const data = await apiRequest<ShopDatabaseState>('/api/state', 'GET');
      setState(data);
      if (data.shop?.language) {
        setLanguageState(data.shop.language);
      }
      const freshUser = data.users.find((u) => u.id === currentUser.id);
      if (freshUser && (freshUser.role !== currentUser.role || freshUser.name !== currentUser.name)) {
        setCurrentUser(freshUser);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load shop state.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser, apiRequest]);

  useEffect(() => {
    refreshState();
  }, [refreshState]);

  const setLanguage = (lang: LanguageCode) => {
    setLanguageState(lang);
  };

  const addToCart = useCallback((product: Product, qty: number = 1) => {
    setCart((prev) => {
      const existingIndex = prev.findIndex((i) => i.product.id === product.id);
      if (existingIndex > -1) {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          product,
          quantity: updated[existingIndex].quantity + qty,
        };
        return updated;
      }
      return [...prev, { product, quantity: qty, itemDiscount: 0 }];
    });
  }, []);

  const updateCartQuantity = useCallback((productId: string, qty: number) => {
    if (qty <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) => (i.product.id === productId ? { ...i, quantity: qty } : i))
    );
  }, []);

  const updateCartDiscount = useCallback((productId: string, discount: number) => {
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, itemDiscount: Math.max(0, discount) } : i
      )
    );
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
  }, []);

  const login = async (email: string, password: string) => {
    const res = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Login failed.');
    }
    setCurrentUser(data.user);
    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify({ user: data.user }));
  };

  const registerShop = async (payload: {
    shopName: string;
    ownerName: string;
    email: string;
    password: string;
    phone: string;
    address: string;
    vatNumber: string;
    currency: string;
    timezone: string;
    includeDemoData: boolean;
  }) => {
    const res = await fetch('/api/auth/register-shop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Registration failed.');
    }
    setCurrentUser(data.user);
    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify({ user: data.user }));
  };

  const resetPassword = async (email: string, newPassword: string): Promise<string> => {
    const res = await fetch('/api/auth/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || 'Password reset failed.');
    }
    return data.message;
  };

  const logout = () => {
    setCurrentUser(null);
    setState(null);
    setCart([]);
    localStorage.removeItem(STORAGE_AUTH_KEY);
  };

  const switchRoleUser = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem(STORAGE_AUTH_KEY, JSON.stringify({ user }));
  };

  const completePosSale = async (payload: {
    orderDiscount: number;
    taxInclusive: boolean;
    paymentMethod: PaymentMethod;
    cashPaid: number;
    cardPaid: number;
    creditAmount: number;
    customerId?: string;
    notes?: string;
    managerOverride?: boolean;
  }) => {
    const items = cart.map((c) => ({
      productId: c.product.id,
      quantity: c.quantity,
      itemDiscount: c.itemDiscount,
    }));
    const sale = await apiRequest<Sale>('/api/sales', 'POST', {
      items,
      ...payload,
    });
    clearCart();
    await refreshState();
    return sale;
  };

  const refundOrVoidSale = async (
    saleId: string,
    payload: {
      type: 'void' | 'full_refund' | 'partial_refund';
      reason: string;
      restockItems: boolean;
      refundAmount?: number;
    }
  ) => {
    await apiRequest(`/api/sales/${saleId}/refund`, 'POST', payload);
    await refreshState();
  };

  const createPurchaseOrder = async (payload: unknown) => {
    const purchase = await apiRequest<Purchase>('/api/purchases', 'POST', payload);
    await refreshState();
    return purchase;
  };

  const receivePurchaseOrder = async (purchaseId: string) => {
    const purchase = await apiRequest<Purchase>(
      `/api/purchases/${purchaseId}/receive`,
      'POST',
      {}
    );
    await refreshState();
    return purchase;
  };

  const recordPartyPayment = async (payload: {
    partyType: 'customer' | 'supplier';
    partyId: string;
    amount: number;
    paymentMethod: 'cash' | 'card' | 'bank_transfer';
    notes?: string;
  }) => {
    const res = await apiRequest<{ payment: PaymentRecord }>('/api/payments', 'POST', payload);
    await refreshState();
    return res.payment;
  };

  const updateShopSettings = async (updates: Partial<Shop>) => {
    await apiRequest('/api/shop/settings', 'PUT', updates);
    await refreshState();
  };

  const resetStoreDataMode = async (includeDemoData: boolean) => {
    await apiRequest('/api/shop/reset-mode', 'POST', { includeDemoData });
    clearCart();
    await refreshState();
  };

  return (
    <ShopContext.Provider
      value={{
        state,
        currentUser,
        isLoading,
        error,
        activeTab,
        setActiveTab,
        language,
        setLanguage,
        cart,
        addToCart,
        updateCartQuantity,
        updateCartDiscount,
        removeFromCart,
        clearCart,
        prefilledBarcodeForNewProduct,
        setPrefilledBarcodeForNewProduct,
        showApkModal,
        setShowApkModal,
        login,
        registerShop,
        resetPassword,
        logout,
        switchRoleUser,
        refreshState,
        apiRequest,
        completePosSale,
        refundOrVoidSale,
        createPurchaseOrder,
        receivePurchaseOrder,
        recordPartyPayment,
        updateShopSettings,
        resetStoreDataMode,
      }}
    >
      {children}
    </ShopContext.Provider>
  );
};

export function useShop() {
  const ctx = useContext(ShopContext);
  if (!ctx) {
    throw new Error('useShop must be used inside a ShopProvider');
  }
  return ctx;
}
