import React from 'react';
import { Wallet as WalletType } from '../types';
import { formatRupiah } from '../api/client';
import {
  Wallet,
  Building2,
  Smartphone,
  ArrowRightLeft,
  Edit2,
  Trash2
} from 'lucide-react';

interface WalletCardProps {
  wallet: WalletType;
  onTransfer: (wallet: WalletType) => void;
  onEdit: (wallet: WalletType) => void;
  onDelete: (walletId: number) => void;
}

export const WalletCard: React.FC<WalletCardProps> = ({
  wallet,
  onTransfer,
  onEdit,
  onDelete,
}) => {
  const getIcon = () => {
    switch (wallet.type) {
      case 'bank':
        return <Building2 className="w-5 h-5 text-white" />;
      case 'ewallet':
        return <Smartphone className="w-5 h-5 text-white" />;
      default:
        return <Wallet className="w-5 h-5 text-white" />;
    }
  };

  const getTypeLabel = () => {
    switch (wallet.type) {
      case 'bank':
        return 'Rekening Bank';
      case 'ewallet':
        return 'E-Wallet';
      default:
        return 'Uang Tunai';
    }
  };

  return (
    <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between relative overflow-hidden group">
      {/* Color accent line */}
      <div
        className="absolute top-0 left-0 right-0 h-1.5"
        style={{ backgroundColor: wallet.color || '#3b82f6' }}
      />

      <div>
        <div className="flex justify-between items-start mb-4">
          <div className="flex items-center space-x-3">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shadow-xs"
              style={{ backgroundColor: wallet.color || '#3b82f6' }}
            >
              {getIcon()}
            </div>
            <div>
              <h3 className="font-bold text-slate-800 text-base leading-tight">
                {wallet.name}
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {getTypeLabel()} {wallet.account_number ? `• ${wallet.account_number}` : ''}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-1 opacity-80 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => onEdit(wallet)}
              title="Edit Dompet"
              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
            >
              <Edit2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => onDelete(wallet.id)}
              title="Hapus Dompet"
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="mt-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
            Saldo Saat Ini
          </span>
          <p className="text-2xl font-extrabold text-slate-900 tracking-tight mt-0.5">
            {formatRupiah(Number(wallet.balance))}
          </p>
        </div>
      </div>

      <div className="mt-5 pt-3 border-t border-slate-100 flex justify-end">
        <button
          onClick={() => onTransfer(wallet)}
          className="flex items-center space-x-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-3 py-1.5 rounded-lg transition-colors"
        >
          <ArrowRightLeft className="w-3.5 h-3.5" />
          <span>Transfer Saldo</span>
        </button>
      </div>
    </div>
  );
};
