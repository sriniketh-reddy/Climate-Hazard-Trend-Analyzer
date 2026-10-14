import React, { useMemo } from 'react';
import {
  Map,
  Flame,
  Play,
  RotateCw,
  Droplets,
} from 'lucide-react';
import type { Coordinates, HazardType } from '../types/analysis';
import { AppleLocationSelect } from './AppleLocationSelect';
import { AppleDateRangePicker } from './AppleDateRangePicker';
import { AppleSegmentedSwitch, type AppleSegmentedOption } from './AppleSegmentedSwitch';

interface ConfigurationBarProps {
  coordinates: Coordinates;
  onCoordinatesChange: (coords: Coordinates) => void;
  isMapOpen: boolean;
  onToggleMap: () => void;
  hazardType: HazardType;
  onHazardTypeChange: (hazard: HazardType) => void;
  startDate: string;
  endDate: string;
  onDateRangeChange: (start: string, end: string) => void;
  onRunAnalysis: () => void;
  loading: boolean;
  rateLimitCooldown: number; // in seconds, >0 if cooling down
  hasData?: boolean;
}

export const ConfigurationBar: React.FC<ConfigurationBarProps> = ({
  coordinates,
  onCoordinatesChange,
  isMapOpen,
  onToggleMap,
  hazardType,
  onHazardTypeChange,
  startDate,
  endDate,
  onDateRangeChange,
  onRunAnalysis,
  loading,
  rateLimitCooldown,
  hasData = false,
}) => {
  const hazardOptions = useMemo<AppleSegmentedOption<HazardType>[]>(
    () => [
      {
        value: 'heatwave',
        width: 116,
        label: 'Heatwave',
        icon: <Flame className="w-4 h-4 shrink-0" />,
      },
      {
        value: 'drought',
        width: 116,
        label: 'Drought',
        icon: <Droplets className="w-4 h-4 shrink-0" />,
      },
    ],
    []
  );

  const isCircling = !hasData && !loading;

  const isMac = useMemo(
    () => typeof navigator !== 'undefined' && /Mac|iPod|iPhone|iPad/.test(navigator.platform),
    []
  );

  return (
    <div className="w-full bg-[#0d0d0f] px-4 sm:px-8 py-3 transition-all font-sans">
      <div className="w-full flex flex-wrap items-center justify-between gap-3">
        {/* Left Section: Apple Location Dropdown + Map Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Custom Apple Location Select Popover */}
          <AppleLocationSelect
            coordinates={coordinates}
            onCoordinatesChange={onCoordinatesChange}
          />

          {/* Toggle Map View Button - Fixed width so adjacent elements never shift */}
          <button
            type="button"
            id="map-toggle-btn"
            onClick={onToggleMap}
            className={`w-[145px] justify-center py-2 rounded-full text-sm font-medium flex items-center gap-2 transition-colors cursor-pointer border shrink-0 ${isMapOpen
              ? 'bg-white/15 text-white border-white/25 shadow-md ring-1 ring-white/20'
              : 'bg-[#242426]/80 hover:bg-[#2c2c2e] text-[#f5f5f7] border-white/10 hover:border-white/20'
              }`}
          >
            <Map className="w-4 h-4 text-[#2997ff] shrink-0" />
            <span>{isMapOpen ? 'Hide Map' : 'Select on Map'}</span>
          </button>
        </div>

        {/* Center Section: Hazard Toggle & Custom Apple Date Range Picker */}
        <div className="flex items-center gap-3 shrink-0">
          <AppleSegmentedSwitch
            options={hazardOptions}
            value={hazardType}
            onChange={onHazardTypeChange}
          />

          {/* Custom Apple Date Range Picker Popover */}
          <AppleDateRangePicker
            startDate={startDate}
            endDate={endDate}
            onChange={onDateRangeChange}
          />
        </div>

        {/* Right Section: Apple Glass Action Button with Circling Fade Beam */}
        <div className="shrink-0 flex items-center">
          <div className="circling-beam-wrapper group">
            {/* Ambient Soft Glow (active only when analysis tab is empty and not loading) */}
            {isCircling && (
              <div className="circling-beam-ambient" aria-hidden="true" />
            )}

            {/* Circling Border Beam Track (or crisp static glass border when analysis data is present) */}
            <div
              className={`circling-beam-track ${
                isCircling ? '' : 'bg-white/15'
              }`}
              aria-hidden="true"
            >
              {isCircling && <div className="circling-beam-spinner" />}
            </div>

            {/* Glassy Liquid Button */}
            <button
              type="button"
              onClick={onRunAnalysis}
              disabled={loading || rateLimitCooldown > 0}
              className="apple-glass-btn-primary py-2.5 px-5 sm:px-6 font-semibold text-sm tracking-tight text-white flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed select-none z-10"
            >
              {/* Apple Gloss Sheen across top curve of pill */}
              <div
                className="absolute inset-x-0 top-0 h-1/2 rounded-t-full bg-gradient-to-b from-white/30 via-white/10 to-transparent pointer-events-none"
                aria-hidden="true"
              />

              {loading ? (
                <>
                  <RotateCw className="w-4 h-4 animate-spin text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                  <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">Running Analysis...</span>
                </>
              ) : rateLimitCooldown > 0 ? (
                <>
                  <RotateCw className="w-4 h-4 text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]" />
                  <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">Cooldown ({rateLimitCooldown}s)</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4 fill-current text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.5)]" />
                  <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.4)]">Run Analysis</span>
                  <span className="text-[11px] px-1.5 py-0.5 rounded-md bg-white/20 border border-white/25 text-white/90 font-mono hidden sm:inline shadow-inner tracking-wide">
                    {isMac ? '⌘↵' : 'Ctrl↵'}
                  </span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
