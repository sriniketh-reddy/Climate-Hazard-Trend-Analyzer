import React, { useState } from 'react';
import { Calendar, Sliders, Info } from 'lucide-react';

interface DateRangeFormProps {
  startYear: number;
  endYear: number;
  onRangeChange: (start: number, end: number) => void;
  baselineStartYear: number;
  baselineEndYear: number;
  onBaselineChange: (start: number, end: number) => void;
}

const AVAILABLE_YEARS = Array.from({ length: 2024 - 1950 + 1 }, (_, i) => 1950 + i);

const QUICK_PERIODS = [
  { label: '1990–2023', sub: '34y', start: 1990, end: 2023 },
  { label: '2000–2023', sub: '24y', start: 2000, end: 2023 },
  { label: '1980–2023', sub: '44y', start: 1980, end: 2023 },
  { label: '1970–2023', sub: '54y', start: 1970, end: 2023 },
];

export const DateRangeForm: React.FC<DateRangeFormProps> = ({
  startYear,
  endYear,
  onRangeChange,
  baselineStartYear,
  baselineEndYear,
  onBaselineChange,
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  const durationYears = endYear - startYear + 1;
  const isInvalidRange = startYear >= endYear || durationYears > 60;

  return (
    <div className="space-y-3">
      {/* Title & Baseline Toggle */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold tracking-wider text-slate-200 uppercase flex items-center gap-1.5 font-heading">
          <Calendar className="w-3.5 h-3.5 text-amber-400" />
          Time Period
        </label>
        <span className="text-[11px] font-mono font-medium text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
          {durationYears} Years Span
        </span>
      </div>

      {/* Quick Period Buttons */}
      <div className="grid grid-cols-4 gap-1.5">
        {QUICK_PERIODS.map((period) => {
          const isActive = startYear === period.start && endYear === period.end;
          return (
            <button
              key={period.label}
              type="button"
              onClick={() => onRangeChange(period.start, period.end)}
              className={`py-1.5 px-1 rounded-lg text-center transition-all cursor-pointer ${
                isActive
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm font-semibold'
                  : 'bg-slate-900/70 text-slate-400 hover:bg-slate-800 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <div className="text-[11px] font-mono leading-tight">{period.label}</div>
              <div className="text-[9px] text-slate-500">{period.sub}</div>
            </button>
          );
        })}
      </div>

      {/* Numerical dropdowns */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 font-medium">Start Year</span>
          <select
            value={startYear}
            onChange={(e) => onRangeChange(Number(e.target.value), endYear)}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
          >
            {AVAILABLE_YEARS.map((y) => (
              <option key={y} value={y} disabled={y >= endYear} className="bg-slate-900 text-slate-200">
                {y}
              </option>
            ))}
          </select>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-slate-400 font-medium">End Year</span>
          <select
            value={endYear}
            onChange={(e) => onRangeChange(startYear, Number(e.target.value))}
            className="w-full bg-slate-950/80 border border-slate-800 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-amber-500 font-mono cursor-pointer"
          >
            {AVAILABLE_YEARS.map((y) => (
              <option key={y} value={y} disabled={y <= startYear} className="bg-slate-900 text-slate-200">
                {y}
              </option>
            ))}
          </select>
        </div>
      </div>

      {isInvalidRange && (
        <div className="text-[11px] text-rose-400 bg-rose-950/30 border border-rose-900/50 p-2 rounded-lg font-mono">
          Range must be at least 1 year and at most 60 years.
        </div>
      )}

      {/* Reference Climatology Toggle */}
      <div className="pt-1">
        <button
          type="button"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="text-[11px] text-slate-400 hover:text-amber-300 transition-colors flex items-center justify-between w-full p-1.5 rounded-lg hover:bg-slate-900/60"
        >
          <span className="flex items-center gap-1.5">
            <Sliders className="w-3 h-3 text-amber-400" />
            <span>Normal Baseline Period</span>
          </span>
          <span className="text-[10px] font-mono text-slate-500">
            {baselineStartYear}–{baselineEndYear} ({showAdvanced ? 'Hide' : 'Configure'})
          </span>
        </button>

        {showAdvanced && (
          <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-800/90 space-y-2.5 mt-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs text-slate-300">
              <span className="font-medium flex items-center gap-1 text-[11px]">
                <Info className="w-3.5 h-3.5 text-amber-400" />
                Global Standard Baseline (30 Years)
              </span>
              <span className="text-[10px] text-amber-400/80 font-mono">1991–2020</span>
            </div>
            <p className="text-[10px] text-slate-400 leading-relaxed">
              Defines the standard 30-year normal period used to compare today's temperatures and rainfall against historical records.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <span className="text-[10px] text-slate-400">Baseline Start</span>
                <select
                  value={baselineStartYear}
                  onChange={(e) => onBaselineChange(Number(e.target.value), baselineEndYear)}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono"
                >
                  {AVAILABLE_YEARS.map((y) => (
                    <option key={y} value={y} disabled={y >= baselineEndYear}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <span className="text-[10px] text-slate-400">Baseline End</span>
                <select
                  value={baselineEndYear}
                  onChange={(e) => onBaselineChange(baselineStartYear, Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-800 rounded px-2 py-1 text-xs text-slate-300 font-mono"
                >
                  {AVAILABLE_YEARS.map((y) => (
                    <option key={y} value={y} disabled={y <= baselineStartYear}>
                      {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
