import React, { useState, useEffect } from 'react';
import { TabType } from '../components/Navbar';
import { Wallet as WalletType, ReceiptItem } from '../types';
import { apiRequest } from '../api/client';
import { ReceiptItemRow } from '../components/ReceiptItemRow';
import { SplitSummaryModal } from '../components/SplitSummaryModal';
import {
  Camera,
  Sparkles,
  Plus,
  AlertCircle,
  ArrowRight
} from 'lucide-react';

interface ScanReceiptPageProps {
  onNavigate?: (tab: TabType) => void;
}

export const ScanReceiptPage: React.FC<ScanReceiptPageProps> = ({ onNavigate }) => {
  const [step, setStep] = useState<'upload' | 'scanning' | 'review'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string>('');
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [existingFriends, setExistingFriends] = useState<string[]>([]);
  const [provider, setProvider] = useState<string>('gemini');

  // Extracted data state
  const [merchantName, setMerchantName] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [imagePath, setImagePath] = useState<string>('');
  const [rawSubtotal, setRawSubtotal] = useState<number>(0);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [deliveryFee, setDeliveryFee] = useState<number>(0);
  const [serviceTaxFee, setServiceTaxFee] = useState<number>(0);
  const [totalPaid, setTotalPaid] = useState<number>(0);
  const [notes, setNotes] = useState<string>('');
  const [items, setItems] = useState<ReceiptItem[]>([]);

  const [error, setError] = useState<string>('');
  const [isSummaryModalOpen, setIsSummaryModalOpen] = useState<boolean>(false);

  useEffect(() => {
    async function loadInitial() {
      try {
        const [wData, rData] = await Promise.all([
          apiRequest<WalletType[]>('/wallets'),
          apiRequest<any[]>('/receivables'),
        ]);
        setWallets(wData || []);
        const friends = Array.from(new Set((rData || []).map((r) => r.friend_name)));
        setExistingFriends(friends as string[]);
      } catch (err) {
        console.error(err);
      }
    }
    loadInitial();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleStartScan = async () => {
    if (!selectedFile) {
      setError('Pilih atau ambil foto struk terlebih dahulu.');
      return;
    }

    setStep('scanning');
    setError('');

    const formData = new FormData();
    formData.append('image', selectedFile);
    formData.append('provider', provider);

    try {
      const res = await apiRequest<any>('/receipts/scan', {
        method: 'POST',
        body: formData,
      });

      setMerchantName(res.merchant_name || 'Restoran / Toko');
      setTransactionDate(res.transaction_date || new Date().toISOString().split('T')[0]);
      setImagePath(res.image_path || '');
      setRawSubtotal(Number(res.raw_subtotal) || 0);
      setDiscountAmount(Number(res.discount_amount) || 0);
      setDeliveryFee(Number(res.delivery_fee) || 0);
      setServiceTaxFee(Number(res.service_tax_fee) || 0);
      setTotalPaid(Number(res.total_paid) || 0);

      const parsedItems = (res.items || []).map((it: any) => ({
        name: it.name,
        qty: it.qty || 1,
        raw_price: it.raw_price || 0,
        assigned_to: 'Pribadi',
        is_self: true,
      }));
      setItems(parsedItems);

      recalculateItems(parsedItems, Number(res.raw_subtotal) || 0, Number(res.total_paid) || 0);
      setStep('review');
    } catch (err: any) {
      setError(err.message || 'Gagal memindai struk. Pastikan API key sudah diisi di Pengaturan.');
      setStep('upload');
    }
  };

  const recalculateItems = (itemList: ReceiptItem[], subtotalVal: number, totalVal: number) => {
    if (itemList.length === 0) return;

    const sub = subtotalVal > 0 ? subtotalVal : itemList.reduce((acc, it) => acc + it.raw_price, 0);
    if (sub <= 0 || totalVal <= 0) {
      setItems(itemList.map((it) => ({ ...it, net_price: it.raw_price })));
      return;
    }

    // Proportional calculation with integer penny distribution
    let sumRounded = 0;
    const allocations = itemList.map((it, idx) => {
      const ratio = it.raw_price / sub;
      const exact = totalVal * ratio;
      const floorVal = Math.floor(exact);
      sumRounded += floorVal;
      return {
        idx,
        floorVal,
        remainder: exact - floorVal,
      };
    });

    const diff = Math.round(totalVal - sumRounded);
    allocations.sort((a, b) => b.remainder - a.remainder);
    for (let i = 0; i < diff; i++) {
      allocations[i % allocations.length].floorVal += 1;
    }
    allocations.sort((a, b) => a.idx - b.idx);

    const updated = itemList.map((it, idx) => ({
      ...it,
      net_price: allocations[idx].floorVal,
    }));
    setItems(updated);
  };

  const handleItemChange = (index: number, updated: ReceiptItem) => {
    const copy = [...items];
    copy[index] = updated;
    recalculateItems(copy, rawSubtotal, totalPaid);
  };

  const handleAddItem = () => {
    const copy = [
      ...items,
      {
        name: 'Item Tambahan',
        qty: 1,
        raw_price: 10000,
        assigned_to: 'Pribadi',
        is_self: true,
      },
    ];
    recalculateItems(copy, rawSubtotal, totalPaid);
  };

  const handleDeleteItem = (index: number) => {
    const copy = items.filter((_, i) => i !== index);
    recalculateItems(copy, rawSubtotal, totalPaid);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          Scan Struk & Split Bill Multi-AI
        </h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Foto struk minimarket atau tagihan ShopeeFood untuk dihitung harga bersihnya secara adil
        </p>
      </div>

      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 flex items-center space-x-3 text-rose-700 text-xs">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Step 1: Upload */}
      {step === 'upload' && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-xs space-y-6">
          <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-3xl p-8 text-center transition-colors bg-slate-50/50">
            {previewUrl ? (
              <div className="space-y-4">
                <img
                  src={previewUrl}
                  alt="Preview Struk"
                  className="max-h-72 mx-auto rounded-2xl shadow-md border border-slate-200 object-contain"
                />
                <div>
                  <label className="cursor-pointer px-4 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-700 hover:bg-slate-50 shadow-2xs">
                    Ganti Foto
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            ) : (
              <label className="cursor-pointer flex flex-col items-center justify-center space-y-3">
                <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-xs">
                  <Camera className="w-8 h-8" />
                </div>
                <div>
                  <p className="text-sm font-bold text-slate-800">
                    Klik untuk Ambil Foto atau Unggah Tangkapan Layar
                  </p>
                  <p className="text-xs text-slate-400 mt-1">
                    Mendukung struk fisik Alfamart/Indomaret, atau screenshot ShopeeFood / GoFood (JPG, PNG, WebP)
                  </p>
                </div>
                <input
                  type="file"
                  accept="image/*"
                  capture="environment"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </label>
            )}
          </div>

          <div className="flex flex-col sm:flex-row justify-between items-center gap-4 pt-2">
            <div className="flex items-center space-x-2 text-xs">
              <span className="font-bold text-slate-600">Model AI:</span>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value)}
                className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold focus:border-indigo-500 outline-none"
              >
                <option value="gemini">Google Gemini (Disarankan)</option>
                <option value="groq">Groq Vision</option>
                <option value="openrouter">OpenRouter</option>
                <option value="openai">OpenAI GPT-4o</option>
              </select>
            </div>

            <button
              onClick={handleStartScan}
              disabled={!selectedFile}
              className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-lg shadow-indigo-100 flex items-center justify-center space-x-2 transition-all disabled:opacity-40"
            >
              <Sparkles className="w-4 h-4" />
              <span>Analisis dengan AI</span>
            </button>
          </div>
        </div>
      )}

      {/* Step 2: Scanning Loading */}
      {step === 'scanning' && (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200 shadow-xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto animate-pulse">
            <Sparkles className="w-8 h-8 animate-spin" />
          </div>
          <div>
            <h3 className="text-lg font-extrabold text-slate-800">
              AI Sedang Membaca Struk...
            </h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Mengekstrak nama item, menghitung proporsi diskon promo, ongkos kirim, dan biaya layanan.
            </p>
          </div>
        </div>
      )}

      {/* Step 3: Review & Split */}
      {step === 'review' && (
        <div className="space-y-6">
          {/* Header Bill Info */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 pb-4 border-b border-slate-100">
              <div className="flex-1">
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Merchant / Toko</label>
                <input
                  type="text"
                  value={merchantName}
                  onChange={(e) => setMerchantName(e.target.value)}
                  className="text-lg font-extrabold text-slate-900 border-b border-transparent focus:border-indigo-500 outline-none w-full"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Tanggal</label>
                <input
                  type="date"
                  value={transactionDate}
                  onChange={(e) => setTransactionDate(e.target.value)}
                  className="text-xs font-semibold text-slate-700 px-3 py-1.5 rounded-lg border border-slate-200 outline-none"
                />
              </div>
            </div>

            {/* Price Components */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Subtotal Kotor</label>
                <input
                  type="number"
                  value={rawSubtotal}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setRawSubtotal(val);
                    recalculateItems(items, val, totalPaid);
                  }}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 font-bold outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-emerald-600 uppercase">Diskon Voucher</label>
                <input
                  type="number"
                  value={discountAmount}
                  onChange={(e) => setDiscountAmount(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-emerald-700 outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Ongkir</label>
                <input
                  type="number"
                  value={deliveryFee}
                  onChange={(e) => setDeliveryFee(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 font-semibold outline-none"
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase">Pajak / Biaya</label>
                <input
                  type="number"
                  value={serviceTaxFee}
                  onChange={(e) => setServiceTaxFee(parseFloat(e.target.value) || 0)}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 font-semibold outline-none"
                />
              </div>

              <div className="col-span-2 sm:col-span-1">
                <label className="block text-[10px] font-extrabold text-indigo-700 uppercase">Total Akhir Bayar</label>
                <input
                  type="number"
                  value={totalPaid}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value) || 0;
                    setTotalPaid(val);
                    recalculateItems(items, rawSubtotal, val);
                  }}
                  className="w-full mt-1 px-3 py-1.5 rounded-xl border-2 border-indigo-500 font-extrabold text-indigo-900 outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-slate-400 uppercase">Catatan Tambahan</label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="misal: Makan siang bersama tim dev"
                className="w-full mt-1 px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-medium outline-none"
              />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  Daftar Barang & Pembagian ({items.length} item)
                </h3>
                <p className="text-[11px] text-slate-400">
                  Tandai item mana yang Anda konsumsi sendiri dan mana pesanan teman
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-xs font-bold text-slate-700 transition-colors shadow-2xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Baris</span>
              </button>
            </div>

            <div className="space-y-2.5">
              {items.map((item, idx) => (
                <ReceiptItemRow
                  key={idx}
                  item={item}
                  index={idx}
                  existingFriends={existingFriends}
                  onChange={handleItemChange}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          </div>

          {/* Bottom Actions */}
          <div className="flex justify-between items-center pt-4 border-t border-slate-200">
            <button
              onClick={() => setStep('upload')}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Scan Ulang
            </button>

            <button
              onClick={() => setIsSummaryModalOpen(true)}
              className="flex items-center space-x-2 px-6 py-3 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white font-bold text-xs shadow-lg shadow-indigo-100 transition-all hover:scale-102"
            >
              <span>Lanjut ke Pembagian Tagihan</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Split Summary Modal */}
      <SplitSummaryModal
        isOpen={isSummaryModalOpen}
        onClose={() => setIsSummaryModalOpen(false)}
        merchantName={merchantName}
        transactionDate={transactionDate}
        imagePath={imagePath}
        rawSubtotal={rawSubtotal}
        discountAmount={discountAmount}
        deliveryFee={deliveryFee}
        serviceTaxFee={serviceTaxFee}
        totalPaid={totalPaid}
        notes={notes}
        items={items}
        wallets={wallets}
        onComplete={() => {
          setIsSummaryModalOpen(false);
          if (onNavigate) {
            onNavigate('debts');
          }
        }}
      />
    </div>
  );
};
