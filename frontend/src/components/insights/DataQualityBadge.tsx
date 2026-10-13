import React, { useState } from 'react';
import { ShieldCheck, AlertTriangle, AlertOctagon, ChevronDown, ChevronUp } from 'lucide-react';
import type { DataQualityInfo } from '../../types/analysis';

interface DataQualityBadgeProps {
  quality: DataQualityInfo;
}

export const DataQualityBadge: React.FC<DataQualityBadgeProps> = ({ quality }) => {
  const [expanded, setExpanded] = useState(false);

  const getStatus = () => {
    if (quality.coverage_pct >= 95 && quality.flagged_values === 0) {
      return {
        label: 'Complete Weather Records (Verified)',
        icon: <ShieldCheck className="w-4 h-4 text-[#30d158]" />,
        badgeClass: 'bg-[#30d158]/15 text-[#30d158] border-[#30d158]/30',
      };
    }
    if (quality.coverage_pct >= 85) {
      return {
        label: 'Most Records Available',
        icon: <AlertTriangle className="w-4 h-4 text-[#ffd60a]" />,
        badgeClass: 'bg-[#ffd60a]/15 text-[#ffd60a] border-[#ffd60a]/30',
      };
    }
    return {
      label: 'Some Missing Years',
      icon: <AlertOctagon className="w-4 h-4 text-[#ff453a]" />,
      badgeClass: 'bg-[#ff453a]/15 text-[#ff453a] border-[#ff453a]/30',
    };
  };

  const status = getStatus();

  return (
    <div className="bg-[#1c1c1e]/70 border border-white/[0.08] rounded-2xl p-5 text-sm space-y-3.5 shadow-lg flex flex-col justify-between">
      <div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            {status.icon}
            <span className="font-semibold text-[#f5f5f7] text-base">Weather Record Completeness</span>
          </div>

          <div className="flex items-center gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${status.badgeClass}`}>
              {quality.coverage_pct}% Complete
            </span>
            {quality.flag_reasons.length > 0 && (
              <button
                type="button"
                onClick={() => setExpanded(!expanded)}
                className="text-[#86868b] hover:text-[#f5f5f7] p-1 rounded-md transition-colors cursor-pointer"
              >
                {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
            )}
          </div>
        </div>

        <p className="text-[#d1d1d6] leading-relaxed text-sm mt-3">
          Continuous quality verification ensures the historical weather archive has no missing periods or corrupt sensor anomalies, providing mathematically trustworthy climate trends.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-2 pt-3 border-t border-white/[0.08] text-sm text-[#a1a1a6]">
        <div>
          Days Recorded: <span className="text-[#f5f5f7] font-semibold">{quality.total_received_days.toLocaleString()}</span>
        </div>
        <div>
          Missing Records: <span className="text-[#f5f5f7] font-semibold">{quality.missing_days} days</span>
        </div>
        <div>
          Data Integrity: <span className="text-[#30d158] font-semibold">{quality.flagged_values === 0 ? 'Verified 100%' : `${quality.flagged_values} flagged`}</span>
        </div>
      </div>

      {expanded && quality.flag_reasons.length > 0 && (
        <div className="mt-3 pt-2.5 border-t border-white/[0.08] space-y-1 text-xs text-[#ffd60a] font-mono bg-[#ffd60a]/10 p-3 rounded-xl border border-[#ffd60a]/20">
          {quality.flag_reasons.map((reason, idx) => (
            <div key={idx} className="flex items-start gap-1.5">
              <span>•</span>
              <span>{reason}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

