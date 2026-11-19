import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';
import { formatRupiah } from '../../api/client';

interface IncomeExpenseChartProps {
  data: Array<{ date: string; income: number; expense: number }>;
}

export const IncomeExpenseChart: React.FC<IncomeExpenseChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        Belum ada transaksi pemasukan/pengeluaran di periode ini.
      </div>
    );
  }

  const formattedData = data.map((d) => ({
    ...d,
    displayDate: d.date.split('-').slice(1).join('/'),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={formattedData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="displayDate" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(val) => {
              if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
              if (val >= 1000) return `${(val / 1000).toFixed(0)}k`;
              return String(val);
            }}
          />
          <Tooltip
            formatter={(value: any) => [formatRupiah(Number(value) || 0), '']}
            labelFormatter={(label) => `Tanggal: ${label}`}
            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
          <Legend
            iconType="circle"
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
            formatter={(value) => (value === 'income' ? 'Pemasukan' : 'Pengeluaran')}
          />
          <Bar dataKey="income" name="income" fill="#10b981" radius={[4, 4, 0, 0]} />
          <Bar dataKey="expense" name="expense" fill="#f43f5e" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
