import React, { useEffect, useState } from 'react';
import { Download, Smartphone, WifiOff, X, ExternalLink, CheckCircle2 } from 'lucide-react';
import { useShop } from '../context/ShopContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstalled, setIsInstalled] = useState(false);
  const [isIOS, setIsIOS] = useState(false);

  useEffect(() => {
    const isStandalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsInstalled(isStandalone);

    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const handleAppInstalled = () => {
      setIsInstalled(true);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
      setDeferredPrompt(null);
      return true;
    }
    return false;
  };

  return {
    isInstallable: !!deferredPrompt,
    isInstalled,
    isIOS,
    install,
  };
}

export const AndroidApkGuideModal: React.FC = () => {
  const { showApkModal, setShowApkModal, language } = useShop();
  const { isInstallable, install } = usePWAInstall();

  if (!showApkModal) return null;

  const currentUrl = typeof window !== 'undefined' ? window.location.origin : '';
  const pwaBuilderUrl = `https://www.pwabuilder.com?site=${encodeURIComponent(currentUrl)}`;

  const isBn = language === 'bn';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 space-y-4 my-8 text-slate-900">
        <div className="flex items-center justify-between pb-3 border-b border-slate-200">
          <div className="flex items-center gap-2">
            <Smartphone className="w-6 h-6 text-emerald-600" />
            <h3 className="text-base font-bold text-slate-900">
              {isBn ? 'অ্যান্ড্রয়েড APK ও ইনস্টলেশন গাইড' : 'Android APK & Installation Guide'}
            </h3>
          </div>
          <button
            type="button"
            onClick={() => setShowApkModal(false)}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isBn ? (
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
              <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ১. সবচেয়ে সহজ উপায়: ফোনে সরাসরি ইনস্টল (কোনো APK ডাউনলোড ছাড়াই)
              </h4>
              <p className="text-emerald-900 text-xs">
                SmartShop Pro একটি প্রোগ্রেসিভ ওয়েব অ্যাপ (PWA)। অ্যান্ড্রয়েড ফোনে ইনস্টল করলে এটি অন্যান্য যেকোনো সাধারণ APK অ্যাপের মতোই হোম স্ক্রিনে নিজস্ব আইকন সহ ফুল-স্ক্রিনে চলে। ক্যামেরা বারকোড স্ক্যানার এবং অফলাইন সাপোর্টও সম্পূর্ণ কার্যকর থাকে।
              </p>
              {isInstallable ? (
                <button
                  type="button"
                  onClick={() => install()}
                  className="mt-3 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>এখনই ফোনে অ্যাপ ইনস্টল করুন</span>
                </button>
              ) : (
                <div className="mt-2.5 bg-white/80 p-2.5 rounded-lg border border-emerald-200 text-emerald-900 text-[11px]">
                  <strong>ইনস্টল করার নিয়ম:</strong> অ্যান্ড্রয়েড ফোনে <strong>Chrome ব্রাউজারের ৩-ডট (⋮) মেনু</strong> চাপুন &gt; এরপর <strong>&quot;Install app&quot;</strong> অথবা <strong>&quot;Add to Home screen&quot; (হোম স্ক্রিনে যোগ করুন)</strong>-এ চাপ দিন। সাথে সাথে অ্যাপটি ইনস্টল হয়ে যাবে!
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">
                ২. সরাসরি .APK ফাইল তৈরি ও ডাউনলোড করতে চান?
              </h4>
              <p className="text-slate-600">
                আমাদের অ্যাপটি 100% PWA ও Android Web-App স্ট্যান্ডার্ড অনুযায়ী তৈরি। আপনি মাইক্রোসফটের <strong>PWABuilder</strong> দিয়ে মাত্র ১ ক্লিকে এই সাইটের লিংকের জন্য বিনামূল্যে সাইন করা অ্যান্ড্রয়েড প্যাকেজ (.apk) তৈরি করতে পারবেন:
              </p>
              <div className="pt-1">
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs transition-colors"
                >
                  <span>PWABuilder দিয়ে APK তৈরি করুন</span>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                </a>
              </div>
              <p className="text-[11px] text-slate-500 pt-1">
                ধাপ: উপরের বাটনে চাপ দিন &gt; &quot;Start&quot; &gt; &quot;Package for Stores&quot; &gt; Android APK ডাউনলোড করুন।
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-4 text-xs text-slate-700 leading-relaxed">
            <div className="bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl">
              <h4 className="font-bold text-emerald-950 flex items-center gap-1.5 text-sm mb-1">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                1. Fastest Way: Instant Phone Install (No APK download required)
              </h4>
              <p className="text-emerald-900 text-xs">
                SmartShop Pro is built as an installable PWA. When installed on Android, it launches as a standalone app with its own home screen icon, fullscreen retail interface, camera scanner access, and offline data cache.
              </p>
              {isInstallable ? (
                <button
                  type="button"
                  onClick={() => install()}
                  className="mt-3 w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Install App on Device Now</span>
                </button>
              ) : (
                <div className="mt-2.5 bg-white/80 p-2.5 rounded-lg border border-emerald-200 text-emerald-900 text-[11px]">
                  <strong>How to install:</strong> Open this app in Chrome on your Android device &gt; tap the <strong>3-dots (⋮) menu</strong> &gt; tap <strong>&quot;Install app&quot;</strong> or <strong>&quot;Add to Home screen&quot;</strong>.
                </div>
              )}
            </div>

            <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl space-y-2">
              <h4 className="font-bold text-slate-900 text-sm">
                2. Need a Standalone .APK File for Distribution?
              </h4>
              <p className="text-slate-600">
                You can generate a signed APK or AAB package for free via Microsoft PWABuilder:
              </p>
              <div className="pt-1">
                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs"
                >
                  <span>Build APK via PWABuilder</span>
                  <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                </a>
              </div>
            </div>
          </div>
        )}

        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            type="button"
            onClick={() => setShowApkModal(false)}
            className="px-5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs"
          >
            {isBn ? 'বুঝেছি (Close)' : 'Close'}
          </button>
        </div>
      </div>
    </div>
  );
};

export const PWAInstallButton: React.FC = () => {
  const { setShowApkModal, language } = useShop();
  const { isInstalled } = usePWAInstall();

  if (isInstalled) {
    return null;
  }

  return (
    <button
      type="button"
      onClick={() => setShowApkModal(true)}
      className="inline-flex items-center gap-1.5 rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-900 hover:bg-emerald-100 transition-colors whitespace-nowrap shrink-0 min-h-[36px]"
      title="Android APK & Installation Guide"
    >
      <Smartphone className="w-4 h-4 text-emerald-700" />
      <span>{language === 'bn' ? 'APK / অ্যাপ ইন্সটল' : 'Install App / APK'}</span>
    </button>
  );
};

export const OfflineConnectivityBanner: React.FC = () => {
  const [isOnline, setIsOnline] = useState(
    typeof navigator !== 'undefined' ? navigator.onLine : true
  );

  useEffect(() => {
    const onOnline = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    window.addEventListener('online', onOnline);
    window.addEventListener('offline', onOffline);
    return () => {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('offline', onOffline);
    };
  }, []);

  if (isOnline) return null;

  return (
    <div className="fixed bottom-20 md:bottom-4 left-4 z-50 flex items-center gap-2 rounded-xl bg-amber-600 px-3.5 py-2 text-xs font-medium text-white shadow-lg">
      <WifiOff className="w-4 h-4 shrink-0" />
      <span>Offline Mode — Using cached store state</span>
    </div>
  );
};
