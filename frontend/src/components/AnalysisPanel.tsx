import React, { useState, useEffect, useMemo } from 'react';
import {
  Flame,
  Droplets,
  Clock,
  Layers,
  ThermometerSnowflake,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertCircle,
  Copy,
  Check,
  BarChart2,
  Table as TableIcon,
  BookOpen,
} from 'lucide-react';
import type {
  AnalysisResponse,
  HeatwaveAnnualMetric,
  DroughtAnnualMetric,
} from '../types/analysis';
import { SummaryCard } from './insights/SummaryCard';
import { TrendInsight } from './insights/TrendInsight';
import { DataQualityBadge } from './insights/DataQualityBadge';
import { AnnualMetricsChart } from './charts/AnnualMetricsChart';
import { YearlyDataTable } from './YearlyDataTable';
import { RateLimitBanner } from './RateLimitBanner';
import { AppleSegmentedSwitch, type AppleSegmentedOption } from './AppleSegmentedSwitch';

interface AnalysisPanelProps {
  data: AnalysisResponse | null;
  hazardType?: 'heatwave' | 'drought';
  loading: boolean;
  error: string | null;
  locationName?: string;
  onRetry?: () => void;
  cooldownSeconds?: number;
  onDismissError?: () => void;
}

export const AnalysisPanel: React.FC<AnalysisPanelProps> = ({
  data,
  hazardType = 'heatwave',
  loading,
  error,
  locationName = 'Selected Location',
  onRetry,
  cooldownSeconds = 0,
  onDismissError,
}) => {
  const [activeTab, setActiveTab] = useState<'chart' | 'table' | 'methodology'>('chart');
  const [copied, setCopied] = useState(false);

  // Automatically select the Timeline tab whenever an analysis is triggered or loads
  useEffect(() => {
    if (loading || !data) {
      setActiveTab('chart');
    }
  }, [loading, data]);

  const tabOptions = useMemo<AppleSegmentedOption<'chart' | 'table' | 'methodology'>[]>(
    () => [
      {
        value: 'chart',
        width: 130,
        label: 'Timeline',
        icon: <BarChart2 className="w-4 h-4 shrink-0" />,
      },
      {
        value: 'table',
        width: 145,
        label: 'Data Table',
        icon: <TableIcon className="w-4 h-4 shrink-0" />,
      },
      {
        value: 'methodology',
        width: 165,
        label: 'How It Works',
        icon: <BookOpen className="w-4 h-4 shrink-0" />,
      },
    ],
    []
  );

  const handleCopySummary = () => {
    if (!data) return;
    const summary = `Climate Trend Report (${data.hazard_type === 'heatwave' ? 'Heatwaves' : 'Droughts'}):
Location: ${locationName} (${data.location.requested.lat.toFixed(2)}°N, ${data.location.requested.lon.toFixed(2)}°E)
Years: ${data.start_date.substring(0, 4)} to ${data.end_date.substring(0, 4)}
10-Year Change: ${data.trend.slope_per_decade ?? '0'} per decade (${data.trend.direction || 'stable'})
Pattern: ${data.trend.significant_at_005 ? 'Clear Proven Trend' : 'Normal Fluctuations (Stable)'}
Source: Historical Weather Records`;

    navigator.clipboard.writeText(summary);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Apple-grade Glassmorphic Skeleton Loading Animation
  if (loading) {
    return (
      <div className="space-y-6 w-full animate-fade-in" aria-busy="true" aria-label="Loading analysis">
        {/* Skeleton Top Header Bar */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-white/[0.06] border border-white/[0.08] animate-shimmer shrink-0" />
            <div className="space-y-2">
              <div className="w-48 sm:w-64 h-6 rounded-lg bg-white/[0.08] animate-shimmer" />
              <div className="w-60 sm:w-80 h-3.5 rounded-md bg-white/[0.04] animate-shimmer" />
            </div>
          </div>
          <div className="w-32 h-9 rounded-full bg-white/[0.06] border border-white/[0.08] animate-shimmer" />
        </div>

        {/* Skeleton 4 Metric KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {[...Array(4)].map((_, i) => (
            <div
              key={i}
              className="glass-panel rounded-3xl p-5 border border-white/[0.08] flex flex-col justify-between h-[126px] relative overflow-hidden"
            >
              <div className="flex items-center justify-between">
                <div className="w-24 sm:w-28 h-3.5 rounded bg-white/[0.07] animate-shimmer" />
                <div className="w-7 h-7 rounded-full bg-white/[0.05] animate-shimmer" />
              </div>
              <div className="w-20 sm:w-28 h-8 rounded-lg bg-white/[0.09] animate-shimmer my-1.5" />
              <div className="w-32 sm:w-36 h-3 rounded bg-white/[0.04] animate-shimmer" />
            </div>
          ))}
        </div>

        {/* Skeleton Tab Bar */}
        <div className="flex items-center">
          <div className="inline-flex p-1 rounded-full bg-[#1c1c1e]/90 border border-white/10 gap-1">
            <div className="w-[130px] h-9 rounded-full bg-white/[0.09] animate-shimmer" />
            <div className="w-[145px] h-9 rounded-full bg-white/[0.03] animate-shimmer" />
            <div className="w-[165px] h-9 rounded-full bg-white/[0.03] animate-shimmer" />
          </div>
        </div>

        {/* Skeleton Large Chart Panel */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/[0.08] space-y-6 relative overflow-hidden">
          {/* Chart top header bar */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="space-y-1.5">
              <div className="w-40 sm:w-56 h-5 rounded-lg bg-white/[0.08] animate-shimmer" />
              <div className="w-52 sm:w-72 h-3.5 rounded bg-white/[0.04] animate-shimmer" />
            </div>
            <div className="w-44 h-9 rounded-full bg-white/[0.05] border border-white/[0.06] animate-shimmer" />
          </div>

          {/* Chart visualization canvas placeholder */}
          <div className="h-[340px] sm:h-[380px] w-full rounded-2xl bg-white/[0.02] border border-white/[0.05] p-5 flex flex-col justify-between relative overflow-hidden">
            {/* Simulated subtle horizontal grid lines */}
            <div className="absolute inset-0 flex flex-col justify-between p-6 pointer-events-none opacity-40">
              <div className="w-full border-b border-dashed border-white/[0.07]" />
              <div className="w-full border-b border-dashed border-white/[0.07]" />
              <div className="w-full border-b border-dashed border-white/[0.07]" />
              <div className="w-full border-b border-dashed border-white/[0.07]" />
              <div className="w-full border-b border-white/[0.1]" />
            </div>

            {/* Simulated chart bars shimmering */}
            <div className="flex items-end justify-between gap-1.5 sm:gap-3 h-full pb-6 pt-10 px-2 sm:px-6 relative z-10">
              {[35, 60, 45, 80, 55, 70, 95, 65, 40, 85, 75, 50, 90, 60, 100, 70, 45, 80, 65, 88].map((heightPct, idx) => (
                <div
                  key={idx}
                  style={{ height: `${heightPct}%` }}
                  className="flex-1 rounded-t-md bg-gradient-to-t from-[#0071e3]/10 to-[#2997ff]/25 border-t border-[#2997ff]/30 animate-pulse relative overflow-hidden"
                >
                  <div className="absolute inset-0 animate-shimmer opacity-40" />
                </div>
              ))}
            </div>

            {/* Bottom X-axis label ticks */}
            <div className="flex justify-between items-center pt-2 px-2 relative z-10">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="w-8 sm:w-12 h-3 rounded bg-white/[0.04] animate-shimmer" />
              ))}
            </div>
          </div>
        </div>

        {/* Skeleton Insight Banner */}
        <div className="glass-panel rounded-3xl p-5 sm:p-6 border border-white/[0.08] flex items-center gap-4 relative overflow-hidden">
          <div className="w-10 h-10 rounded-2xl bg-white/[0.07] animate-shimmer shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="w-48 sm:w-72 h-4 rounded-lg bg-white/[0.07] animate-shimmer" />
            <div className="w-full max-w-xl h-3 rounded bg-white/[0.04] animate-shimmer" />
          </div>
        </div>
      </div>
    );
  }

  // Only block screen if there is an error AND we have NO previous analysis to display
  if (error && !data) {
    const is429 = error.includes('429') || error.toLowerCase().includes('rate limit');

    return (
      <div
        className={`glass-panel rounded-3xl p-6 sm:p-8 flex-1 h-full min-h-0 w-full flex flex-col items-center justify-center text-center space-y-4 sm:space-y-5 relative overflow-hidden transition-all duration-300 ${is429
          ? 'border-[#0071e3]/30 bg-[#1c1c1e]/80'
          : 'border-[#ff453a]/30 bg-[#1c1c1e]/80'
          }`}
      >
        <div
          className={`w-16 h-16 rounded-3xl flex items-center justify-center border shadow-xl ${is429
            ? 'bg-[#0071e3]/15 border-[#0071e3]/30 text-[#2997ff]'
            : 'bg-[#ff453a]/15 border-[#ff453a]/30 text-[#ff453a]'
            }`}
        >
          {is429 ? <Clock className="w-8 h-8 animate-pulse" /> : <AlertCircle className="w-8 h-8" />}
        </div>
        <div className="space-y-1.5 max-w-md">
          <h3 className="text-xl font-semibold text-[#f5f5f7] tracking-tight">
            {is429 ? 'Weather Service Busy' : 'Request Notice'}
          </h3>
          <p className="text-xs text-[#86868b] leading-relaxed">
            {is429
              ? 'The weather server is temporarily busy serving requests. It resets automatically every few seconds.'
              : error}
          </p>
        </div>

        {is429 && cooldownSeconds > 0 && (
          <div className="w-full max-w-xs space-y-2">
            <div className="flex justify-between text-xs font-mono text-[#2997ff]">
              <span>Automatic Retry In</span>
              <span>{cooldownSeconds}s</span>
            </div>
            <div className="w-full h-1.5 bg-[#2c2c2e] rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[#0071e3] to-[#2997ff] transition-all duration-1000"
                style={{ width: `${Math.max(5, ((60 - cooldownSeconds) / 60) * 100)}%` }}
              ></div>
            </div>
          </div>
        )}

        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            disabled={cooldownSeconds > 40}
            className="px-6 py-2 rounded-full text-xs font-medium bg-[#0071e3] hover:bg-[#0077ed] active:scale-[0.98] text-white shadow-[0_4px_16px_rgba(0,113,227,0.4)] transition-all cursor-pointer disabled:opacity-50"
          >
            {cooldownSeconds > 0 ? `Wait (${cooldownSeconds}s)` : 'Retry Analysis Now'}
          </button>
        )}
      </div>
    );
  }

  // Empty / Not Started State - Expands up to the end of the viewport, simple and clear for any student
  if (!data) {
    const isDrought = hazardType === 'drought';

    return (
      <div className="glass-panel rounded-3xl p-6 sm:p-8 lg:p-10 flex-1 h-full min-h-0 w-full flex flex-col items-center justify-center text-center space-y-4 sm:space-y-5 relative overflow-hidden transition-all duration-300">
        {/* Subtle Ambient Radial Glow */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[520px] h-[520px] rounded-full blur-[130px] pointer-events-none transition-all duration-700 ${isDrought ? 'bg-[#0071e3]/10' : 'bg-[#2997ff]/10'
            }`}
        />

        {/* Hazard Mode Pill */}
        <div className="inline-flex items-center gap-2 px-4.5 py-2 rounded-full bg-[#1c1c1e]/90 border border-white/10 text-sm sm:text-base font-medium shadow-sm transition-all">
          {isDrought ? (
            <>
              <Droplets className="w-4.5 h-4.5 text-[#2997ff]" />
              <span className="text-[#f5f5f7]">Drought Mode</span>
              <span className="text-[#86868b] font-mono">• Rain Shortages &amp; Dry Months</span>
            </>
          ) : (
            <>
              <Flame className="w-4.5 h-4.5 text-[#2997ff]" />
              <span className="text-[#f5f5f7]">Heatwave Mode</span>
              <span className="text-[#86868b] font-mono">• Unusually Hot Days</span>
            </>
          )}
        </div>

        {/* Dynamic Icon */}
        <div className="w-22 h-22 rounded-3xl bg-gradient-to-b from-[#1c1c1e] to-[#141416] border border-white/15 flex items-center justify-center text-[#2997ff] shadow-[0_16px_40px_rgba(0,113,227,0.25)] relative transition-all duration-300">
          {isDrought ? (
            <Droplets className="w-10 h-10 animate-pulse text-[#2997ff]" />
          ) : (
            <Flame className="w-10 h-10 animate-pulse text-[#2997ff]" />
          )}
          <div className="absolute inset-0 rounded-3xl border border-[#2997ff]/30 animate-ping opacity-15 pointer-events-none" />
        </div>

        {/* Headline & Description (Simple, crystal clear) */}
        <div className="space-y-2.5 max-w-xl transition-all">
          <h3 className="text-3xl sm:text-4xl font-semibold text-[#f5f5f7] tracking-tight">
            {isDrought ? 'Ready to Explore Drought Trends' : 'Ready to Explore Heatwave Trends'}
          </h3>
          <p className="text-base sm:text-lg text-[#86868b] leading-relaxed">
            {isDrought
              ? 'Find out how dry seasons and rainfall shortages have changed over the decades for any location in India.'
              : 'Find out how summer heatwaves and extreme hot days have changed over the decades for any location in India.'}
          </p>
        </div>

        {/* Clear 3 Information Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-2xl w-full pt-3">
          {isDrought ? (
            <>
              <div className="p-4.5 rounded-2xl bg-[#1c1c1e]/60 border border-white/[0.08] text-left">
                <div className="text-xs text-[#86868b] uppercase tracking-wider font-semibold">What We Check</div>
                <div className="text-base font-semibold text-[#f5f5f7] mt-1.5">Monthly Rain Shortage</div>
                <div className="text-xs sm:text-[13px] text-[#86868b] mt-1 leading-normal">Months with far less rain than normal</div>
              </div>
              <div className="p-4.5 rounded-2xl bg-[#1c1c1e]/60 border border-white/[0.08] text-left">
                <div className="text-xs text-[#86868b] uppercase tracking-wider font-semibold">What Counts As Drought</div>
                <div className="text-base font-semibold text-[#f5f5f7] mt-1.5">Extended Dry Spells</div>
                <div className="text-xs sm:text-[13px] text-[#86868b] mt-1 leading-normal">Severe water shortages</div>
              </div>
              <div className="p-4.5 rounded-2xl bg-[#1c1c1e]/60 border border-white/[0.08] text-left">
                <div className="text-xs text-[#86868b] uppercase tracking-wider font-semibold">Years Covered</div>
                <div className="text-base font-semibold text-[#f5f5f7] mt-1.5">1940 to Present Day</div>
                <div className="text-xs sm:text-[13px] text-[#86868b] mt-1 leading-normal">Over 80 years of weather records</div>
              </div>
            </>
          ) : (
            <>
              <div className="p-4.5 rounded-2xl bg-[#1c1c1e]/60 border border-white/[0.08] text-left">
                <div className="text-xs text-[#86868b] uppercase tracking-wider font-semibold">What We Check</div>
                <div className="text-base font-semibold text-[#f5f5f7] mt-1.5">Daily High Temperature</div>
                <div className="text-xs sm:text-[13px] text-[#86868b] mt-1 leading-normal">The hottest reading each day</div>
              </div>
              <div className="p-4.5 rounded-2xl bg-[#1c1c1e]/60 border border-white/[0.08] text-left">
                <div className="text-xs text-[#86868b] uppercase tracking-wider font-semibold">What Counts As Heatwave</div>
                <div className="text-base font-semibold text-[#f5f5f7] mt-1.5">3+ Dangerously Hot Days</div>
                <div className="text-xs sm:text-[13px] text-[#86868b] mt-1 leading-normal">Extreme heat lasting 3+ days in a row</div>
              </div>
              <div className="p-4.5 rounded-2xl bg-[#1c1c1e]/60 border border-white/[0.08] text-left">
                <div className="text-xs text-[#86868b] uppercase tracking-wider font-semibold">Years Covered</div>
                <div className="text-base font-semibold text-[#f5f5f7] mt-1.5">1940 to Present Day</div>
                <div className="text-xs sm:text-[13px] text-[#86868b] mt-1 leading-normal">Over 80 years of weather records</div>
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  const isHeatwave = data.hazard_type === 'heatwave';

  // Metrics summary computations
  let totalEventsOrDryMonths = 0;
  let maxDurationOrDeficit = 0;
  let meanVal = 0;

  if (isHeatwave) {
    const hwMetrics = data.annual_metrics as HeatwaveAnnualMetric[];
    totalEventsOrDryMonths = hwMetrics.reduce((sum, m) => sum + m.event_count, 0);
    maxDurationOrDeficit = Math.max(0, ...hwMetrics.map((m) => m.max_duration));
    const allDurations = hwMetrics.filter((m) => m.mean_duration > 0);
    meanVal =
      allDurations.length > 0
        ? Math.round(
          (allDurations.reduce((sum, m) => sum + m.mean_duration, 0) / allDurations.length) * 10
        ) / 10
        : 0;
  } else {
    const drMetrics = data.annual_metrics as DroughtAnnualMetric[];
    totalEventsOrDryMonths = drMetrics.reduce((sum, m) => sum + m.dry_month_count, 0);
    maxDurationOrDeficit = Math.round(Math.max(0, ...drMetrics.map((m) => m.total_deficit_mm)));
    const nonZeroDeficits = drMetrics.filter((m) => m.total_deficit_mm > 0);
    meanVal =
      nonZeroDeficits.length > 0
        ? Math.round(
          (nonZeroDeficits.reduce((sum, m) => sum + m.total_deficit_mm, 0) / nonZeroDeficits.length) * 10
        ) / 10
        : 0;
  }

  return (
    <div className="space-y-6">
      {/* Rate limit / Error Banner (Non-blocking) */}
      {error && (
        <RateLimitBanner
          error={error}
          cooldownSeconds={cooldownSeconds}
          onRetry={onRetry || (() => { })}
          onDismiss={onDismissError || (() => { })}
        />
      )}

      {/* Top Header Bar with Cache & Actions */}
      <div className="glass-panel rounded-3xl p-5 sm:p-6 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className={`p-3 rounded-2xl border shadow-md ${isHeatwave
              ? 'bg-[#0071e3]/15 border-[#0071e3]/30 text-[#2997ff]'
              : 'bg-[#0071e3]/15 border-[#0071e3]/30 text-[#2997ff]'
              }`}
          >
            {isHeatwave ? <Flame className="w-6 h-6" /> : <Droplets className="w-6 h-6" />}
          </div>
          <div>
            <h2 className="text-lg sm:text-xl font-semibold text-[#f5f5f7] tracking-tight capitalize">
              {locationName} — {data.hazard_type === 'heatwave' ? 'Heatwave Trends' : 'Drought Trends'}
            </h2>
            <p className="text-xs sm:text-sm text-[#86868b] mt-1 font-mono">
              Coordinates: {data.location.grid_cell.lat}°N, {data.location.grid_cell.lon}°E • Period: {data.start_date.substring(0, 4)}–{data.end_date.substring(0, 4)}
            </p>
          </div>
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopySummary}
            className="px-4 py-2 rounded-full bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.98] text-[#f5f5f7] border border-white/[0.1] text-xs sm:text-sm font-medium flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-[#30d158]" />
                <span className="text-[#30d158]">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 text-[#86868b]" />
                <span>Copy Summary</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 4 Summary Metric KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <SummaryCard
          label={isHeatwave ? 'Total Heatwaves' : 'Total Dry Months'}
          value={totalEventsOrDryMonths}
          unit={isHeatwave ? 'events' : 'months'}
          subtext={`${data.start_date.substring(0, 4)}–${data.end_date.substring(0, 4)} total`}
          icon={isHeatwave ? <Flame className="w-4 h-4" /> : <Droplets className="w-4 h-4" />}
          highlightColor={isHeatwave ? 'amber' : 'cyan'}
        />

        <SummaryCard
          label={isHeatwave ? 'Longest Heatwave' : 'Worst Rain Shortage'}
          value={maxDurationOrDeficit}
          unit={isHeatwave ? 'days' : 'mm'}
          subtext={isHeatwave ? `Average: ${meanVal} days per heatwave` : `Average: ${meanVal} mm per year`}
          icon={<Clock className="w-4 h-4" />}
          highlightColor="purple"
        />

        <SummaryCard
          label="10-Year Change"
          value={
            data.trend.slope_per_decade !== undefined
              ? `${data.trend.slope_per_decade > 0 ? '+' : ''}${data.trend.slope_per_decade}`
              : 'N/A'
          }
          unit={isHeatwave ? 'days / decade' : 'months / decade'}
          subtext={data.trend.direction ? `Pattern: ${data.trend.direction}` : 'Long-term pattern'}
          icon={
            data.trend.direction === 'decreasing' || (data.trend.slope_per_decade !== undefined && data.trend.slope_per_decade < 0) ? (
              <TrendingDown className="w-4 h-4" />
            ) : data.trend.direction === 'increasing' || (data.trend.slope_per_decade !== undefined && data.trend.slope_per_decade > 0) ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <Minus className="w-4 h-4" />
            )
          }
          highlightColor={data.trend.significant_at_005 ? 'rose' : 'emerald'}
          badge={
            data.trend.significant_at_005
              ? { text: 'Clear Trend', variant: 'negative' }
              : { text: 'Stable / Flat', variant: 'neutral' }
          }
        />

        <SummaryCard
          label={isHeatwave ? 'Heatwave Cutoff' : 'Drought Cutoff'}
          value={
            isHeatwave
              ? `${data.hazard_definition.threshold_value ?? '--'}°C`
              : 'Driest 20% of Months'
          }
          subtext="Compared to local normal"
          icon={<ThermometerSnowflake className="w-4 h-4" />}
          highlightColor="emerald"
        />
      </div>

      {/* Main View Tabs - Apple Segmented Capsule with Draggable Sliding Indicator */}
      <div className="flex items-center">
        <AppleSegmentedSwitch<'chart' | 'table' | 'methodology'>
          options={tabOptions}
          value={activeTab}
          onChange={(val) => setActiveTab(val)}
        />
      </div>

      {/* Tab 1: Trend Chart */}
      {activeTab === 'chart' && (
        <div className="space-y-5">
          <div className="glass-panel rounded-3xl p-5 sm:p-6">
            <AnnualMetricsChart
              hazardType={data.hazard_type}
              metrics={data.annual_metrics}
              monthlyMetrics={data.monthly_metrics}
              trend={data.trend}
              totalMonths={data.total_months}
              canShowYearly={data.can_show_yearly}
            />
          </div>

          {/* Statistical Insight Card */}
          <TrendInsight trend={data.trend} hazardType={data.hazard_type} />
        </div>
      )}

      {/* Tab 2: Monthly & Yearly Data Table */}
      {activeTab === 'table' && (
        <div className="glass-panel rounded-3xl p-5 sm:p-6">
          <YearlyDataTable
            hazardType={data.hazard_type}
            metrics={data.annual_metrics}
            monthlyMetrics={data.monthly_metrics}
            totalMonths={data.total_months}
            canShowYearly={data.can_show_yearly}
            locationName={locationName}
          />
        </div>
      )}

      {/* Tab 3: Methodology & Scientific Calculations */}
      {activeTab === 'methodology' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: Definition & Threshold Detection */}
          <div className="bg-[#1c1c1e]/70 border border-white/[0.08] rounded-2xl p-5 text-sm space-y-3.5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 font-semibold text-[#f5f5f7] text-base">
                <Layers className="w-5 h-5 text-[#2997ff]" />
                <span>How Extreme Events Are Counted</span>
              </div>
              <p className="text-[#d1d1d6] leading-relaxed text-sm mt-3">
                {isHeatwave ? (
                  <>
                    A <strong className="text-white">Heatwave</strong> is counted when daytime temperatures reach or exceed the danger cutoff of <strong className="text-[#ff453a]">{data.hazard_definition.threshold_value ?? '--'}°C</strong> for <strong className="text-white">3 or more consecutive days</strong>.
                  </>
                ) : (
                  <>
                    A month is counted as a <strong className="text-white">Drought (Dry Month)</strong> when total rainfall drops into the <strong className="text-[#2997ff]">driest 20%</strong> of historical records for this location. We compare against 80+ years of weather records to detect real shortages.
                  </>
                )}
              </p>
            </div>
            <div className="pt-3 border-t border-white/[0.08] flex flex-col gap-2.5 text-sm text-[#a1a1a6]">
              <div className="flex justify-between items-center">
                <span>Hazard Type:</span>
                <span className="text-[#f5f5f7] font-medium capitalize">
                  {isHeatwave ? 'Heatwave (Extreme Heat)' : 'Drought (Rainfall Shortfall)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>What We Measure:</span>
                <span className="text-[#f5f5f7] font-medium">
                  {isHeatwave ? 'Daily High Temperature (°C)' : 'Total Monthly Rainfall (mm)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Danger Cutoff Trigger:</span>
                <span className="text-[#2997ff] font-bold">
                  {isHeatwave
                    ? `≥ ${data.hazard_definition.threshold_value ?? '--'}°C for 3+ straight days`
                    : 'Bottom 20% driest rainfall months'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 2: Trend Calculation (OLS Regression) */}
          <div className="bg-[#1c1c1e]/70 border border-white/[0.08] rounded-2xl p-5 text-sm space-y-3.5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 font-semibold text-[#f5f5f7] text-base">
                <TrendingUp className="w-5 h-5 text-[#30d158]" />
                <span>Long-Term Trend & Scientific Certainty</span>
              </div>
              <p className="text-[#d1d1d6] leading-relaxed text-sm mt-3">
                We test whether extremes are steadily rising over the decades or simply fluctuating within normal natural cycles. A shift is only marked as a proven trend if it passes rigorous scientific validation with 95% statistical certainty.
              </p>
            </div>
            <div className="pt-3 border-t border-white/[0.08] flex flex-col gap-2.5 text-sm text-[#a1a1a6]">
              <div className="flex justify-between items-center">
                <span>10-Year Decadal Rate:</span>
                <span className={data.trend.slope_per_decade && data.trend.slope_per_decade > 0 ? 'text-[#ff453a] font-bold' : 'text-[#30d158] font-bold'}>
                  {data.trend.slope_per_decade != null ? `${data.trend.slope_per_decade > 0 ? '+' : ''}${data.trend.slope_per_decade}` : '--'} {isHeatwave ? 'days / decade' : 'months / decade'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Scientific Confidence:</span>
                <span className="text-[#f5f5f7] font-medium">
                  {data.trend.significant_at_005
                    ? '95% Certainty (Proven Shift)'
                    : 'Within Natural Variability (No Proven Shift)'}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Statistical Result:</span>
                <span className={data.trend.significant_at_005 ? 'text-[#ff9f0a] font-semibold' : 'text-[#86868b] font-medium'}>
                  {data.trend.significant_at_005
                    ? 'Statistically Validated Trend'
                    : 'Normal Year-to-Year Weather Variations'}
                </span>
              </div>
            </div>
          </div>

          {/* Card 3: Climatological Baseline Normal */}
          <div className="bg-[#1c1c1e]/70 border border-white/[0.08] rounded-2xl p-5 text-sm space-y-3.5 shadow-lg flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2.5 font-semibold text-[#f5f5f7] text-base">
                <ThermometerSnowflake className="w-5 h-5 text-[#bf5af2]" />
                <span>Local Climate Baseline Reference</span>
              </div>
              <p className="text-[#d1d1d6] leading-relaxed text-sm mt-3">
                What feels unusually hot or dry in one region can be ordinary in another. To ensure accurate results, weather anomalies are measured against official World Meteorological Organization (WMO) 30-year climate normal standards specifically for this location.
              </p>
            </div>
            <div className="pt-3 border-t border-white/[0.08] flex flex-col gap-2.5 text-sm text-[#a1a1a6]">
              <div className="flex justify-between items-center">
                <span>Standard Baseline Period:</span>
                <span className="text-[#2997ff] font-semibold">{data.hazard_definition.baseline_period || '1991 – 2020 (WMO Normal)'}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Local Area Coverage:</span>
                <span className="text-[#f5f5f7] font-medium">~27 km High-Resolution Weather Cell</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Timeline Analyzed:</span>
                <span className="text-[#f5f5f7] font-medium">{data.start_date.substring(0, 7)} to {data.end_date.substring(0, 7)} ({data.total_months} months)</span>
              </div>
            </div>
          </div>

          {/* Card 4: Quality & Integrity Verification */}
          <DataQualityBadge quality={data.data_quality} />
        </div>
      )}
    </div>
  );
};

