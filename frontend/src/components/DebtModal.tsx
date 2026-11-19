import React, { useState } from 'react';
import { apiRequest } from '../api/client';
import { RupiahInput } from './RupiahInput';
import { X, CreditCard, AlertCircle, Loader2 } from 'lucide-react';

interface DebtModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const DebtModal: React.FC<DebtModalProps> = ({ isOpen, onClose, onSuccess }) => {
  const [creditorName, setCreditorName] = useState<string>('');
  const [amount, setAmount] = useState<string>('');
  const [dueDate, setDueDate] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const numAmount = Number(amount) || 0;
    if (!creditorName.trim()) {
      setError('Nama pemberi pinjaman / lembaga wajib diisi.');
      return;
    }
    if (numAmount <= 0) {
      setError('Nominal hutang harus lebih besar dari 0.');
      return;
    }
    if (!dueDate) {
      setError('Tanggal jatuh tempo wajib diisi.');
      return;
    }

    setIsLoading(true);
    try {
      await apiRequest('/debts', {
        method: 'POST',
        body: JSON.stringify({
          creditor_name: creditorName.trim(),
          amount: numAmount,
          due_date: dueDate,
          notes: notes.trim(),
        }),
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Gagal menambahkan catatan hutang.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
      <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100 animate-in fade-in zoom-in-95 duration-150">
        <div className="flex justify-between items-center pb-4 border-b border-slate-100">
          <div className="flex items-center space-x-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <h2 className="text-lg font-bold text-slate-800">Catat Hutang Baru</h2>
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
          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Pemberi Pinjaman / Kreditur</label>
            <input
              type="text"
              value={creditorName}
              onChange={(e) => setCreditorName(e.target.value)}
              placeholder="misal: BCA Cicilan, Mas Dani, Paylater"
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-indigo-500 outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Nominal Hutang</label>
            <RupiahInput
              value={amount}
              onChange={(val) => setAmount(val ? String(val) : '')}
              placeholder="0"
              required
              size="lg"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">
              Tanggal Jatuh Tempo <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              required
              className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-indigo-500 outline-none"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Sistem akan memberikan pengingat visual saat tanggal jatuh tempo sudah dekat.
            </p>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-600 mb-1">Catatan / Keterangan</label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="misal: Pinjam untuk DP motor"
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
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Simpan Hutang</span>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
