import React, { useState } from 'react';
import { Debt, Wallet as WalletType } from '../types';
import { apiRequest, formatRupiah } from '../api/client';
import { RupiahInput } from './RupiahInput';
import { X, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';

interface PayDebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  debt: Debt | null;
  wallets: WalletType[];
  onSuccess: () => void;
}

export const PayDebtModal: React.FC<PayDebtModalProps> = ({
  isOpen,
  onClose,
  debt,
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
    if (debt) {
      setAmount(String(debt.remaining_amount));
    }
  }, [debt]);

  if (!isOpen || !debt) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = Number(amount) || 0;
    if (numAmount <= 0) {
      setError('Nominal pembayaran harus lebih besar dari 0.');
      return;
    }
    if (numAmount > Number(debt.remaining_amount)) {
      setError(`Nominal bayar melebihi sisa hutang (${formatRupiah(Number(debt.remaining_amount))}).`);
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest(`/debts/${debt.id}/pay`, {
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
      setError(err.message || 'Gagal memproses pembayaran hutang.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-800">Bayar Hutang</h2>
              <p className="text-xs text-slate-400">Ke: {debt.creditor_name}</p>
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
          <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-100 flex justify-between items-center text-xs">
            <span className="text-amber-800 font-medium">Sisa Hutang Saat Ini:</span>
            <span className="font-extrabold text-amber-900 text-sm">
              {formatRupiah(Number(debt.remaining_amount))}
            </span>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="block text-xs font-bold text-slate-600">Nominal Bayar</label>
              <button
                type="button"
                onClick={() => setAmount(String(debt.remaining_amount))}
                className="text-[11px] font-bold text-amber-600 hover:text-amber-700 hover:underline"
              >
                Bayar Lunas
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
              <label className="block text-xs font-bold text-slate-600 mb-1">Bayar dari Dompet</label>
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
              placeholder="misal: Cicilan bulan ke-2, Pelunasan via BCA"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-indigo-500 outline-none"
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
              className="px-5 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-100 flex items-center space-x-2 disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Konfirmasi Bayar</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
