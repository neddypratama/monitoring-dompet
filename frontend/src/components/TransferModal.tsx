import React, { useState, useEffect } from 'react';
import { Wallet as WalletType } from '../types';
import { apiRequest, formatRupiah } from '../api/client';
import { X, ArrowRightLeft, AlertCircle, Loader2 } from 'lucide-react';

interface TransferModalProps {
  isOpen: boolean;
  onClose: () => void;
  wallets: WalletType[];
  initialFromWallet?: WalletType | null;
  onSuccess: () => void;
}

export const TransferModal: React.FC<TransferModalProps> = ({
  isOpen,
  onClose,
  wallets,
  initialFromWallet,
  onSuccess,
}) => {
  const [fromId, setFromId] = useState<number>(0);
  const [toId, setToId] = useState<number>(0);
  const [amount, setAmount] = useState<string>('');
  const [adminFee, setAdminFee] = useState<string>('0');
  const [date, setDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  useEffect(() => {
    if (wallets.length >= 2) {
      const srcId = initialFromWallet ? initialFromWallet.id : wallets[0].id;
      setFromId(srcId);
      const other = wallets.find((w) => w.id !== srcId);
      if (other) {
        setToId(other.id);
      }
    }
  }, [wallets, initialFromWallet, isOpen]);

  if (!isOpen) return null;

  const fromWallet = wallets.find((w) => w.id === fromId);
  const numAmount = parseFloat(amount) || 0;
  const numFee = parseFloat(adminFee) || 0;
  const totalDeduction = numAmount + numFee;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (fromId === toId) {
      setError('Dompet asal dan tujuan tidak boleh sama.');
      return;
    }
    if (numAmount <= 0) {
      setError('Nominal transfer harus lebih besar dari 0.');
      return;
    }
    if (fromWallet && Number(fromWallet.balance) < totalDeduction) {
      setError(
        `Saldo ${fromWallet.name} tidak cukup (${formatRupiah(Number(fromWallet.balance))}). Dibutuhkan: ${formatRupiah(totalDeduction)}.`
      );
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest('/wallets/transfer', {
        method: 'POST',
        body: JSON.stringify({
          from_wallet_id: fromId,
          to_wallet_id: toId,
          amount: numAmount,
          admin_fee: numFee,
          date,
          notes,
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal memproses transfer saldo.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <ArrowRightLeft className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Transfer Antar Dompet</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
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
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Dari Dompet</label>
              <select
                value={fromId}
                onChange={(e) => setFromId(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name} ({formatRupiah(Number(w.balance))})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Ke Dompet</label>
              <select
                value={toId}
                onChange={(e) => setToId(Number(e.target.value))}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
              >
                {wallets.map((w) => (
                  <option key={w.id} value={w.id} disabled={w.id === fromId}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nominal Transfer (Rp)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              min="1"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-base font-bold text-slate-900 focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-600 mb-1">Biaya Admin (Rp)</label>
              <input
                type="number"
                value={adminFee}
                onChange={(e) => setAdminFee(e.target.value)}
                placeholder="0"
                min="0"
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:border-indigo-500 outline-none"
              />
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
            <label className="block text-xs font-bold text-slate-600 mb-1">Catatan / Keterangan</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="misal: Tarik tunai ATM, Top up e-wallet"
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-indigo-500 outline-none"
            />
          </div>

          {numAmount > 0 && fromWallet && (
            <div className="p-3 bg-slate-50 rounded-xl text-xs text-slate-600 space-y-1">
              <div className="flex justify-between">
                <span>Total saldo dipotong dari {fromWallet.name}:</span>
                <span className="font-bold text-slate-900">{formatRupiah(totalDeduction)}</span>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Sisa saldo setelah transfer:</span>
                <span>{formatRupiah(Math.max(0, Number(fromWallet.balance) - totalDeduction))}</span>
              </div>
            </div>
          )}

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center space-x-2 transition-all disabled:opacity-50"
            >
              {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <span>Konfirmasi Transfer</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
