import React, { useState } from 'react';
import {
  Settings,
  Store,
  Users,
  ShieldCheck,
  Smartphone,
  Globe,
  Database,
  Printer,
  CheckCircle2,
  Download,
  ExternalLink,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { CurrencyCode, LanguageCode, Shop, User } from '../types';

export const SettingsView: React.FC = () => {
  const {
    state,
    currentUser,
    switchRoleUser,
    updateShopSettings,
    resetStoreDataMode,
    language,
    setLanguage,
    setShowApkModal,
  } = useShop();

  const shop = state?.shop;
  const users = state?.users || [];

  const [shopName, setShopName] = useState(shop?.name || 'SmartShop Pro');
  const [address, setAddress] = useState(shop?.address || '');
  const [phone, setPhone] = useState(shop?.phone || '');
  const [vatNumber, setVatNumber] = useState(shop?.vatNumber || '');
  const [currency, setCurrency] = useState<CurrencyCode>(shop?.currency || 'SAR');
  const [timezone, setTimezone] = useState(shop?.timezone || 'Asia/Riyadh');
  const [defaultTaxRate, setDefaultTaxRate] = useState(String(shop?.defaultTaxRate ?? 15));
  const [taxInclusivePricing, setTaxInclusivePricing] = useState(
    shop?.taxInclusivePricing ?? true
  );
  const [receiptFooter, setReceiptFooter] = useState(
    shop?.receiptFooter || 'Thank you for shopping with us! Please retain receipt for returns.'
  );

  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await updateShopSettings({
        name: shopName.trim(),
        address: address.trim(),
        phone: phone.trim(),
        vatNumber: vatNumber.trim(),
        currency,
        timezone,
        defaultTaxRate: parseFloat(defaultTaxRate) || 0,
        taxInclusivePricing,
        receiptFooter: receiptFooter.trim(),
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: unknown) {
      alert((err as Error).message || 'Failed to update settings');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div>
        <h1 className="text-xl font-bold tracking-tight text-slate-900">Store Settings & System</h1>
        <p className="text-xs text-slate-500">
          Configure shop profile, tax compliance, role simulation, and Android APK installation
        </p>
      </div>

      {/* Prominent Android APK / Mobile App Banner */}
      <div className="p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-800 to-emerald-950 text-white shadow-sm border border-slate-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">
                {language === 'bn' ? 'অ্যান্ড্রয়েড ফোন ও ট্যাবলেটে APK / অ্যাপ ইনস্টলেশন' : 'Android Phone & Tablet App / APK Installation'}
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono text-[10px] font-semibold">
                PWA / APK
              </span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              {language === 'bn'
                ? 'আপনার অ্যান্ড্রয়েড মোবাইলে Google Chrome দিয়ে এই ওয়েবসাইটটি ওপেন করে ৩-ডট মেনু থেকে "Install App" বা "Add to Home screen" চাপলে এটি সরাসরি ক্যামেরা বারকোড স্ক্যানারসহ ফুলস্ক্রিন অ্যাপ হিসেবে ইনস্টল হবে। এছাড়াও PWABuilder দিয়ে ৩০ সেকেন্ডে রেডিমেড APK প্যাকেজ তৈরি করতে পারেন।'
                : 'Install SmartShop Pro directly on any Android smartphone or tablet via Chrome ("Install App" or "Add to Home screen") with camera barcode scanner access. You can also package a signed standalone APK via PWABuilder.'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowApkModal(true)}
          className="shrink-0 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-xs flex items-center gap-1.5"
        >
          <Download className="w-4 h-4" />
          <span>{language === 'bn' ? 'APK ও ইনস্টল গাইড দেখুন' : 'View APK & Install Guide'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Shop Profile & Tax Settings (8 cols) */}
        <div className="lg:col-span-8 space-y-6">
          <form
            onSubmit={handleSaveSettings}
            className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4 text-xs"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Store className="w-4 h-4 text-emerald-600" />
                <h3 className="font-bold text-slate-900 text-sm">Shop Information & Invoicing</h3>
              </div>
              {saveSuccess && (
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Saved successfully
                </span>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-semibold text-slate-700 block mb-1">Shop Name *</label>
                <input
                  type="text"
                  required
                  value={shopName}
                  onChange={(e) => setShopName(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  VAT Registration Number *
                </label>
                <input
                  type="text"
                  required
                  value={vatNumber}
                  onChange={(e) => setVatNumber(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl font-mono focus:outline-none"
                  placeholder="300XXXXXXXXXXXX"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Contact Phone</label>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Currency Code</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value as CurrencyCode)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                >
                  <option value="SAR">SAR - Saudi Riyal (Default)</option>
                  <option value="BDT">BDT - Bangladeshi Taka (৳)</option>
                  <option value="USD">USD - US Dollar ($)</option>
                  <option value="AED">AED - UAE Dirham</option>
                  <option value="EUR">EUR - Euro (€)</option>
                  <option value="GBP">GBP - British Pound (£)</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">Business Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl bg-white focus:outline-none"
                >
                  <option value="Asia/Riyadh">Asia/Riyadh (GMT+3) - Default</option>
                  <option value="Asia/Dhaka">Asia/Dhaka (GMT+6)</option>
                  <option value="Asia/Dubai">Asia/Dubai (GMT+4)</option>
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="Europe/London">Europe/London</option>
                  <option value="America/New_York">America/New_York</option>
                </select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 block mb-1">
                  Default VAT Rate (%)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={defaultTaxRate}
                  onChange={(e) => setDefaultTaxRate(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl font-mono focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">
                  Store Physical Address
                </label>
                <input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                  placeholder="Street 14, Olaya District, Riyadh, Saudi Arabia"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="font-semibold text-slate-700 block mb-1">
                  Receipt Thermal Print Footer Note
                </label>
                <input
                  type="text"
                  value={receiptFooter}
                  onChange={(e) => setReceiptFooter(e.target.value)}
                  className="w-full p-2 border border-slate-200 rounded-xl focus:outline-none"
                />
              </div>

              <div className="sm:col-span-2 pt-1">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={taxInclusivePricing}
                    onChange={(e) => setTaxInclusivePricing(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span className="text-slate-800 font-semibold">
                    Tax-Inclusive Pricing (Retail shelf prices already include VAT)
                  </span>
                </label>
              </div>
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="submit"
                disabled={isSaving || currentUser?.role === 'cashier'}
                className="px-5 py-2.5 rounded-xl font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs"
              >
                {isSaving ? 'Updating...' : 'Save Store Profile'}
              </button>
            </div>
          </form>

          {/* Language Switcher */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Language / ভাষা</h3>
            </div>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setLanguage('bn')}
                className={`flex-1 p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                  language === 'bn'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                বাংলা (Bengali)
              </button>
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`flex-1 p-3 rounded-xl border text-center font-bold text-xs transition-all ${
                  language === 'en'
                    ? 'border-emerald-600 bg-emerald-50 text-emerald-900'
                    : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                }`}
              >
                English (Default)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Role Switcher & Database Reset (4 cols) */}
        <div className="lg:col-span-4 space-y-6">
          {/* Role simulation */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Role-Based Access</h3>
            </div>
            <p className="text-[11px] text-slate-500">
              Switch between simulated roles to test access control permissions across cashiers, managers, and owners.
            </p>

            <div className="space-y-2">
              {users.map((u) => {
                const isCurrent = currentUser?.id === u.id;
                return (
                  <button
                    key={u.id}
                    type="button"
                    onClick={() => switchRoleUser(u)}
                    className={`w-full p-2.5 rounded-xl border text-left flex items-center justify-between text-xs transition-colors ${
                      isCurrent
                        ? 'border-slate-900 bg-slate-900 text-white'
                        : 'border-slate-200 hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div>
                      <div className="font-bold">{u.name}</div>
                      <div
                        className={`text-[10px] ${isCurrent ? 'text-slate-300' : 'text-slate-500'}`}
                      >
                        {u.email}
                      </div>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                        isCurrent
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {u.role}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Database Reset / Demo Data Toggle */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex items-center gap-2">
              <Database className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-slate-900 text-sm">Demo Data & Ledger Reset</h3>
            </div>
            <p className="text-[11px] text-slate-500">
              Reset the store database state back to sample retail inventory or clear data to start clean.
            </p>

            <div className="space-y-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  if (confirm('Reload realistic retail demo store data (products, sales, customers, suppliers)?')) {
                    resetStoreDataMode(true);
                  }
                }}
                className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 text-left flex items-center justify-between"
              >
                <span>Load Sample Store Data</span>
                <span className="text-[10px] text-emerald-600 font-mono">Demo Mode</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  if (confirm('Clear all historical sales and start fresh with empty inventory?')) {
                    resetStoreDataMode(false);
                  }
                }}
                className="w-full py-2 px-3 rounded-xl border border-red-200 text-xs font-semibold text-red-600 hover:bg-red-50 text-left flex items-center justify-between"
              >
                <span>Reset to Clean Blank State</span>
                <span className="text-[10px] text-red-500 font-mono">Empty</span>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
