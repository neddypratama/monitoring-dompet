import React, { useState, useEffect } from 'react';
import { TabType } from '../components/Navbar';
import { DashboardSummary } from '../types';
import { apiRequest, formatRupiah } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { MetricCard } from '../components/MetricCard';
import { IncomeExpenseChart } from '../components/Charts/IncomeExpenseChart';
import { CategoryPieChart } from '../components/Charts/CategoryPieChart';
import { BalanceTrendChart } from '../components/Charts/BalanceTrendChart';
import {
  Wallet,
  ArrowDownLeft,
  ArrowUpRight,
  TrendingUp,
  TrendingDown,
  Calendar,
  Clock,
  Users,
  Copy,
  Check,
  Target,
  ArrowRight,
  Loader2
} from 'lucide-react';

interface DashboardPageProps {
  onNavigate?: (tab: TabType) => void;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({ onNavigate }) => {
  const { user } = useAuth();
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [periodPreset, setPeriodPreset] = useState<string>('this_month');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [copiedRecId, setCopiedRecId] = useState<number | null>(null);

  // Set date ranges on preset change
  useEffect(() => {
    const now = new Date();
    let s = '';
    let e = '';

    if (periodPreset === 'today') {
      s = e = now.toISOString().split('T')[0];
    } else if (periodPreset === 'this_week') {
      const day = now.getDay() || 7; // Monday = 1
      const mon = new Date(now);
      mon.setDate(now.getDate() - day + 1);
      s = mon.toISOString().split('T')[0];
      e = now.toISOString().split('T')[0];
    } else if (periodPreset === 'this_month') {
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      s = `${year}-${month}-01`;
      const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
      e = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    } else if (periodPreset === 'last_month') {
      const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const year = prev.getFullYear();
      const month = String(prev.getMonth() + 1).padStart(2, '0');
      s = `${year}-${month}-01`;
      const lastDay = new Date(year, prev.getMonth() + 1, 0).getDate();
      e = `${year}-${month}-${String(lastDay).padStart(2, '0')}`;
    } else if (periodPreset === 'this_year') {
      s = `${now.getFullYear()}-01-01`;
      e = `${now.getFullYear()}-12-31`;
    }

    if (s && e) {
      setStartDate(s);
      setEndDate(e);
    }
  }, [periodPreset]);

  const fetchSummary = async () => {
    if (!startDate || !endDate) return;
    setIsLoading(true);
    try {
      const data = await apiRequest<DashboardSummary>(
        `/dashboard?start_date=${startDate}&end_date=${endDate}`
      );
      setSummary(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (startDate && endDate) {
      fetchSummary();
    }
  }, [startDate, endDate]);

  const handleCopyWhatsApp = (rec: any) => {
    const text = `Halo ${rec.friend_name}! Mau ingetin patungan ${rec.merchant_name ? rec.merchant_name + ': ' : ''}sebesar Rp ${Number(rec.remaining_amount).toLocaleString('id-ID')}.\nBisa ditransfer ya, terima kasih banyak! 🙏`;
    navigator.clipboard.writeText(text);
    setCopiedRecId(rec.id);
    setTimeout(() => setCopiedRecId(null), 2500);
  };

  return (
    <div className="space-y-6">
      {/* Header greeting & Period filter */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
            Halo, {user?.full_name || user?.username}! 👋
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Pantau arus kas dompet, pengingat hutang/piutang, dan split bill struk Anda
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex flex-wrap items-center gap-2 bg-white p-1.5 rounded-2xl border border-slate-200 shadow-2xs">
          <select
            value={periodPreset}
            onChange={(e) => setPeriodPreset(e.target.value)}
            className="px-3 py-1.5 rounded-xl bg-slate-50 border-none text-xs font-bold text-slate-700 outline-none cursor-pointer hover:bg-slate-100"
          >
            <option value="today">Hari Ini</option>
            <option value="this_week">Minggu Ini</option>
            <option value="this_month">Bulan Ini</option>
            <option value="last_month">Bulan Lalu</option>
            <option value="this_year">Tahun Ini</option>
            <option value="custom">Kustom</option>
          </select>

          {periodPreset === 'custom' && (
            <div className="flex items-center space-x-1.5 px-2 py-1 text-xs font-medium text-slate-600">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent text-[11px] outline-none"
              />
              <span>-</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent text-[11px] outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading && !summary ? (
        <div className="py-20 flex justify-center text-slate-400">
          <Loader2 className="w-8 h-8 animate-spin" />
        </div>
      ) : summary ? (
        <>
          {/* 4 Financial KPI Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <MetricCard
              title="Total Saldo Dompet"
              value={formatRupiah(summary.total_balance)}
              subtitle={`Dari ${summary.wallets.length} akun dompet aktif`}
              icon={Wallet}
              colorClass="text-blue-600"
              bgClass="bg-blue-50"
            />
            <MetricCard
              title="Total Pemasukan"
              value={formatRupiah(summary.total_income)}
              subtitle="Operasional periode terpilih"
              icon={ArrowDownLeft}
              colorClass="text-emerald-600"
              bgClass="bg-emerald-50"
            />
            <MetricCard
              title="Total Pengeluaran"
              value={formatRupiah(summary.total_expense)}
              subtitle="Operasional belanja pribadi"
              icon={ArrowUpRight}
              colorClass="text-rose-600"
              bgClass="bg-rose-50"
            />
            <MetricCard
              title="Arus Kas Bersih"
              value={formatRupiah(summary.net_cashflow)}
              subtitle={summary.net_cashflow >= 0 ? 'Surplus / Hemat' : 'Defisit Belanja'}
              icon={summary.net_cashflow >= 0 ? TrendingUp : TrendingDown}
              colorClass={summary.net_cashflow >= 0 ? 'text-indigo-600' : 'text-amber-600'}
              bgClass={summary.net_cashflow >= 0 ? 'bg-indigo-50' : 'bg-amber-50'}
              trend={{
                positive: summary.net_cashflow >= 0,
                text: summary.net_cashflow >= 0 ? '+ Arus Kas Positif' : '- Arus Kas Negatif',
              }}
            />
          </div>

          {/* Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    Pemasukan vs Pengeluaran
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Aktivitas arus kas harian selama periode terpilih
                  </p>
                </div>
              </div>
              <IncomeExpenseChart data={summary.income_expense_chart} />
            </div>

            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="font-extrabold text-slate-800 text-sm">
                    Pengeluaran per Kategori
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Proporsi belanja berdasarkan kategori
                  </p>
                </div>
              </div>
              <CategoryPieChart data={summary.category_pie_chart} />
            </div>
          </div>

          {/* Balance Trend Area Chart */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  Tren Arus Kas Bersih Kumulatif
                </h3>
                <p className="text-[11px] text-slate-400">
                  Pergerakan saldo akumulatif dari waktu ke waktu
                </p>
              </div>
            </div>
            <BalanceTrendChart data={summary.balance_trend_chart} />
          </div>

          {/* Quick Action & Widgets Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Widget Hutang Mendesak */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                      Hutang Jatuh Tempo
                    </h3>
                  </div>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('debts')}
                      className="text-[11px] font-bold text-amber-600 hover:text-amber-800 flex items-center space-x-1"
                    >
                      <span>Lihat Semua</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {summary.urgent_debts.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    Tidak ada hutang mendesak saat ini.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {summary.urgent_debts.map((d) => (
                      <div
                        key={d.id}
                        className="p-3 bg-slate-50 rounded-2xl flex justify-between items-center text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{d.creditor_name}</p>
                          <p className="text-[10px] text-slate-400">Tempo: {d.due_date}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-extrabold text-amber-700">
                            {formatRupiah(Number(d.remaining_amount))}
                          </p>
                          <span
                            className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                              d.urgency_status === 'overdue'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {d.urgency_status === 'overdue' ? 'Lewat Tempo' : 'Mendesak'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Widget Piutang Teman */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <Users className="w-4 h-4 text-teal-600" />
                    <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                      Piutang Teman (Split Bill)
                    </h3>
                  </div>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('debts')}
                      className="text-[11px] font-bold text-teal-600 hover:text-teal-800 flex items-center space-x-1"
                    >
                      <span>Lihat Semua</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {summary.active_receivables.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    Tidak ada piutang teman yang tertunggak.
                  </p>
                ) : (
                  <div className="space-y-2.5">
                    {summary.active_receivables.map((r) => (
                      <div
                        key={r.id}
                        className="p-3 bg-teal-50/50 rounded-2xl flex justify-between items-center text-xs"
                      >
                        <div>
                          <p className="font-bold text-slate-800">{r.friend_name}</p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {r.notes || 'Split bill'}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <span className="font-extrabold text-teal-800">
                            {formatRupiah(Number(r.remaining_amount))}
                          </span>
                          <button
                            onClick={() => handleCopyWhatsApp(r)}
                            title="Salin rekap WhatsApp"
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded-md"
                          >
                            {copiedRecId === r.id ? (
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Widget Anggaran & Target Tabungan */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex flex-col justify-between">
              <div>
                <div className="flex justify-between items-center mb-3">
                  <div className="flex items-center space-x-2">
                    <Target className="w-4 h-4 text-indigo-600" />
                    <h3 className="font-extrabold text-slate-800 text-xs uppercase tracking-wider">
                      Anggaran Kategori
                    </h3>
                  </div>
                  {onNavigate && (
                    <button
                      onClick={() => onNavigate('budgets')}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                    >
                      <span>Kelola</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {summary.top_budgets.length === 0 ? (
                  <p className="text-xs text-slate-400 py-6 text-center">
                    Belum ada anggaran yang disetel bulan ini.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {summary.top_budgets.slice(0, 3).map((b) => (
                      <div key={b.id} className="space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-bold text-slate-700">{b.category_name}</span>
                          <span className="text-[11px] text-slate-400">
                            {formatRupiah(b.spent_amount)} / {formatRupiah(b.monthly_limit)}
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                          <div
                            className={`h-full rounded-full transition-all ${
                              b.status === 'danger'
                                ? 'bg-rose-500'
                                : b.status === 'warning'
                                ? 'bg-amber-500'
                                : 'bg-emerald-500'
                            }`}
                            style={{ width: `${Math.min(100, b.percentage)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Recent Transactions Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs">
            <div className="flex justify-between items-center mb-4">
              <div>
                <h3 className="font-extrabold text-slate-800 text-sm">
                  Transaksi Terbaru
                </h3>
                <p className="text-[11px] text-slate-400">
                  Riwayat mutasi saldo terakhir di semua akun
                </p>
              </div>
              {onNavigate && (
                <button
                  onClick={() => onNavigate('transactions')}
                  className="text-xs font-bold text-indigo-600 hover:text-indigo-800 flex items-center space-x-1"
                >
                  <span>Buka Semua Transaksi</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="text-[11px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100 pb-2">
                  <tr>
                    <th className="py-2.5 px-3">Tanggal</th>
                    <th className="py-2.5 px-3">Keterangan</th>
                    <th className="py-2.5 px-3">Dompet</th>
                    <th className="py-2.5 px-3 text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {summary.recent_transactions.map((tx) => (
                    <tr key={tx.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-3 text-slate-400 whitespace-nowrap">{tx.date}</td>
                      <td className="py-3 px-3">
                        <span className="font-bold text-slate-800">
                          {tx.category_name || (tx.type === 'transfer' ? 'Transfer' : 'Lain-lain')}
                        </span>
                        {tx.notes && (
                          <span className="text-slate-400 text-[11px] ml-2 truncate max-w-xs inline-block">
                            ({tx.notes})
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-slate-600 whitespace-nowrap font-medium">
                        {tx.wallet_name}
                      </td>
                      <td
                        className={`py-3 px-3 text-right font-extrabold whitespace-nowrap ${
                          tx.type === 'income' || tx.type === 'receivable_settlement'
                            ? 'text-emerald-600'
                            : 'text-slate-900'
                        }`}
                      >
                        {tx.type === 'income' || tx.type === 'receivable_settlement' ? '+' : '-'} {formatRupiah(Number(tx.amount))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
};
