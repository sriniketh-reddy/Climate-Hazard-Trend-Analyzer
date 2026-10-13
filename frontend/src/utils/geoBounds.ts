import indiaBoundaryData from '../data/india_boundary.json';

// Leaflet map bounds for India with a comfortable boundary frame
export const INDIA_MAP_BOUNDS: [[number, number], [number, number]] = [
  [6.5, 66.5],  // Southwest corner
  [37.5, 99.0], // Northeast corner
];

const geom = indiaBoundaryData.features[0].geometry;

function isPointInRing(pt: [number, number], ring: number[][]): boolean {
  const x = pt[0]; // lon
  const y = pt[1]; // lat
  let inside = false;

  for (let i = 0; i < ring.length; i++) {
    const j = (i - 1 + ring.length) % ring.length;
    const xi = ring[i][0];
    const yi = ring[i][1];
    const xj = ring[j][0];
    const yj = ring[j][1];

    const intersect =
      yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi;

    if (intersect) {
      inside = !inside;
    }
  }

  return inside;
}

/**
 * Strict Survey of India polygon check for any coordinate.
 * Returns true only if coordinates fall inside official Indian borders.
 */
export function isPointInIndia(lat: number, lon: number): boolean {
  // Quick pre-filter bounding box
  if (lat < 6.5 || lat > 37.5 || lon < 68.0 || lon > 97.6) {
    return false;
  }

  const pt: [number, number] = [lon, lat];

  for (const poly of geom.coordinates) {
    if (isPointInRing(pt, poly[0])) {
      return true;
    }
  }

  return false;
}

export { indiaBoundaryData };
