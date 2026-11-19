import React from 'react';
import { LucideIcon } from 'lucide-react';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: LucideIcon;
  colorClass: string;
  bgClass: string;
  trend?: {
    positive?: boolean;
    text: string;
  };
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  icon: Icon,
  colorClass,
  bgClass,
  trend,
}) => {
  return (
    <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between">
      <div className="flex justify-between items-start mb-3">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          {title}
        </span>
        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center ${bgClass} ${colorClass}`}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      <div>
        <p className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
          {value}
        </p>

        {subtitle && (
          <p className="text-xs text-slate-400 mt-1 font-medium">
            {subtitle}
          </p>
        )}

        {trend && (
          <div className="mt-2 flex items-center space-x-1.5 text-xs font-semibold">
            <span className={trend.positive ? 'text-emerald-600' : 'text-rose-600'}>
              {trend.text}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
