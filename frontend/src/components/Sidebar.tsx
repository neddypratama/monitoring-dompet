import React, { useState } from 'react';
import {
  LayoutDashboard,
  Wallet,
  ArrowRightLeft,
  Scale,
  Target,
  Settings,
  ShieldCheck,
  Camera,
  LogOut,
  Menu,
  X
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type TabType =
  | 'dashboard'
  | 'wallets'
  | 'transactions'
  | 'debts'
  | 'scan'
  | 'budgets'
  | 'settings'
  | 'admin';

interface SidebarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onTabChange }) => {
  const { user, logout } = useAuth();
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'wallets' as TabType, label: 'Dompet Saya', icon: Wallet },
    { id: 'transactions' as TabType, label: 'Riwayat Transaksi', icon: ArrowRightLeft },
    { id: 'debts' as TabType, label: 'Hutang & Piutang', icon: Scale },
    { id: 'budgets' as TabType, label: 'Anggaran & Target', icon: Target },
    { id: 'settings' as TabType, label: 'Pengaturan & AI', icon: Settings },
  ];

  if (user?.role === 'admin') {
    navItems.splice(5, 0, {
      id: 'admin' as TabType,
      label: 'Panel Admin',
      icon: ShieldCheck,
    });
  }

  const handleSelectTab = (tab: TabType) => {
    onTabChange(tab);
    setIsMobileOpen(false);
  };

  const NavLinkContent: React.FC<{ item: typeof navItems[0] }> = ({ item }) => {
    const Icon = item.icon;
    const isActive = currentTab === item.id;
    const isAdmin = item.id === 'admin';

    return (
      <button
        onClick={() => handleSelectTab(item.id)}
        className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
          isActive
            ? isAdmin
              ? 'bg-purple-50 text-purple-700 shadow-xs font-bold'
              : 'bg-indigo-50 text-indigo-700 shadow-xs font-bold'
            : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
        }`}
      >
        <div className="flex items-center space-x-3">
          <Icon
            className={`w-4 h-4 shrink-0 ${
              isActive
                ? isAdmin
                  ? 'text-purple-600'
                  : 'text-indigo-600'
                : 'text-slate-400 group-hover:text-slate-600'
            }`}
          />
          <span>{item.label}</span>
        </div>
        {isAdmin && (
          <span className="px-1.5 py-0.5 text-[9px] font-extrabold uppercase rounded bg-purple-100 text-purple-700">
            Admin
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      {/* 1. DESKTOP FIXED SIDEBAR (lg:flex) */}
      <aside className="hidden lg:flex fixed inset-y-0 left-0 w-64 bg-white border-r border-slate-200 z-30 flex-col justify-between select-none">
        {/* Top: Logo & Nav items */}
        <div className="p-5 flex flex-col flex-1 overflow-y-auto">
          {/* Logo brand */}
          <div
            onClick={() => handleSelectTab('dashboard')}
            className="flex items-center space-x-3 cursor-pointer group pb-5 border-b border-slate-100"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-100 group-hover:scale-105 transition-transform shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <span className="text-xl font-black bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent block leading-tight">
                DompetKu
              </span>
              <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider block">
                Multi-AI Finance
              </span>
            </div>
          </div>

          {/* Quick Scan CTA Button */}
          <div className="my-4">
            <button
              onClick={() => handleSelectTab('scan')}
              className={`w-full flex items-center justify-center space-x-2 py-2.5 px-4 rounded-xl text-sm font-bold transition-all shadow-md ${
                currentTab === 'scan'
                  ? 'bg-indigo-700 text-white shadow-indigo-300 ring-2 ring-indigo-400'
                  : 'bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white shadow-indigo-100 hover:shadow-indigo-200 hover:scale-[1.02] active:scale-[0.98]'
              }`}
            >
              <Camera className="w-4 h-4" />
              <span>Scan Struk AI</span>
            </button>
          </div>

          {/* Navigation Links */}
          <div className="space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 mb-2">
              Menu Navigasi
            </p>
            {navItems.map((item) => (
              <NavLinkContent key={item.id} item={item} />
            ))}
          </div>
        </div>

        {/* Bottom: User Card & Logout */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/60">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center space-x-1.5">
                  <p className="text-xs font-bold text-slate-800 truncate">
                    {user?.full_name || user?.username}
                  </p>
                  {user?.role === 'admin' && (
                    <span className="px-1 py-0.2 text-[8px] font-black uppercase rounded bg-purple-100 text-purple-700 shrink-0">
                      Admin
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-slate-400 truncate">@{user?.username}</p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors ml-2 shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* 2. TABLET / MOBILE TOP APP BAR (lg:hidden) */}
      <header className="lg:hidden sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 h-15 flex items-center justify-between">
        <div
          onClick={() => handleSelectTab('dashboard')}
          className="flex items-center space-x-2.5 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-xs">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <span className="text-base font-black text-slate-900 block leading-tight">
              DompetKu
            </span>
            <span className="text-[9px] text-indigo-600 font-bold uppercase tracking-wider block">
              Multi-AI Finance
            </span>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {/* Quick Scan Button */}
          <button
            onClick={() => handleSelectTab('scan')}
            className="flex items-center space-x-1.5 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Scan</span>
          </button>

          {/* Hamburger Drawer Toggle */}
          <button
            onClick={() => setIsMobileOpen(true)}
            className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Buka Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
        </div>
      </header>

      {/* 3. MOBILE & TABLET SLIDE-OVER DRAWER (lg:hidden) */}
      {isMobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div
            onClick={() => setIsMobileOpen(false)}
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
          />

          {/* Drawer content */}
          <div className="relative w-72 max-w-[85vw] bg-white h-full z-10 shadow-2xl flex flex-col justify-between animate-in slide-in-from-left duration-200">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white">
                  <Wallet className="w-4 h-4" />
                </div>
                <span className="font-black text-slate-900 text-lg">DompetKu</span>
              </div>
              <button
                onClick={() => setIsMobileOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Nav links */}
            <div className="p-4 space-y-1.5 flex-1 overflow-y-auto">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 mb-2">
                Menu Utama
              </p>
              {navItems.map((item) => (
                <NavLinkContent key={item.id} item={item} />
              ))}
            </div>

            {/* Drawer User profile & Logout */}
            <div className="p-4 border-t border-slate-100 bg-slate-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {(user?.full_name || user?.username || 'U').charAt(0).toUpperCase()}
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-800 truncate">
                      {user?.full_name || user?.username}
                    </p>
                    <p className="text-[10px] text-slate-400">@{user?.username}</p>
                  </div>
                </div>
                <button
                  onClick={logout}
                  className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                  title="Logout"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. MOBILE BOTTOM THUMB BAR (sm:hidden) */}
      <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-slate-200 px-3 py-1.5 flex justify-around items-center">
        <button
          onClick={() => handleSelectTab('dashboard')}
          className={`flex flex-col items-center py-1 px-2 ${
            currentTab === 'dashboard' ? 'text-indigo-600 font-bold' : 'text-slate-400'
          }`}
        >
          <LayoutDashboard className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Beranda</span>
        </button>

        <button
          onClick={() => handleSelectTab('wallets')}
          className={`flex flex-col items-center py-1 px-2 ${
            currentTab === 'wallets' ? 'text-indigo-600 font-bold' : 'text-slate-400'
          }`}
        >
          <Wallet className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Dompet</span>
        </button>

        {/* Central Floating Scan Button */}
        <button
          onClick={() => handleSelectTab('scan')}
          className="flex flex-col items-center -mt-5"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-300 border-3 border-white">
            <Camera className="w-5 h-5" />
          </div>
          <span className="text-[10px] font-bold text-indigo-700 mt-0.5">Scan</span>
        </button>

        <button
          onClick={() => handleSelectTab('debts')}
          className={`flex flex-col items-center py-1 px-2 ${
            currentTab === 'debts' ? 'text-indigo-600 font-bold' : 'text-slate-400'
          }`}
        >
          <Scale className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Hutang</span>
        </button>

        <button
          onClick={() => setIsMobileOpen(true)}
          className="flex flex-col items-center py-1 px-2 text-slate-400 hover:text-slate-700"
        >
          <Menu className="w-5 h-5" />
          <span className="text-[10px] mt-0.5">Lainnya</span>
        </button>
      </nav>
    </>
  );
};
