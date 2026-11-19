import React from 'react';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatRupiah } from '../../api/client';

interface CategoryPieChartProps {
  data: Array<{ name: string; color: string; icon: string; total_amount: number }>;
}

export const CategoryPieChart: React.FC<CategoryPieChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        Belum ada data pengeluaran per kategori.
      </div>
    );
  }

  const defaultColors = ['#f43f5e', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4', '#ec4899', '#64748b'];

  const total = data.reduce((acc, d) => acc + Number(d.total_amount), 0);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 h-64">
      <div className="h-full w-full sm:w-1/2">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              dataKey="total_amount"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={80}
              paddingAngle={3}
            >
              {data.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={entry.color || defaultColors[index % defaultColors.length]}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any) => [formatRupiah(Number(value) || 0), 'Pengeluaran']}
              contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>

      <div className="w-full sm:w-1/2 max-h-56 overflow-y-auto space-y-2 pr-1">
        {data.map((item, idx) => {
          const pct = total > 0 ? ((item.total_amount / total) * 100).toFixed(1) : '0';
          return (
            <div key={idx} className="flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 truncate">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color || defaultColors[idx % defaultColors.length] }}
                />
                <span className="font-semibold text-slate-700 truncate">{item.name}</span>
              </div>
              <div className="text-right shrink-0">
                <span className="font-extrabold text-slate-900">{formatRupiah(Number(item.total_amount))}</span>
                <span className="text-[10px] text-slate-400 ml-1">({pct}%)</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
