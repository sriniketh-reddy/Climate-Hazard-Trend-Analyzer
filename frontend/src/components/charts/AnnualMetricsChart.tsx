import React, { useState, useMemo, useRef } from 'react';
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
  Cell,
} from 'recharts';
import { LineChart, BarChart2, Calendar, Eye, EyeOff, ArrowRightLeft } from 'lucide-react';
import { AppleSegmentedSwitch, type AppleSegmentedOption } from '../AppleSegmentedSwitch';
import type {
  HeatwaveAnnualMetric,
  DroughtAnnualMetric,
  HeatwaveMonthMetric,
  DroughtMonthMetric,
  TrendInfo,
} from '../../types/analysis';

interface AnnualMetricsChartProps {
  hazardType: 'heatwave' | 'drought';
  metrics: (HeatwaveAnnualMetric | DroughtAnnualMetric)[];
  monthlyMetrics?: (HeatwaveMonthMetric | DroughtMonthMetric)[];
  trend: TrendInfo;
  totalMonths?: number;
  canShowYearly?: boolean;
}

export const AnnualMetricsChart: React.FC<AnnualMetricsChartProps> = ({
  hazardType,
  metrics,
  monthlyMetrics = [],
  trend,
  totalMonths = 0,
  canShowYearly = false,
}) => {
  // Monthly view is shown by default for all analyses
  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [showTrendLine, setShowTrendLine] = useState(true);

  const effectiveMonths = totalMonths || monthlyMetrics.length;
  const isYearlyAllowed = canShowYearly || effectiveMonths >= 48;

  const viewOptions = useMemo<AppleSegmentedOption<'monthly' | 'yearly'>[]>(
    () => [
      {
        value: 'monthly',
        width: 116,
        label: 'Monthly',
        icon: <Calendar className="w-4 h-4 shrink-0" />,
      },
      {
        value: 'yearly',
        width: 116,
        label: 'Yearly',
        icon: <BarChart2 className="w-4 h-4 shrink-0" />,
        disabled: !isYearlyAllowed,
        tooltip: !isYearlyAllowed ? 'For this we need at least 48 months to show this analytics' : undefined,
      },
    ],
    [isYearlyAllowed]
  );

  // ─────────────────────────────────────────────────────────────────────────────
  // Yearly Data Preparation
  // ─────────────────────────────────────────────────────────────────────────────
  const years = metrics.map((m) => m.year);
  const annualSlope = (trend.slope_per_decade || 0) / 10;
  const valuesToAverage = metrics.map((m) =>
    hazardType === 'heatwave'
      ? (m as HeatwaveAnnualMetric).total_heatwave_days
      : (m as DroughtAnnualMetric).dry_month_count
  );
  const meanVal = valuesToAverage.length ? valuesToAverage.reduce((a, b) => a + b, 0) / valuesToAverage.length : 0;
  const meanYear = years.length ? years.reduce((a, b) => a + b, 0) / years.length : 0;

  const yearlyChartData = metrics.map((m) => {
    const trendVal = meanVal + annualSlope * (m.year - meanYear);
    if (hazardType === 'heatwave') {
      const hw = m as HeatwaveAnnualMetric;
      return {
        year: hw.year,
        eventCount: hw.event_count,
        totalDays: hw.total_heatwave_days,
        maxDuration: hw.max_duration,
        meanDuration: hw.mean_duration,
        trendLine: Math.max(0, Math.round(trendVal * 10) / 10),
      };
    } else {
      const dr = m as DroughtAnnualMetric;
      return {
        year: dr.year,
        dryMonths: dr.dry_month_count,
        deficitMm: Math.round(dr.total_deficit_mm * 10) / 10,
        annualPrecip: Math.round(dr.annual_precip_mm * 10) / 10,
        driestMonth: dr.driest_month,
        trendLine: Math.max(0, Math.round(trendVal * 10) / 10),
      };
    }
  });

  // ─────────────────────────────────────────────────────────────────────────────
  // Monthly Data Preparation
  // ─────────────────────────────────────────────────────────────────────────────
  const monthlyChartData = monthlyMetrics.map((m) => {
    if (hazardType === 'heatwave') {
      const hw = m as HeatwaveMonthMetric;
      return {
        label: hw.month_label,
        year: hw.year,
        month: hw.month,
        heatwaveDays: hw.heatwave_days,
        eventCount: hw.event_count,
        peakTemp: hw.peak_temperature,
        meanTemp: hw.mean_temperature,
        threshold: hw.threshold_celsius,
      };
    } else {
      const dr = m as DroughtMonthMetric;
      return {
        label: dr.month_label,
        year: dr.year,
        month: dr.month,
        totalPrecip: dr.total_precip_mm,
        isDry: dr.is_dry,
        deficitMm: dr.deficit_mm,
        thresholdMm: dr.threshold_mm,
        medianMm: dr.median_mm,
      };
    }
  });

  // Calculate dynamic width for horizontally scrollable monthly graph
  // Min 56px per month bar so angled labels and bars never overlap
  const minBarWidth = 56;
  const computedMonthlyWidth = Math.max(760, monthlyChartData.length * minBarWidth);

  // Exact domains to synchronize the fixed left/right Y-axes with the scrollable chart
  const leftDomain = useMemo<[number, number]>(() => {
    if (hazardType === 'heatwave') {
      const maxVal = Math.max(5, ...monthlyChartData.map((d: any) => d.heatwaveDays || 0));
      return [0, Math.ceil(maxVal * 1.25)];
    } else {
      const maxVal = Math.max(
        50,
        ...monthlyChartData.map((d: any) => Math.max(d.totalPrecip || 0, d.thresholdMm || 0))
      );
      return [0, Math.ceil(maxVal * 1.15)];
    }
  }, [hazardType, monthlyChartData]);

  const rightDomain = useMemo<[number, number]>(() => {
    if (hazardType === 'heatwave') {
      const temps = monthlyChartData
        .flatMap((d: any) => [d.peakTemp, d.meanTemp])
        .filter((v: any) => typeof v === 'number' && !isNaN(v));
      const minVal = temps.length > 0 ? Math.floor(Math.min(...temps) - 2) : 15;
      const maxVal = temps.length > 0 ? Math.ceil(Math.max(...temps) + 2) : 45;
      return [Math.max(0, minVal), maxVal];
    } else {
      const maxVal = Math.max(20, ...monthlyChartData.map((d: any) => d.deficitMm || 0));
      return [0, Math.ceil(maxVal * 1.2)];
    }
  }, [hazardType, monthlyChartData]);

  const scrollContainerRef = useRef<HTMLDivElement>(null);

  const handleHorizontalWheel = (e: React.WheelEvent<HTMLDivElement>) => {
    // Only scroll graph horizontally when Shift + Scroll is used; normal scroll should not react
    if (e.shiftKey && scrollContainerRef.current) {
      if (Math.abs(e.deltaY) > 0 && Math.abs(e.deltaX) === 0) {
        scrollContainerRef.current.scrollLeft += e.deltaY;
      }
    }
  };

  // If no metrics at all
  if ((!metrics || metrics.length === 0) && (!monthlyMetrics || monthlyMetrics.length === 0)) {
    return (
      <div className="h-72 flex items-center justify-center text-[#86868b] font-mono text-xs">
        No metrics to display for the selected range.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Chart Toolbar with Glassy Pill View Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
        {/* Title Indicator */}
        <div className="flex items-center gap-2 text-[#f5f5f7] font-semibold text-sm sm:text-base">
          {viewMode === 'monthly' ? (
            <>
              <Calendar className="w-4.5 h-4.5 text-[#2997ff]" />
              <span>
                {hazardType === 'heatwave'
                  ? 'Monthly Peak Temperatures & Heatwave Spells'
                  : 'Monthly Rainfall vs 20th Percentile Drought Threshold'}
              </span>
            </>
          ) : (
            <>
              <BarChart2 className="w-4.5 h-4.5 text-[#2997ff]" />
              <span>
                {hazardType === 'heatwave'
                  ? 'Heatwaves and Hot Days per Year'
                  : 'Dry Months and Rain Shortfall per Year'}
              </span>
            </>
          )}
        </div>

        {/* Right Section: View Switcher & Trend Toggle */}
        <div className="flex items-center gap-2.5">
          <AppleSegmentedSwitch<'monthly' | 'yearly'>
            options={viewOptions}
            value={viewMode}
            onChange={(val) => setViewMode(val)}
          />

          {/* Yearly Trendline toggle (only in yearly view) */}
          {viewMode === 'yearly' && trend.method !== 'insufficient_data' && (
            <button
              type="button"
              onClick={() => setShowTrendLine(!showTrendLine)}
              className={`px-3.5 py-2 rounded-full text-sm font-medium border transition-all flex items-center gap-2 cursor-pointer ${
                showTrendLine
                  ? 'bg-[#0071e3]/15 text-[#2997ff] border-[#0071e3]/30 shadow-[0_2px_8px_rgba(0,113,227,0.2)]'
                  : 'bg-[#2c2c2e]/70 text-[#86868b] border-white/[0.08] hover:text-[#f5f5f7]'
              }`}
            >
              <LineChart className="w-4 h-4" />
              <span>Trendline</span>
              {showTrendLine ? (
                <Eye className="w-3.5 h-3.5 opacity-90" />
              ) : (
                <EyeOff className="w-3.5 h-3.5 text-[#6e6e73]" />
              )}
            </button>
          )}
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 1. Monthly Graph (Horizontally Scrollable between Fixed Y-Axis Lines) */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {viewMode === 'monthly' && (
        <div className="w-full bg-[#0d0d0f]/80 rounded-2xl p-4 border border-white/[0.08] shadow-inner space-y-3">
          {/* Subtle scroll indicator prompt & Stationary Legend */}
          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-[#86868b] px-1 pb-1 border-b border-white/[0.06]">
            <span className="flex items-center gap-1.5 text-[#2997ff] font-mono">
              <ArrowRightLeft className="w-3.5 h-3.5 shrink-0" />
              Shift + Scroll or drag timeline ({monthlyChartData.length} months)
            </span>
            <div className="flex items-center gap-4 flex-wrap text-xs font-sans">
              {hazardType === 'heatwave' ? (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#ff9f0a]" />
                    <span className="text-[#f5f5f7]">Heatwave Days</span>
                    <span className="text-[#86868b] font-mono text-[10px]">(Left Axis)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-[#ff453a] rounded" />
                    <span className="text-[#f5f5f7]">Peak Temp (°C)</span>
                    <span className="text-[#86868b] font-mono text-[10px]">(Right Axis)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 border-t border-dashed border-[#ffd60a]" />
                    <span className="text-[#f5f5f7]">Average Temp (°C)</span>
                    <span className="text-[#86868b] font-mono text-[10px]">(Right Axis)</span>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#0071e3]" />
                    <span className="text-[#f5f5f7]">Rainfall (mm)</span>
                    <span className="text-[#86868b] font-mono text-[10px]">(Left Axis)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-sm bg-[#ff453a]" />
                    <span className="text-[#ff453a]">Dry Month (Shortfall)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-0.5 border-t border-dashed border-[#ff9f0a]" />
                    <span className="text-[#f5f5f7]">20th Pct Cutoff</span>
                    <span className="text-[#86868b] font-mono text-[10px]">(Left Axis)</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-1 bg-[#ffd60a] rounded" />
                    <span className="text-[#f5f5f7]">Rain Deficit (mm)</span>
                    <span className="text-[#86868b] font-mono text-[10px]">(Right Axis)</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Axis headers aligned directly above the pinned columns */}
          <div className="flex items-center justify-between text-[11px] font-mono text-[#86868b] px-0.5 select-none">
            <span className="w-[58px] text-center uppercase tracking-wider text-[#a1a1a6] font-semibold">
              {hazardType === 'heatwave' ? 'Days' : 'Rain (mm)'}
            </span>
            <span className="text-[11px] text-[#6e6e73] font-sans">
              ← Shift + Scroll or drag timeline between pinned axes →
            </span>
            <span className="w-[58px] text-center uppercase tracking-wider text-[#a1a1a6] font-semibold">
              {hazardType === 'heatwave' ? 'Temp (°C)' : 'Deficit'}
            </span>
          </div>

          {/* Chart Wrapper: Fixed Left Axis + Scrollable Middle Area + Fixed Right Axis */}
          <div className="relative flex items-stretch border border-white/[0.12] rounded-xl overflow-hidden bg-[#08080a] h-[370px]">
            {/* 1. Stationary Left Y-Axis with Fixed Dividing Line */}
            <div className="relative shrink-0 w-[58px] bg-[#0d0d0f] border-r-2 border-white/20 z-20 select-none shadow-[4px_0_15px_rgba(0,0,0,0.6)]">
              <ComposedChart
                width={58}
                height={370}
                data={monthlyChartData}
                margin={{ top: 20, right: 2, bottom: 10, left: 2 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                <XAxis
                  dataKey="label"
                  height={60}
                  tick={false}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.25)', strokeWidth: 1 }}
                />
                <YAxis
                  domain={leftDomain}
                  stroke="#a1a1a6"
                  tick={{ fill: '#a1a1a6', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.3)', strokeWidth: 1 }}
                  width={50}
                />
                <Line
                  type="monotone"
                  dataKey={hazardType === 'heatwave' ? 'heatwaveDays' : 'totalPrecip'}
                  stroke="transparent"
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </div>

            {/* 2. Horizontally Scrollable Timeline (Scrolls strictly between the lines) */}
            <div
              ref={scrollContainerRef}
              onWheel={handleHorizontalWheel}
              className="flex-1 min-w-0 overflow-x-auto overflow-y-hidden pb-2.5 custom-apple-scrollbar relative"
            >
              <div style={{ width: `${computedMonthlyWidth}px`, height: '370px' }}>
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart
                    data={monthlyChartData}
                    margin={{ top: 20, right: 10, bottom: 10, left: 10 }}
                  >
                    <defs>
                      <linearGradient id="monthPrecipNormal" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#2997ff" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#0071e3" stopOpacity={0.65} />
                      </linearGradient>
                      <linearGradient id="monthPrecipDry" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff453a" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#c9342b" stopOpacity={0.65} />
                      </linearGradient>
                      <linearGradient id="monthHwBar" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#ff9f0a" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="#d97706" stopOpacity={0.65} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="rgba(255, 255, 255, 0.08)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="label"
                      stroke="#86868b"
                      tick={{ fill: '#86868b', fontSize: 11, fontFamily: 'monospace' }}
                      tickLine={false}
                      interval={0}
                      angle={-45}
                      textAnchor="end"
                      height={60}
                      dx={-4}
                      dy={4}
                      axisLine={{ stroke: 'rgba(255, 255, 255, 0.25)', strokeWidth: 1 }}
                      tickFormatter={(val: string) => {
                        if (!val) return '';
                        const parts = val.split(' ');
                        if (parts.length === 2 && parts[1].length === 4) {
                          return `${parts[0]} '${parts[1].slice(2)}`;
                        }
                        return val;
                      }}
                    />
                    {/* Synchronized hidden axes */}
                    <YAxis yAxisId="left" domain={leftDomain} hide />
                    <YAxis yAxisId="right" orientation="right" domain={rightDomain} hide />

                    <Tooltip
                      cursor={false}
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="apple-glass-popover p-3.5 rounded-2xl text-xs sm:text-sm space-y-2 font-mono shadow-2xl border border-white/15">
                              <div className="font-semibold text-[#f5f5f7] text-sm sm:text-base border-b border-white/[0.08] pb-1 font-sans">
                                {label}
                              </div>
                              {payload.map((entry, index) => (
                                <div
                                  key={`m-item-${index}`}
                                  className="flex items-center justify-between gap-5"
                                >
                                  <span
                                    style={{ color: entry.color }}
                                    className="flex items-center gap-1.5 font-sans text-xs sm:text-sm"
                                  >
                                    <span
                                      className="w-2.5 h-2.5 rounded-full"
                                      style={{ backgroundColor: entry.color }}
                                    ></span>
                                    {entry.name}:
                                  </span>
                                  <span className="font-bold text-white font-mono">
                                    {entry.value}
                                  </span>
                                </div>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />

                    {hazardType === 'heatwave' ? (
                      <>
                        <Bar
                          yAxisId="left"
                          dataKey="heatwaveDays"
                          name="Heatwave Days"
                          fill="url(#monthHwBar)"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={22}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="peakTemp"
                          name="Peak Temp (°C)"
                          stroke="#ff453a"
                          strokeWidth={2.4}
                          dot={{ r: 2.5, fill: '#ff453a' }}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="meanTemp"
                          name="Average Temp (°C)"
                          stroke="#ffd60a"
                          strokeWidth={1.8}
                          strokeDasharray="3 3"
                          dot={false}
                        />
                      </>
                    ) : (
                      <>
                        <Bar
                          yAxisId="left"
                          dataKey="totalPrecip"
                          name="Rainfall (mm)"
                          radius={[5, 5, 0, 0]}
                          maxBarSize={22}
                        >
                          {monthlyChartData.map((entry: any, index) => (
                            <Cell
                              key={`cell-${index}`}
                              fill={entry.isDry ? 'url(#monthPrecipDry)' : 'url(#monthPrecipNormal)'}
                            />
                          ))}
                        </Bar>
                        <Line
                          yAxisId="left"
                          type="monotone"
                          dataKey="thresholdMm"
                          name="20th Pct Cutoff (mm)"
                          stroke="#ff9f0a"
                          strokeWidth={2}
                          strokeDasharray="4 4"
                          dot={false}
                        />
                        <Line
                          yAxisId="right"
                          type="monotone"
                          dataKey="deficitMm"
                          name="Rain Deficit (mm)"
                          stroke="#ffd60a"
                          strokeWidth={2}
                          dot={{ r: 2, fill: '#ffd60a' }}
                        />
                      </>
                    )}
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* 3. Stationary Right Y-Axis with Fixed Dividing Line */}
            <div className="relative shrink-0 w-[58px] bg-[#0d0d0f] border-l-2 border-white/20 z-20 select-none shadow-[-4px_0_15px_rgba(0,0,0,0.6)]">
              <ComposedChart
                width={58}
                height={370}
                data={monthlyChartData}
                margin={{ top: 20, right: 4, bottom: 10, left: 2 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.08)" vertical={false} />
                <XAxis
                  dataKey="label"
                  height={60}
                  tick={false}
                  tickLine={false}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.25)', strokeWidth: 1 }}
                />
                <YAxis
                  orientation="right"
                  domain={rightDomain}
                  stroke="#a1a1a6"
                  tick={{ fill: '#a1a1a6', fontSize: 11, fontFamily: 'monospace' }}
                  tickLine={{ stroke: 'rgba(255, 255, 255, 0.3)' }}
                  axisLine={{ stroke: 'rgba(255, 255, 255, 0.3)', strokeWidth: 1 }}
                  width={50}
                />
                <Line
                  type="monotone"
                  dataKey={hazardType === 'heatwave' ? 'peakTemp' : 'deficitMm'}
                  stroke="transparent"
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 2. Yearly Graph (Multi-Year View with OLS Trendlines) */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {viewMode === 'yearly' && (
        <div className="h-80 w-full bg-[#0d0d0f]/80 rounded-2xl p-3 border border-white/[0.08] shadow-inner">
          <ResponsiveContainer width="100%" height="100%">
            <ComposedChart data={yearlyChartData} margin={{ top: 12, right: 12, bottom: 4, left: -10 }}>
              <defs>
                <linearGradient id="heatwaveBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#0071e3" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#2997ff" stopOpacity={0.65} />
                </linearGradient>
                <linearGradient id="droughtBarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#2997ff" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="#0071e3" stopOpacity={0.65} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.05)" vertical={false} />
              <XAxis
                dataKey="year"
                stroke="#86868b"
                tick={{ fill: '#86868b', fontSize: 12, fontFamily: 'monospace' }}
                tickLine={false}
              />
              <YAxis
                yAxisId="left"
                stroke="#86868b"
                tick={{ fill: '#86868b', fontSize: 12 }}
                tickLine={false}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="#86868b"
                tick={{ fill: '#86868b', fontSize: 12 }}
                tickLine={false}
              />
              <Tooltip
                cursor={false}
                content={({ active, payload, label }) => {
                  if (active && payload && payload.length) {
                    return (
                      <div className="apple-glass-popover p-3.5 rounded-2xl text-xs sm:text-sm space-y-2 font-mono shadow-2xl border border-white/15">
                        <div className="font-semibold text-[#f5f5f7] text-sm sm:text-base border-b border-white/[0.08] pb-1 font-sans">
                          Year {label}
                        </div>
                        {payload.map((entry, index) => (
                          <div key={`y-item-${index}`} className="flex items-center justify-between gap-5">
                            <span style={{ color: entry.color }} className="flex items-center gap-1.5 font-sans text-xs sm:text-sm">
                              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.color }}></span>
                              {entry.name}:
                            </span>
                            <span className="font-bold text-white font-mono">
                              {entry.value}
                            </span>
                          </div>
                        ))}
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <Legend
                verticalAlign="top"
                height={34}
                formatter={(value) => (
                  <span className="text-xs sm:text-sm text-[#86868b] font-medium">{value}</span>
                )}
              />

              {hazardType === 'heatwave' ? (
                <>
                  <Bar
                    yAxisId="left"
                    dataKey="eventCount"
                    name="Heatwaves"
                    fill="url(#heatwaveBarGrad)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="totalDays"
                    name="Hot Days Total"
                    stroke="#ffd60a"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: '#ffd60a' }}
                  />
                  {showTrendLine && trend.method !== 'insufficient_data' && (
                    <Line
                      yAxisId="right"
                      type="linear"
                      dataKey="trendLine"
                      name="10-Year Trend (Days)"
                      stroke="#ff453a"
                      strokeWidth={2.2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  )}
                </>
              ) : (
                <>
                  <Bar
                    yAxisId="left"
                    dataKey="dryMonths"
                    name="Very Dry Months"
                    fill="url(#droughtBarGrad)"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={28}
                  />
                  <Line
                    yAxisId="right"
                    type="monotone"
                    dataKey="deficitMm"
                    name="Rain Shortfall (mm)"
                    stroke="#2997ff"
                    strokeWidth={2.5}
                    dot={{ r: 2.5, fill: '#2997ff' }}
                  />
                  {showTrendLine && trend.method !== 'insufficient_data' && (
                    <Line
                      yAxisId="left"
                      type="linear"
                      dataKey="trendLine"
                      name="10-Year Trend (Months)"
                      stroke="#bf5af2"
                      strokeWidth={2.2}
                      strokeDasharray="4 4"
                      dot={false}
                    />
                  )}
                </>
              )}
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
};
