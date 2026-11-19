import React from 'react';
import {
  Wallet,
  LayoutDashboard,
  Scale,
  Target,
  Settings,
  LogOut,
  Camera,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export type TabType = 'dashboard' | 'wallets' | 'transactions' | 'debts' | 'scan' | 'budgets' | 'settings' | 'admin';

interface NavbarProps {
  currentTab: TabType;
  onTabChange: (tab: TabType) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, onTabChange }) => {
  const { user, logout } = useAuth();

  const navItems = [
    { id: 'dashboard' as TabType, label: 'Dashboard', icon: LayoutDashboard },
    { id: 'wallets' as TabType, label: 'Dompet', icon: Wallet },
    { id: 'debts' as TabType, label: 'Hutang & Piutang', icon: Scale },
    { id: 'budgets' as TabType, label: 'Anggaran & Target', icon: Target },
    { id: 'settings' as TabType, label: 'Pengaturan', icon: Settings },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin' as TabType, label: 'Panel Admin', icon: ShieldCheck });
  }

  return (
    <>
      {/* Desktop Top Navbar */}
      <header className="hidden md:block sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onTabChange('dashboard')}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xl font-bold bg-gradient-to-r from-slate-900 to-indigo-950 bg-clip-text text-transparent">
                  DompetKu
                </span>
                <span className="block text-xs text-indigo-600 font-semibold uppercase tracking-wider">
                  Multi-AI Finance
                </span>
              </div>
            </div>

            {/* Navigation links */}
            <nav className="flex space-x-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = currentTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`flex items-center space-x-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                      isActive
                        ? 'bg-indigo-50 text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Right side CTA & User */}
            <div className="flex items-center space-x-3">
              <button
                onClick={() => onTabChange('scan')}
                className="flex items-center space-x-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-700 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md shadow-indigo-200 transition-all hover:scale-102"
              >
                <Camera className="w-4 h-4" />
                <span>Scan Struk</span>
              </button>

              <div className="h-6 w-px bg-slate-200 mx-1"></div>

              <div className="flex items-center space-x-2">
                <div className="text-right">
                  <div className="flex items-center space-x-1.5 justify-end">
                    <p className="text-xs font-semibold text-slate-800 leading-tight">
                      {user?.full_name || user?.username}
                    </p>
                    {user?.role === 'admin' && (
                      <span className="px-1.5 py-0.2 text-[9px] font-extrabold rounded-full bg-purple-100 text-purple-700 uppercase tracking-wider">
                        Admin
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 leading-tight">
                    @{user?.username}
                  </p>
                </div>
                <button
                  onClick={logout}
                  title="Logout"
                  className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Bottom Navigation Bar */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/90 backdrop-blur-md border-t border-slate-200 px-3 py-2">
        <div className="flex justify-around items-center">
          <button
            onClick={() => onTabChange('dashboard')}
            className={`flex flex-col items-center py-1 px-2 ${
              currentTab === 'dashboard' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <LayoutDashboard className="w-5 h-5" />
            <span className="text-[10px] mt-1">Beranda</span>
          </button>

          <button
            onClick={() => onTabChange('wallets')}
            className={`flex flex-col items-center py-1 px-2 ${
              currentTab === 'wallets' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <Wallet className="w-5 h-5" />
            <span className="text-[10px] mt-1">Dompet</span>
          </button>

          {/* Central floating scan button */}
          <button
            onClick={() => onTabChange('scan')}
            className="flex flex-col items-center -mt-6"
          >
            <div className="w-13 h-13 rounded-full bg-gradient-to-tr from-indigo-600 to-blue-600 text-white flex items-center justify-center shadow-lg shadow-indigo-300 border-4 border-slate-50">
              <Camera className="w-6 h-6" />
            </div>
            <span className="text-[10px] mt-0.5 font-bold text-indigo-700">Scan</span>
          </button>

          <button
            onClick={() => onTabChange('debts')}
            className={`flex flex-col items-center py-1 px-2 ${
              currentTab === 'debts' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <Scale className="w-5 h-5" />
            <span className="text-[10px] mt-1">Hutang</span>
          </button>

          <button
            onClick={() => onTabChange('settings')}
            className={`flex flex-col items-center py-1 px-2 ${
              currentTab === 'settings' ? 'text-indigo-600 font-bold' : 'text-slate-400'
            }`}
          >
            <Settings className="w-5 h-5" />
            <span className="text-[10px] mt-1">Setelan</span>
          </button>
        </div>
      </div>
    </>
  );
};
