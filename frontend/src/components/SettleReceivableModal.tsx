import React, { useState } from 'react';
import { Receivable, Wallet as WalletType } from '../types';
import { apiRequest, formatRupiah } from '../api/client';
import { RupiahInput } from './RupiahInput';
import { X, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

interface SettleReceivableModalProps {
  isOpen: boolean;
  onClose: () => void;
  receivable: Receivable | null;
  wallets: WalletType[];
  onSuccess: () => void;
}

export const SettleReceivableModal: React.FC<SettleReceivableModalProps> = ({
  isOpen,
  onClose,
  receivable,
  wallets,
  onSuccess,
}) => {
  const [amount, setAmount] = useState<string>('');
  const [walletId, setWalletId] = useState<number>(wallets[0]?.id || 0);
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  React.useEffect(() => {
    if (receivable) {
      setAmount(String(receivable.remaining_amount));
    }
  }, [receivable]);

  if (!isOpen || !receivable) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      setError('Nominal pelunasan harus lebih besar dari 0.');
      return;
    }
    if (numAmount > Number(receivable.remaining_amount)) {
      setError(`Nominal bayar melebihi sisa piutang (${formatRupiah(Number(receivable.remaining_amount))}).`);
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest(`/receivables/${receivable.id}/settle`, {
        method: 'POST',
        body: JSON.stringify({
          amount: numAmount,
          wallet_id: walletId,
          date,
          notes,
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal mencatat pelunasan piutang.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-600 flex items-center justify-center">
              <CheckCircle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Terima Pembayaran Piutang</h2>
              <p className="text-xs text-slate-400">Dari teman: {receivable.friend_name}</p>
            </div>
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

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="p-3 bg-teal-50/60 rounded-xl border border-teal-100 flex justify-between items-center text-xs">
            <span className="text-teal-800 font-medium">Sisa Tagihan Teman:</span>
            <span className="font-extrabold text-teal-900 text-sm">
              {formatRupiah(Number(receivable.remaining_amount))}
            </span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-600">Nominal Diterima</label>
              <button
                type="button"
                onClick={() => setAmount(String(receivable.remaining_amount))}
                className="text-[11px] font-bold text-teal-600 hover:text-teal-700 hover:underline"
              >
                Lunasi Semua
              </button>
            </div>
            <RupiahInput
              value={amount}
              onChange={(val) => setAmount(val ? String(val) : '')}
              placeholder="0"
              required
              size="lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Masuk ke Dompet</label>
              <select
                value={walletId}
                onChange={(e) => setWalletId(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Tanggal</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:border-indigo-500 outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Catatan</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="misal: Ditransfer via QRIS / Tunai"
              className="w-full px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-md shadow-teal-100 flex items-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Tandai Lunas / Terima</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
