import React, { useState, useRef, useEffect } from 'react';
import { MapPin, ChevronDown, Check, Search } from 'lucide-react';
import type { Coordinates } from '../types/analysis';
import { PRESET_LOCATIONS } from '../data/presetLocations';

interface AppleLocationSelectProps {
  coordinates: Coordinates;
  onCoordinatesChange: (coords: Coordinates) => void;
}

export const AppleLocationSelect: React.FC<AppleLocationSelectProps> = ({
  coordinates,
  onCoordinatesChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Check if current coords match a preset
  const matchedPreset = PRESET_LOCATIONS.find(
    (p) =>
      Math.abs(p.coords.lat - coordinates.lat) < 0.15 &&
      Math.abs(p.coords.lon - coordinates.lon) < 0.15
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

  const filteredPresets = PRESET_LOCATIONS.filter((p) =>
    `${p.name} ${p.state}`.toLowerCase().includes(searchQuery.toLowerCase().trim())
  );

  return (
    <div ref={containerRef} className="relative shrink-0">
      {/* Apple Pill Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          setSearchQuery('');
        }}
        className={`flex items-center justify-between bg-[#242426]/80 hover:bg-[#2c2c2e] border transition-all rounded-full px-4 py-2 text-sm text-[#f5f5f7] cursor-pointer shadow-sm w-[210px] shrink-0 ${
          isOpen ? 'border-[#0071e3] ring-1 ring-[#0071e3]/40 bg-[#2c2c2e]' : 'border-white/10'
        }`}
      >
        <div className="flex items-center min-w-0 pr-2">
          <MapPin className="w-4 h-4 text-[#2997ff] mr-2 shrink-0" />
          <span className="truncate font-medium text-left">
            {matchedPreset
              ? `${matchedPreset.name}`
              : `Custom (${coordinates.lat.toFixed(1)}°, ${coordinates.lon.toFixed(1)}°)`}
          </span>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-[#86868b] transition-transform duration-200 shrink-0 ${
            isOpen ? 'rotate-180 text-white' : ''
          }`}
        />
      </button>

      {/* Apple Frosted Popover Menu with Smooth Ease In / Ease Out Animation */}
      <div
        className={`absolute left-0 top-full mt-2 w-72 apple-glass-popover rounded-3xl p-2.5 z-50 origin-top-left transition-all duration-300 ease-in-out ${
          isOpen
            ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto visible'
            : 'opacity-0 -translate-y-2 scale-95 pointer-events-none invisible'
        }`}
      >
        {/* Search Filter Header */}
        <div className="relative mb-2 px-1">
          <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search location..."
            className="w-full bg-[#2c2c2e]/80 border border-white/[0.08] rounded-xl pl-9 pr-3 py-2 text-sm text-[#f5f5f7] placeholder:text-[#6e6e73] focus:outline-none focus:border-[#0071e3]"
          />
        </div>

        {/* Preset List */}
        <div className="max-h-64 overflow-y-auto space-y-1 custom-scrollbar pr-1">
          {!matchedPreset && !searchQuery && (
            <div className="px-3 py-2 rounded-xl text-xs bg-[#0071e3]/15 text-[#2997ff] border border-[#0071e3]/30 flex items-center justify-between mb-1">
              <span className="font-semibold">
                Custom Point ({coordinates.lat.toFixed(2)}°, {coordinates.lon.toFixed(2)}°)
              </span>
              <Check className="w-4 h-4" />
            </div>
          )}

          {filteredPresets.length === 0 ? (
            <div className="py-4 text-center text-xs text-[#86868b]">
              No matching locations
            </div>
          ) : (
            filteredPresets.map((loc) => {
              const isSelected =
                matchedPreset && matchedPreset.name === loc.name;

              return (
                <button
                  key={loc.name}
                  type="button"
                  onClick={() => {
                    onCoordinatesChange(loc.coords);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-colors flex items-center justify-between cursor-pointer ${
                    isSelected
                      ? 'bg-[#0071e3] text-white font-semibold shadow-sm'
                      : 'text-[#f5f5f7] hover:bg-white/[0.08]'
                  }`}
                >
                  <div className="truncate pr-2">
                    <div className="truncate leading-tight font-medium">{loc.name}</div>
                    <div
                      className={`text-xs truncate leading-tight mt-0.5 ${
                        isSelected ? 'text-white/80' : 'text-[#86868b]'
                      }`}
                    >
                      {loc.state}
                    </div>
                  </div>
                  {isSelected && <Check className="w-4 h-4 shrink-0" />}
                </button>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
