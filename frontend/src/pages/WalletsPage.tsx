import React, { useState, useEffect } from 'react';
import { Wallet as WalletType } from '../types';
import { apiRequest, formatRupiah } from '../api/client';
import { WalletCard } from '../components/WalletCard';
import { TransferModal } from '../components/TransferModal';
import { RupiahInput } from '../components/RupiahInput';
import {
  Wallet,
  Plus,
  ArrowRightLeft,
  X,
  Loader2,
  AlertCircle
} from 'lucide-react';

export const WalletsPage: React.FC = () => {
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isTransferOpen, setIsTransferOpen] = useState<boolean>(false);
  const [selectedWalletForTransfer, setSelectedWalletForTransfer] = useState<WalletType | null>(null);

  // Add / Edit Wallet Modal state
  const [isWalletModalOpen, setIsWalletModalOpen] = useState<boolean>(false);
  const [editingWallet, setEditingWallet] = useState<WalletType | null>(null);
  const [name, setName] = useState<string>('');
  const [type, setType] = useState<'cash' | 'bank' | 'ewallet'>('bank');
  const [accountNumber, setAccountNumber] = useState<string>('');
  const [initialBalance, setInitialBalance] = useState<string>('0');
  const [color, setColor] = useState<string>('#2563eb');
  const [modalError, setModalError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const fetchWallets = async () => {
    try {
      const data = await apiRequest<WalletType[]>('/wallets');
      setWallets(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchWallets();
  }, []);

  const totalBalance = wallets.reduce(
    (acc, w) => acc + (w.is_active ? Number(w.balance) : 0),
    0
  );

  const handleOpenAdd = () => {
    setEditingWallet(null);
    setName('');
    setType('bank');
    setAccountNumber('');
    setInitialBalance('0');
    setColor('#2563eb');
    setModalError('');
    setIsWalletModalOpen(true);
  };

  const handleOpenEdit = (wallet: WalletType) => {
    setEditingWallet(wallet);
    setName(wallet.name);
    setType(wallet.type);
    setAccountNumber(wallet.account_number || '');
    setInitialBalance(String(wallet.balance));
    setColor(wallet.color || '#2563eb');
    setModalError('');
    setIsWalletModalOpen(true);
  };

  const handleOpenTransfer = (wallet?: WalletType) => {
    setSelectedWalletForTransfer(wallet || null);
    setIsTransferOpen(true);
  };

  const handleDeleteWallet = async (walletId: number) => {
    if (!window.confirm('Apakah Anda yakin ingin menghapus dompet ini? Riwayat transaksi dompet ini akan terpengaruh.')) {
      return;
    }
    try {
      await apiRequest(`/wallets/${walletId}`, { method: 'DELETE' });
      fetchWallets();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus dompet.');
    }
  };

  const handleSaveWallet = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');

    if (!name.trim()) {
      setModalError('Nama dompet wajib diisi.');
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingWallet) {
        await apiRequest(`/wallets/${editingWallet.id}`, {
          method: 'PUT',
          body: JSON.stringify({
            name: name.trim(),
            type,
            account_number: accountNumber.trim(),
            color,
          }),
        });
      } else {
        await apiRequest('/wallets', {
          method: 'POST',
          body: JSON.stringify({
            name: name.trim(),
            type,
            account_number: accountNumber.trim(),
            balance: Number(initialBalance) || 0,
            color,
          }),
        });
      }
      setIsWalletModalOpen(false);
      fetchWallets();
    } catch (err: any) {
      setModalError(err.message || 'Gagal menyimpan dompet.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const colors = [
    '#2563eb', // Blue
    '#16a34a', // Green
    '#8b5cf6', // Purple
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#06b6d4', // Cyan
    '#64748b', // Slate
  ];

  return (
    <div className="space-y-6">
      {/* Header & Total Card */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Kelola Dompet & Rekening
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pisahkan saldo tunai, bank, dan e-wallet dengan rapi
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {wallets.length >= 2 && (
            <button
              onClick={() => handleOpenTransfer()}
              className="flex items-center space-x-1.5 px-3.5 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all"
            >
              <ArrowRightLeft className="w-4 h-4 text-indigo-600" />
              <span>Transfer Saldo</span>
            </button>
          )}

          <button
            onClick={handleOpenAdd}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Dompet</span>
          </button>
        </div>
      </div>

      {/* Total Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 text-white shadow-xl relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-1/3 bg-radial from-indigo-500/10 to-transparent pointer-events-none" />
        <div className="relative z-10">
          <div className="flex items-center space-x-2 text-indigo-300 text-xs font-semibold uppercase tracking-wider">
            <Wallet className="w-4 h-4" />
            <span>Total Kekayaan Likuid</span>
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold mt-1 tracking-tight">
            {formatRupiah(totalBalance)}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Tersebar di {wallets.length} akun dompet aktif
          </p>
        </div>
      </div>

      {/* Wallets Grid */}
      {isLoading ? (
        <div className="py-12 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : wallets.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
          <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-3">
            <Wallet className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-800">Belum Ada Dompet</h3>
          <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
            Buat akun dompet pertama Anda (misalnya Rekening BCA, Dompet Tunai, atau GoPay) untuk mulai mencatat.
          </p>
          <button
            onClick={handleOpenAdd}
            className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            Tambah Sekarang
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {wallets.map((w) => (
            <WalletCard
              key={w.id}
              wallet={w}
              onTransfer={handleOpenTransfer}
              onEdit={handleOpenEdit}
              onDelete={handleDeleteWallet}
            />
          ))}
        </div>
      )}

      {/* Transfer Modal */}
      <TransferModal
        isOpen={isTransferOpen}
        onClose={() => setIsTransferOpen(false)}
        wallets={wallets}
        initialFromWallet={selectedWalletForTransfer}
        onSuccess={fetchWallets}
      />

      {/* Add / Edit Wallet Modal */}
      {isWalletModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">
                {editingWallet ? 'Edit Dompet' : 'Tambah Dompet Baru'}
              </h2>
              <button
                onClick={() => setIsWalletModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center space-x-2 text-rose-700 text-xs">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveWallet} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">
                  Nama Dompet / Bank
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="misal: BCA Utama, Dompet Tunai, GoPay"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-indigo-500 outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Tipe Dompet
                  </label>
                  <select
                    value={type}
                    onChange={(e: any) => setType(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
                  >
                    <option value="bank">Rekening Bank</option>
                    <option value="ewallet">E-Wallet</option>
                    <option value="cash">Uang Tunai</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    No. Rekening / ID (opsional)
                  </label>
                  <input
                    type="text"
                    value={accountNumber}
                    onChange={(e) => setAccountNumber(e.target.value)}
                    placeholder="1234-xxxx-xx"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-medium focus:border-indigo-500 outline-none"
                  />
                </div>
              </div>

              {!editingWallet && (
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1">
                    Saldo Awal
                  </label>
                  <RupiahInput
                    value={initialBalance}
                    onChange={(val) => setInitialBalance(val ? String(val) : '0')}
                    placeholder="0"
                    size="md"
                  />
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5">
                  Warna Aksen
                </label>
                <div className="flex space-x-2">
                  {colors.map((c) => (
                    <button
                      type="button"
                      key={c}
                      onClick={() => setColor(c)}
                      className={`w-7 h-7 rounded-full border-2 transition-transform ${
                        color === c ? 'border-slate-800 scale-110 shadow-xs' : 'border-transparent'
                      }`}
                      style={{ backgroundColor: c }}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsWalletModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center space-x-2"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Simpan Dompet</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
