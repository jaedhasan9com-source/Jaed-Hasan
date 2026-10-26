import React, { useState } from 'react';
import { ScanBarcode, ShieldCheck, Store, KeyRound, ArrowRight, CheckCircle2, Smartphone } from 'lucide-react';
import { useShop } from '../context/ShopContext';

export const AuthView: React.FC = () => {
  const { login, registerShop, resetPassword, setShowApkModal, language } = useShop();
  const [mode, setMode] = useState<'login' | 'register' | 'reset'>('login');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const [email, setEmail] = useState('owner@smartshop.sa');
  const [password, setPassword] = useState('SmartShop123!');

  const [shopName, setShopName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [phone, setPhone] = useState('+966 50 000 0000');
  const [address, setAddress] = useState('Riyadh, Saudi Arabia');
  const [vatNumber, setVatNumber] = useState('310123456700003');
  const [currency, setCurrency] = useState('SAR');
  const [timezone, setTimezone] = useState('Asia/Riyadh');
  const [includeDemoData, setIncludeDemoData] = useState(true);

  const [newPassword, setNewPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await login(email, password);
      } else if (mode === 'register') {
        await registerShop({
          shopName,
          ownerName,
          email,
          password,
          phone,
          address,
          vatNumber,
          currency,
          timezone,
          includeDemoData,
        });
      } else {
        const msg = await resetPassword(email, newPassword);
        setSuccessMsg(msg);
        setMode('login');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleQuickDemoLogin = async (roleEmail: string) => {
    setError(null);
    setSubmitting(true);
    try {
      await login(roleEmail, 'SmartShop123!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Quick login failed.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl w-full mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        <div className="lg:col-span-5 flex flex-col justify-between rounded-2xl bg-slate-800/80 border border-slate-700/80 p-7">
          <div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                  <ScanBarcode className="w-6 h-6" />
                </div>
                <span className="text-xl font-bold tracking-tight text-white">SmartShop Pro</span>
              </div>
              <button
                type="button"
                onClick={() => setShowApkModal(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/25 transition"
              >
                <Smartphone className="w-3.5 h-3.5" />
                <span>{language === 'bn' ? 'APK গাইড' : 'APK Guide'}</span>
              </button>
            </div>

            <h1 className="mt-6 text-2xl sm:text-3xl font-bold text-white tracking-tight leading-snug">
              Enterprise Retail POS, Inventory & Barcode Management
            </h1>
            <p className="mt-3 text-sm text-slate-300 leading-relaxed">
              মুদি দোকান, সুপারমার্কেট, মিনি মার্কেট ও কসমেটিকস শপের জন্য সম্পূর্ণ রিটেইল ম্যানেজমেন্ট — ক্যামেরা বারকোড স্ক্যানার, স্টক কন্ট্রোল, পিওএস চেকআউট ও হিসাব-নিকাশ।
            </p>

            <div className="mt-6 space-y-3 text-xs text-slate-300 border-t border-slate-700/70 pt-5">
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Multi-Tenant Isolation:</strong> প্রতি শপের ডেটা সম্পূর্ণ আলাদা।
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Role-Based Control:</strong> Owner, Manager, Cashier রোল।
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  <strong className="text-white">Mobile & PWA Ready:</strong> ফোনে ইন্সটলযোগ্য ফুল-স্ক্রিন অ্যাপ।
                </span>
              </div>
            </div>
          </div>

          <div className="mt-8 pt-5 border-t border-slate-700/80">
            <p className="text-xs font-medium text-slate-400 mb-2.5">
              ডেমো টেস্ট করুন (Al-Noor Supermarket Riyadh):
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('owner@smartshop.sa')}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-950 border border-slate-700 text-left transition-colors"
              >
                <div className="text-xs font-semibold text-emerald-400">Owner</div>
                <div className="text-[11px] text-slate-400 truncate">মালিক একাউন্ট</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('manager@smartshop.sa')}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-950 border border-slate-700 text-left transition-colors"
              >
                <div className="text-xs font-semibold text-sky-400">Manager</div>
                <div className="text-[11px] text-slate-400 truncate">স্টক ও ক্রয়</div>
              </button>
              <button
                type="button"
                onClick={() => handleQuickDemoLogin('cashier@smartshop.sa')}
                className="px-3 py-2 rounded-xl bg-slate-900 hover:bg-slate-950 border border-slate-700 text-left transition-colors"
              >
                <div className="text-xs font-semibold text-amber-400">Cashier</div>
                <div className="text-[11px] text-slate-400 truncate">চেকআউট</div>
              </button>
            </div>
          </div>
        </div>

        <div className="lg:col-span-7 rounded-2xl bg-white text-slate-900 p-7 sm:p-8 shadow-xl border border-slate-200 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl mb-6">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  mode === 'login'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                লগইন (Sign In)
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setEmail('');
                  setPassword('');
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  mode === 'register'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                নতুন দোকান রেজিস্টার
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('reset');
                  setError(null);
                }}
                className={`flex-1 py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${
                  mode === 'reset'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                পাসওয়ার্ড রিসেট
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-xs font-medium text-red-700">
                {error}
              </div>
            )}

            {successMsg && (
              <div className="mb-4 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3 text-xs font-medium text-emerald-700">
                {successMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'login' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <ShieldCheck className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-lg font-bold text-slate-900">দোকান অ্যাকাউন্টে প্রবেশ করুন</h2>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      ইমেইল ঠিকানা (Email)
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="owner@smartshop.sa"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      পাসওয়ার্ড (Password)
                    </label>
                    <input
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                </>
              )}

              {mode === 'register' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <Store className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-lg font-bold text-slate-900">
                      নতুন শপ ওয়ার্কস্পেস তৈরি করুন
                    </h2>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        দোকানের নাম *
                      </label>
                      <input
                        type="text"
                        required
                        value={shopName}
                        onChange={(e) => setShopName(e.target.value)}
                        placeholder="যেমন: আল-মদিনা মিনি মার্কেট"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        মালিকের নাম *
                      </label>
                      <input
                        type="text"
                        required
                        value={ownerName}
                        onChange={(e) => setOwnerName(e.target.value)}
                        placeholder="আপনার নাম"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        ইমেইল ঠিকানা *
                      </label>
                      <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="owner@myshop.com"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        পাসওয়ার্ড *
                      </label>
                      <input
                        type="password"
                        required
                        minLength={6}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="কমপক্ষে ৬ অক্ষর"
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        মুদ্রা (Currency)
                      </label>
                      <select
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                      >
                        <option value="SAR">SAR — Saudi Riyal (সৌদি রিয়াল)</option>
                        <option value="BDT">BDT — Bangladeshi Taka (বাংলাদেশি টাকা)</option>
                        <option value="USD">USD — US Dollar</option>
                        <option value="AED">AED — UAE Dirham</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        টাইম জোন
                      </label>
                      <select
                        value={timezone}
                        onChange={(e) => setTimezone(e.target.value)}
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-sm bg-white"
                      >
                        <option value="Asia/Riyadh">Asia/Riyadh (রিয়াদ সময়)</option>
                        <option value="Asia/Dhaka">Asia/Dhaka (বাংলাদেশ সময়)</option>
                        <option value="Asia/Dubai">Asia/Dubai (দুবাই সময়)</option>
                      </select>
                    </div>
                  </div>
                  <label className="flex items-center gap-2.5 pt-1 text-xs text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeDemoData}
                      onChange={(e) => setIncludeDemoData(e.target.checked)}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    />
                    <span>স্যাম্পল পণ্য ক্যাটালগ যোগ করুন (সেটিংস থেকে যেকোনো সময় মুছা যাবে)</span>
                  </label>
                </>
              )}

              {mode === 'reset' && (
                <>
                  <div className="flex items-center gap-2 mb-2">
                    <KeyRound className="w-5 h-5 text-emerald-600" />
                    <h2 className="text-lg font-bold text-slate-900">পাসওয়ার্ড রিসেট করুন</h2>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      রেজিস্টার্ড ইমেইল ঠিকানা
                    </label>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      নতুন পাসওয়ার্ড
                    </label>
                    <input
                      type="password"
                      required
                      minLength={6}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="নতুন পাসওয়ার্ড লিখুন (কমপক্ষে ৬ অক্ষর)"
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm"
                    />
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={submitting}
                className="w-full mt-2 inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold py-3 px-4 text-sm transition-colors disabled:opacity-50"
              >
                <span>
                  {submitting
                    ? 'প্রক্রিয়াকরণ হচ্ছে...'
                    : mode === 'login'
                    ? 'SmartShop Pro-তে প্রবেশ করুন'
                    : mode === 'register'
                    ? 'দোকান অ্যাকাউন্ট তৈরি করুন'
                    : 'পাসওয়ার্ড পরিবর্তন করুন'}
                </span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-100 text-[11px] text-slate-500 flex items-center justify-between">
            <span>নিরাপদ Multi-Tenant স্টোরেজ ও সার্ভার ভেরিফিকেশন</span>
            <span>Default Currency: SAR · Asia/Riyadh</span>
          </div>
        </div>
      </div>
    </div>
  );
};
