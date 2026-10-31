import React from 'react';

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  trendValue,
  onClick,
  color = 'emerald',
}) {
  const isUp = trend === 'up';
  const colorMap = {
    emerald: {
      bgIcon: 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20',
      ring: 'hover:border-emerald-500/40 hover:ring-1 hover:ring-emerald-500/20',
    },
    blue: {
      bgIcon: 'bg-blue-500/10 text-blue-400 border border-blue-500/20',
      ring: 'hover:border-blue-500/40 hover:ring-1 hover:ring-blue-500/20',
    },
    amber: {
      bgIcon: 'bg-amber-500/10 text-amber-400 border border-amber-500/20',
      ring: 'hover:border-amber-500/40 hover:ring-1 hover:ring-amber-500/20',
    },
    rose: {
      bgIcon: 'bg-rose-500/10 text-rose-400 border border-rose-500/20',
      ring: 'hover:border-rose-500/40 hover:ring-1 hover:ring-rose-500/20',
    },
  };

  const scheme = colorMap[color] || colorMap.emerald;

  return (
    <div
      onClick={onClick}
      className={`bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-sm transition-all duration-200 ${
        onClick ? `cursor-pointer ${scheme.ring}` : ''
      }`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-medium text-slate-400">{title}</p>
          <h4 className="text-2xl font-bold text-white tracking-tight font-mono">{value}</h4>
          {(trendValue || subtitle) && (
            <div className="mt-2 flex items-center gap-2">
              {trendValue && (
                <span
                  className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    isUp
                      ? 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                      : 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                  }`}
                >
                  {isUp ? '+' : '-'}
                  {trendValue}
                </span>
              )}
              {subtitle && <span className="text-xs text-slate-400">{subtitle}</span>}
            </div>
          )}
        </div>

        {Icon && (
          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${scheme.bgIcon}`}>
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>
    </div>
  );
}
