import React from 'react';
import { ReceiptItem } from '../types';
import { formatRupiah } from '../api/client';
import { RupiahInput } from './RupiahInput';
import { Trash2, User, UserCheck } from 'lucide-react';

interface ReceiptItemRowProps {
  item: ReceiptItem;
  index: number;
  existingFriends: string[];
  onChange: (index: number, updated: ReceiptItem) => void;
  onDelete: (index: number) => void;
}

export const ReceiptItemRow: React.FC<ReceiptItemRowProps> = ({
  item,
  index,
  existingFriends,
  onChange,
  onDelete,
}) => {
  const isSelf = item.is_self ?? (item.assigned_to === 'Pribadi' || !item.assigned_to);

  const handleNameChange = (val: string) => {
    onChange(index, { ...item, name: val });
  };

  const handleQtyChange = (val: number) => {
    onChange(index, { ...item, qty: Math.max(1, val) });
  };

  const handlePriceChange = (val: number) => {
    onChange(index, { ...item, raw_price: Math.max(0, val) });
  };

  const handleToggleSelf = (toSelf: boolean) => {
    onChange(index, {
      ...item,
      is_self: toSelf,
      assigned_to: toSelf ? 'Pribadi' : (existingFriends[0] || 'Teman 1'),
    });
  };

  const handleOwnerChange = (val: string) => {
    const clean = val.trim();
    const self = clean.toLowerCase() === 'pribadi' || clean.toLowerCase() === 'saya';
    onChange(index, {
      ...item,
      is_self: self,
      assigned_to: self ? 'Pribadi' : clean,
    });
  };

  return (
    <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs space-y-3 transition-all hover:border-indigo-200">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1">
          <input
            type="text"
            value={item.name}
            onChange={(e) => handleNameChange(e.target.value)}
            placeholder="Nama menu / barang"
            className="w-full text-xs font-bold text-slate-800 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 pb-0.5 outline-none transition-colors"
          />
        </div>

        <button
          onClick={() => onDelete(index)}
          className="text-slate-300 hover:text-rose-600 p-1 rounded-md transition-colors"
          title="Hapus baris"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase">Qty</label>
          <input
            type="number"
            value={item.qty}
            onChange={(e) => handleQtyChange(parseInt(e.target.value) || 1)}
            min="1"
            className="w-full mt-0.5 px-2.5 py-1.5 rounded-lg border border-slate-200 font-semibold focus:border-indigo-500 outline-none"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-slate-400 uppercase">Harga Kotor</label>
          <RupiahInput
            value={item.raw_price}
            onChange={(val) => handlePriceChange(val)}
            size="sm"
            wrapperClassName="mt-0.5"
          />
        </div>

        <div>
          <label className="block text-[10px] font-bold text-indigo-600 uppercase">Harga Bersih</label>
          <div className="mt-0.5 px-2.5 py-1.5 rounded-lg bg-indigo-50 border border-indigo-100 font-extrabold text-indigo-900 truncate">
            {formatRupiah(item.net_price ?? item.raw_price)}
          </div>
        </div>
      </div>

      {/* Assignment / Ownership */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center space-x-1.5">
          <button
            type="button"
            onClick={() => handleToggleSelf(true)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              isSelf
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <UserCheck className="w-3 h-3" />
            <span>Pribadi (Saya)</span>
          </button>

          <button
            type="button"
            onClick={() => handleToggleSelf(false)}
            className={`flex items-center space-x-1 px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
              !isSelf
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <User className="w-3 h-3" />
            <span>Milik Teman</span>
          </button>
        </div>

        {!isSelf && (
          <div className="flex items-center space-x-1.5">
            <span className="text-[11px] text-slate-400">Atas nama:</span>
            <input
              type="text"
              value={item.assigned_to || ''}
              onChange={(e) => handleOwnerChange(e.target.value)}
              placeholder="Nama Teman"
              list="existing-friends"
              className="px-2.5 py-1 rounded-lg border border-indigo-200 bg-indigo-50/50 text-indigo-950 font-bold text-xs focus:border-indigo-500 outline-none w-28"
            />
            <datalist id="existing-friends">
              {existingFriends.map((f) => (
                <option key={f} value={f} />
              ))}
            </datalist>
          </div>
        )}
      </div>
    </div>
  );
};
