import type { Coordinates } from '../types/analysis';

export interface PresetLocation {
  name: string;
  state: string;
  region: string;
  climateZone: string;
  coords: Coordinates;
}

export const PRESET_LOCATIONS: PresetLocation[] = [
  {
    name: 'New Delhi',
    state: 'Delhi',
    region: 'Northern Plains',
    climateZone: 'Semi-Arid Subtropical',
    coords: { lat: 28.6139, lon: 77.2090 },
  },
  {
    name: 'Mumbai',
    state: 'Maharashtra',
    region: 'West Coast',
    climateZone: 'Tropical Wet & Dry',
    coords: { lat: 19.0760, lon: 72.8777 },
  },
  {
    name: 'Bengaluru',
    state: 'Karnataka',
    region: 'Deccan Plateau',
    climateZone: 'Tropical Savanna',
    coords: { lat: 12.9716, lon: 77.5946 },
  },
  {
    name: 'Kolkata',
    state: 'West Bengal',
    region: 'Eastern Delta',
    climateZone: 'Tropical Wet & Dry',
    coords: { lat: 22.5726, lon: 88.3639 },
  },
  {
    name: 'Chennai',
    state: 'Tamil Nadu',
    region: 'Coromandel Coast',
    climateZone: 'Tropical Maritime',
    coords: { lat: 13.0827, lon: 80.2707 },
  },
  {
    name: 'Hyderabad',
    state: 'Telangana',
    region: 'South-Central',
    climateZone: 'Semi-Arid Steppe',
    coords: { lat: 17.3850, lon: 78.4867 },
  },
  {
    name: 'Ahmedabad',
    state: 'Gujarat',
    region: 'Western Plains',
    climateZone: 'Semi-Arid Hot',
    coords: { lat: 23.0225, lon: 72.5714 },
  },
  {
    name: 'Pune',
    state: 'Maharashtra',
    region: 'Western Ghats Leeward',
    climateZone: 'Tropical Semi-Arid',
    coords: { lat: 18.5204, lon: 73.8567 },
  },
  {
    name: 'Jaipur',
    state: 'Rajasthan',
    region: 'Semi-Arid West',
    climateZone: 'Hot Semi-Arid',
    coords: { lat: 26.9124, lon: 75.7873 },
  },
  {
    name: 'Nagpur',
    state: 'Maharashtra',
    region: 'Central Dry Zone',
    climateZone: 'Tropical Wet & Dry',
    coords: { lat: 21.1458, lon: 79.0882 },
  },
  {
    name: 'Lucknow',
    state: 'Uttar Pradesh',
    region: 'Central Gangetic',
    climateZone: 'Humid Subtropical',
    coords: { lat: 26.8467, lon: 80.9462 },
  },
  {
    name: 'Patna',
    state: 'Bihar',
    region: 'Middle Gangetic',
    climateZone: 'Humid Subtropical',
    coords: { lat: 25.5941, lon: 85.1376 },
  },
  {
    name: 'Bhopal',
    state: 'Madhya Pradesh',
    region: 'Central Highlands',
    climateZone: 'Humid Subtropical',
    coords: { lat: 23.2599, lon: 77.4126 },
  },
  {
    name: 'Jodhpur',
    state: 'Rajasthan',
    region: 'Thar Desert Fringe',
    climateZone: 'Arid Desert',
    coords: { lat: 26.2389, lon: 73.0243 },
  },
  {
    name: 'Varanasi',
    state: 'Uttar Pradesh',
    region: 'Eastern Gangetic',
    climateZone: 'Humid Subtropical',
    coords: { lat: 25.3176, lon: 82.9739 },
  },
  {
    name: 'Chandigarh',
    state: 'Punjab / Haryana',
    region: 'Shivalik Foothills',
    climateZone: 'Subtropical Monsoon',
    coords: { lat: 30.7333, lon: 76.7794 },
  },
];
