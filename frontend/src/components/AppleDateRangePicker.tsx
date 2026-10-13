import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Calendar, ChevronLeft, ChevronRight, Clock } from 'lucide-react';
import { AppleSegmentedSwitch, type AppleSegmentedOption } from './AppleSegmentedSwitch';

interface AppleDateRangePickerProps {
  startDate: string; // YYYY-MM-DD or YYYY-MM
  endDate: string; // YYYY-MM-DD or YYYY-MM
  onChange: (start: string, end: string) => void;
}

const MONTH_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];


function getLastDayOfMonth(year: number, monthZeroIndexed: number): number {
  return new Date(year, monthZeroIndexed + 1, 0).getDate();
}

function formatMonthLabel(dateStr: string): string {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length >= 2) {
    const yr = parts[0];
    const mIdx = parseInt(parts[1], 10) - 1;
    if (mIdx >= 0 && mIdx < 12) {
      return `${MONTH_SHORT[mIdx]} ${yr}`;
    }
  }
  return dateStr;
}

export const AppleDateRangePicker: React.FC<AppleDateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTarget, setActiveTarget] = useState<'start' | 'end'>('start');
  const containerRef = useRef<HTMLDivElement>(null);

  const currentYear = useMemo(() => new Date().getFullYear(), []);
  const currentMonthIdx = useMemo(() => new Date().getMonth(), []);

  // Parse start and end years/months
  const startYear = useMemo(() => {
    const y = parseInt(startDate?.split('-')[0], 10);
    return isNaN(y) ? 1990 : y;
  }, [startDate]);

  const startMonthIdx = useMemo(() => {
    const m = parseInt(startDate?.split('-')[1], 10) - 1;
    return isNaN(m) ? 0 : m;
  }, [startDate]);

  const endYear = useMemo(() => {
    const y = parseInt(endDate?.split('-')[0], 10);
    return isNaN(y) ? currentYear : y;
  }, [endDate, currentYear]);

  const endMonthIdx = useMemo(() => {
    const m = parseInt(endDate?.split('-')[1], 10) - 1;
    return isNaN(m) ? currentMonthIdx : m;
  }, [endDate, currentMonthIdx]);

  // Current view year in picker
  const [viewYear, setViewYear] = useState(() => (activeTarget === 'start' ? startYear : endYear));

  // Sync view year when opening or changing target
  const handleSelectTarget = (target: 'start' | 'end') => {
    setActiveTarget(target);
    setViewYear(target === 'start' ? startYear : endYear);
  };

  const targetOptions = useMemo<AppleSegmentedOption<'start' | 'end'>[]>(
    () => [
      { value: 'start', width: 104, label: 'Start Month' },
      { value: 'end', width: 104, label: 'End Month' },
    ],
    []
  );

  // Close on click outside or Escape
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const availableYears = useMemo(() => {
    const years = [];
    for (let y = currentYear; y >= 1940; y--) {
      years.push(y);
    }
    return years;
  }, [currentYear]);

  const handleMonthClick = (mIdx: number) => {
    const mStr = String(mIdx + 1).padStart(2, '0');
    if (activeTarget === 'start') {
      const newStart = `${viewYear}-${mStr}-01`;
      // If new start is after current end, bump end
      const startKey = `${viewYear}-${mStr}`;
      const endKey = `${endYear}-${String(endMonthIdx + 1).padStart(2, '0')}`;
      let newEnd = endDate;
      if (startKey > endKey) {
        const lastDay = getLastDayOfMonth(viewYear, mIdx);
        newEnd = `${viewYear}-${mStr}-${String(lastDay).padStart(2, '0')}`;
      }
      onChange(newStart, newEnd);
      // Auto-advance target to 'end' for seamless Apple UX
      setActiveTarget('end');
      setViewYear(endYear < viewYear ? viewYear : endYear);
    } else {
      const lastDay = getLastDayOfMonth(viewYear, mIdx);
      const newEnd = `${viewYear}-${mStr}-${String(lastDay).padStart(2, '0')}`;
      // If new end is before current start, adjust start
      const endKey = `${viewYear}-${mStr}`;
      const startKey = `${startYear}-${String(startMonthIdx + 1).padStart(2, '0')}`;
      let newStart = startDate;
      if (endKey < startKey) {
        newStart = `${viewYear}-${mStr}-01`;
      }
      onChange(newStart, newEnd);
      setIsOpen(false);
    }
  };

  const handleQuickPreset = (sYear: number, sMonth: number, eYear: number, eMonth: number) => {
    const sMonthStr = String(sMonth).padStart(2, '0');
    const eMonthStr = String(eMonth).padStart(2, '0');
    const lastDay = getLastDayOfMonth(eYear, eMonth - 1);
    const newStart = `${sYear}-${sMonthStr}-01`;
    const newEnd = `${eYear}-${eMonthStr}-${String(lastDay).padStart(2, '0')}`;
    onChange(newStart, newEnd);
    setIsOpen(false);
  };

  return (
    <div className="relative font-sans" ref={containerRef}>
      {/* Apple Pill Trigger Button */}
      <div className="flex items-center gap-1.5 p-1 rounded-full bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/10 shadow-inner shrink-0">
        <div className="pl-2.5 pr-1 text-[#86868b] flex items-center">
          <Calendar className="w-4 h-4 text-[#2997ff]" />
        </div>

        {/* Start Month Pill */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
            handleSelectTarget('start');
          }}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
            isOpen && activeTarget === 'start'
              ? 'bg-gradient-to-b from-[#0071e3]/90 via-[#0077ed]/85 to-[#005bb5]/80 backdrop-blur-2xl border border-white/30 shadow-[0_4px_16px_rgba(0,113,227,0.55),inset_0_1px_1px_rgba(255,255,255,0.5)] text-white font-semibold'
              : 'hover:bg-white/10 text-[#f5f5f7] border border-transparent'
          }`}
        >
          <span
            className={`text-xs font-semibold tracking-wide uppercase transition-colors ${
              isOpen && activeTarget === 'start' ? 'text-white' : 'text-[#86868b]'
            }`}
          >
            From
          </span>
          <span className="font-mono text-sm font-medium">{formatMonthLabel(startDate) || 'Jan 1990'}</span>
        </div>

        <span className="text-[#86868b] font-mono">–</span>

        {/* End Month Pill */}
        <div
          onClick={(e) => {
            e.stopPropagation();
            setIsOpen(true);
            handleSelectTarget('end');
          }}
          className={`flex items-center gap-2 px-3.5 py-1.5 rounded-full transition-all duration-200 cursor-pointer ${
            isOpen && activeTarget === 'end'
              ? 'bg-gradient-to-b from-[#0071e3]/90 via-[#0077ed]/85 to-[#005bb5]/80 backdrop-blur-2xl border border-white/30 shadow-[0_4px_16px_rgba(0,113,227,0.55),inset_0_1px_1px_rgba(255,255,255,0.5)] text-white font-semibold'
              : 'hover:bg-white/10 text-[#f5f5f7] border border-transparent'
          }`}
        >
          <span
            className={`text-xs font-semibold tracking-wide uppercase transition-colors ${
              isOpen && activeTarget === 'end' ? 'text-white' : 'text-[#86868b]'
            }`}
          >
            To
          </span>
          <span className="font-mono text-sm font-medium">{formatMonthLabel(endDate) || formatMonthLabel(new Date().toISOString())}</span>
        </div>
      </div>

      {/* Apple Frosted Month Picker Popover */}
      <div
        className={`absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-[340px] apple-glass-popover rounded-3xl p-4 z-50 origin-top transition-all duration-300 ease-in-out ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto visible'
            : 'opacity-0 -translate-y-2 scale-95 pointer-events-none invisible'
        }`}
      >
        {/* Target Switcher Capsule with Sliding Glassy Indicator */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <AppleSegmentedSwitch
            options={targetOptions}
            value={activeTarget}
            onChange={handleSelectTarget}
            size="sm"
          />

          <div className="text-xs font-mono text-[#86868b] pl-2 truncate font-medium">
            {activeTarget === 'start' ? formatMonthLabel(startDate) : formatMonthLabel(endDate)}
          </div>
        </div>

        {/* Year Navigation Bar */}
        <div className="flex items-center justify-between my-3 px-1">
          <div className="flex items-center gap-2">
            <span className="text-xs sm:text-sm text-[#86868b] font-medium">Year:</span>
            <select
              value={viewYear}
              onChange={(e) => setViewYear(parseInt(e.target.value, 10))}
              className="bg-[#2c2c2e] text-[#f5f5f7] border border-white/10 rounded-lg px-2.5 py-1 text-xs sm:text-sm font-semibold focus:outline-none focus:border-[#0071e3] cursor-pointer"
            >
              {availableYears.map((yr) => (
                <option key={yr} value={yr} className="bg-[#1c1c1e] text-[#f5f5f7]">
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setViewYear((y) => Math.max(1940, y - 1))}
              disabled={viewYear <= 1940}
              className="p-1.5 rounded-full hover:bg-white/10 text-[#86868b] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-semibold text-xs sm:text-sm text-[#f5f5f7] px-1 font-mono">{viewYear}</span>
            <button
              type="button"
              onClick={() => setViewYear((y) => Math.min(currentYear, y + 1))}
              disabled={viewYear >= currentYear}
              className="p-1.5 rounded-full hover:bg-white/10 text-[#86868b] hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 12-Month Apple Grid */}
        <div className="grid grid-cols-4 gap-2 py-1">
          {MONTH_SHORT.map((name, mIdx) => {
            const thisKey = `${viewYear}-${String(mIdx + 1).padStart(2, '0')}`;
            const startKey = `${startYear}-${String(startMonthIdx + 1).padStart(2, '0')}`;
            const endKey = `${endYear}-${String(endMonthIdx + 1).padStart(2, '0')}`;

            const isStart = thisKey === startKey;
            const isEnd = thisKey === endKey;
            const isInRange = thisKey > startKey && thisKey < endKey;
            const isFuture = viewYear === currentYear && mIdx > currentMonthIdx;

            return (
              <button
                key={name}
                type="button"
                disabled={isFuture}
                onClick={() => handleMonthClick(mIdx)}
                className={`h-10 rounded-xl flex items-center justify-center text-sm font-medium transition-all ${
                  isStart || isEnd
                    ? 'bg-gradient-to-b from-[#0071e3]/95 via-[#0077ed]/90 to-[#005bb5]/85 backdrop-blur-2xl border border-white/30 text-white font-semibold shadow-[0_4px_16px_rgba(0,113,227,0.55),inset_0_1px_1px_rgba(255,255,255,0.5)] scale-105 ring-1 ring-white/30'
                    : isInRange
                    ? 'bg-[#0071e3]/20 text-[#2997ff] font-semibold border border-[#0071e3]/30'
                    : 'text-[#f5f5f7] bg-white/[0.04] hover:bg-white/[0.1] border border-transparent'
                } ${isFuture ? 'opacity-20 cursor-not-allowed' : 'cursor-pointer'}`}
              >
                {name}
              </button>
            );
          })}
        </div>

        {/* Quick Range Presets */}
        <div className="mt-3.5 pt-3 border-t border-white/[0.08] space-y-2">
          <div className="text-xs text-[#86868b] uppercase tracking-wider font-semibold">
            Quick Ranges
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickPreset(currentYear - 4, 1, currentYear, 12)}
              className="px-3 py-2 rounded-xl bg-[#2c2c2e]/70 hover:bg-[#2c2c2e] text-[#f5f5f7] border border-white/[0.06] text-left transition-colors flex items-center gap-2 cursor-pointer font-medium"
            >
              <Clock className="w-3.5 h-3.5 text-[#2997ff] shrink-0" />
              <span>Last 5 Years</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(currentYear - 9, 1, currentYear, 12)}
              className="px-3 py-2 rounded-xl bg-[#2c2c2e]/70 hover:bg-[#2c2c2e] text-[#f5f5f7] border border-white/[0.06] text-left transition-colors flex items-center gap-2 cursor-pointer font-medium"
            >
              <Clock className="w-3.5 h-3.5 text-[#2997ff] shrink-0" />
              <span>Last 10 Years</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(1991, 1, 2020, 12)}
              className="px-3 py-2 rounded-xl bg-[#2c2c2e]/70 hover:bg-[#2c2c2e] text-[#f5f5f7] border border-white/[0.06] text-left transition-colors flex items-center gap-2 cursor-pointer font-medium"
            >
              <Clock className="w-3.5 h-3.5 text-[#2997ff] shrink-0" />
              <span>1991–2020 (WMO)</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickPreset(1940, 1, currentYear, currentMonthIdx + 1)}
              className="px-3 py-2 rounded-xl bg-[#2c2c2e]/70 hover:bg-[#2c2c2e] text-[#f5f5f7] border border-white/[0.06] text-left transition-colors flex items-center gap-2 cursor-pointer font-medium"
            >
              <Clock className="w-3.5 h-3.5 text-[#2997ff] shrink-0" />
              <span>Full Record (1940–Now)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
