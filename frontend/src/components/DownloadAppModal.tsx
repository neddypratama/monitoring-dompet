import React, { useState } from 'react';
import { X, Smartphone, Apple, Download, Share2, Copy, Check, ShieldCheck } from 'lucide-react';

interface DownloadAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'android' | 'ios';
}

export const DownloadAppModal: React.FC<DownloadAppModalProps> = ({
  isOpen,
  onClose,
  defaultTab = 'android',
}) => {
  const [activeTab, setActiveTab] = useState<'android' | 'ios'>(defaultTab);
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  const appUrl = window.location.origin;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-5 pb-4 border-b border-slate-100 flex items-center justify-between bg-gradient-to-r from-slate-50 to-indigo-50/40">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-indigo-200">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-extrabold text-slate-800">Aplikasi Mobile DompetKu</h2>
              <p className="text-xs text-slate-500">Pasang di smartphone Android & iOS (iPhone/iPad)</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="p-4 pb-0">
          <div className="grid grid-cols-2 p-1 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('android')}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'android'
                  ? 'bg-white text-emerald-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Smartphone className="w-4 h-4 text-emerald-600" />
              <span>Android (APK & PWA)</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ios')}
              className={`flex items-center justify-center space-x-2 py-2.5 rounded-xl text-xs font-bold transition-all ${
                activeTab === 'ios'
                  ? 'bg-white text-slate-900 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Apple className="w-4 h-4 text-slate-800" />
              <span>Apple iOS (iPhone/iPad)</span>
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="p-6 overflow-y-auto space-y-4 text-slate-700">
          {activeTab === 'android' ? (
            /* ANDROID TAB */
            <div className="space-y-4">
              {/* Option 1: Direct APK Download */}
              <div className="p-4 rounded-2xl border border-emerald-200 bg-emerald-50/50 space-y-3">
                <div className="flex items-start justify-between">
                  <div>
                    <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-emerald-100 text-emerald-800">
                      Opsi 1: File Installer APK
                    </span>
                    <h3 className="text-sm font-extrabold text-slate-900 mt-1">
                      Download File DompetKu.apk
                    </h3>
                    <p className="text-xs text-slate-500">
                      Ukuran: 4.3 MB • Versi 1.0 • Android 7.0 ke atas
                    </p>
                  </div>
                  <ShieldCheck className="w-5 h-5 text-emerald-600 shrink-0" />
                </div>

                <a
                  href="/DompetKu.apk"
                  download="DompetKu.apk"
                  className="w-full flex items-center justify-center space-x-2 py-3 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white font-bold text-xs rounded-xl shadow-md shadow-emerald-200 transition-all hover:scale-[1.01] active:scale-[0.99]"
                >
                  <Download className="w-4 h-4" />
                  <span>Download DompetKu.apk (Android)</span>
                </a>

                <div className="bg-white/80 p-3 rounded-xl border border-emerald-100 text-[11px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-700">Cara Instalasi APK:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-500">
                    <li>Buka file <span className="font-semibold text-slate-700">DompetKu.apk</span> setelah selesai diunduh.</li>
                    <li>Jika muncul peringatan keamanan, pilih <strong>Setelan</strong> lalu aktifkan <strong>"Izinkan dari sumber ini"</strong>.</li>
                    <li>Ketuk <strong>Instal</strong> dan buka aplikasi dari layar utama HP Anda.</li>
                  </ol>
                </div>
              </div>

              {/* Option 2: PWA Install (Chrome) */}
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/70 space-y-2">
                <span className="px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase bg-slate-200 text-slate-700">
                  Opsi 2: Tanpa Download File (PWA)
                </span>
                <h4 className="text-xs font-bold text-slate-800">
                  Instal Langsung dari Google Chrome HP
                </h4>
                <p className="text-[11px] text-slate-500">
                  Buka situs ini di browser Chrome di HP Android Anda, ketuk ikon titik tiga <strong>(⋮)</strong> di pojok kanan atas, lalu pilih <strong>"Tambahkan ke Layar Utama"</strong> atau <strong>"Instal Aplikasi"</strong>.
                </p>
              </div>
            </div>
          ) : (
            /* IOS TAB */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 space-y-3">
                <div className="flex items-center space-x-2 text-slate-900 font-extrabold text-sm">
                  <Apple className="w-5 h-5" />
                  <span>Panduan Instalasi di iPhone / iPad (iOS)</span>
                </div>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Apple iOS mendukung instalasi aplikasi web resmi sebagai <strong>Progressive Web App (PWA)</strong> tanpa perlu App Store atau file APK. Aplikasi akan berjalan <em>fullscreen</em> tanpa bilah URL Safari.
                </p>

                {/* Steps */}
                <div className="space-y-2.5 pt-1">
                  <div className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      1
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">Buka Browser Safari</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Akses situs <span className="font-semibold text-indigo-600">{appUrl}</span> menggunakan browser <strong>Safari</strong> bawaan Apple.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      2
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">Ketuk Tombol Share (Bagikan)</p>
                      <p className="text-slate-500 text-[11px] mt-0.5 flex items-center flex-wrap gap-1">
                        Ketuk ikon kotak dengan panah ke atas (
                        <Share2 className="w-3.5 h-3.5 inline text-indigo-600" />
                        ) di bagian bawah layar Safari.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold text-xs flex items-center justify-center shrink-0">
                      3
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">Pilih "Tambahkan ke Layar Utama"</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Gulir ke bawah pada menu bagikan, lalu ketuk <strong>"Add to Home Screen"</strong> / <strong>"Tambahkan ke Layar Utama"</strong>.
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start space-x-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 font-bold text-xs flex items-center justify-center shrink-0">
                      4
                    </span>
                    <div className="text-xs">
                      <p className="font-bold text-slate-800">Selesai! Ketuk "Tambah" (Add)</p>
                      <p className="text-slate-500 text-[11px] mt-0.5">
                        Icon DompetKu akan muncul di homescreen iPhone/iPad Anda dan berjalan layaknya aplikasi native!
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Copy Link Bar */}
          <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[10px] font-bold text-slate-400 uppercase">Tautan Aplikasi</p>
              <p className="text-xs font-semibold text-slate-700 truncate">{appUrl}</p>
            </div>
            <button
              onClick={handleCopyLink}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-white hover:bg-slate-100 text-slate-700 rounded-xl text-xs font-bold border border-slate-200 transition-all shadow-2xs shrink-0"
            >
              {copied ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                  <span className="text-emerald-700">Tersalin!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-500" />
                  <span>Salin Link</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200/70 transition-colors"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
