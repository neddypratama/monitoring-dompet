import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { Navbar, TabType } from './components/Navbar';
import { DashboardPage } from './pages/DashboardPage';
import { WalletsPage } from './pages/WalletsPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { DebtsPage } from './pages/DebtsPage';
import { ScanReceiptPage } from './pages/ScanReceiptPage';
import { BudgetsGoalsPage } from './pages/BudgetsGoalsPage';
import { SettingsPage } from './pages/SettingsPage';
import { Loader2 } from 'lucide-react';

const MainApp: React.FC = () => {
  const { user, isLoading } = useAuth();
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [currentTab, setCurrentTab] = useState<TabType>('dashboard');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center text-white">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-400" />
      </div>
    );
  }

  if (!user) {
    return authMode === 'login' ? (
      <LoginPage onSwitchToRegister={() => setAuthMode('register')} />
    ) : (
      <RegisterPage onSwitchToLogin={() => setAuthMode('login')} />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col pb-20 md:pb-8">
      <Navbar currentTab={currentTab} onTabChange={setCurrentTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {currentTab === 'dashboard' && <DashboardPage onNavigate={setCurrentTab} />}
        {currentTab === 'wallets' && <WalletsPage />}
        {currentTab === 'transactions' && <TransactionsPage />}
        {currentTab === 'debts' && <DebtsPage />}
        {currentTab === 'scan' && <ScanReceiptPage onNavigate={setCurrentTab} />}
        {currentTab === 'budgets' && <BudgetsGoalsPage />}
        {currentTab === 'settings' && <SettingsPage />}
      </main>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
};

export default App;
