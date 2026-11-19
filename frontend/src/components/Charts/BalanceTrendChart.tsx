import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import { formatRupiah } from '../../api/client';

interface BalanceTrendChartProps {
  data: Array<{ date: string; net_movement: number; cumulative: number }>;
}

export const BalanceTrendChart: React.FC<BalanceTrendChartProps> = ({ data }) => {
  if (!data || data.length === 0) {
    return (
      <div className="h-64 flex items-center justify-center text-xs text-slate-400">
        Belum ada data tren saldo di rentang tanggal ini.
      </div>
    );
  }

  const formatted = data.map((d) => ({
    ...d,
    displayDate: d.date.split('-').slice(1).join('/'),
  }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={formatted} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
          <defs>
            <linearGradient id="colorCumulative" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
              <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
          <XAxis dataKey="displayDate" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: '#94a3b8' }} />
          <YAxis
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: '#94a3b8' }}
            tickFormatter={(val) => {
              if (Math.abs(val) >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
              if (Math.abs(val) >= 1000) return `${(val / 1000).toFixed(0)}k`;
              return String(val);
            }}
          />
          <Tooltip
            formatter={(value: any) => [formatRupiah(Number(value) || 0), 'Arus Bersih Kumulatif']}
            labelFormatter={(label) => `Tanggal: ${label}`}
            contentStyle={{ backgroundColor: '#ffffff', borderRadius: '12px', border: '1px solid #e2e8f0', fontSize: '12px' }}
          />
          <Area
            type="monotone"
            dataKey="cumulative"
            stroke="#6366f1"
            strokeWidth={2.5}
            fillOpacity={1}
            fill="url(#colorCumulative)"
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
};
