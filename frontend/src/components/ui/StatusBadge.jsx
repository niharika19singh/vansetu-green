import React from 'react';

const VARIANTS = {
  success: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30',
  warning: 'bg-amber-500/15 text-amber-300 border-amber-500/30',
  danger: 'bg-rose-500/15 text-rose-300 border-rose-500/30',
  info: 'bg-blue-500/15 text-blue-300 border-blue-500/30',
  default: 'bg-slate-800 text-slate-300 border-slate-700',
};

const DOT_COLORS = {
  success: 'bg-emerald-400',
  warning: 'bg-amber-400',
  danger: 'bg-rose-400',
  info: 'bg-blue-400',
  default: 'bg-slate-400',
};

export default function StatusBadge({
  children,
  variant = 'default',
  showDot = false,
  className = '',
}) {
  const badgeClass = VARIANTS[variant] || VARIANTS.default;
  const dotClass = DOT_COLORS[variant] || DOT_COLORS.default;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass} ${className}`}
    >
      {showDot && <span className={`w-1.5 h-1.5 rounded-full ${dotClass} shrink-0`} />}
      <span>{children}</span>
    </span>
  );
}
