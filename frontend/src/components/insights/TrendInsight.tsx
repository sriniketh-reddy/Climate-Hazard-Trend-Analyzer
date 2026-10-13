import React from 'react';
import { TrendingUp, TrendingDown, Minus, CheckCircle, AlertCircle } from 'lucide-react';
import type { TrendInfo } from '../../types/analysis';

interface TrendInsightProps {
  trend: TrendInfo;
  hazardType: 'heatwave' | 'drought';
}

export const TrendInsight: React.FC<TrendInsightProps> = ({ trend, hazardType }) => {
  const isSignificant = trend.significant_at_005;
  const isIncreasing = trend.direction === 'increasing';
  const isDecreasing = trend.direction === 'decreasing';

  const getTrendIcon = () => {
    if (isIncreasing) {
      return <TrendingUp className="w-5 h-5 text-[#ff453a]" />;
    }
    if (isDecreasing) {
      return <TrendingDown className="w-5 h-5 text-[#30d158]" />;
    }
    return <Minus className="w-5 h-5 text-[#86868b]" />;
  };

  const getDirectionBadge = () => {
    if (trend.method === 'insufficient_data') {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#2c2c2e] text-[#86868b] border border-white/[0.08]">
          Need More Years of Data
        </span>
      );
    }
    if (isSignificant) {
      return (
        <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30 flex items-center gap-1.5">
          <CheckCircle className="w-3.5 h-3.5" />
          Clear Long-Term Change
        </span>
      );
    }
    return (
      <span className="px-3 py-1 rounded-full text-xs font-semibold bg-[#ffd60a]/15 text-[#ffd60a] border border-[#ffd60a]/30 flex items-center gap-1.5">
        <AlertCircle className="w-3.5 h-3.5" />
        No Significant Change (Stable)
      </span>
    );
  };

  const cleanInterpretation = (text: string): string => {
    if (!text) return '';
    let cleaned = text.replace(/\(p=[0-9.]+(?:,\s*statistically significant at p<0\.05)?\)/gi, '');
    cleaned = cleaned.replace(/statistically significant/gi, 'clearly noticeable');
    cleaned = cleaned.replace(/\s{2,}/g, ' ').trim();
    return cleaned;
  };

  return (
    <div className="glass-panel rounded-3xl p-5 sm:p-6 relative overflow-hidden">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3.5">
          <div className="p-3 rounded-2xl bg-[#2c2c2e]/70 border border-white/[0.08]">
            {getTrendIcon()}
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-semibold text-[#f5f5f7]">
              Is {hazardType === 'heatwave' ? 'Extreme Heat' : 'Drought'} Increasing or Decreasing?
            </h3>
            <p className="text-xs sm:text-sm text-[#86868b] mt-0.5">
              Calculated by comparing recorded weather year-over-year
            </p>
          </div>
        </div>

        <div>{getDirectionBadge()}</div>
      </div>

      {/* Main explanation paragraph */}
      <div className="mt-4 text-base text-[#f5f5f7] leading-relaxed bg-[#1c1c1e]/60 p-4.5 rounded-2xl border border-white/[0.06]">
        {cleanInterpretation(trend.interpretation)}
      </div>

      {/* Clear Details Grid (No complex data science jargon) */}
      {trend.method !== 'insufficient_data' && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-4 text-xs">
          <div className="bg-[#1c1c1e]/60 p-3.5 rounded-2xl border border-white/[0.06]">
            <span className="text-[#86868b] block text-xs uppercase font-semibold">
              10-Year Change
            </span>
            <span className="text-[#f5f5f7] font-semibold text-base mt-1 block font-mono">
              {trend.slope_per_decade && trend.slope_per_decade > 0 ? '+' : ''}
              {trend.slope_per_decade}
            </span>
            <span className="text-xs text-[#86868b] block mt-1">change per decade</span>
          </div>

          <div className="bg-[#1c1c1e]/60 p-3.5 rounded-2xl border border-white/[0.06]">
            <span className="text-[#86868b] block text-xs uppercase font-semibold">
              Trend Certainty
            </span>
            <span className={`font-semibold text-base mt-1 block ${isSignificant ? 'text-[#30d158]' : 'text-[#ffd60a]'}`}>
              {isSignificant ? 'High (95%+)' : 'Varied / Normal'}
            </span>
            <span className="text-xs text-[#86868b] block mt-1">
              {isSignificant ? 'Reliable long-term shift' : 'Natural weather swings'}
            </span>
          </div>

          <div className="bg-[#1c1c1e]/60 p-3.5 rounded-2xl border border-white/[0.06]">
            <span className="text-[#86868b] block text-xs uppercase font-semibold">
              Pattern Strength
            </span>
            <span className="text-[#f5f5f7] font-semibold text-base mt-1 block">
              {trend.r_squared !== undefined ? (trend.r_squared > 0.3 ? 'Clear Pattern' : 'Moderate Pattern') : 'Normal'}
            </span>
            <span className="text-xs text-[#86868b] block mt-1">consistency over time</span>
          </div>

          <div className="bg-[#1c1c1e]/60 p-3.5 rounded-2xl border border-white/[0.06]">
            <span className="text-[#86868b] block text-xs uppercase font-semibold">
              Likely Range
            </span>
            <span className="text-[#f5f5f7] font-semibold text-sm truncate block mt-1 font-mono">
              {trend.confidence_interval_95
                ? `${trend.confidence_interval_95[0]} to ${trend.confidence_interval_95[1]}`
                : 'N/A'}
            </span>
            <span className="text-xs text-[#86868b] block mt-1">estimated decade span</span>
          </div>
        </div>
      )}
    </div>
  );
};

