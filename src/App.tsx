import React from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  ScanBarcode,
  Package,
  Boxes,
  Truck,
  Wallet,
  Users,
  BarChart3,
  Settings,
  LogOut,
  Globe,
} from 'lucide-react';
import { ShopProvider, useShop, ActiveTab } from './context/ShopContext';
import { AuthView } from './components/AuthView';
import { DashboardView } from './components/DashboardView';
import { PosView } from './components/PosView';
import { BarcodeScannerView } from './components/BarcodeScannerView';
import { ProductsView } from './components/ProductsView';
import { InventoryView } from './components/InventoryView';
import { PurchasesView } from './components/PurchasesView';
import { ExpensesProfitView } from './components/ExpensesProfitView';
import { CustomersCreditView } from './components/CustomersCreditView';
import { ReportsView } from './components/ReportsView';
import { SettingsView } from './components/SettingsView';
impoconstPWAInstallButton, OfflineConnectivityBanner } from './components/PWAInstallPrompt';
import { t } from './lib/i18n';

constconst MainShell: React.FC = () => {
  const {
    state,
    currentUser,
    isLoading,
    error,
    activeTab,
    setActiveTab,
    language,
    setLanguage,
    cart,
    logout,
    refreshState,
  } = useShop();

  if (!currentUser) {
    return <AuthView />;
  }

  if (isLoading && !state) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center mx-auto animate-pulse">
            <ScanBarcode className="w-6 h-6" />
          </div>
          <div className="text-sm font-bold text-slate-900">Loading SmartShop Pro...</div>
          <div className="text-xs text-slate-500">Verifying shop membership and inventory ledger</div>
        </div>
      </div>
    );
  }

  if (error && !state) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-2xl bg-white p-6 border border-slate-200 text-center space-y-4">
          <div className="text-base font-bold text-red-600">Connection Error</div>
          <p className="text-xs text-slate-600">{error}</p>
          <div className="flex justify-center gap-2">
            <button
              type="button"
              onClick={refreshState}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-semibold"
            >
              Retry
            </button>
            <button
              type="button"
              onClick={logout}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700"
            >
              Back to Sign In
            </button>
          </div>
        </div>
      </div>
    );
  }

  const shop = state?.shop;
  const cartCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const navItems: { id: ActiveTab; label: string; icon: React.ReactNode }[] = [
    { id: 'dashboard', label: t(language, 'dashboard'), icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'pos', label: t(language, 'pos'), icon: <ShoppingCart className="w-4 h-4" /> },
    { id: 'scanner', label: t(language, 'scanner'), icon: <ScanBarcode className="w-4 h-4" /> },
    { id: 'products', label: t(language, 'products'), icon: <Package className="w-4 h-4" /> },
    { id: 'inventory', label: t(language, 'inventory'), icon: <Boxes className="w-4 h-4" /> },
    { id: 'purchases', label: t(language, 'purchases'), icon: <Truck className="w-4 h-4" /> },
    { id: 'expenses', label: t(language, 'expenses'), icon: <Wallet className="w-4 h-4" /> },
    { id: 'customers', label: t(language, 'customers'), icon: <Users className="w-4 h-4" /> },
    { id: 'reports', label: t(language, 'reports'), icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'settings', label: t(language, 'settings'), icon: <Settings className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col md:flex-row">
      <OfflineConnectivityBanner />

      {/* Desktop Left Sidebar */}
      <aside className="hidden md:flex md:w-64 lg:w-68 bg-slate-900 text-slate-100 flex-col justify-between shrink-0 border-r border-slate-800">
        <div>
          {/* Brand Lockup */}
          <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
                <ScanBarcode className="w-5 h-5" />
              </div>
              <span className="text-base font-bold tracking-tight text-white truncate">
                {t(language, 'appName')}
              </span>
            </div>
          </div>

          {/* Shop & Active Role Context */}
          <div className="px-5 py-3.5 border-b border-slate-800/80 bg-slate-950/40 text-xs">
            <div className="font-bold text-white truncate">{shop?.name}</div>
            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
              {currentUser.name} ·{' '}
              <span className="uppercase text-emerald-400 font-mono font-semibold">
                {currentUser.role}
              </span>
            </div>
            <div className="text-[10px] text-slate-500 font-mono mt-0.5">
              {shop?.currency} · {shop?.timezone}
            </div>
          </div>

          {/* Sidebar Navigation */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-colors whitespace-nowrap ${
                    isActive
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <span className="flex items-center gap-2.5 truncate">
                    {item.icon}
                    <span className="truncate">{item.label}</span>
                  </span>
                  {item.id === 'pos' && cartCount > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 rounded-md bg-slate-900/60 text-[10px] font-mono">
                      {cartCount}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bottom Sidebar Controls */}
        <div className="p-4 border-t border-slate-800 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 px-3 py-2 text-xs font-semibold text-slate-200 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-emerald-400" />
              <span>{language === 'en' ? 'বাংলা' : 'English'}</span>
            </button>
            <button
              type="button"
              onClick={logout}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-800 hover:bg-red-950/70 px-3 py-2 text-xs font-semibold text-slate-300 hover:text-red-300 transition-colors"
              title={t(language, 'logout')}
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>{t(language, 'logout')}</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-0">
        {/* Top Bar Contract: 3 clean zones */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
          {/* Zone 1: Brand / Breadcrumb */}
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-sm font-bold text-slate-900 whitespace-nowrap truncate">
              {shop?.name || 'SmartShop Pro'}
            </span>
          </div>

          {/* Zone 2: Quick Top Navigation Links (Desktop) */}
          <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-600">
            <button
              type="button"
              onClick={() => setActiveTab('dashboard')}
              className={`hover:text-slate-900 whitespace-nowrap shrink-0 ${
                activeTab === 'dashboard' ? 'text-slate-900 font-bold underline underline-offset-4' : ''
              }`}
            >
              {t(language, 'dashboard')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pos')}
              className={`hover:text-slate-900 whitespace-nowrap shrink-0 ${
                activeTab === 'pos' ? 'text-slate-900 font-bold underline underline-offset-4' : ''
              }`}
            >
              {t(language, 'pos')} {cartCount > 0 ? `(${cartCount})` : ''}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scanner')}
              className={`hover:text-slate-900 whitespace-nowrap shrink-0 ${
                activeTab === 'scanner' ? 'text-slate-900 font-bold underline underline-offset-4' : ''
              }`}
            >
              {t(language, 'scanner')}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('reports')}
              className={`hover:text-slate-900 whitespace-nowrap shrink-0 ${
                activeTab === 'reports' ? 'text-slate-900 font-bold underline underline-offset-4' : ''
              }`}
            >
              {t(language, 'reports')}
            </button>
          </nav>

          {/* Zone 3: Primary Action & Language/PWA */}
          <div className="flex items-center gap-2 shrink-0">
            <PWAInstallButton />
            <button
              type="button"
              onClick={() => setLanguage(language === 'en' ? 'bn' : 'en')}
              className="md:hidden inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-slate-700"
            >
              {language === 'en' ? 'বাংলা' : 'EN'}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('scanner')}
              className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-1.5 text-xs font-semibold transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
            >
              <ScanBarcode className="w-3.5 h-3.5" />
              <span>{t(language, 'scanBarcode')}</span>
            </button>
          </div>
        </header>

        {/* Active View Viewport */}
        <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6">
          {activeTab === 'dashboard' && <DashboardView />}
          {activeTab === 'pos' && <PosView />}
          {activeTab === 'scanner' && <BarcodeScannerView />}
          {activeTab === 'products' && <ProductsView />}
          {activeTab === 'inventory' && <InventoryView />}
          {activeTab === 'purchases' && <PurchasesView />}
          {activeTab === 'expenses' && <ExpensesProfitView />}
          {activeTab === 'customers' && <CustomersCreditView />}
          {activeTab === 'reports' && <ReportsView />}
          {activeTab === 'settings' && <SettingsView />}
        </main>
      </div>

      {/* Mobile Fixed Bottom Navigation Bar (<= 15% viewport height, >= 44px touch targets) */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 grid grid-cols-5 items-center h-15 px-1">
        {(
          [
            { id: 'dashboard', label: 'Home', icon: <LayoutDashboard className="w-5 h-5" /> },
            { id: 'pos', label: `POS${cartCount ? ` (${cartCount})` : ''}`, icon: <ShoppingCart className="w-5 h-5" /> },
            { id: 'scanner', label: 'Scan', icon: <ScanBarcode className="w-5 h-5" /> },
            { id: 'products', label: 'Products', icon: <Package className="w-5 h-5" /> },
            { id: 'settings', label: 'More', icon: <Settings className="w-5 h-5" /> },
          ] as { id: ActiveTab; label: string; icon: React.ReactNode }[]
        ).map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center min-h-[44px] min-w-[44px] rounded-xl transition-colors ${
                isActive ? 'text-emerald-600 font-bold' : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.icon}
              <span className="text-[10px] mt-0.5 tracking-tight truncate">{tab.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
};

export function App() {
  return (
    <ShopProvider>
      <MainShell />
    </ShopProvider>
  );
}

export default App;
