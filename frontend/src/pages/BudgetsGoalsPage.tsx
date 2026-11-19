import React, { useState, useEffect } from 'react';
import { Budget, SavingsGoal, Category, Wallet as WalletType } from '../types';
import { apiRequest, formatRupiah } from '../api/client';
import { RupiahInput } from '../components/RupiahInput';
import {
  Target,
  Plus,
  AlertCircle,
  CheckCircle2,
  Trash2,
  Loader2,
  X,
  Coins
} from 'lucide-react';

export const BudgetsGoalsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'budgets' | 'goals'>('budgets');
  const [budgets, setBudgets] = useState<Budget[]>([]);
  const [goals, setGoals] = useState<SavingsGoal[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [monthYear, setMonthYear] = useState<string>(() => new Date().toISOString().slice(0, 7));
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Set Budget Modal
  const [isBudgetModalOpen, setIsBudgetModalOpen] = useState<boolean>(false);
  const [selectedCatId, setSelectedCatId] = useState<number>(0);
  const [monthlyLimit, setMonthlyLimit] = useState<string>('');

  // Add Goal Modal
  const [isGoalModalOpen, setIsGoalModalOpen] = useState<boolean>(false);
  const [goalName, setGoalName] = useState<string>('');
  const [goalTarget, setGoalTarget] = useState<string>('');
  const [goalDate, setGoalDate] = useState<string>('');
  const [goalWalletId, setGoalWalletId] = useState<number>(0);

  // Deposit Goal Modal
  const [depositGoal, setDepositGoal] = useState<SavingsGoal | null>(null);
  const [depositAmount, setDepositAmount] = useState<string>('');
  const [depositWalletId, setDepositWalletId] = useState<number>(0);

  const [modalError, setModalError] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [bData, gData, cData, wData] = await Promise.all([
        apiRequest<Budget[]>(`/budgets?month=${monthYear}`),
        apiRequest<SavingsGoal[]>('/goals'),
        apiRequest<Category[]>('/categories'),
        apiRequest<WalletType[]>('/wallets'),
      ]);
      setBudgets(bData || []);
      setGoals(gData || []);
      setCategories(cData || []);
      setWallets(wData || []);

      const expenseCats = (cData || []).filter((c) => c.type === 'expense');
      if (expenseCats.length > 0 && !selectedCatId) {
        setSelectedCatId(expenseCats[0].id);
      }
      if ((wData || []).length > 0 && !depositWalletId) {
        setDepositWalletId(wData[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [monthYear]);

  const handleSaveBudget = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    const num = Number(monthlyLimit) || 0;
    if (num <= 0) {
      setModalError('Batas anggaran harus lebih besar dari 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('/budgets', {
        method: 'POST',
        body: JSON.stringify({
          category_id: selectedCatId,
          monthly_limit: num,
          month_year: monthYear,
        }),
      });
      setIsBudgetModalOpen(false);
      setMonthlyLimit('');
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Gagal menyimpan anggaran.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBudget = async (id: number) => {
    if (!window.confirm('Hapus batas anggaran ini?')) return;
    try {
      await apiRequest(`/budgets/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus anggaran.');
    }
  };

  const handleSaveGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    const num = Number(goalTarget) || 0;
    if (!goalName.trim() || num <= 0 || !goalDate) {
      setModalError('Semua field wajib diisi dengan benar.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('/goals', {
        method: 'POST',
        body: JSON.stringify({
          name: goalName.trim(),
          target_amount: num,
          target_date: goalDate,
          wallet_id: goalWalletId || null,
        }),
      });
      setIsGoalModalOpen(false);
      setGoalName('');
      setGoalTarget('');
      setGoalDate('');
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Gagal menyimpan target tabungan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDepositGoal = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError('');
    const num = Number(depositAmount) || 0;
    if (!depositGoal || num <= 0) {
      setModalError('Nominal setoran harus lebih besar dari 0.');
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest(`/goals/${depositGoal.id}/deposit`, {
        method: 'POST',
        body: JSON.stringify({
          amount: num,
          wallet_id: depositWalletId || null,
        }),
      });
      setDepositGoal(null);
      setDepositAmount('');
      loadData();
    } catch (err: any) {
      setModalError(err.message || 'Gagal menyetor tabungan.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteGoal = async (id: number) => {
    if (!window.confirm('Hapus target tabungan ini?')) return;
    try {
      await apiRequest(`/goals/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus target.');
    }
  };

  const expenseCategories = categories.filter((c) => c.type === 'expense');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Anggaran & Target Tabungan
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Kendalikan batas belanja bulanan dan wujudkan impian finansial Anda
          </p>
        </div>

        {activeTab === 'budgets' ? (
          <div className="flex items-center space-x-2">
            <input
              type="month"
              value={monthYear}
              onChange={(e) => setMonthYear(e.target.value)}
              className="px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs font-bold text-slate-700 outline-none"
            />
            <button
              onClick={() => {
                setModalError('');
                setIsBudgetModalOpen(true);
              }}
              className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 transition-all hover:scale-102"
            >
              <Plus className="w-4 h-4" />
              <span>Set Anggaran</span>
            </button>
          </div>
        ) : (
          <button
            onClick={() => {
              setModalError('');
              setIsGoalModalOpen(true);
            }}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-100 transition-all hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>Tambah Target Tabungan</span>
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex space-x-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('budgets')}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'budgets'
              ? 'border-indigo-600 text-indigo-700'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Anggaran Kategori ({budgets.length})
        </button>
        <button
          onClick={() => setActiveTab('goals')}
          className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 ${
            activeTab === 'goals'
              ? 'border-emerald-600 text-emerald-700'
              : 'border-transparent text-slate-400 hover:text-slate-700'
          }`}
        >
          Target Tabungan ({goals.length})
        </button>
      </div>

      {isLoading ? (
        <div className="py-16 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : activeTab === 'budgets' ? (
        /* Budgets Grid */
        budgets.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <Target className="w-12 h-12 text-indigo-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-800">Belum Ada Anggaran untuk Bulan Ini</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Atur batas maksimal belanja bulanan untuk pos pengeluaran seperti Makanan, Hiburan, atau Belanja.
            </p>
            <button
              onClick={() => setIsBudgetModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
            >
              Set Anggaran Pertama
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {budgets.map((b) => (
              <div
                key={b.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <span className="font-extrabold text-slate-900 text-base">{b.category_name}</span>
                    <button
                      onClick={() => handleDeleteBudget(b.id)}
                      title="Hapus Anggaran"
                      className="p-1 text-slate-300 hover:text-rose-600 rounded-md transition-colors"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="space-y-1 mb-3">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Terpakai:</span>
                      <span className="font-bold text-slate-800">{formatRupiah(b.spent_amount)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Batas Anggaran:</span>
                      <span className="font-bold text-slate-900">{formatRupiah(b.monthly_limit)}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden mb-2">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        b.status === 'danger'
                          ? 'bg-rose-500'
                          : b.status === 'warning'
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{ width: `${Math.min(100, b.percentage)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px]">
                    <span
                      className={`font-bold ${
                        b.status === 'danger'
                          ? 'text-rose-600'
                          : b.status === 'warning'
                          ? 'text-amber-600'
                          : 'text-emerald-600'
                      }`}
                    >
                      {b.percentage}% ({b.status === 'danger' ? 'Batas Kritis / Over' : b.status === 'warning' ? 'Waspada' : 'Aman'})
                    </span>
                    <span className="text-slate-400">
                      Sisa: {formatRupiah(b.remaining_amount)}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Goals Grid */
        goals.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <Coins className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-800">Belum Ada Target Tabungan</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
              Buat target impian Anda seperti Dana Darurat, Beli Gadget, atau Liburan.
            </p>
            <button
              onClick={() => setIsGoalModalOpen(true)}
              className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white text-xs font-bold"
            >
              Buat Target Tabungan
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {goals.map((g) => (
              <div
                key={g.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">{g.name}</h3>
                      <p className="text-[11px] text-slate-400 mt-0.5">
                        Target: {g.target_date} {g.wallet_name ? `• Di ${g.wallet_name}` : ''}
                      </p>
                    </div>

                    <div className="flex items-center space-x-1">
                      {g.is_achieved ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 flex items-center space-x-1">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>Tercapai!</span>
                        </span>
                      ) : null}
                      <button
                        onClick={() => handleDeleteGoal(g.id)}
                        className="p-1 text-slate-300 hover:text-rose-600 rounded-md"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400">Terkumpul:</span>
                      <span className="font-extrabold text-slate-900">{formatRupiah(g.current_amount)}</span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Target:</span>
                      <span>{formatRupiah(g.target_amount)}</span>
                    </div>
                  </div>

                  <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden my-2.5">
                    <div
                      className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                      style={{ width: `${Math.min(100, g.percentage)}%` }}
                    />
                  </div>

                  <div className="flex justify-between items-center text-[11px] text-slate-400">
                    <span className="font-bold text-emerald-600">{g.percentage}%</span>
                    <span>Sisa: {formatRupiah(Math.max(0, g.target_amount - g.current_amount))}</span>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex justify-end">
                  <button
                    onClick={() => {
                      setDepositGoal(g);
                      setDepositAmount('');
                    }}
                    className="flex items-center space-x-1 text-xs font-bold text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50 px-3 py-1.5 rounded-xl transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Setor Tabungan</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Set Budget Modal */}
      {isBudgetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Set Batas Anggaran Bulanan</h2>
              <button onClick={() => setIsBudgetModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveBudget} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Kategori Pengeluaran</label>
                <select
                  value={selectedCatId}
                  onChange={(e) => setSelectedCatId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
                >
                  {expenseCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Batas Maksimal Belanja (Per Bulan)</label>
                <RupiahInput
                  value={monthlyLimit}
                  onChange={(val) => setMonthlyLimit(val ? String(val) : '')}
                  placeholder="0"
                  required
                  size="md"
                />
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsBudgetModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-100 flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Simpan Anggaran</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Goal Modal */}
      {isGoalModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <h2 className="text-lg font-bold text-slate-800">Target Tabungan Baru</h2>
              <button onClick={() => setIsGoalModalOpen(false)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSaveGoal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nama Target Impian</label>
                <input
                  type="text"
                  value={goalName}
                  onChange={(e) => setGoalName(e.target.value)}
                  placeholder="misal: Dana Darurat, Liburan Jepang, Beli Laptop"
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Target Nominal Tabungan</label>
                <RupiahInput
                  value={goalTarget}
                  onChange={(val) => setGoalTarget(val ? String(val) : '')}
                  placeholder="0"
                  required
                  size="md"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Target Tanggal Tercapai</label>
                <input
                  type="date"
                  value={goalDate}
                  onChange={(e) => setGoalDate(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-xs font-medium focus:border-indigo-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Dompet Penampung (opsional)</label>
                <select
                  value={goalWalletId}
                  onChange={(e) => setGoalWalletId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
                >
                  <option value="0">Tanpa dompet khusus (virtual tracker)</option>
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsGoalModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-100 flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Simpan Target</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Deposit Goal Modal */}
      {depositGoal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-100">
            <div className="flex justify-between items-center pb-4 border-b border-slate-100">
              <div>
                <h2 className="text-base font-bold text-slate-800">Setor ke Tabungan</h2>
                <p className="text-xs text-slate-400">{depositGoal.name}</p>
              </div>
              <button onClick={() => setDepositGoal(null)} className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg">
                <X className="w-5 h-5" />
              </button>
            </div>

            {modalError && (
              <div className="mt-4 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleDepositGoal} className="mt-4 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Nominal Setoran</label>
                <RupiahInput
                  value={depositAmount}
                  onChange={(val) => setDepositAmount(val ? String(val) : '')}
                  placeholder="0"
                  required
                  size="lg"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1">Ambil dari Dompet</label>
                <select
                  value={depositWalletId}
                  onChange={(e) => setDepositWalletId(Number(e.target.value))}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold focus:border-indigo-500 outline-none"
                >
                  {wallets.map((w) => (
                    <option key={w.id} value={w.id}>
                      {w.name} ({formatRupiah(Number(w.balance))})
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-2 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setDepositGoal(null)}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-100 flex items-center space-x-2 disabled:opacity-50"
                >
                  {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Setor Sekarang</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
