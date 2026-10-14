import { useState, useEffect } from 'react';
import {
  MapContainer,
  TileLayer,
  Marker,
  GeoJSON,
  useMapEvents,
  useMap,
} from 'react-leaflet';
import L from 'leaflet';
import {
  MapPin,
  RotateCcw,
  Compass,
  AlertTriangle,
} from 'lucide-react';
import type { Coordinates } from '../types/analysis';
import { PRESET_LOCATIONS } from '../data/presetLocations';
import {
  isPointInIndia,
  INDIA_MAP_BOUNDS,
  indiaBoundaryData,
} from '../utils/geoBounds';

// Active pin icon for currently selected custom coordinates (Apple vibrant dot)
const activePinIcon = L.divIcon({
  className: 'custom-map-pin',
  html: `
    <div style="width: 14px; height: 14px; border-radius: 50%; background: #0071e3; border: 2.5px solid #ffffff; box-shadow: 0 0 12px rgba(0, 113, 227, 0.95); display: flex; align-items: center; justify-content: center; cursor: pointer;">
      <div style="width: 3px; height: 3px; border-radius: 50%; background: white;"></div>
    </div>
  `,
  iconSize: [14, 14],
  iconAnchor: [7, 7],
});

// Sleek city point icon with permanently highlighted Apple frosted pill label
const createCityPointIcon = (name: string, isSelected: boolean) =>
  L.divIcon({
    className: 'custom-map-city-point',
    html: `
      <div style="display: flex; align-items: center; pointer-events: none; white-space: nowrap;">
        <!-- Precise Center Dot -->
        <div style="width: ${isSelected ? '14px' : '8px'}; height: ${isSelected ? '14px' : '8px'}; border-radius: 50%; background: ${isSelected ? '#0071e3' : '#2997ff'}; border: ${isSelected ? '2.5px solid #ffffff' : '1.5px solid #000000'}; box-shadow: ${isSelected ? '0 0 10px rgba(0, 113, 227, 0.95)' : '0 0 6px rgba(41, 151, 255, 0.7)'}; pointer-events: auto; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; justify-content: center;">
          ${isSelected ? '<div style="width: 3px; height: 3px; border-radius: 50%; background: white;"></div>' : ''}
        </div>
        <!-- Highlighted Apple Frosted Pill -->
        <span style="margin-left: 5px; font-size: ${isSelected ? '11px' : '10px'}; font-weight: ${isSelected ? '700' : '500'}; font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', sans-serif; color: ${isSelected ? '#ffffff' : '#f5f5f7'}; background: ${isSelected ? 'rgba(0, 113, 227, 0.45)' : 'rgba(28, 28, 30, 0.85)'}; padding: 2px 7px; border-radius: 980px; border: 1px solid ${isSelected ? 'rgba(41, 151, 255, 0.85)' : 'rgba(255, 255, 255, 0.15)'}; backdrop-filter: blur(12px); box-shadow: 0 2px 8px rgba(0,0,0,0.5); pointer-events: auto; cursor: pointer;">
          ${name}
        </span>
      </div>
    `,
    iconSize: [isSelected ? 100 : 80, isSelected ? 18 : 14],
    iconAnchor: [isSelected ? 7 : 4, isSelected ? 9 : 7],
  });

interface InteractiveMapTrayProps {
  coordinates: Coordinates;
  onChange: (coords: Coordinates) => void;
  onClose: () => void;
  gridCell?: Coordinates;
  isOpen?: boolean;
}

function MapClickHandler({
  onSelect,
  onInvalidClick,
}: {
  onSelect: (coords: Coordinates) => void;
  onInvalidClick: () => void;
}) {
  useMapEvents({
    click(e) {
      const lat = Math.round(e.latlng.lat * 10000) / 10000;
      const lon = Math.round(e.latlng.lng * 10000) / 10000;

      // Strict validation: Only allow selection if the point is within Indian borders
      if (isPointInIndia(lat, lon)) {
        onSelect({ lat, lon });
      } else {
        onInvalidClick();
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
      map.fitBounds(INDIA_MAP_BOUNDS, { animate: true });
    }
  }, [resetTrigger, map]);
  return null;
}

function MapSizeInvalidator({ isOpen }: { isOpen?: boolean }) {
  const map = useMap();
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        map.invalidateSize();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, map]);
  return null;
}

export const InteractiveMapTray: React.FC<InteractiveMapTrayProps> = ({
  coordinates,
  onChange,
  onClose,
  gridCell,
  isOpen = true,
}) => {
  const [resetTrigger, setResetTrigger] = useState<number>(0);
  const [invalidNotice, setInvalidNotice] = useState<string | null>(null);

  const handleInvalidClick = () => {
    setInvalidNotice('Selected location is outside Indian territory. Please click inside India.');
    setTimeout(() => setInvalidNotice(null), 3500);
  };

  const handleManualLatChange = (latVal: number) => {
    if (isPointInIndia(latVal, coordinates.lon)) {
      onChange({ ...coordinates, lat: latVal });
      setInvalidNotice(null);
    } else {
      setInvalidNotice(`Latitude ${latVal}°N falls outside India.`);
      setTimeout(() => setInvalidNotice(null), 3000);
    }
  };

  const handleManualLonChange = (lonVal: number) => {
    if (isPointInIndia(coordinates.lat, lonVal)) {
      onChange({ ...coordinates, lon: lonVal });
      setInvalidNotice(null);
    } else {
      setInvalidNotice(`Longitude ${lonVal}°E falls outside India.`);
      setTimeout(() => setInvalidNotice(null), 3000);
    }
  };

  return (
    <div className="apple-glass-popover bg-[#18181b] border border-white/15 rounded-3xl p-4 sm:p-5 shadow-[0_24px_70px_rgba(0,0,0,0.98)] space-y-3.5">
      {/* Map Tray Top Header */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-2xl bg-[#0071e3]/15 border border-[#0071e3]/30 text-[#2997ff]">
            <Compass className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs sm:text-sm font-semibold text-[#f5f5f7] flex items-center gap-2">
              India Territory Map
              <span className="text-[10px] font-mono text-[#2997ff] font-normal">
                ({coordinates.lat.toFixed(2)}°N, {coordinates.lon.toFixed(2)}°E)
              </span>
            </h3>
            <p className="text-[10px] text-[#86868b] font-mono">
              {gridCell ? `Weather Cell: ${gridCell.lat}°N, ${gridCell.lon}°E` : 'Click anywhere inside India'}
            </p>
          </div>
        </div>
      </div>

      {/* Invalid Click Notice Banner */}
      {invalidNotice && (
        <div className="p-2.5 rounded-2xl bg-[#ff453a]/15 border border-[#ff453a]/30 text-[#ff453a] text-xs flex items-center gap-2 animate-in fade-in">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          <span className="font-medium text-[11px]">{invalidNotice}</span>
        </div>
      )}

      {/* Instruction Banner in place of cities & search */}
      <div className="flex items-center px-4 py-2 bg-[#242426]/70 rounded-full border border-white/[0.08] text-xs text-[#86868b]">
        <span className="flex items-center gap-2 font-medium">
          <MapPin className="w-3.5 h-3.5 text-[#2997ff] shrink-0" />
          <span>Click anywhere inside the territory boundary to select India coordinate</span>
        </span>
      </div>

      {/* Map Container - Clamped to India, Non-Repeating */}
      <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden border border-white/[0.08] shadow-inner group">
        <MapContainer
          center={[coordinates.lat, coordinates.lon]}
          zoom={5}
          minZoom={4.5}
          maxZoom={12}
          maxBounds={INDIA_MAP_BOUNDS}
          maxBoundsViscosity={1.0}
          scrollWheelZoom={true}
          worldCopyJump={false}
          className="h-full w-full"
        >
          {/* Esri Dark Gray Base Map - Non-repeating with noWrap */}
          <TileLayer
            attribution='&copy; <a href="https://www.esri.com/">Esri</a>'
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Gray_Base/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
            noWrap={true}
            bounds={INDIA_MAP_BOUNDS}
          />
          {/* Esri Dark Gray Labels / Reference Layer */}
          <TileLayer
            attribution=""
            url="https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Dark_Reference/MapServer/tile/{z}/{y}/{x}"
            maxZoom={16}
            noWrap={true}
            bounds={INDIA_MAP_BOUNDS}
          />

          {/* Official Survey of India Boundary Overlay */}
          <GeoJSON
            data={indiaBoundaryData as any}
            style={() => ({
              color: '#0071e3',
              weight: 1.8,
              opacity: 0.85,
              fillColor: '#0071e3',
              fillOpacity: 0.05,
              dashArray: '3 4',
            })}
          />

          {/* Key City Points with Highlighted Names */}
          {PRESET_LOCATIONS.map((loc) => {
            const isSelected =
              Math.abs(coordinates.lat - loc.coords.lat) < 0.12 &&
              Math.abs(coordinates.lon - loc.coords.lon) < 0.12;

            return (
              <Marker
                key={loc.name}
                position={[loc.coords.lat, loc.coords.lon]}
                icon={createCityPointIcon(loc.name, isSelected)}
                zIndexOffset={isSelected ? 1000 : 200}
                eventHandlers={{
                  click: () => {
                    onChange(loc.coords);
                    setInvalidNotice(null);
                  },
                }}
              />
            );
          })}

          {/* Active Custom Location Marker (Only rendered when coordinate is custom and not a preset city) */}
          {!PRESET_LOCATIONS.some(
            (loc) =>
              Math.abs(coordinates.lat - loc.coords.lat) < 0.12 &&
              Math.abs(coordinates.lon - loc.coords.lon) < 0.12
          ) && (
            <Marker position={[coordinates.lat, coordinates.lon]} icon={activePinIcon} zIndexOffset={900} />
          )}

          <MapClickHandler
            onSelect={(coords) => {
              onChange(coords);
              setInvalidNotice(null);
            }}
            onInvalidClick={handleInvalidClick}
          />
          <MapRecenter coords={coordinates} />
          <MapViewResetter resetTrigger={resetTrigger} />
          <MapSizeInvalidator isOpen={isOpen} />
        </MapContainer>

        {/* Map Top-Right Reset Control */}
        <div className="absolute top-2.5 right-2.5 z-[1000] flex items-center gap-2">
          <button
            type="button"
            title="Reset to India frame"
            onClick={() => setResetTrigger((prev) => prev + 1)}
            className="p-2 rounded-full bg-[#1c1c1e]/90 text-[#f5f5f7] hover:bg-[#2c2c2e] border border-white/[0.12] shadow-lg backdrop-blur-xl cursor-pointer transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Manual Coordinate Stepper inputs (Spinners disabled) */}
      <div className="flex flex-wrap items-center justify-between gap-2.5 pt-1 text-xs">
        <div className="flex items-center gap-2">
          <div className="bg-[#242426]/80 border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <span className="text-[#86868b] font-mono uppercase text-[10px]">Lat:</span>
            <input
              type="number"
              step="0.01"
              min="8.0"
              max="37.2"
              value={coordinates.lat}
              onChange={(e) => handleManualLatChange(parseFloat(e.target.value) || coordinates.lat)}
              className="w-16 bg-transparent border-0 text-[#f5f5f7] font-mono text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[#86868b] font-mono text-[10px]">°N</span>
          </div>

          <div className="bg-[#242426]/80 border border-white/10 rounded-full px-3 py-1.5 flex items-center gap-1.5">
            <span className="text-[#86868b] font-mono uppercase text-[10px]">Lon:</span>
            <input
              type="number"
              step="0.01"
              min="68.2"
              max="97.4"
              value={coordinates.lon}
              onChange={(e) => handleManualLonChange(parseFloat(e.target.value) || coordinates.lon)}
              className="w-16 bg-transparent border-0 text-[#f5f5f7] font-mono text-xs focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[#86868b] font-mono text-[10px]">°E</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="px-5 py-1.5 rounded-full bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.98] text-white font-medium text-xs transition-all cursor-pointer shadow-[0_2px_12px_rgba(0,113,227,0.4)]"
        >
          Done
        </button>
      </div>
    </div>
  );
};
