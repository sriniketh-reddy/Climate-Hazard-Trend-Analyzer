import React from 'react';

interface SummaryCardProps {
  label: string;
  value: string | number;
  unit?: string;
  subtext?: string;
  icon: React.ReactNode;
  badge?: {
    text: string;
    variant: 'positive' | 'negative' | 'neutral' | 'warning';
  };
  highlightColor?: 'amber' | 'cyan' | 'emerald' | 'rose' | 'purple';
}

const colorMap = {
  amber: {
    icon: 'text-[#2997ff] bg-[#0071e3]/15 border-[#0071e3]/30',
    glow: 'from-[#0071e3]/15 to-transparent',
    accent: 'text-[#2997ff]',
  },
  cyan: {
    icon: 'text-[#2997ff] bg-[#0071e3]/15 border-[#0071e3]/30',
    glow: 'from-[#0071e3]/15 to-transparent',
    accent: 'text-[#2997ff]',
  },
  emerald: {
    icon: 'text-[#30d158] bg-[#30d158]/15 border-[#30d158]/30',
    glow: 'from-[#30d158]/15 to-transparent',
    accent: 'text-[#30d158]',
  },
  rose: {
    icon: 'text-[#ff453a] bg-[#ff453a]/15 border-[#ff453a]/30',
    glow: 'from-[#ff453a]/15 to-transparent',
    accent: 'text-[#ff453a]',
  },
  purple: {
    icon: 'text-[#bf5af2] bg-[#bf5af2]/15 border-[#bf5af2]/30',
    glow: 'from-[#bf5af2]/15 to-transparent',
    accent: 'text-[#bf5af2]',
  },
};

const badgeColorMap = {
  positive: 'bg-[#30d158]/15 text-[#30d158] border-[#30d158]/30',
  negative: 'bg-[#ff453a]/15 text-[#ff453a] border-[#ff453a]/30',
  neutral: 'bg-[#2c2c2e]/80 text-[#86868b] border-white/[0.08]',
  warning: 'bg-[#ffd60a]/15 text-[#ffd60a] border-[#ffd60a]/30',
};

export const SummaryCard: React.FC<SummaryCardProps> = ({
  label,
  value,
  unit,
  subtext,
  icon,
  badge,
  highlightColor = 'amber',
}) => {
  const scheme = colorMap[highlightColor];

  return (
    <div className="glass-panel-interactive rounded-2xl p-4 sm:p-5 flex flex-col justify-between relative overflow-hidden group">
      {/* Apple Subtle specular reflection glow */}
      <div
        className={`absolute -top-12 -right-12 w-32 h-32 bg-gradient-to-br ${scheme.glow} rounded-full blur-2xl pointer-events-none opacity-30 group-hover:opacity-60 transition-opacity duration-500`}
      />

      <div className="flex items-center justify-between relative z-10">
        <span className="text-xs sm:text-[13px] font-semibold text-[#86868b] tracking-wider uppercase">
          {label}
        </span>
        <div className={`p-2.5 rounded-xl border ${scheme.icon} transition-transform duration-300 group-hover:scale-105`}>
          {icon}
        </div>
      </div>

      <div className="mt-4 relative z-10">
        <div className="flex items-baseline gap-2">
          <span className="text-3xl sm:text-4xl font-bold tracking-tight text-[#f5f5f7]">
            {value}
          </span>
          {unit && (
            <span className="text-sm font-medium text-[#86868b] font-mono">
              {unit}
            </span>
          )}
        </div>

        <div className="flex items-center justify-between mt-3.5 pt-2.5 border-t border-white/[0.08] text-xs sm:text-[13px]">
          {subtext && (
            <span className="text-[#86868b] truncate max-w-[65%]" title={subtext}>
              {subtext}
            </span>
          )}
          {badge && (
            <span
              className={`text-xs px-2.5 py-0.5 rounded-full font-semibold border ${badgeColorMap[badge.variant]}`}
            >
              {badge.text}
            </span>
          )}
        </div>
      </div>
    </div>
  );
};

