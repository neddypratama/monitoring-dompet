import React, { useState, useEffect } from 'react';
import { Debt, Receivable, Wallet as WalletType } from '../types';
import { apiRequest, formatRupiah } from '../api/client';
import { DebtModal } from '../components/DebtModal';
import { PayDebtModal } from '../components/PayDebtModal';
import { SettleReceivableModal } from '../components/SettleReceivableModal';
import {
  CreditCard,
  Users,
  Plus,
  Calendar,
  AlertTriangle,
  Clock,
  CheckCircle2,
  Copy,
  Check,
  Trash2,
  Loader2
} from 'lucide-react';

export const DebtsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'debts' | 'receivables'>('debts');
  const [debts, setDebts] = useState<Debt[]>([]);
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [wallets, setWallets] = useState<WalletType[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Modals
  const [isDebtModalOpen, setIsDebtModalOpen] = useState<boolean>(false);
  const [selectedDebtForPay, setSelectedDebtForPay] = useState<Debt | null>(null);
  const [selectedRecForSettle, setSelectedRecForSettle] = useState<Receivable | null>(null);
  const [copiedId, setCopiedId] = useState<number | null>(null);

  const loadData = async () => {
    try {
      const [dData, rData, wData] = await Promise.all([
        apiRequest<Debt[]>('/debts'),
        apiRequest<Receivable[]>('/receivables'),
        apiRequest<WalletType[]>('/wallets'),
      ]);
      setDebts(dData || []);
      setReceivables(rData || []);
      setWallets(wData || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const totalRemainingDebt = debts
    .filter((d) => d.status !== 'paid')
    .reduce((acc, d) => acc + Number(d.remaining_amount), 0);

  const totalRemainingReceivable = receivables
    .filter((r) => r.status !== 'paid')
    .reduce((acc, r) => acc + Number(r.remaining_amount), 0);

  const handleDeleteDebt = async (id: number) => {
    if (!window.confirm('Hapus catatan hutang ini?')) return;
    try {
      await apiRequest(`/debts/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus hutang.');
    }
  };

  const handleDeleteReceivable = async (id: number) => {
    if (!window.confirm('Hapus catatan piutang ini?')) return;
    try {
      await apiRequest(`/receivables/${id}`, { method: 'DELETE' });
      loadData();
    } catch (err: any) {
      alert(err.message || 'Gagal menghapus piutang.');
    }
  };

  const handleCopyWhatsApp = (rec: Receivable) => {
    const text = `Halo ${rec.friend_name}! Mau ingetin patungan ${rec.merchant_name ? rec.merchant_name + ': ' : ''}sebesar Rp ${Number(rec.remaining_amount).toLocaleString('id-ID')}.\nCatatan: ${rec.notes || 'Split bill'}\nBisa ditransfer ya, makasih banyak! 🙏`;
    navigator.clipboard.writeText(text);
    setCopiedId(rec.id);
    setTimeout(() => setCopiedId(null), 2500);
  };

  const getUrgencyBadge = (debt: Debt) => {
    if (debt.status === 'paid') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600">
          <CheckCircle2 className="w-3.5 h-3.5 text-slate-500" />
          <span>Lunas</span>
        </span>
      );
    }
    if (debt.urgency_status === 'overdue') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-700 animate-pulse">
          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
          <span>Lewat Jatuh Tempo ({Math.abs(debt.days_left || 0)} hari lalu)</span>
        </span>
      );
    }
    if (debt.urgency_status === 'urgent') {
      return (
        <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
          <Clock className="w-3.5 h-3.5 text-amber-600" />
          <span>Jatuh Tempo ({debt.days_left === 0 ? 'Hari ini' : `${debt.days_left} hari lagi`})</span>
        </span>
      );
    }
    return (
      <span className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700">
        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
        <span>Aman ({debt.days_left} hari lagi)</span>
      </span>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Pengingat Hutang & Piutang
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Pantau kewajiban jatuh tempo dan tagihan patungan teman
          </p>
        </div>

        {activeTab === 'debts' ? (
          <button
            onClick={() => setIsDebtModalOpen(true)}
            className="flex items-center space-x-1.5 px-4 py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md shadow-amber-100 transition-all hover:scale-102"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Hutang Baru</span>
          </button>
        ) : null}
      </div>

      {/* Tabs & Summary Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div
          onClick={() => setActiveTab('debts')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeTab === 'debts'
              ? 'bg-amber-500/10 border-amber-300 shadow-md ring-2 ring-amber-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Hutang Saya</p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {formatRupiah(totalRemainingDebt)}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
              {debts.filter((d) => d.status !== 'paid').length} Belum Lunas
            </span>
          </div>
        </div>

        <div
          onClick={() => setActiveTab('receivables')}
          className={`cursor-pointer p-5 rounded-2xl border transition-all ${
            activeTab === 'receivables'
              ? 'bg-teal-500/10 border-teal-300 shadow-md ring-2 ring-teal-400/20'
              : 'bg-white border-slate-200 hover:border-slate-300'
          }`}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 rounded-xl bg-teal-100 text-teal-700 flex items-center justify-center">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Piutang Teman</p>
                <p className="text-xl font-extrabold text-slate-900 mt-0.5">
                  {formatRupiah(totalRemainingReceivable)}
                </p>
              </div>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-teal-100 text-teal-800">
              {receivables.filter((r) => r.status !== 'paid').length} Teman Belum Bayar
            </span>
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="py-12 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : activeTab === 'debts' ? (
        /* Debts List */
        debts.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-emerald-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-800">Bebas Hutang!</h3>
            <p className="text-xs text-slate-400 mt-1">Anda tidak memiliki kewajiban hutang yang tercatat.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {debts.map((debt) => (
              <div
                key={debt.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">
                        {debt.creditor_name}
                      </h3>
                      <div className="flex items-center space-x-1.5 text-xs text-slate-400 mt-1">
                        <Calendar className="w-3.5 h-3.5" />
                        <span>Jatuh Tempo: <strong className="text-slate-600">{debt.due_date}</strong></span>
                      </div>
                    </div>
                    {getUrgencyBadge(debt)}
                  </div>

                  <div className="mt-4 p-3 bg-slate-50 rounded-xl space-y-1">
                    <div className="flex justify-between text-xs text-slate-500">
                      <span>Sisa Hutang:</span>
                      <span className="font-extrabold text-slate-900 text-sm">
                        {formatRupiah(Number(debt.remaining_amount))}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Total Awal:</span>
                      <span>{formatRupiah(Number(debt.amount))}</span>
                    </div>
                  </div>

                  {debt.notes && (
                    <p className="text-xs text-slate-500 mt-2 italic bg-amber-50/40 p-2 rounded-lg border border-amber-100/50">
                      "{debt.notes}"
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <button
                    onClick={() => handleDeleteDebt(debt.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                    title="Hapus Hutang"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {debt.status !== 'paid' && (
                    <button
                      onClick={() => setSelectedDebtForPay(debt)}
                      className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      Bayar Hutang
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      ) : (
        /* Receivables List */
        receivables.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center border border-slate-200">
            <CheckCircle2 className="w-12 h-12 text-teal-500 mx-auto mb-2" />
            <h3 className="text-base font-bold text-slate-800">Tidak Ada Piutang Tertunggak</h3>
            <p className="text-xs text-slate-400 mt-1">
              Saat Anda memindai struk belanja bersama teman, tagihan teman akan otomatis muncul di sini.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {receivables.map((rec) => (
              <div
                key={rec.id}
                className="bg-white rounded-2xl p-5 border border-slate-200 shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base">
                        {rec.friend_name}
                      </h3>
                      <p className="text-xs text-slate-400 mt-0.5">
                        {rec.merchant_name ? `Dari struk: ${rec.merchant_name}` : 'Pinjaman / Talangan'}
                      </p>
                    </div>

                    <span
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-full ${
                        rec.status === 'paid'
                          ? 'bg-slate-100 text-slate-600'
                          : 'bg-teal-50 text-teal-700'
                      }`}
                    >
                      {rec.status === 'paid' ? 'Lunas' : 'Belum Bayar'}
                    </span>
                  </div>

                  <div className="mt-4 p-3 bg-teal-50/50 rounded-xl space-y-1 border border-teal-100/60">
                    <div className="flex justify-between text-xs text-teal-800 font-medium">
                      <span>Sisa Tagihan:</span>
                      <span className="font-extrabold text-teal-950 text-sm">
                        {formatRupiah(Number(rec.remaining_amount))}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] text-slate-400">
                      <span>Total Awal:</span>
                      <span>{formatRupiah(Number(rec.amount))}</span>
                    </div>
                  </div>

                  {rec.notes && (
                    <p className="text-xs text-slate-500 mt-2 bg-slate-50 p-2 rounded-lg border border-slate-100">
                      {rec.notes}
                    </p>
                  )}
                </div>

                <div className="mt-5 pt-3 border-t border-slate-100 flex justify-between items-center">
                  <div className="flex items-center space-x-1">
                    <button
                      onClick={() => handleDeleteReceivable(rec.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                      title="Hapus Piutang"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>

                    {rec.status !== 'paid' && (
                      <button
                        onClick={() => handleCopyWhatsApp(rec)}
                        className="flex items-center space-x-1 px-3 py-1.5 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold transition-colors"
                        title="Salin rekap tagihan WhatsApp"
                      >
                        {copiedId === rec.id ? (
                          <>
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="text-emerald-700 font-bold">Tersalin!</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3.5 h-3.5 text-indigo-600" />
                            <span>Rekap WA</span>
                          </>
                        )}
                      </button>
                    )}
                  </div>

                  {rec.status !== 'paid' && (
                    <button
                      onClick={() => setSelectedRecForSettle(rec)}
                      className="px-4 py-1.5 rounded-xl bg-teal-600 hover:bg-teal-700 text-white text-xs font-bold shadow-xs transition-colors"
                    >
                      Tandai Lunas
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )
      )}

      {/* Debt Modals */}
      <DebtModal
        isOpen={isDebtModalOpen}
        onClose={() => setIsDebtModalOpen(false)}
        onSuccess={loadData}
      />

      <PayDebtModal
        isOpen={!!selectedDebtForPay}
        onClose={() => setSelectedDebtForPay(null)}
        debt={selectedDebtForPay}
        wallets={wallets}
        onSuccess={loadData}
      />

      <SettleReceivableModal
        isOpen={!!selectedRecForSettle}
        onClose={() => setSelectedRecForSettle(null)}
        receivable={selectedRecForSettle}
        wallets={wallets}
        onSuccess={loadData}
      />
    </div>
  );
};
