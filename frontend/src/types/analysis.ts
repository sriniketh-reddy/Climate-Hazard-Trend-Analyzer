export type HazardType = 'heatwave' | 'drought';

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface LocationInfo {
  requested: Coordinates;
  grid_cell: Coordinates;
}

export interface HazardDefinition {
  method: string;
  variable: string;
  percentile?: number;
  threshold_value?: number;
  threshold_unit?: string;
  min_consecutive_days?: number;
  dry_month_percentile_threshold?: number;
  baseline_period: string;
  description: string;
}

export interface HeatwaveMonthMetric {
  year: number;
  month: number;
  month_label: string;
  heatwave_days: number;
  event_count: number;
  peak_temperature?: number | null;
  mean_temperature?: number | null;
  threshold_celsius: number;
}

export interface DroughtMonthMetric {
  year: number;
  month: number;
  month_label: string;
  total_precip_mm: number;
  is_dry: boolean;
  deficit_mm: number;
  threshold_mm: number;
  median_mm: number;
  reliable: boolean;
}

export type MonthMetric = HeatwaveMonthMetric | DroughtMonthMetric;

export interface HeatwaveAnnualMetric {
  year: number;
  event_count: number;
  total_heatwave_days: number;
  max_duration: number;
  mean_duration: number;
}

export interface DroughtAnnualMetric {
  year: number;
  dry_month_count: number;
  total_deficit_mm: number;
  driest_month: string | null;
  driest_month_precip_mm: number | null;
  annual_precip_mm: number;
}

export type AnnualMetric = HeatwaveAnnualMetric | DroughtAnnualMetric;

export interface TrendInfo {
  method: string;
  metric_analyzed: string;
  slope_per_decade?: number;
  direction?: 'increasing' | 'decreasing' | 'stable';
  p_value?: number;
  r_squared?: number;
  confidence_interval_95?: [number, number];
  significant_at_005?: boolean;
  interpretation: string;
}

export interface DataQualityInfo {
  total_expected_days: number;
  total_received_days: number;
  missing_days: number;
  coverage_pct: number;
  flagged_values: number;
  flag_reasons: string[];
}

export interface AnalysisResponse {
  location: LocationInfo;
  hazard_type: HazardType;
  start_date: string;
  end_date: string;
  start_month?: string;
  end_month?: string;
  total_months: number;
  can_show_yearly: boolean;
  baseline_start?: string;
  baseline_end?: string;
  source: string;
  weather_model: string;
  hazard_definition: HazardDefinition;
  monthly_metrics: HeatwaveMonthMetric[] | DroughtMonthMetric[];
  annual_metrics: HeatwaveAnnualMetric[] | DroughtAnnualMetric[];
  trend: TrendInfo;
  data_quality: DataQualityInfo;
  analysis_version: string;
  cached: boolean;
  updated_date?: string;
  values?: number[];
  created_at: string;
  updated_at: string;
}

export interface AnalysisRequest {
  latitude: number;
  longitude: number;
  hazard_type: HazardType;
  start_date: string;
  end_date: string;
  start_month?: string;
  end_month?: string;
  baseline_start?: string;
  baseline_end?: string;
}
