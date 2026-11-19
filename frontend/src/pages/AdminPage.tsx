import React, { useState, useEffect } from 'react';
import {
  Users,
  ShieldCheck,
  Activity,
  UserCheck,
  CreditCard,
  ArrowRightLeft,
  CircleDollarSign,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Lock,
  Unlock,
  Shield,
  Clock
} from 'lucide-react';
import { apiRequest, formatRupiah } from '../api/client';
import { AdminStats, AdminUserListItem, ActivityLog } from '../types';
import { useAuth } from '../context/AuthContext';

export const AdminPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [activeSubTab, setActiveSubTab] = useState<'stats' | 'users' | 'logs'>('stats');

  // Stats state
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [isStatsLoading, setIsStatsLoading] = useState(false);

  // Users state
  const [users, setUsers] = useState<AdminUserListItem[]>([]);
  const [isUsersLoading, setIsUsersLoading] = useState(false);
  const [userSearch, setUserSearch] = useState('');

  // Logs state
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [isLogsLoading, setIsLogsLoading] = useState(false);
  const [logSearch, setLogSearch] = useState('');

  // Notifications
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Action modals/loading
  const [isActionLoading, setIsActionLoading] = useState(false);

  const loadStats = async () => {
    setIsStatsLoading(true);
    try {
      const data = await apiRequest<AdminStats>('/admin/stats');
      setStats(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal memuat statistik platform' });
    } finally {
      setIsStatsLoading(false);
    }
  };

  const loadUsers = async () => {
    setIsUsersLoading(true);
    try {
      const data = await apiRequest<AdminUserListItem[]>('/admin/users');
      setUsers(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal memuat daftar pengguna' });
    } finally {
      setIsUsersLoading(false);
    }
  };

  const loadLogs = async (searchTerm?: string) => {
    setIsLogsLoading(true);
    try {
      const query = searchTerm ? `?search=${encodeURIComponent(searchTerm)}` : '';
      const data = await apiRequest<ActivityLog[]>(`/admin/logs${query}`);
      setLogs(data);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal memuat riwayat aktivitas' });
    } finally {
      setIsLogsLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
    loadUsers();
    loadLogs();
  }, []);

  const handleToggleStatus = async (user: AdminUserListItem) => {
    const nextStatus = user.is_active === 1 ? 0 : 1;
    const actionLabel = nextStatus === 1 ? 'mengaktifkan' : 'menonaktifkan';

    if (!window.confirm(`Apakah Anda yakin ingin ${actionLabel} akun @${user.username}?`)) {
      return;
    }

    setIsActionLoading(true);
    setMessage(null);
    try {
      await apiRequest(`/admin/users/${user.id}/status`, {
        method: 'PUT',
        body: JSON.stringify({ is_active: nextStatus }),
      });
      setMessage({
        type: 'success',
        text: `Akun @${user.username} berhasil ${nextStatus === 1 ? 'diaktifkan kembali' : 'dinonaktifkan'}.`,
      });
      await loadUsers();
      await loadStats();
      await loadLogs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal mengubah status akun' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleToggleRole = async (user: AdminUserListItem) => {
    const nextRole = user.role === 'admin' ? 'user' : 'admin';
    const actionLabel = nextRole === 'admin' ? 'menjadikan ADMIN' : 'menjadikan USER biasa';

    if (!window.confirm(`Apakah Anda yakin ingin ${actionLabel} untuk @${user.username}?`)) {
      return;
    }

    setIsActionLoading(true);
    setMessage(null);
    try {
      await apiRequest(`/admin/users/${user.id}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: nextRole }),
      });
      setMessage({
        type: 'success',
        text: `Role @${user.username} berhasil diubah menjadi ${nextRole.toUpperCase()}.`,
      });
      await loadUsers();
      await loadStats();
      await loadLogs();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Gagal mengubah role pengguna' });
    } finally {
      setIsActionLoading(false);
    }
  };

  const handleLogSearch = (e: React.FormEvent) => {
    e.preventDefault();
    loadLogs(logSearch);
  };

  const filteredUsers = users.filter((u) =>
    u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.full_name.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center shadow-xs">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900">Panel Administrator</h1>
              <p className="text-sm text-slate-500">
                Pusat kendali manajemen pengguna, statistik sistem, dan audit log aktivitas
              </p>
            </div>
          </div>
        </div>

        {/* Tab switchers */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          <button
            onClick={() => setActiveSubTab('stats')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'stats'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Activity className="w-4 h-4" />
            <span>Statistik</span>
          </button>
          <button
            onClick={() => setActiveSubTab('users')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'users'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Pengguna ({users.length})</span>
          </button>
          <button
            onClick={() => setActiveSubTab('logs')}
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeSubTab === 'logs'
                ? 'bg-white text-purple-700 shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            <span>Audit Log</span>
          </button>
        </div>
      </div>

      {/* Alert Notification */}
      {message && (
        <div
          className={`p-4 rounded-xl flex items-center space-x-3 text-sm font-medium ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-800 border border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          ) : (
            <AlertCircle className="w-5 h-5 text-rose-600 flex-shrink-0" />
          )}
          <span>{message.text}</span>
          <button
            onClick={() => setMessage(null)}
            className="ml-auto text-xs text-slate-400 hover:text-slate-600"
          >
            ✕
          </button>
        </div>
      )}

      {/* Subtab 1: System Statistics */}
      {activeSubTab === 'stats' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
                <Users className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Pengguna</p>
                <p className="text-2xl font-black text-slate-900">{stats?.total_users ?? 0}</p>
                <p className="text-xs text-slate-500 mt-0.5">{stats?.active_users ?? 0} akun aktif</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Administrator</p>
                <p className="text-2xl font-black text-slate-900">{stats?.admin_users ?? 0}</p>
                <p className="text-xs text-slate-500 mt-0.5">Memiliki akses penuh</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-100 text-indigo-600 flex items-center justify-center">
                <CreditCard className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Dompet</p>
                <p className="text-2xl font-black text-slate-900">{stats?.total_wallets ?? 0}</p>
                <p className="text-xs text-slate-500 mt-0.5">Terdaftar di sistem</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-600 flex items-center justify-center">
                <ArrowRightLeft className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Jumlah Transaksi</p>
                <p className="text-2xl font-black text-slate-900">{stats?.total_transactions ?? 0}</p>
                <p className="text-xs text-slate-500 mt-0.5">Seluruh mutasi tercatat</p>
              </div>
            </div>

            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4 sm:col-span-2">
              <div className="w-12 h-12 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center">
                <CircleDollarSign className="w-6 h-6" />
              </div>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Perputaran Sistem</p>
                <p className="text-2xl font-black text-slate-900">{formatRupiah(stats?.total_volume ?? 0)}</p>
                <p className="text-xs text-slate-500 mt-0.5">Akumulasi volume transaksi platform</p>
              </div>
            </div>
          </div>

          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md flex items-center justify-between">
            <div>
              <h3 className="font-bold text-lg">Keamanan & Integritas Data</h3>
              <p className="text-xs text-slate-400 mt-1 max-w-xl">
                Privasi pengguna tetap terjaga. Sebagai administrator, Anda mengelola hak akses akun dan memantau kesehatan operasional tanpa membuka catatan rincian belanja privat pengguna.
              </p>
            </div>
            <button
              onClick={loadStats}
              disabled={isStatsLoading}
              className="flex items-center space-x-2 bg-slate-800 hover:bg-slate-700 text-slate-200 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors"
            >
              <RefreshCw className={`w-4 h-4 ${isStatsLoading ? 'animate-spin' : ''}`} />
              <span>Segarkan Data</span>
            </button>
          </div>
        </div>
      )}

      {/* Subtab 2: User Management */}
      {activeSubTab === 'users' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Search bar & Refresh */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Cari username atau nama..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <button
              onClick={loadUsers}
              disabled={isUsersLoading}
              className="flex items-center space-x-2 px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors self-end sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${isUsersLoading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>
          </div>

          {/* Users Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Pengguna</th>
                  <th className="py-3 px-6">Role</th>
                  <th className="py-3 px-6 text-center">Dompet</th>
                  <th className="py-3 px-6 text-center">Transaksi</th>
                  <th className="py-3 px-6">Terdaftar</th>
                  <th className="py-3 px-6 text-center">Status</th>
                  <th className="py-3 px-6 text-right">Aksi Manajemen</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-8 text-slate-400">
                      Tidak ada pengguna yang sesuai pencarian.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((u) => {
                    const isSelf = currentUser?.id === u.id;
                    return (
                      <tr key={u.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-4 px-6">
                          <div className="font-bold text-slate-900 flex items-center space-x-1.5">
                            <span>{u.full_name || u.username}</span>
                            {isSelf && (
                              <span className="text-[10px] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded font-normal">
                                Anda
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-400">@{u.username}</div>
                        </td>

                        <td className="py-4 px-6">
                          {u.role === 'admin' ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-purple-100 text-purple-700">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Admin</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-600">
                              <span>User</span>
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-center text-slate-600">
                          {u.total_wallets}
                        </td>

                        <td className="py-4 px-6 text-center text-slate-600">
                          {u.total_transactions}
                        </td>

                        <td className="py-4 px-6 text-xs text-slate-500 whitespace-nowrap">
                          {u.created_at.substring(0, 10)}
                        </td>

                        <td className="py-4 px-6 text-center whitespace-nowrap">
                          {u.is_active === 1 ? (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700">
                              <UserCheck className="w-3.5 h-3.5" />
                              <span>Aktif</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                              <span>Menunggu Aktivasi</span>
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-6 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end space-x-2">
                            {/* Role Switch */}
                            <button
                              onClick={() => handleToggleRole(u)}
                              disabled={isActionLoading}
                              title={u.role === 'admin' ? 'Ubah jadi User' : 'Jadikan Admin'}
                              className="px-2.5 py-1 text-xs font-semibold rounded-lg border border-purple-200 text-purple-700 hover:bg-purple-50 transition-colors disabled:opacity-50"
                            >
                              {u.role === 'admin' ? 'Jadikan User' : 'Jadikan Admin'}
                            </button>

                            {/* Status Toggle / Activate */}
                            {u.is_active === 1 ? (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                disabled={isActionLoading || isSelf}
                                title={isSelf ? 'Tidak dapat menonaktifkan akun sendiri' : 'Nonaktifkan Akun'}
                                className="p-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-rose-600 hover:border-rose-200 hover:bg-rose-50 transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                              >
                                <Lock className="w-3.5 h-3.5" />
                              </button>
                            ) : (
                              <button
                                onClick={() => handleToggleStatus(u)}
                                disabled={isActionLoading}
                                title="Klik untuk mengaktifkan akun pengguna ini"
                                className="flex items-center space-x-1 px-3 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 text-xs font-bold transition-all shadow-2xs"
                              >
                                <Unlock className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Aktifkan</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Subtab 3: Activity Logs */}
      {activeSubTab === 'logs' && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          {/* Search bar & Refresh */}
          <div className="p-4 sm:p-6 border-b border-slate-100 flex flex-col sm:flex-row justify-between items-center gap-3">
            <form onSubmit={handleLogSearch} className="relative w-full sm:w-96 flex space-x-2">
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3 top-3.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Cari aksi, username, atau detail log..."
                  value={logSearch}
                  onChange={(e) => setLogSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-sm font-semibold transition-colors"
              >
                Cari
              </button>
            </form>

            <button
              onClick={() => {
                setLogSearch('');
                loadLogs();
              }}
              disabled={isLogsLoading}
              className="flex items-center space-x-2 px-4 py-2 border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-50 rounded-xl text-sm font-semibold transition-colors self-end sm:self-auto"
            >
              <RefreshCw className={`w-4 h-4 ${isLogsLoading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>
          </div>

          {/* Logs Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-700">
              <thead className="bg-slate-50 text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-6">Waktu</th>
                  <th className="py-3 px-6">Aksi</th>
                  <th className="py-3 px-6">Pelaku / Pengguna</th>
                  <th className="py-3 px-6">Detail Aktivitas</th>
                  <th className="py-3 px-6">IP Address</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="text-center py-8 text-slate-400">
                      Belum ada riwayat aktivitas yang tercatat.
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const isAuth = log.action.startsWith('auth.');
                    const isAdmin = log.action.startsWith('admin.');
                    return (
                      <tr key={log.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3.5 px-6 text-xs text-slate-500 whitespace-nowrap">
                          {log.created_at}
                        </td>

                        <td className="py-3.5 px-6 whitespace-nowrap">
                          <span
                            className={`px-2 py-0.5 rounded-md text-[11px] font-bold tracking-wide ${
                              isAdmin
                                ? 'bg-purple-100 text-purple-700'
                                : isAuth
                                ? 'bg-blue-100 text-blue-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {log.action}
                          </span>
                        </td>

                        <td className="py-3.5 px-6 whitespace-nowrap">
                          {log.username ? (
                            <div>
                              <span className="font-semibold text-slate-900">@{log.username}</span>
                              {log.role && (
                                <span className="ml-1.5 text-[9px] bg-slate-100 text-slate-500 px-1 py-0.2 rounded uppercase">
                                  {log.role}
                                </span>
                              )}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Sistem / Tamu</span>
                          )}
                        </td>

                        <td className="py-3.5 px-6 text-slate-700 max-w-md">
                          {log.details}
                        </td>

                        <td className="py-3.5 px-6 text-xs text-slate-400 font-mono whitespace-nowrap">
                          {log.ip_address || '-'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
