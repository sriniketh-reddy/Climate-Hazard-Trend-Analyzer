import React, { useMemo } from 'react';
import { useDraggableSegmented, type SegmentedOptionDef } from '../hooks/useDraggableSegmented';

export interface AppleSegmentedOption<T extends string> {
  value: T;
  width: number;
  label: string;
  icon?: React.ReactNode;
  disabled?: boolean;
  tooltip?: string;
}

interface AppleSegmentedSwitchProps<T extends string> {
  options: AppleSegmentedOption<T>[];
  value: T;
  onChange: (value: T) => void;
  className?: string;
  size?: 'sm' | 'md';
}

export function AppleSegmentedSwitch<T extends string>({
  options,
  value,
  onChange,
  className = '',
  size = 'md',
}: AppleSegmentedSwitchProps<T>) {
  const optionDefs: SegmentedOptionDef<T>[] = useMemo(
    () =>
      options.map((opt) => ({
        value: opt.value,
        width: opt.width,
        disabled: opt.disabled,
      })),
    [options]
  );

  const {
    containerProps,
    indicatorStyle,
    contentMaskStyle,
    isDragging,
    handleButtonClick,
  } = useDraggableSegmented({
    options: optionDefs,
    value,
    onChange,
  });

  const totalWidth = useMemo(
    () => options.reduce((sum, opt) => sum + opt.width, 0) + 10, // 4px padding left, 4px right, 2px border (1px each side)
    [options]
  );

  const pyClass = size === 'sm' ? 'py-1.5 text-xs sm:text-[13px]' : 'py-2 text-sm';

  return (
    <div
      {...containerProps}
      style={{ width: `${totalWidth}px`, boxSizing: 'border-box', ...containerProps.style }}
      className={`relative flex items-center p-1 rounded-full bg-[#1c1c1e]/90 backdrop-blur-2xl border border-white/10 shrink-0 select-none overflow-hidden ${
        isDragging ? 'cursor-grabbing' : 'cursor-grab'
      } ${className}`}
    >
      {/* ───────────────────────────────────────────────────────────── */}
      {/* LAYER 1: BASE UNSELECTED LABELS (Dim Grey)                   */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className={`flex items-center text-[#86868b] font-semibold pointer-events-none select-none ${pyClass}`}>
        {options.map((opt) => (
          <div
            key={opt.value}
            style={{ width: `${opt.width}px` }}
            className={`flex items-center justify-center gap-2 whitespace-nowrap shrink-0 transition-opacity duration-200 ${
              opt.disabled ? 'opacity-35' : ''
            }`}
          >
            {opt.icon}
            <span className="whitespace-nowrap">{opt.label}</span>
          </div>
        ))}
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* LAYER 2: SLIDING MASK WINDOW WITH WHITE SELECTED LABELS       */}
      {/* Clips letters down to the sub-pixel along the pill boundary  */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div
        style={indicatorStyle}
        className="absolute left-1 top-1 bottom-1 rounded-full pointer-events-none apple-glass-indicator overflow-hidden"
      >
        {/* Counter-translated white labels layer (stationary on screen) */}
        <div
          style={contentMaskStyle}
          className={`flex items-center text-white font-semibold select-none ${pyClass}`}
        >
          {options.map((opt) => (
            <div
              key={opt.value}
              style={{ width: `${opt.width}px` }}
              className="flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
            >
              {opt.icon}
              <span className="whitespace-nowrap">{opt.label}</span>
            </div>
          ))}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────── */}
      {/* LAYER 3: INTERACTIVE BUTTONS & TOOLTIPS                       */}
      {/* ───────────────────────────────────────────────────────────── */}
      <div className="absolute inset-1 flex items-center pointer-events-auto">
        {options.map((opt) => (
          <div
            key={opt.value}
            style={{ width: `${opt.width}px` }}
            className="h-full relative group shrink-0"
          >
            <button
              type="button"
              disabled={opt.disabled}
              onClick={() => handleButtonClick(opt.value, opt.disabled)}
              className={`w-full h-full rounded-full opacity-0 outline-none focus:outline-none select-none ${
                opt.disabled ? 'cursor-not-allowed' : 'cursor-pointer'
              }`}
              aria-label={opt.label}
            />

            {/* Tooltip on cursor hover when disabled */}
            {opt.disabled && opt.tooltip && (
              <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:flex flex-col items-center pointer-events-none z-50">
                <div className="bg-[#1c1c1e] text-[#f5f5f7] border border-white/15 px-3 py-1.5 rounded-xl text-xs font-sans font-medium shadow-2xl whitespace-nowrap">
                  {opt.tooltip}
                </div>
                <div className="w-2 h-2 bg-[#1c1c1e] border-r border-b border-white/15 rotate-45 -mt-1" />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
