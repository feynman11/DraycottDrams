/**
 * Scotch whisky region polygons for the map's background shading.
 *
 * The geometry in whisky-regions.json is derived from Natural Earth 10m admin-1 council areas
 * (public domain), cut along the Highland line and the two wards named in the Scotch Whisky
 * Regulations 2009, then simplified for use at zoom 9 and below. See docs/MAP_REGIONS.md.
 */
import regions from './whisky-regions.json';

/** The five legal regions/localities plus "Islands", the club's informal grouping. */
export type WhiskyRegionName = 'Highland' | 'Speyside' | 'Lowland' | 'Islay' | 'Campbeltown' | 'Islands';

export interface WhiskyRegionFeature {
  type: 'Feature';
  properties: { region: WhiskyRegionName };
  geometry: { type: 'MultiPolygon'; coordinates: number[][][][] };
}

export interface WhiskyRegionCollection {
  type: 'FeatureCollection';
  features: WhiskyRegionFeature[];
}

export const WHISKY_REGIONS = regions as WhiskyRegionCollection;

/** Legend order, roughly north to south */
export const WHISKY_REGION_NAMES: WhiskyRegionName[] = ['Islands', 'Highland', 'Speyside', 'Lowland', 'Campbeltown', 'Islay'];

/**
 * Fill colours, one muted hue per region. Each is an OKLCH colour on a hue from the design tokens in
 * styles/globals.css (silver, info, success, gold, bronze, destructive), kept low-chroma and cool so
 * the shading never reads as the amber pin palette. MapLibre can't parse oklch(), so the sRGB hex is
 * stored alongside the OKLCH it was converted from.
 */
export const WHISKY_REGION_COLORS: Record<WhiskyRegionName, string> = {
  Islands: '#65b4e9', // oklch(0.74 0.11 240), info hue
  Highland: '#8da8c3', // oklch(0.72 0.05 250), silver hue
  Speyside: '#66c093', // oklch(0.74 0.11 160), success hue
  Lowland: '#cdbc9a', // oklch(0.80 0.05 85), gold hue, desaturated
  Campbeltown: '#bd835b', // oklch(0.66 0.09 55), bronze hue
  Islay: '#cf7f79', // oklch(0.68 0.10 25), destructive hue, desaturated
};
