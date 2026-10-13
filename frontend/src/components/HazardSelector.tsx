import React from 'react';
import { Flame, CloudRain, CheckCircle2, ShieldAlert } from 'lucide-react';
import type { HazardType } from '../types/analysis';

interface HazardSelectorProps {
  selected: HazardType;
  onChange: (hazard: HazardType) => void;
}

export const HazardSelector: React.FC<HazardSelectorProps> = ({ selected, onChange }) => {
  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold tracking-wider text-slate-200 uppercase flex items-center gap-1.5 font-heading">
          <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
          Climate Hazard Model
        </label>
        <span className="text-[10px] font-mono text-slate-400">
          {selected === 'heatwave' ? 'T_max Percentile' : 'Precipitation Deficit'}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        {/* Heatwave Option */}
        <button
          type="button"
          onClick={() => onChange('heatwave')}
          className={`relative p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between group ${
            selected === 'heatwave'
              ? 'bg-gradient-to-br from-amber-950/50 via-orange-950/30 to-slate-900 border-amber-500/70 shadow-lg shadow-amber-950/30 ring-1 ring-amber-500/40 glow-heatwave'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90 text-slate-400'
          }`}
        >
          {selected === 'heatwave' && (
            <div className="absolute top-2.5 right-2.5 text-amber-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}

          <div>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-105 ${
                selected === 'heatwave'
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <Flame className="w-4 h-4" />
            </div>
            <div
              className={`font-bold text-sm tracking-tight font-heading ${
                selected === 'heatwave' ? 'text-amber-200' : 'text-slate-200'
              }`}
            >
              Heatwave
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
              Consecutive days exceeding 95th percentile baseline maximum temperature.
            </p>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 font-mono text-[10px]">
            <span
              className={`px-1.5 py-0.5 rounded ${
                selected === 'heatwave'
                  ? 'bg-amber-500/20 text-amber-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              ≥3 Days
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">95th Pct</span>
          </div>
        </button>

        {/* Meteorological Drought Option */}
        <button
          type="button"
          onClick={() => onChange('drought')}
          className={`relative p-3 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between group ${
            selected === 'drought'
              ? 'bg-gradient-to-br from-cyan-950/50 via-sky-950/30 to-slate-900 border-sky-500/70 shadow-lg shadow-cyan-950/30 ring-1 ring-sky-500/40 glow-drought'
              : 'bg-slate-900/60 border-slate-800 hover:border-slate-700 hover:bg-slate-900/90 text-slate-400'
          }`}
        >
          {selected === 'drought' && (
            <div className="absolute top-2.5 right-2.5 text-sky-400">
              <CheckCircle2 className="w-4 h-4" />
            </div>
          )}

          <div>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center mb-2 transition-transform group-hover:scale-105 ${
                selected === 'drought'
                  ? 'bg-sky-500/20 text-sky-400 border border-sky-500/40'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              <CloudRain className="w-4 h-4" />
            </div>
            <div
              className={`font-bold text-sm tracking-tight font-heading ${
                selected === 'drought' ? 'text-sky-200' : 'text-slate-200'
              }`}
            >
              Drought
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5 line-clamp-2 leading-relaxed">
              Meteorological drought via monthly precipitation percentiles.
            </p>
          </div>

          <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center gap-1.5 font-mono text-[10px]">
            <span
              className={`px-1.5 py-0.5 rounded ${
                selected === 'drought'
                  ? 'bg-sky-500/20 text-sky-300'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              &lt;20th Pct
            </span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400">Precip Deficit</span>
          </div>
        </button>
      </div>
    </div>
  );
};
