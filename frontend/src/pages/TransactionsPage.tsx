import React, { useState, useEffect } from 'react';
import { Transaction, Wallet, Category } from '../types';
import { apiRequest, formatRupiah } from '../api/client';
import { TransactionModal } from '../components/TransactionModal';
import {
  Plus,
  Search,
  ArrowUpRight,
  ArrowDownLeft,
  ArrowRightLeft,
  Users,
  CreditCard,
  Trash2,
  Loader2,
  Calendar
} from 'lucide-react';

export const TransactionsPage: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Filters
  const [search, setSearch] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [walletFilter, setWalletFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);

  const loadData = async () => {
    try {
      const [txData, wData, cData] = await Promise.all([
        apiRequest<Transaction[]>('/transactions', {
          // query parameters will be handled by fetchTransactions
        }),
        apiRequest<Wallet[]>('/wallets'),
        apiRequest<Category[]>('/categories'),
      ]);
      setTransactions(txData || []);
      setWallets(wData || []);
      setCategories(cData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTransactions = async () => {
    const params = new URLSearchParams();
    if (typeFilter) params.append('type', typeFilter);
    if (walletFilter) params.append('wallet_id', walletFilter);
    if (startDate) params.append('start_date', startDate);
    if (endDate) params.append('end_date', endDate);

    try {
      const data = await apiRequest<Transaction[]>(`/transactions?${params.toString()}`);
      setTransactions(data || []);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    fetchTransactions();
  }, [typeFilter, walletFilter, startDate, endDate]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Hapus transaksi ini? Saldo dompet akan otomatis disesuaikan kembali.')) {
      return;
    }
    try {
      await apiRequest(`/transactions/${id}`, { method: 'DELETE' });
      fetchTransactions();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus transaksi.');
    }
  };

  const filteredTransactions = transactions.filter((t) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      t.notes?.toLowerCase().includes(q) ||
      t.category_name?.toLowerCase().includes(q) ||
      t.wallet_name?.toLowerCase().includes(q)
    );
  });

  const getTypeBadge = (type: Transaction['type']) => {
    switch (type) {
      case 'income':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
            <ArrowDownLeft className="w-3 h-3" />
            <span>Pemasukan</span>
          </span>
        );
      case 'expense':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700">
            <ArrowUpRight className="w-3 h-3" />
            <span>Pengeluaran</span>
          </span>
        );
      case 'transfer':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700">
            <ArrowRightLeft className="w-3 h-3" />
            <span>Transfer</span>
          </span>
        );
      case 'split_receivable':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700">
            <Users className="w-3 h-3" />
            <span>Talangan Teman</span>
          </span>
        );
      case 'receivable_settlement':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-teal-50 text-teal-700">
            <Users className="w-3 h-3" />
            <span>Pelunasan Piutang</span>
          </span>
        );
      case 'debt_payment':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700">
            <CreditCard className="w-3 h-3" />
            <span>Bayar Hutang</span>
          </span>
        );
      case 'debt_receipt':
        return (
          <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-cyan-50 text-cyan-700">
            <CreditCard className="w-3 h-3" />
            <span>Terima Pinjaman</span>
          </span>
        );
      default:
        return null;
    }
  };

  const getAmountColor = (type: Transaction['type']) => {
    if (type === 'income' || type === 'receivable_settlement' || type === 'debt_receipt') {
      return 'text-emerald-600';
    }
    if (type === 'transfer') {
      return 'text-blue-600';
    }
    return 'text-slate-900';
  };

  const getAmountPrefix = (type: Transaction['type']) => {
    if (type === 'income' || type === 'receivable_settlement' || type === 'debt_receipt') {
      return '+';
    }
    if (type === 'transfer') {
      return '';
    }
    return '-';
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Riwayat Transaksi
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Daftar lengkap uang masuk, keluar, mutasi, dan split bill
          </p>
        </div>

        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all hover:scale-102"
        >
          <Plus className="w-4 h-4" />
          <span>Catat Transaksi</span>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="relative flex-1">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              <Search className="w-4 h-4" />
            </div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari transaksi berdasarkan catatan atau kategori..."
              className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 text-xs focus:border-indigo-500 outline-none"
            />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
            >
              <option value="">Semua Tipe</option>
              <option value="expense">Pengeluaran</option>
              <option value="income">Pemasukan</option>
              <option value="transfer">Transfer</option>
              <option value="split_receivable">Talangan Teman</option>
              <option value="receivable_settlement">Pelunasan Piutang</option>
              <option value="debt_payment">Bayar Hutang</option>
            </select>

            <select
              value={walletFilter}
              onChange={(e) => setWalletFilter(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
            >
              <option value="">Semua Dompet</option>
              {wallets.map((w) => (
                <option key={w.id} value={w.id}>
                  {w.name}
                </option>
              ))}
            </select>

            <div className="flex items-center space-x-1.5 bg-slate-50 px-2 py-1 rounded-xl border border-slate-200">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-[11px] font-medium outline-none"
              />
              <span className="text-slate-300">-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-[11px] font-medium outline-none"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        {isLoading ? (
          <div className="py-12 flex justify-center text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        ) : filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-slate-400 text-sm">
            Tidak ada transaksi yang cocok dengan filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-100 text-slate-400 font-bold uppercase tracking-wider">
                <tr>
                  <th className="py-3.5 px-4">Tanggal</th>
                  <th className="py-3.5 px-4">Kategori & Keterangan</th>
                  <th className="py-3.5 px-4">Tipe</th>
                  <th className="py-3.5 px-4">Dompet</th>
                  <th className="py-3.5 px-4 text-right">Nominal</th>
                  <th className="py-3.5 px-4 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3 px-4 font-semibold text-slate-500 whitespace-nowrap">
                      {tx.date}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">
                        {tx.category_name || (tx.type === 'transfer' ? 'Transfer Antar Dompet' : 'Lain-lain')}
                      </div>
                      {tx.notes && (
                        <div className="text-[11px] text-slate-400 mt-0.5 max-w-xs truncate">
                          {tx.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      {getTypeBadge(tx.type)}
                    </td>
                    <td className="py-3 px-4 whitespace-nowrap">
                      <span className="font-semibold text-slate-700">
                        {tx.wallet_name || 'Dompet'}
                      </span>
                      {tx.transfer_to_wallet_name && (
                        <span className="text-slate-400 text-[11px]">
                          {' '}➔ {tx.transfer_to_wallet_name}
                        </span>
                      )}
                    </td>
                    <td className={`py-3 px-4 text-right font-extrabold whitespace-nowrap ${getAmountColor(tx.type)}`}>
                      {getAmountPrefix(tx.type)} {formatRupiah(Number(tx.amount))}
                    </td>
                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      <button
                        onClick={() => handleDelete(tx.id)}
                        title="Hapus Transaksi"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        wallets={wallets}
        categories={categories}
        onSuccess={loadData}
      />
    </div>
  );
};
