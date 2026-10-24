import type maplibregl from 'maplibre-gl';
import { WHISKY_REGIONS, WHISKY_REGION_COLORS, WHISKY_REGION_NAMES } from '@/lib/whisky-regions';

// The region shading has its own source so the pin source can be torn down and rebuilt without it
export const REGION_SOURCE_ID = 'whisky-regions-source';
export const REGION_FILL_LAYER_ID = 'whisky-regions-fill';
export const REGION_LINE_LAYER_ID = 'whisky-regions-line';

// Strong enough to read against the hillshade; pins are opaque and drawn above, so unaffected
const REGION_FILL_OPACITY = 0.3;
const REGION_LINE_OPACITY = 0.55;

// ['match', ['get', 'region'], 'Islands', '#…', 'Highland', '#…', …, fallback]
const regionColor = [
  'match',
  ['get', 'region'],
  ...WHISKY_REGION_NAMES.flatMap((name) => [name, WHISKY_REGION_COLORS[name]]),
  '#808080',
] as unknown as maplibregl.ExpressionSpecification;

/**
 * Adds the region source with a fill and a hairline outline. Both go in beneath the basemap's water
 * layer: the polygons follow a coarse coastline, and the basemap's precise water polygons paint over
 * whatever spills into the sea or a sea loch, so the shading ends exactly at the shore. That also
 * keeps them beneath the labels and any pin layers added later (those are appended on top). Falls
 * back to the first symbol layer on a style without a water fill. Does nothing if the source exists.
 */
export function addWhiskyRegionLayers(map: maplibregl.Map, visible: boolean) {
  if (map.getSource(REGION_SOURCE_ID)) return;

  const visibility = visible ? 'visible' : 'none';
  const layers = map.getStyle().layers;
  const beforeId = (
    layers.find((layer) => layer.type === 'fill' && 'source-layer' in layer && layer['source-layer'] === 'water') ??
    layers.find((layer) => layer.type === 'symbol')
  )?.id;

  map.addSource(REGION_SOURCE_ID, {
    type: 'geojson',
    data: WHISKY_REGIONS,
  });

  map.addLayer(
    {
      id: REGION_FILL_LAYER_ID,
      type: 'fill',
      source: REGION_SOURCE_ID,
      layout: { visibility },
      paint: {
        'fill-color': regionColor,
        'fill-opacity': REGION_FILL_OPACITY,
      },
    },
    beforeId
  );

  map.addLayer(
    {
      id: REGION_LINE_LAYER_ID,
      type: 'line',
      source: REGION_SOURCE_ID,
      layout: { visibility, 'line-join': 'round' },
      paint: {
        'line-color': regionColor,
        'line-opacity': REGION_LINE_OPACITY,
        'line-width': 1,
      },
    },
    beforeId
  );
}

/** Shows or hides the shading without touching the source */
export function setWhiskyRegionsVisible(map: maplibregl.Map, visible: boolean) {
  for (const id of [REGION_FILL_LAYER_ID, REGION_LINE_LAYER_ID]) {
    if (map.getLayer(id)) {
      map.setLayoutProperty(id, 'visibility', visible ? 'visible' : 'none');
    }
  }
}
