import React, { useState } from 'react';
import { Wallet as WalletType, ReceiptItem } from '../types';
import { apiRequest, formatRupiah } from '../api/client';
import { X, Check, Copy, AlertCircle, Loader2, ArrowRight } from 'lucide-react';

interface SplitSummaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  merchantName: string;
  transactionDate: string;
  imagePath: string;
  rawSubtotal: number;
  discountAmount: number;
  deliveryFee: number;
  serviceTaxFee: number;
  totalPaid: number;
  notes: string;
  items: ReceiptItem[];
  wallets: WalletType[];
  onComplete: () => void;
}

export const SplitSummaryModal: React.FC<SplitSummaryModalProps> = ({
  isOpen,
  onClose,
  merchantName,
  transactionDate,
  imagePath,
  rawSubtotal,
  discountAmount,
  deliveryFee,
  serviceTaxFee,
  totalPaid,
  notes,
  items,
  wallets,
  onComplete,
}) => {
  const [selectedWalletId, setSelectedWalletId] = useState<number>(wallets[0]?.id || 0);
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');

  if (!isOpen) return null;

  // Group items by owner
  const selfItems = items.filter((it) => it.is_self ?? (it.assigned_to === 'Pribadi' || !it.assigned_to));
  const selfTotal = selfItems.reduce((acc, it) => acc + (it.net_price ?? it.raw_price), 0);

  const friendGroups: Record<string, { items: ReceiptItem[]; total: number }> = {};
  items.forEach((it) => {
    const isSelf = it.is_self ?? (it.assigned_to === 'Pribadi' || !it.assigned_to);
    if (!isSelf) {
      const owner = (it.assigned_to || 'Teman').trim();
      if (!friendGroups[owner]) {
        friendGroups[owner] = { items: [], total: 0 };
      }
      friendGroups[owner].items.push(it);
      friendGroups[owner].total += (it.net_price ?? it.raw_price);
    }
  });

  const selectedWallet = wallets.find((w) => w.id === selectedWalletId);

  const generateWhatsAppMessage = () => {
    const lines: string[] = [];
    lines.push(`🧾 *Rekap Tagihan: ${merchantName}*`);
    lines.push(`📅 Tanggal: ${transactionDate}`);
    lines.push(`💰 Total Bill: ${formatRupiah(totalPaid)}`);
    lines.push('--------------------------------');

    if (Object.keys(friendGroups).length === 0) {
      lines.push('Seluruh item adalah belanja pribadi.');
    } else {
      for (const [friend, data] of Object.entries(friendGroups)) {
        lines.push(`👤 *${friend}* : *${formatRupiah(data.total)}*`);
        data.items.forEach((it) => {
          lines.push(`  • ${it.name} (x${it.qty}): ${formatRupiah(it.net_price ?? it.raw_price)}`);
        });
        lines.push('');
      }
    }
    lines.push('--------------------------------');
    lines.push('Bisa ditransfer ya, terima kasih banyak! 🙏');
    return lines.join('\n');
  };

  const handleCopyWhatsApp = () => {
    navigator.clipboard.writeText(generateWhatsAppMessage());
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2500);
  };

  const handleExecute = async () => {
    setError('');
    if (!selectedWalletId) {
      setError('Pilih dompet yang digunakan untuk membayar.');
      return;
    }
    if (selectedWallet && Number(selectedWallet.balance) < totalPaid) {
      setError(`Saldo ${selectedWallet.name} tidak cukup (${formatRupiah(Number(selectedWallet.balance))}).`);
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest('/receipts/split-execute', {
        method: 'POST',
        body: JSON.stringify({
          merchant_name: merchantName,
          transaction_date: transactionDate,
          image_path: imagePath,
          raw_subtotal: rawSubtotal,
          discount_amount: discountAmount,
          delivery_fee: deliveryFee,
          service_tax_fee: serviceTaxFee,
          total_paid: totalPaid,
          wallet_id: selectedWalletId,
          notes,
          items,
        }),
      });
      onComplete();
    } catch (err: any) {
      setError(err.message || 'Gagal mengeksekusi split bill.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 my-8 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">
              Konfirmasi Split Bill Struk
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">{merchantName} • {transactionDate}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-2 text-rose-700 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="mt-4 space-y-4 max-h-[60vh] overflow-y-auto pr-1">
          {/* Wallet selector */}
          <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Bayar Penuh dari Dompet
            </label>
            <select
              value={selectedWalletId}
              onChange={(e) => setSelectedWalletId(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold focus:border-indigo-500 outline-none"
            >
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name} (Saldo: {formatRupiah(Number(w.balance))})
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1.5 flex justify-between">
              <span>Saldo akan terpotong:</span>
              <strong className="text-slate-900">{formatRupiah(totalPaid)}</strong>
            </p>
          </div>

          {/* Breakdown: Pribadi */}
          <div className="p-3.5 bg-rose-50/50 rounded-2xl border border-rose-100">
            <div className="flex justify-between items-center mb-1">
              <span className="text-xs font-bold text-rose-900">
                Bagian Pribadi (Masuk Pengeluaran)
              </span>
              <span className="text-sm font-extrabold text-rose-700">
                {formatRupiah(selfTotal)}
              </span>
            </div>
            <p className="text-[11px] text-rose-600">
              {selfItems.length} menu/barang milik Anda sendiri.
            </p>
          </div>

          {/* Breakdown: Teman */}
          <div className="p-3.5 bg-teal-50/50 rounded-2xl border border-teal-100 space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-teal-900">
                Bagian Teman (Masuk Piutang)
              </span>
              <span className="text-sm font-extrabold text-teal-800">
                {formatRupiah(totalPaid - selfTotal)}
              </span>
            </div>

            {Object.keys(friendGroups).length === 0 ? (
              <p className="text-[11px] text-teal-600 italic">Tidak ada item milik teman.</p>
            ) : (
              <div className="divide-y divide-teal-100/80 pt-1">
                {Object.entries(friendGroups).map(([friend, data]) => (
                  <div key={friend} className="py-2 flex justify-between items-start text-xs">
                    <div>
                      <span className="font-bold text-slate-800">{friend}</span>
                      <p className="text-[11px] text-slate-400">
                        {data.items.map((it) => it.name).join(', ')}
                      </p>
                    </div>
                    <span className="font-extrabold text-teal-700">{formatRupiah(data.total)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* WhatsApp preview & copy */}
          <div className="p-3 bg-slate-100/70 rounded-2xl border border-slate-200">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[11px] font-bold text-slate-600">Format Chat WhatsApp</span>
              <button
                type="button"
                onClick={handleCopyWhatsApp}
                className="flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-xs font-bold text-indigo-600 hover:bg-slate-50 transition-colors shadow-2xs"
              >
                {isCopied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                    <span className="text-emerald-700">Tersalin!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Salin Pesan WA</span>
                  </>
                )}
              </button>
            </div>
            <pre className="text-[11px] text-slate-600 font-mono whitespace-pre-wrap bg-white p-2.5 rounded-xl border border-slate-200/60 max-h-24 overflow-y-auto">
              {generateWhatsAppMessage()}
            </pre>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex justify-end space-x-2 mt-4">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
          >
            Kembali Edit
          </button>
          <button
            type="button"
            onClick={handleExecute}
            disabled={isLoading}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center space-x-2 disabled:opacity-50"
          >
            {isLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Eksekusi Pembukuan</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
