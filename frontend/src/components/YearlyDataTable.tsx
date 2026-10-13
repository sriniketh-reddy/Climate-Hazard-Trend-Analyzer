import React, { useState, useMemo } from 'react';
import { ArrowUpDown, Search, Calendar, BarChart2, FileSpreadsheet } from 'lucide-react';
import { AppleSegmentedSwitch, type AppleSegmentedOption } from './AppleSegmentedSwitch';
import type {
  HeatwaveAnnualMetric,
  DroughtAnnualMetric,
  HeatwaveMonthMetric,
  DroughtMonthMetric,
} from '../types/analysis';

interface YearlyDataTableProps {
  hazardType: 'heatwave' | 'drought';
  metrics: (HeatwaveAnnualMetric | DroughtAnnualMetric)[];
  monthlyMetrics?: (HeatwaveMonthMetric | DroughtMonthMetric)[];
  totalMonths?: number;
  canShowYearly?: boolean;
  locationName: string;
}

export const YearlyDataTable: React.FC<YearlyDataTableProps> = ({
  hazardType,
  metrics = [],
  monthlyMetrics = [],
  totalMonths = 0,
  canShowYearly = false,
  locationName,
}) => {
  const isHeatwave = hazardType === 'heatwave';
  const effectiveMonths = totalMonths || monthlyMetrics.length;
  const isYearlyAllowed = canShowYearly || effectiveMonths >= 48;

  const [viewMode, setViewMode] = useState<'monthly' | 'yearly'>('monthly');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortField, setSortField] = useState<string>('date');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

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

  const handleViewModeChange = (newMode: 'monthly' | 'yearly') => {
    setViewMode(newMode);
    setSortField('date');
  };

  // ─────────────────────────────────────────────────────────────────────────────
  // Monthly Data Processing
  // ─────────────────────────────────────────────────────────────────────────────
  const sortedMonthlyData = useMemo(() => {
    let list = [...monthlyMetrics];
    if (searchTerm.trim()) {
      const q = searchTerm.trim().toLowerCase();
      list = list.filter((m) =>
        m.month_label.toLowerCase().includes(q) || m.year.toString().includes(q)
      );
    }

    list.sort((a, b) => {
      let valA: number = a.year * 12 + a.month;
      let valB: number = b.year * 12 + b.month;

      if (sortField === 'primary') {
        valA = isHeatwave
          ? ((a as HeatwaveMonthMetric).heatwave_days ?? 0)
          : ((a as DroughtMonthMetric).total_precip_mm ?? 0);
        valB = isHeatwave
          ? ((b as HeatwaveMonthMetric).heatwave_days ?? 0)
          : ((b as DroughtMonthMetric).total_precip_mm ?? 0);
      } else if (sortField === 'secondary') {
        valA = isHeatwave
          ? ((a as HeatwaveMonthMetric).peak_temperature ?? 0)
          : ((a as DroughtMonthMetric).deficit_mm ?? 0);
        valB = isHeatwave
          ? ((b as HeatwaveMonthMetric).peak_temperature ?? 0)
          : ((b as DroughtMonthMetric).deficit_mm ?? 0);
      } else if (sortField === 'tertiary') {
        valA = isHeatwave
          ? ((a as HeatwaveMonthMetric).mean_temperature ?? 0)
          : ((a as DroughtMonthMetric).threshold_mm ?? 0);
        valB = isHeatwave
          ? ((b as HeatwaveMonthMetric).mean_temperature ?? 0)
          : ((b as DroughtMonthMetric).threshold_mm ?? 0);
      }

      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [monthlyMetrics, searchTerm, sortField, sortAsc, isHeatwave]);

  // ─────────────────────────────────────────────────────────────────────────────
  // Yearly Data Processing
  // ─────────────────────────────────────────────────────────────────────────────
  const sortedYearlyData = useMemo(() => {
    let list = [...metrics];
    if (searchTerm.trim()) {
      const q = searchTerm.trim();
      list = list.filter((m) => m.year.toString().includes(q));
    }

    list.sort((a, b) => {
      let valA: number = a.year;
      let valB: number = b.year;

      if (sortField === 'primary') {
        valA = isHeatwave
          ? (a as HeatwaveAnnualMetric).event_count
          : (a as DroughtAnnualMetric).dry_month_count;
        valB = isHeatwave
          ? (b as HeatwaveAnnualMetric).event_count
          : (b as DroughtAnnualMetric).dry_month_count;
      } else if (sortField === 'secondary') {
        valA = isHeatwave
          ? (a as HeatwaveAnnualMetric).total_heatwave_days
          : (a as DroughtAnnualMetric).total_deficit_mm;
        valB = isHeatwave
          ? (b as HeatwaveAnnualMetric).total_heatwave_days
          : (b as DroughtAnnualMetric).total_deficit_mm;
      }

      return sortAsc ? valA - valB : valB - valA;
    });

    return list;
  }, [metrics, searchTerm, sortField, sortAsc, isHeatwave]);

  // ─────────────────────────────────────────────────────────────────────────────
  // CSV Export Handler
  // ─────────────────────────────────────────────────────────────────────────────
  const handleDownloadCSV = () => {
    let csvContent = '';
    const safeLoc = locationName.replace(/\s+/g, '_').toLowerCase();

    if (viewMode === 'monthly') {
      if (isHeatwave) {
        csvContent = 'Month,Year,Heatwave Days,Event Count,Peak Temp (C),Average Temp (C),Threshold (C)\n';
        monthlyMetrics.forEach((m) => {
          const hw = m as HeatwaveMonthMetric;
          csvContent += `"${hw.month_label}",${hw.year},${hw.heatwave_days},${hw.event_count},${hw.peak_temperature},${hw.mean_temperature},${hw.threshold_celsius}\n`;
        });
      } else {
        csvContent = 'Month,Year,Rainfall (mm),Is Dry Month,Rain Deficit (mm),20th Pct Cutoff (mm)\n';
        monthlyMetrics.forEach((m) => {
          const dr = m as DroughtMonthMetric;
          csvContent += `"${dr.month_label}",${dr.year},${dr.total_precip_mm},${dr.is_dry ? 'Yes' : 'No'},${dr.deficit_mm},${dr.threshold_mm}\n`;
        });
      }
    } else {
      if (isHeatwave) {
        csvContent = 'Year,Event Count,Total Heatwave Days,Max Duration (days),Mean Duration (days)\n';
        metrics.forEach((m) => {
          const hw = m as HeatwaveAnnualMetric;
          csvContent += `${hw.year},${hw.event_count},${hw.total_heatwave_days},${hw.max_duration},${hw.mean_duration}\n`;
        });
      } else {
        csvContent = 'Year,Dry Month Count,Total Deficit (mm),Annual Precip (mm),Driest Month\n';
        metrics.forEach((m) => {
          const dr = m as DroughtAnnualMetric;
          csvContent += `${dr.year},${dr.dry_month_count},${dr.total_deficit_mm},${dr.annual_precip_mm},${dr.driest_month || 'N/A'}\n`;
        });
      }
    }

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `${hazardType}_${viewMode}_${safeLoc}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const toggleSort = (field: string) => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Table Toolbar: Glassy View Switcher + Search + CSV Export */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        {/* Left: View Switcher (Monthly vs Yearly) */}
        <div className="flex items-center gap-3">
          <AppleSegmentedSwitch
            options={viewOptions}
            value={viewMode}
            onChange={handleViewModeChange}
          />

          <span className="text-xs sm:text-sm text-[#86868b] font-mono hidden md:inline">
            {viewMode === 'monthly' ? `${sortedMonthlyData.length} months` : `${sortedYearlyData.length} years`}
          </span>
        </div>

        {/* Right: Search & Export */}
        <div className="flex items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-[#86868b] absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={viewMode === 'monthly' ? 'Filter month/year...' : 'Filter year...'}
              className="bg-[#1c1c1e]/80 border border-white/[0.08] rounded-full pl-9 pr-3.5 py-2 text-sm text-[#f5f5f7] placeholder:text-[#6e6e73] focus:outline-none focus:border-[#0071e3] font-mono w-44 sm:w-52 transition-colors"
            />
          </div>

          <button
            type="button"
            onClick={handleDownloadCSV}
            className="px-4 py-2 rounded-full text-xs sm:text-sm font-medium bg-white/[0.08] hover:bg-white/[0.14] active:scale-[0.98] text-[#f5f5f7] border border-white/[0.1] flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-[#30d158]" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 1. Monthly Table View */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {viewMode === 'monthly' && (
        <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0d0d0f]/80 max-h-96 overflow-y-auto custom-apple-scrollbar">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-[#1c1c1e]/95 text-[#86868b] font-mono uppercase text-xs sticky top-0 border-b border-white/[0.08] z-10 backdrop-blur-xl">
              <tr>
                <th
                  onClick={() => toggleSort('date')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Month</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('primary')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{isHeatwave ? 'Heatwave Days' : 'Rainfall (mm)'}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('secondary')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{isHeatwave ? 'Peak Temp (°C)' : 'Deficit (mm)'}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('tertiary')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{isHeatwave ? 'Average Temp (°C)' : '20th Pct Cutoff (mm)'}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-4">
                  {isHeatwave ? 'Threshold (°C)' : 'Status'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-mono text-[#f5f5f7]">
              {sortedMonthlyData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#86868b] text-xs">
                    No monthly records match your search filter.
                  </td>
                </tr>
              ) : (
                sortedMonthlyData.map((row, idx) => {
                  if (isHeatwave) {
                    const hw = row as HeatwaveMonthMetric;
                    const hasDays = hw.heatwave_days > 0;
                    return (
                      <tr
                        key={`m-hw-${idx}`}
                        className={`hover:bg-white/[0.04] transition-colors ${
                          hasDays ? 'bg-[#ff9f0a]/[0.06]' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-semibold text-white flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#6e6e73]" />
                          {hw.month_label}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              hasDays
                                ? 'bg-[#ff9f0a]/15 text-[#ff9f0a] border border-[#ff9f0a]/30'
                                : 'text-[#6e6e73]'
                            }`}
                          >
                            {hw.heatwave_days} d
                          </span>
                        </td>
                        <td className="py-2.5 px-4 font-semibold text-[#ff453a]">
                          {hw.peak_temperature != null ? `${hw.peak_temperature.toFixed(1)}°C` : '--'}
                        </td>
                        <td className="py-2.5 px-4 text-[#ffd60a]">
                          {hw.mean_temperature != null ? `${hw.mean_temperature.toFixed(2)}°C` : '--'}
                        </td>
                        <td className="py-2.5 px-4 text-[#86868b]">
                          {hw.threshold_celsius != null ? `${hw.threshold_celsius.toFixed(1)}°C` : '--'}
                        </td>
                      </tr>
                    );
                  } else {
                    const dr = row as DroughtMonthMetric;
                    return (
                      <tr
                        key={`m-dr-${idx}`}
                        className={`hover:bg-white/[0.04] transition-colors ${
                          dr.is_dry ? 'bg-[#ff453a]/[0.06]' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-semibold text-white flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#6e6e73]" />
                          {dr.month_label}
                        </td>
                        <td className="py-2.5 px-4 text-[#2997ff] font-semibold">
                          {dr.total_precip_mm.toFixed(1)} mm
                        </td>
                        <td className="py-2.5 px-4 text-[#ffd60a]">
                          {dr.deficit_mm > 0 ? `${dr.deficit_mm.toFixed(1)} mm` : '0 mm'}
                        </td>
                        <td className="py-2.5 px-4 text-[#86868b]">
                          {dr.threshold_mm.toFixed(1)} mm
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              dr.is_dry
                                ? 'bg-[#ff453a]/15 text-[#ff453a] border border-[#ff453a]/30'
                                : 'bg-[#30d158]/10 text-[#30d158] border border-[#30d158]/20'
                            }`}
                          >
                            {dr.is_dry ? 'Dry Month' : 'Normal'}
                          </span>
                        </td>
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {/* 2. Yearly Table View */}
      {/* ───────────────────────────────────────────────────────────────────────────── */}
      {viewMode === 'yearly' && (
        <div className="rounded-2xl border border-white/[0.08] overflow-hidden bg-[#0d0d0f]/80 max-h-96 overflow-y-auto custom-apple-scrollbar">
          <table className="w-full text-left border-collapse text-sm">
            <thead className="bg-[#1c1c1e]/95 text-[#86868b] font-mono uppercase text-xs sticky top-0 border-b border-white/[0.08] z-10 backdrop-blur-xl">
              <tr>
                <th
                  onClick={() => toggleSort('date')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Year</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('primary')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{isHeatwave ? 'Heatwaves' : 'Dry Months'}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th
                  onClick={() => toggleSort('secondary')}
                  className="py-3 px-4 cursor-pointer hover:text-white transition-colors"
                >
                  <div className="flex items-center gap-1.5">
                    <span>{isHeatwave ? 'Total Hot Days' : 'Rain Shortfall (mm)'}</span>
                    <ArrowUpDown className="w-3.5 h-3.5 opacity-60" />
                  </div>
                </th>
                <th className="py-3 px-4">
                  {isHeatwave ? 'Longest Spell' : 'Total Rain (mm)'}
                </th>
                <th className="py-3 px-4">
                  {isHeatwave ? 'Average Spell' : 'Driest Month'}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04] font-mono text-[#f5f5f7]">
              {sortedYearlyData.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-[#86868b] text-xs">
                    No yearly records match your search filter.
                  </td>
                </tr>
              ) : (
                sortedYearlyData.map((row) => {
                  if (isHeatwave) {
                    const hw = row as HeatwaveAnnualMetric;
                    const isHigh = hw.event_count >= 3 || hw.total_heatwave_days >= 15;
                    return (
                      <tr
                        key={`y-hw-${hw.year}`}
                        className={`hover:bg-white/[0.04] transition-colors ${
                          isHigh ? 'bg-[#0071e3]/[0.06]' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-semibold text-white flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#6e6e73]" />
                          {hw.year}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              hw.event_count > 0
                                ? 'bg-[#0071e3]/15 text-[#2997ff] border border-[#0071e3]/30'
                                : 'text-[#6e6e73]'
                            }`}
                          >
                            {hw.event_count}
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[#f5f5f7]">
                          {hw.total_heatwave_days} d
                        </td>
                        <td className="py-2.5 px-4 text-[#86868b]">
                          {hw.max_duration} d
                        </td>
                        <td className="py-2.5 px-4 text-[#86868b]">
                          {hw.mean_duration} d
                        </td>
                      </tr>
                    );
                  } else {
                    const dr = row as DroughtAnnualMetric;
                    const isHigh = dr.dry_month_count >= 4;
                    return (
                      <tr
                        key={`y-dr-${dr.year}`}
                        className={`hover:bg-white/[0.04] transition-colors ${
                          isHigh ? 'bg-[#0071e3]/[0.06]' : ''
                        }`}
                      >
                        <td className="py-2.5 px-4 font-semibold text-white flex items-center gap-2">
                          <Calendar className="w-3.5 h-3.5 text-[#6e6e73]" />
                          {dr.year}
                        </td>
                        <td className="py-2.5 px-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                              dr.dry_month_count > 0
                                ? 'bg-[#0071e3]/15 text-[#2997ff] border border-[#0071e3]/30'
                                : 'text-[#6e6e73]'
                            }`}
                          >
                            {dr.dry_month_count} mo
                          </span>
                        </td>
                        <td className="py-2.5 px-4 text-[#f5f5f7]">
                          {dr.total_deficit_mm.toFixed(1)} mm
                        </td>
                        <td className="py-2.5 px-4 text-[#86868b]">
                          {dr.annual_precip_mm.toFixed(1)} mm
                        </td>
                        <td className="py-2.5 px-4 text-[#86868b]">
                          {dr.driest_month || '--'}
                        </td>
                      </tr>
                    );
                  }
                })
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};
