import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import {
  Camera,
  CameraOff,
  CheckCircle2,
  AlertCircle,
  Plus,
  Minus,
  ShoppingCart,
  PackagePlus,
  Search,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { useShop } from '../context/ShopContext';
import { Product } from '../types';
import { formatCurrency } from '../lib/i18n';

function playScanBeep() {
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1046.5, ctx.currentTime);
    gain.gain.setValueAtTime(0.12, ctx.currentTime);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.09);
  } catch {
    // Ignore audio context error
  }
}

export const BarcodeScannerView: React.FC = () => {
  const {
    state,
    addToCart,
    cart,
    setActiveTab,
    setPrefilledBarcodeForNewProduct,
    currentUser,
  } = useShop();

  const [isScanning, setIsScanning] = useState(false);
  const [cameras, setCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const [manualBarcode, setManualBarcode] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState<string>('');
  const [matchedProduct, setMatchedProduct] = useState<Product | null>(null);
  const [unknownBarcode, setUnknownBarcode] = useState<string | null>(null);
  const [scanQuantity, setScanQuantity] = useState<number>(1);
  const [scanFeedback, setScanFeedback] = useState<string | null>(null);

  const scannerRef = useRef<Html5Qrcode | null>(null);
  const lastScanTimestampRef = useRef<{ code: string; time: number }>({ code: '', time: 0 });

  const products = state?.products || [];
  const shop = state?.shop;

  const lookupBarcode = (rawCode: string, fromCamera = false) => {
    const code = rawCode.trim();
    if (!code) return;

    const now = Date.now();
    if (
      fromCamera &&
      lastScanTimestampRef.current.code === code &&
      now - lastScanTimestampRef.current.time < 2200
    ) {
      return;
    }
    lastScanTimestampRef.current = { code, time: now };

    if (soundEnabled) {
      playScanBeep();
    }

    setLastScannedCode(code);
    setScanQuantity(1);

    const found = products.find(
      (p) =>
        (p.barcode && p.barcode.toLowerCase() === code.toLowerCase()) ||
        p.sku.toLowerCase() === code.toLowerCase()
    );

    if (found) {
      setMatchedProduct(found);
      setUnknownBarcode(null);
      setScanFeedback(`পণ্য পাওয়া গেছে: ${found.name}`);
    } else {
      setMatchedProduct(null);
      setUnknownBarcode(code);
      setScanFeedback(null);
    }
  };

  const stopScanner = async () => {
    if (scannerRef.current) {
      try {
        if (scannerRef.current.isScanning) {
          await scannerRef.current.stop();
        }
        scannerRef.current.clear();
      } catch {
        // ignore
      }
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const startScanner = async (preferredCameraId?: string) => {
    setCameraError(null);
    try {
      await stopScanner();

      const devices = await Html5Qrcode.getCameras();
      if (!devices || devices.length === 0) {
        setCameraError(
          'কোনো ক্যামেরা পাওয়া যায়নি। নিচের ম্যানুয়াল বারকোড এন্ট্রি বা ইউএসবি বারকোড স্ক্যানার ব্যবহার করুন।'
        );
        return;
      }

      setCameras(devices);

      let targetCameraId = preferredCameraId || selectedCameraId;
      if (!targetCameraId) {
        const rearCam = devices.find((d) =>
          /back|rear|environment/i.test(d.label)
        );
        targetCameraId = rearCam ? rearCam.id : devices[0].id;
        setSelectedCameraId(targetCameraId);
      }

      const html5QrCode = new Html5Qrcode('smartshop-barcode-reader', {
        formatsToSupport: [
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.QR_CODE,
        ],
        verbose: false,
      });

      scannerRef.current = html5QrCode;
      setIsScanning(true);

      await html5QrCode.start(
        targetCameraId ? { deviceId: { exact: targetCameraId } } : { facingMode: 'environment' },
        {
          fps: 10,
          qrbox: { width: 260, height: 140 },
        },
        (decodedText) => {
          lookupBarcode(decodedText, true);
        },
        () => {
          // Frame without barcode
        }
      );
    } catch (err: unknown) {
      setIsScanning(false);
      const msg =
        err instanceof Error
          ? err.message
          : 'ক্যামেরা পারমিশন পাওয়া যায়নি।';
      setCameraError(
        `ক্যামেরা অ্যাক্সেস করা যায়নি (${msg})। আপনি নিচের ফিল্ডে কোড লিখেও স্ক্যান করতে পারেন।`
      );
    }
  };

  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualBarcode.trim()) return;
    lookupBarcode(manualBarcode, false);
  };

  const handleAddMatchedToCart = () => {
    if (!matchedProduct) return;
    addToCart(matchedProduct, scanQuantity);
    setScanFeedback(
      `${scanQuantity} × "${matchedProduct.name}" কার্টে যোগ করা হয়েছে!`
    );
  };

  const handleCreateProductFromUnknownBarcode = () => {
    if (!unknownBarcode) return;
    setPrefilledBarcodeForNewProduct(unknownBarcode);
    setActiveTab('products');
  };

  if (!shop) return null;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">
            ক্যামেরা ও ম্যানুয়াল বারকোড স্ক্যানার
          </h1>
          <p className="text-xs text-slate-500">
            EAN-13, EAN-8, UPC, Code 128 এবং USB/Bluetooth বারকোড স্ক্যানার সাপোর্ট করে
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setSoundEnabled(!soundEnabled)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50"
          >
            {soundEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-600" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-400" />
            )}
            <span>{soundEnabled ? 'Beep On' : 'Muted'}</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pos')}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 text-white px-4 py-2 text-xs font-semibold hover:bg-slate-800"
          >
            <ShoppingCart className="w-4 h-4 text-emerald-400" />
            <span>POS Cart ({cart.reduce((s, i) => s + i.quantity, 0)})</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="rounded-2xl bg-slate-900 text-white p-5 border border-slate-800">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-400" />
                <span className="text-sm font-semibold">লাইভ ক্যামেরা বারকোড রিডার</span>
              </div>

              <div className="flex items-center gap-2">
                {cameras.length > 1 && (
                  <select
                    value={selectedCameraId}
                    onChange={(e) => {
                      setSelectedCameraId(e.target.value);
                      if (isScanning) startScanner(e.target.value);
                    }}
                    className="rounded-lg bg-slate-800 border border-slate-700 px-2.5 py-1.5 text-xs text-slate-200"
                  >
                    {cameras.map((cam, idx) => (
                      <option key={cam.id} value={cam.id}>
                        {cam.label || `Camera ${idx + 1}`}
                      </option>
                    ))}
                  </select>
                )}

                {!isScanning ? (
                  <button
                    type="button"
                    onClick={() => startScanner()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 text-xs font-semibold transition-colors"
                  >
                    <Camera className="w-4 h-4" />
                    <span>ক্যামেরা চালু করুন</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => stopScanner()}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-red-600 hover:bg-red-500 text-white px-4 py-2 text-xs font-semibold transition-colors"
                  >
                    <CameraOff className="w-4 h-4" />
                    <span>ক্যামেরা বন্ধ করুন</span>
                  </button>
                )}
              </div>
            </div>

            <div className="relative rounded-xl overflow-hidden bg-slate-950 border border-slate-800 min-h-[260px] flex flex-col items-center justify-center">
              <div id="smartshop-barcode-reader" className="w-full max-w-md mx-auto" />

              {!isScanning && (
                <div className="p-8 text-center max-w-sm mx-auto">
                  <div className="w-14 h-14 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto mb-3 text-emerald-400">
                    <Camera className="w-7 h-7" />
                  </div>
                  <p className="text-sm font-semibold text-white">
                    ক্যামেরা স্ট্যান্ডবাই মোড
                  </p>
                  <p className="mt-1 text-xs text-slate-400 leading-relaxed">
                    বারকোড স্ক্যান করতে &quot;ক্যামেরা চালু করুন&quot; বাটনে চাপ দিন এবং পণ্যের বারকোড ক্যামেরার সামনে ধরুন।
                  </p>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="mt-3 rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 text-xs text-amber-200 flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}
          </div>

          <div className="rounded-2xl bg-white p-5 border border-slate-200">
            <h2 className="text-sm font-bold text-slate-900 mb-1">
              ম্যানুয়াল বারকোড / SKU এন্ট্রি
            </h2>
            <p className="text-xs text-slate-500 mb-3">
              বারকোড নম্বর লিখুন অথবা বারকোড স্ক্যানার গান দিয়ে স্ক্যান করে Enter চাপুন:
            </p>
            <form onSubmit={handleManualSubmit} className="flex gap-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={manualBarcode}
                  onChange={(e) => setManualBarcode(e.target.value)}
                  placeholder="বারকোড (যেমন: 6281000100114) বা SKU লিখুন..."
                  className="w-full rounded-xl border border-slate-300 pl-9 pr-3.5 py-2.5 text-sm font-mono focus:border-slate-900 focus:outline-none"
                />
              </div>
              <button
                type="submit"
                className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2.5 text-xs font-semibold whitespace-nowrap shrink-0"
              >
                খুঁজুন
              </button>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-[11px] font-semibold text-slate-500 mb-2">
                টেস্ট বারকোড (ক্লিক করে টেস্ট করুন):
              </div>
              <div className="flex flex-wrap gap-1.5">
                {products.slice(0, 4).map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => {
                      setManualBarcode(p.barcode || p.sku);
                      lookupBarcode(p.barcode || p.sku, false);
                    }}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-mono transition-colors"
                  >
                    {p.barcode || p.sku} ({p.name.slice(0, 14)}...)
                  </button>
                ))}
                <button
                  type="button"
                  onClick={() => {
                    const unknown = '6289999888771';
                    setManualBarcode(unknown);
                    lookupBarcode(unknown, false);
                  }}
                  className="px-2.5 py-1.5 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-200 text-xs font-mono transition-colors"
                >
                  6289999888771 (অজানা বারকোড টেস্ট)
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="lg:col-span-5">
          <div className="rounded-2xl bg-white p-6 border border-slate-200">
            <h2 className="text-base font-bold text-slate-900 mb-4">
              স্ক্যান করা পণ্যের ফলাফল
            </h2>

            {!lastScannedCode && (
              <div className="py-12 text-center">
                <p className="text-sm font-medium text-slate-600">
                  এখনো কোনো বারকোড স্ক্যান করা হয়নি
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  ক্যামেরার সামনে বারকোড ধরুন অথবা বামে কোড লিখে খুঁজুন।
                </p>
              </div>
            )}

            {matchedProduct && (
              <div className="space-y-4">
                <div className="rounded-xl bg-emerald-50 border border-emerald-200 px-3.5 py-2.5 flex items-center gap-2 text-xs font-medium text-emerald-800">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{scanFeedback || 'ক্যাটালগে পণ্যটি পাওয়া গেছে'}</span>
                </div>

                <div className="rounded-xl border border-slate-200 p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-xs font-mono text-slate-500">
                        বারকোড: {matchedProduct.barcode || 'N/A'} · SKU: {matchedProduct.sku}
                      </div>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5">
                        {matchedProduct.name}
                      </h3>
                      <div className="text-xs text-slate-500 mt-0.5">
                        {matchedProduct.category}
                      </div>
                    </div>
                    <div className="text-right font-mono tabular-nums">
                      <div className="text-lg font-bold text-emerald-700">
                        {formatCurrency(matchedProduct.sellingPrice, shop.currency)}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        প্রতি {matchedProduct.unit}
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <span className="text-slate-500">মজুদ স্টক:</span>
                    <span
                      className={`font-mono font-bold ${
                        matchedProduct.stock <= 0
                          ? 'text-red-600'
                          : matchedProduct.stock <= matchedProduct.minStockThreshold
                          ? 'text-amber-600'
                          : 'text-slate-900'
                      }`}
                    >
                      {matchedProduct.stock} {matchedProduct.unit}
                    </span>
                  </div>

                  <div className="pt-2 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-700">পরিমাণ:</span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setScanQuantity(Math.max(1, scanQuantity - 1))}
                        className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                      >
                        <Minus className="w-4 h-4" />
                      </button>
                      <input
                        type="number"
                        min={1}
                        value={scanQuantity}
                        onChange={(e) =>
                          setScanQuantity(Math.max(1, Number(e.target.value) || 1))
                        }
                        className="w-16 text-center rounded-lg border border-slate-200 py-1.5 text-sm font-mono font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setScanQuantity(scanQuantity + 1)}
                        className="w-9 h-9 rounded-lg border border-slate-200 flex items-center justify-center hover:bg-slate-50"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  <div className="pt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <button
                      type="button"
                      onClick={handleAddMatchedToCart}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white py-2.5 px-4 text-xs font-semibold transition-colors"
                    >
                      <ShoppingCart className="w-4 h-4" />
                      <span>কার্টে যোগ করুন</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        handleAddMatchedToCart();
                        setActiveTab('pos');
                      }}
                      className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 text-xs font-semibold transition-colors"
                    >
                      <span>চেকআউটে যান →</span>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {unknownBarcode && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div>
                    <h3 className="text-sm font-bold text-amber-950">
                      অপরিচিত বারকোড: <span className="font-mono">{unknownBarcode}</span>
                    </h3>
                    <p className="mt-1 text-xs text-amber-800 leading-relaxed">
                      এই বারকোডটি এখনো ক্যাটালগে যুক্ত করা হয়নি।
                    </p>
                  </div>
                </div>

                {currentUser?.role === 'cashier' ? (
                  <p className="text-xs text-amber-900 font-medium">
                    ম্যানেজার বা মালিককে এই নতুন পণ্যটি যুক্ত করতে বলুন।
                  </p>
                ) : (
                  <button
                    type="button"
                    onClick={handleCreateProductFromUnknownBarcode}
                    className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white py-2.5 px-4 text-xs font-semibold transition-colors"
                  >
                    <PackagePlus className="w-4 h-4 text-emerald-400" />
                    <span>বারকোড {unknownBarcode} দিয়ে নতুন পণ্য যোগ করুন</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
