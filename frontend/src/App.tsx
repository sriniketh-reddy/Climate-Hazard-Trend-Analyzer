import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Globe,
} from 'lucide-react';
import type { Coordinates, HazardType, AnalysisResponse } from './types/analysis';
import { fetchAnalysis } from './api/analysisApi';
import { ConfigurationBar } from './components/ConfigurationBar';
import { InteractiveMapTray } from './components/InteractiveMapTray';
import { AnalysisPanel } from './components/AnalysisPanel';
import { PRESET_LOCATIONS } from './data/presetLocations';

export default function App() {
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);

  // Input parameters state
  const [coordinates, setCoordinates] = useState<Coordinates>(PRESET_LOCATIONS[5].coords); // Default: Hyderabad
  const [hazardType, setHazardType] = useState<HazardType>('heatwave');
  const [startDate, setStartDate] = useState<string>('1990-01-01');
  const [endDate, setEndDate] = useState<string>(todayStr);

  // Map Tray expand/collapse state
  const [isMapOpen, setIsMapOpen] = useState<boolean>(false);
  const mapOverlayRef = useRef<HTMLDivElement>(null);

  // Close map when clicking outside or pressing Escape
  useEffect(() => {
    if (!isMapOpen) return;

    const handleOutsideClick = (e: MouseEvent | TouchEvent) => {
      const target = e.target as HTMLElement | null;
      if (!target) return;

      // Don't close if clicking inside the map tray or the toggle button
      if (mapOverlayRef.current && mapOverlayRef.current.contains(target)) {
        return;
      }

      if (target.closest('#map-toggle-btn')) {
        return;
      }

      setIsMapOpen(false);
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsMapOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('touchstart', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('touchstart', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMapOpen]);

  // Rate limit cooldown state (seconds remaining)
  const [rateLimitCooldown, setRateLimitCooldown] = useState<number>(0);

  // Analysis result state
  const [data, setData] = useState<AnalysisResponse | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Cooldown countdown timer
  useEffect(() => {
    if (rateLimitCooldown <= 0) return;
    const interval = setInterval(() => {
      setRateLimitCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [rateLimitCooldown]);

  // Compute matched location name for UI labels
  const matchedLocationName = useMemo(() => {
    const found = PRESET_LOCATIONS.find(
      (p) =>
        Math.abs(p.coords.lat - coordinates.lat) < 0.15 &&
        Math.abs(p.coords.lon - coordinates.lon) < 0.15
    );
    return found ? `${found.name}, ${found.state}` : `${coordinates.lat.toFixed(2)}°N, ${coordinates.lon.toFixed(2)}°E`;
  }, [coordinates]);

  const handleRunAnalysis = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const result = await fetchAnalysis({
        latitude: coordinates.lat,
        longitude: coordinates.lon,
        hazard_type: hazardType,
        start_date: startDate,
        end_date: endDate,
      });
      setData(result);
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
        if (err.message.includes('429') || err.message.toLowerCase().includes('rate limit')) {
          setRateLimitCooldown(60);
        }
      } else {
        setError('An unexpected error occurred during analysis.');
      }
    } finally {
      setLoading(false);
    }
  }, [coordinates, hazardType, startDate, endDate]);

  // Configuration change handlers: When anything in configuration changes, previous analytics vanish
  const handleCoordinatesChange = useCallback((newCoords: Coordinates) => {
    setCoordinates(newCoords);
    setData(null);
    setError(null);
  }, []);

  const handleHazardTypeChange = useCallback((newHazard: HazardType) => {
    setHazardType(newHazard);
    setData(null);
    setError(null);
  }, []);

  const handleDateRangeChange = useCallback((start: string, end: string) => {
    setStartDate(start);
    setEndDate(end);
    setData(null);
    setError(null);
  }, []);

  // Keyboard shortcut: Ctrl+Enter or Cmd+Enter to run analysis
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        handleRunAnalysis();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleRunAnalysis]);

  // Auto-sleeping scrollbar: Wakes on scroll, hover, or when data arrives, then sleeps after 1 second of inactivity
  useEffect(() => {
    let sleepTimer: ReturnType<typeof setTimeout> | null = null;
    let isDraggingScrollbar = false;

    const wakeScrollbar = (delayMs = 1000) => {
      document.body.classList.add('is-scrolling');
      if (sleepTimer) {
        clearTimeout(sleepTimer);
      }
      sleepTimer = setTimeout(() => {
        if (!isDraggingScrollbar) {
          document.body.classList.remove('is-scrolling');
        }
      }, delayMs);
    };

    const handleScroll = () => {
      wakeScrollbar(1000);
    };

    const handlePointerDown = (e: PointerEvent) => {
      // Check if clicked near right edge (scrollbar area)
      if (window.innerWidth - e.clientX <= 20) {
        isDraggingScrollbar = true;
        wakeScrollbar(1000);
      }
    };

    const handlePointerUp = () => {
      if (isDraggingScrollbar) {
        isDraggingScrollbar = false;
        wakeScrollbar(1000);
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      // Hovering near the right scrollbar track wakes it up
      if (window.innerWidth - e.clientX <= 16) {
        wakeScrollbar(1000);
      }
    };

    window.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { passive: true });
    window.addEventListener('pointerup', handlePointerUp, { passive: true });
    window.addEventListener('mousemove', handleMouseMove, { passive: true });

    // When analysis data arrives, briefly wake the scrollbar for 1s, then put it to sleep
    if (data) {
      wakeScrollbar(1000);
    }

    return () => {
      if (sleepTimer) clearTimeout(sleepTimer);
      window.removeEventListener('scroll', handleScroll, { capture: true });
      window.removeEventListener('pointerdown', handlePointerDown);
      window.removeEventListener('pointerup', handlePointerUp);
      window.removeEventListener('mousemove', handleMouseMove);
      document.body.classList.remove('is-scrolling');
    };
  }, [data]);

  return (
    <div
      className={`min-h-screen bg-[#000000] text-[#f5f5f7] flex flex-col font-sans selection:bg-[#0071e3] selection:text-white ${
        !data ? 'h-screen overflow-hidden' : ''
      }`}
    >
      {/* 1 & 2. Unified Opaque Sticky Top Header & Configuration Bar */}
      <div className="sticky top-0 z-50 w-full shrink-0 bg-[#0d0d0f] shadow-[0_12px_36px_rgba(0,0,0,0.85)] border-b border-white/[0.08]">
        <header className="px-6 sm:px-10 py-3 flex items-center justify-between gap-4 border-b border-white/[0.06] bg-[#0d0d0f]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-b from-[#2c2c2e] to-[#1c1c1e] border border-white/15 flex items-center justify-center text-[#2997ff] shadow-lg shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-semibold tracking-tight text-[#f5f5f7]">
                Climate Hazard Trend Analyzer
              </h1>
              <p className="text-xs sm:text-sm text-[#86868b] hidden sm:block font-normal">
                Track extreme heatwaves and drought trends across India
              </p>
            </div>
          </div>
        </header>

        {/* Configuration Bar integrated directly under header */}
        <ConfigurationBar
          coordinates={coordinates}
          onCoordinatesChange={handleCoordinatesChange}
          isMapOpen={isMapOpen}
          onToggleMap={() => setIsMapOpen((prev) => !prev)}
          hazardType={hazardType}
          onHazardTypeChange={handleHazardTypeChange}
          startDate={startDate}
          endDate={endDate}
          onDateRangeChange={handleDateRangeChange}
          onRunAnalysis={handleRunAnalysis}
          loading={loading}
          rateLimitCooldown={rateLimitCooldown}
          hasData={Boolean(data)}
        />

        {/* Floating Map Overlay anchored directly under Configuration Bar inside sticky container */}
        <div className="relative w-full mx-auto px-4 sm:px-8 pointer-events-none">
          <div
            ref={mapOverlayRef}
            className={`absolute top-2 left-4 sm:left-8 z-50 w-[calc(100%-2rem)] sm:w-[540px] transition-all duration-300 ease-in-out origin-top-left ${
              isMapOpen
                ? 'opacity-100 translate-y-0 scale-100 pointer-events-auto visible shadow-2xl'
                : 'opacity-0 -translate-y-3 scale-95 pointer-events-none invisible'
            }`}
          >
            <InteractiveMapTray
              isOpen={isMapOpen}
              coordinates={coordinates}
              onChange={handleCoordinatesChange}
              onClose={() => setIsMapOpen(false)}
              gridCell={data?.location.grid_cell}
            />
          </div>
        </div>
      </div>

      {/* Click-away Scrim for Map Overlay */}
      {isMapOpen && (
        <div
          className="fixed inset-0 z-40 transition-opacity duration-200"
          onClick={() => setIsMapOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* 3. Main Workspace Canvas (Full Width & Height Analysis Section) */}
      <main className="flex-1 min-h-0 w-full px-4 sm:px-6 lg:px-8 py-3.5 sm:py-4 relative z-10 flex flex-col">
        <section className="w-full flex-1 min-h-0 flex flex-col">
          <AnalysisPanel
            data={data}
            hazardType={hazardType}
            loading={loading}
            error={error}
            locationName={matchedLocationName}
            onRetry={handleRunAnalysis}
            cooldownSeconds={rateLimitCooldown}
            onDismissError={() => setError(null)}
          />
        </section>
      </main>
    </div>
  );
}
