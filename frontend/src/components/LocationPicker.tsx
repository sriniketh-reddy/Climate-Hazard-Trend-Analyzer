import { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  Compass,
  Search,
  Maximize2,
  Minimize2,
  RotateCcw,
  CheckCircle2,
  Layers,
} from 'lucide-react';
import type { Coordinates } from '../types/analysis';
import { PRESET_LOCATIONS } from '../data/presetLocations';

// Active pin icon for currently selected coordinates
const activePinIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `
    <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 36px; height: 36px;">
      <div style="position: absolute; width: 36px; height: 36px; border-radius: 50%; background: rgba(245, 158, 11, 0.4); animation: ping 1.4s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
      <div style="position: relative; width: 26px; height: 26px; border-radius: 50%; background: linear-gradient(135deg, #f59e0b, #ea580c); border: 2.5px solid #ffffff; box-shadow: 0 4px 16px rgba(0,0,0,0.7); display: flex; align-items: center; justify-content: center;">
        <div style="width: 7px; height: 7px; border-radius: 50%; background: white;"></div>
      </div>
    </div>
  `,
  iconSize: [36, 36],
  iconAnchor: [18, 18],
});

// Subtle preset dot icon for other preset locations
const createPresetIcon = (isSelected: boolean) =>
  L.divIcon({
    className: 'map-preset-pin',
    html: `
      <div style="position: relative; display: flex; align-items: center; justify-content: center; width: 22px; height: 22px; cursor: pointer;">
        <div style="width: ${isSelected ? '14px' : '9px'}; height: ${
      isSelected ? '14px' : '9px'
    }; border-radius: 50%; background: ${
      isSelected ? '#f59e0b' : '#94a3b8'
    }; border: ${isSelected ? '2px solid white' : '1.5px solid #0f172a'}; box-shadow: 0 2px 6px rgba(0,0,0,0.6);"></div>
      </div>
    `,
    iconSize: [22, 22],
    iconAnchor: [11, 11],
  });

interface LocationPickerProps {
  coordinates: Coordinates;
  onChange: (coords: Coordinates) => void;
  gridCell?: Coordinates;
}

function MapClickHandler({ onSelect }: { onSelect: (coords: Coordinates) => void }) {
  useMapEvents({
    click(e) {
      const lat = Math.round(e.latlng.lat * 10000) / 10000;
      const lon = Math.round(e.latlng.lng * 10000) / 10000;
      // Clamp to India & immediate subcontinental perimeter
      if (lat >= 6 && lat <= 38 && lon >= 68 && lon <= 98) {
        onSelect({ lat, lon });
      }
    },
  });
  return null;
}

function MapRecenter({ coords }: { coords: Coordinates }) {
  const map = useMap();
  useEffect(() => {
    map.panTo([coords.lat, coords.lon], { animate: true });
  }, [coords.lat, coords.lon, map]);
  return null;
}

function MapViewResetter({ resetTrigger }: { resetTrigger: number }) {
  const map = useMap();
  useEffect(() => {
    if (resetTrigger > 0) {
      map.setView([22.5937, 78.9629], 4.5, { animate: true });
    }
  }, [resetTrigger, map]);
  return null;
}

export const LocationPicker: React.FC<LocationPickerProps> = ({
  coordinates,
  onChange,
  gridCell,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);
  const [resetCount, setResetCount] = useState(0);

  // Identify matching preset if coordinates match closely
  const activePreset = useMemo(() => {
    return PRESET_LOCATIONS.find(
      (p) =>
        Math.abs(p.coords.lat - coordinates.lat) < 0.15 &&
        Math.abs(p.coords.lon - coordinates.lon) < 0.15
    );
  }, [coordinates]);

  // Filter preset locations based on search query
  const filteredPresets = useMemo(() => {
    if (!searchQuery.trim()) return PRESET_LOCATIONS;
    const q = searchQuery.toLowerCase();
    return PRESET_LOCATIONS.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.state.toLowerCase().includes(q) ||
        p.region.toLowerCase().includes(q) ||
        p.climateZone.toLowerCase().includes(q)
    );
  }, [searchQuery]);

  return (
    <div className="space-y-3.5">
      {/* Header & Controls */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold tracking-wider text-slate-200 uppercase flex items-center gap-1.5 font-heading">
          <MapPin className="w-3.5 h-3.5 text-amber-400" />
          Location & Climate Grid
        </label>
        <span className="text-[11px] font-mono text-slate-400 bg-slate-900/80 px-2 py-0.5 rounded border border-slate-800">
          {coordinates.lat.toFixed(3)}°N, {coordinates.lon.toFixed(3)}°E
        </span>
      </div>

      {/* Selected Location Pill */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900/90 border border-slate-800 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_8px_#f59e0b]"></div>
          <div>
            <div className="text-xs font-bold text-white flex items-center gap-1.5">
              <span>{activePreset ? activePreset.name : 'Custom Coordinates'}</span>
              {activePreset && (
                <span className="text-[10px] font-normal text-amber-300 font-mono">
                  ({activePreset.state})
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400">
              {activePreset
                ? `${activePreset.region} • ${activePreset.climateZone}`
                : 'Click map or enter coordinates'}
            </div>
          </div>
        </div>

        {gridCell && (
          <div className="text-right">
            <span className="text-[9px] text-slate-500 uppercase tracking-wider block font-mono">
              Weather Cell
            </span>
            <span className="text-[10px] font-mono text-amber-400">
              {gridCell.lat}°N, {gridCell.lon}°E
            </span>
          </div>
        )}
      </div>

      {/* Search Input for Cities */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search Indian cities or regions (Delhi, Mumbai, Nagpur...)"
          className="w-full bg-slate-950/80 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-amber-500/60 focus:ring-1 focus:ring-amber-500/30 transition-all font-sans"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 hover:text-white"
          >
            Clear
          </button>
        )}
      </div>

      {/* Preset Location Pills */}
      <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-0.5">
        {filteredPresets.map((preset) => {
          const isSelected =
            Math.abs(coordinates.lat - preset.coords.lat) < 0.1 &&
            Math.abs(coordinates.lon - preset.coords.lon) < 0.1;
          return (
            <button
              key={preset.name}
              type="button"
              onClick={() => onChange(preset.coords)}
              className={`text-xs px-2.5 py-1 rounded-lg font-medium transition-all cursor-pointer flex items-center gap-1 ${
                isSelected
                  ? 'bg-amber-500/25 text-amber-300 border border-amber-500/50 shadow-sm shadow-amber-950/40 ring-1 ring-amber-500/30'
                  : 'bg-slate-900/70 text-slate-300 hover:bg-slate-800 border border-slate-800 hover:border-slate-700'
              }`}
            >
              <span>{preset.name}</span>
              {isSelected && <CheckCircle2 className="w-3 h-3 text-amber-400" />}
            </button>
          );
        })}
      </div>

      {/* Map Container with Carto Dark Tiles */}
      <div
        className={`relative w-full rounded-2xl overflow-hidden border border-slate-800/90 shadow-2xl transition-all duration-300 group ${
          isExpanded ? 'h-80' : 'h-56'
        }`}
      >
        <MapContainer
          center={[coordinates.lat, coordinates.lon]}
          zoom={5}
          scrollWheelZoom={false}
          className="h-full w-full"
        >
          {/* CartoDB Dark Matter Tiles */}
          <TileLayer
            attribution='&copy; <a href="https://carto.com/">CARTO</a> &copy; <a href="https://openstreetmap.org">OSM</a>'
            url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
          />

          {/* Markers for all preset cities across India */}
          {PRESET_LOCATIONS.map((preset) => {
            const isSelected =
              Math.abs(coordinates.lat - preset.coords.lat) < 0.1 &&
              Math.abs(coordinates.lon - preset.coords.lon) < 0.1;

            return (
              <Marker
                key={preset.name}
                position={[preset.coords.lat, preset.coords.lon]}
                icon={createPresetIcon(isSelected)}
                eventHandlers={{
                  click: () => onChange(preset.coords),
                }}
              >
                <Popup>
                  <div className="font-sans text-xs text-slate-100">
                    <div className="font-bold text-amber-400">{preset.name}</div>
                    <div className="text-[10px] text-slate-300">{preset.region}</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      {preset.coords.lat.toFixed(2)}°N, {preset.coords.lon.toFixed(2)}°E
                    </div>
                  </div>
                </Popup>
              </Marker>
            );
          })}

          {/* Active selection marker */}
          <Marker position={[coordinates.lat, coordinates.lon]} icon={activePinIcon} />

          <MapClickHandler onSelect={onChange} />
          <MapRecenter coords={coordinates} />
          <MapViewResetter resetTrigger={resetCount} />
        </MapContainer>

        {/* Map Top-Right Quick Controls */}
        <div className="absolute top-2 right-2 z-[1000] flex items-center gap-1.5">
          <button
            type="button"
            title="Reset to India view"
            onClick={() => setResetCount((prev) => prev + 1)}
            className="p-1.5 rounded-lg bg-slate-900/90 text-slate-300 hover:text-white border border-slate-700/60 shadow-md backdrop-blur-md cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            title={isExpanded ? 'Collapse map' : 'Expand map'}
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1.5 rounded-lg bg-slate-900/90 text-slate-300 hover:text-white border border-slate-700/60 shadow-md backdrop-blur-md cursor-pointer transition-colors"
          >
            {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>

        {/* Map Bottom Helper Overlay */}
        <div className="absolute bottom-2 left-2 right-2 pointer-events-none z-[1000] flex items-center justify-between px-2.5 py-1 bg-slate-950/85 backdrop-blur-md rounded-lg border border-slate-800/80 text-[10px] text-slate-300">
          <span className="flex items-center gap-1.5 font-sans">
            <Compass className="w-3 h-3 text-amber-400" />
            Click anywhere on map to select
          </span>
          <span className="text-amber-400/90 font-mono flex items-center gap-1">
            <Layers className="w-3 h-3" />
            Weather Grid
          </span>
        </div>
      </div>

      {/* Manual Lat/Lon Coordinates Entry */}
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono uppercase">LAT</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.01"
              min="6.0"
              max="38.0"
              value={coordinates.lat}
              onChange={(e) =>
                onChange({ ...coordinates, lat: parseFloat(e.target.value) || coordinates.lat })
              }
              className="w-20 text-right bg-transparent text-slate-100 font-mono text-xs focus:outline-none focus:text-amber-300"
            />
            <span className="text-slate-500 font-mono text-[10px]">°N</span>
          </div>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl px-2.5 py-1.5 flex items-center justify-between">
          <span className="text-[10px] text-slate-500 font-mono uppercase">LON</span>
          <div className="flex items-center gap-1">
            <input
              type="number"
              step="0.01"
              min="68.0"
              max="98.0"
              value={coordinates.lon}
              onChange={(e) =>
                onChange({ ...coordinates, lon: parseFloat(e.target.value) || coordinates.lon })
              }
              className="w-20 text-right bg-transparent text-slate-100 font-mono text-xs focus:outline-none focus:text-amber-300"
            />
            <span className="text-slate-500 font-mono text-[10px]">°E</span>
          </div>
        </div>
      </div>
    </div>
  );
};
