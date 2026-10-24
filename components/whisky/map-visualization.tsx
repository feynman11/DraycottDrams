import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { ZoomIn, ZoomOut, RotateCcw, SlidersHorizontal, Info, Loader2, MapPinOff } from 'lucide-react';
import { type WhiskyWithGathering, type Distillery } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Sheet, SheetBody, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { useMediaQuery } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';
import { WHISKY_REGION_COLORS, WHISKY_REGION_NAMES } from '@/lib/whisky-regions';
import { addWhiskyRegionLayers, setWhiskyRegionsVisible } from './map-regions';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Props {
  whiskies: WhiskyWithGathering[];
  allDistilleries?: Distillery[];
  distilleryWhiskiesMap?: Map<string, WhiskyWithGathering[]>;
  onSelect: (whisky: WhiskyWithGathering) => void;
  onDistillerySelect?: (distillery: string, whiskies: WhiskyWithGathering[]) => void;
  selectedId?: string;
  selectedDistillery?: string;
  gatheringFilter?: number;
  gatherings?: number[];
  gatheringThemes?: Map<number, string>;
  onGatheringChange?: (gathering: number | undefined) => void;
  showDistilleriesWithWhiskies?: boolean;
  onShowDistilleriesWithWhiskiesChange?: (show: boolean) => void;
  showDistilleriesWithoutTastings?: boolean;
  onShowDistilleriesWithoutTastingsChange?: (show: boolean) => void;
}

// Pins merge into a cluster when closer than about one pin width on screen (px)
const CLUSTER_RADIUS = 22;
const MAP_MAX_ZOOM = 15;

// Region view coordinates
const REGION_VIEWS = {
  UK: { center: [-2, 54] as [number, number], zoom: 4 },
  USA: { center: [-95, 39] as [number, number], zoom: 2.2 },
  Europe: { center: [10, 50] as [number, number], zoom: 3 },
  Asia: { center: [110, 30] as [number, number], zoom: 1.8   },
} as const;

// Orange shades palette - ordered from lightest (oldest) to darkest (newest)
const ORANGE_SHADES = [
  '#fef3c7', // amber-100 - lightest (oldest)
  '#fde68a', // amber-200
  '#fcd34d', // amber-300
  '#fbbf24', // amber-400
  '#fed7aa', // orange-200
  '#fdba74', // orange-300
  '#fb923c', // orange-400
  '#f59e0b', // amber-500
  '#f97316', // orange-500
  '#d97706', // amber-600
  '#ea580c', // orange-600
  '#b45309', // amber-700
  '#c2410c', // orange-700
  '#92400e', // amber-800
  '#9a3412', // orange-800
  '#78350f', // amber-900
  '#7c2d12', // orange-900 - darkest (newest)
];

// Multi-colored palette for gatherings - using distinct colors
const MULTI_COLORS = [
  '#d97706', // amber-600
  '#059669', // emerald-600
  '#0284c7', // sky-600
  '#7c3aed', // violet-600
  '#dc2626', // red-600
  '#ea580c', // orange-600
  '#0891b2', // cyan-600
  '#be185d', // pink-700
  '#65a30d', // lime-600
  '#c2410c', // orange-700
  '#1e40af', // blue-700
  '#7e22ce', // purple-700
  '#b91c1c', // red-700
  '#0d9488', // teal-600
  '#4338ca', // indigo-600
  '#a21caf', // fuchsia-700
  '#ca8a04', // yellow-600
  '#16a34a', // green-600
  '#2563eb', // blue-600
  '#9333ea', // purple-600
];

type ColorMode = 'orange' | 'multi';

// Function to get color for a gathering number based on mode and total gatherings
// Older gatherings (lower numbers) get lighter colors, newer (higher numbers) get darker
const getGatheringColor = (
  gathering: number, 
  mode: ColorMode = 'orange',
  totalGatherings: number = 1
): string => {
  if (mode === 'orange') {
    // Map gathering to color based on its relative position
    // Gathering 1 (oldest) = lightest color, highest gathering (newest) = darkest color
    const palette = ORANGE_SHADES;
    
    if (totalGatherings <= 1) {
      return palette[0]; // If only one gathering, use lightest
    }
    
    // Calculate position: 0 = oldest (lightest), 1 = newest (darkest)
    const position = (gathering - 1) / (totalGatherings - 1);
    
    // Map to palette index (0 = lightest, palette.length - 1 = darkest)
    const index = Math.round(position * (palette.length - 1));
    
    return palette[index];
  } else {
    // Multi-colored mode uses the original logic
    return MULTI_COLORS[(gathering - 1) % MULTI_COLORS.length];
  }
};

export const MapVisualization: React.FC<Props> = ({ 
  whiskies, 
  allDistilleries,
  distilleryWhiskiesMap,
  onSelect,
  onDistillerySelect,
  selectedId,
  selectedDistillery,
  gatheringFilter,
  gatherings = [],
  gatheringThemes = new Map(),
  onGatheringChange,
  showDistilleriesWithWhiskies = false,
  onShowDistilleriesWithWhiskiesChange,
  showDistilleriesWithoutTastings = false,
  onShowDistilleriesWithoutTastingsChange,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const whiskiesRef = useRef<string>('');
  const clusterPopupRef = useRef<maplibregl.Popup | null>(null);
  const hoverPopupRef = useRef<maplibregl.Popup | null>(null);
  const listenersAddedRef = useRef<boolean>(false);
  const eventHandlersRef = useRef<{
    clusterClick?: (e: maplibregl.MapLayerMouseEvent) => void;
    clusterCountClick?: (e: maplibregl.MapLayerMouseEvent) => void;
    unclusteredClick?: (e: maplibregl.MapLayerMouseEvent) => void;
    unclusteredMouseEnter?: (e: maplibregl.MapLayerMouseEvent) => void;
    unclusteredMouseLeave?: () => void;
    clusterMouseEnter?: (e: maplibregl.MapLayerMouseEvent) => void;
    clusterMouseLeave?: () => void;
    clusterCountMouseEnter?: () => void;
    clusterCountMouseLeave?: () => void;
  }>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [mapError, setMapError] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('orange');
  const [showRegions, setShowRegions] = useState(true);
  const [maptilerApiKey, setMaptilerApiKey] = useState<string>('');
  const [apiKeyFetched, setApiKeyFetched] = useState(false);
  
  // Calculate total number of gatherings for auto-scaling
  const totalGatherings = gatherings.length > 0 ? Math.max(...gatherings) : 1;

  // Fetch MapTiler API key from server
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/map-key');
        const data = (await response.json()) as { apiKey?: string };
        setMaptilerApiKey(data.apiKey || '');
      } catch (error) {
        console.error('Failed to fetch map API key:', error);
        setMaptilerApiKey('');
      } finally {
        setApiKeyFetched(true);
      }
    };
    fetchApiKey();
  }, []);

  useEffect(() => {
    if (!mapContainer.current || map.current || !apiKeyFetched) return;

    // Initialize map with MapTiler backdrop style
    map.current = new maplibregl.Map({
      container: mapContainer.current,
      style: maptilerApiKey 
        ? `https://api.maptiler.com/maps/backdrop/style.json?key=${maptilerApiKey}`
        : 'https://demotiles.maptiler.com/style.json', // Fallback to demo style
      center: REGION_VIEWS.UK.center,
      zoom: REGION_VIEWS.UK.zoom,
      minZoom: 1,
      maxZoom: MAP_MAX_ZOOM,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // A failed style fetch (offline, bad key) would otherwise leave the loading state forever.
    // Individual tile/glyph failures carry a `tile`/`sourceId` and are not fatal, so ignore them.
    map.current.on('error', (e) => {
      const partial = e as { tile?: unknown; sourceId?: unknown };
      if (partial.tile || partial.sourceId) return;
      if (!map.current?.isStyleLoaded()) {
        console.error('Map style failed to load:', e.error);
        setMapError(true);
      }
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [apiKeyFetched, maptilerApiKey]);

  // Region shading: added once the style is in, before the pin layers below so pins stay on top;
  // toggling only flips visibility
  useEffect(() => {
    if (!map.current || !mapLoaded) return;
    addWhiskyRegionLayers(map.current, showRegions);
    setWhiskyRegionsVisible(map.current, showRegions);
  }, [mapLoaded, showRegions]);

  // Group whiskies by distillery and convert to GeoJSON
  const distilleriesToGeoJSON = (whiskiesList: WhiskyWithGathering[], colorMode: ColorMode, totalGatherings: number) => {
    // If showing only distilleries without tastings, skip whiskies entirely
    if (showDistilleriesWithoutTastings) {
      if (!allDistilleries) {
        return {
          type: 'FeatureCollection' as const,
          features: [],
        };
      }

      // Create a set of distillery names that have whiskies
      const distilleriesWithWhiskies = new Set<string>();
      whiskiesList.forEach((whisky) => {
        distilleriesWithWhiskies.add(whisky.distillery);
      });

      // Only include distilleries without whiskies
      const features = allDistilleries
        .filter((distillery) => {
          // Only include if it doesn't have any whiskies
          return !distilleriesWithWhiskies.has(distillery.name);
        })
        .filter((distillery) => {
          // Only add if has coordinates
          return (
            distillery.coordinates &&
            Array.isArray(distillery.coordinates) &&
            distillery.coordinates.length === 2 &&
            typeof distillery.coordinates[0] === 'number' &&
            typeof distillery.coordinates[1] === 'number'
          );
        })
        .map((distillery) => ({
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: distillery.coordinates as [number, number],
          },
          properties: {
            distillery: distillery.name,
            region: distillery.region || '',
            country: distillery.country || '',
            whiskyCount: 0,
            highestABV: 0,
            color: '#6b7280', // Gray color for distilleries without whiskies
            whiskyIds: [],
          },
        }));

      return {
        type: 'FeatureCollection' as const,
        features,
      };
    }

    // Filter whiskies with valid coordinates
    const whiskiesWithCoords = whiskiesList.filter(
      (whisky): whisky is WhiskyWithGathering & { coordinates: [number, number] } =>
        !!whisky.coordinates &&
        Array.isArray(whisky.coordinates) &&
        whisky.coordinates.length === 2 &&
        typeof whisky.coordinates[0] === 'number' &&
        typeof whisky.coordinates[1] === 'number'
    );

    // Group by distillery
    const distilleryMap = new Map<string, WhiskyWithGathering[]>();
    whiskiesWithCoords.forEach((whisky) => {
      const key = whisky.distillery;
      if (!distilleryMap.has(key)) {
        distilleryMap.set(key, []);
      }
      distilleryMap.get(key)!.push(whisky);
    });

    // Create one feature per distillery with whiskies
    const features = Array.from(distilleryMap.entries()).map(([distillery, distilleryWhiskies]) => {
      // Use coordinates from first whisky (all should be the same for same distillery)
      const coordinates = distilleryWhiskies[0].coordinates!;
      
      // Find the whisky with highest ABV to determine color
      const highestABVWhisky = distilleryWhiskies.reduce((max, whisky) => {
        const maxABV = parseFloat(max.abv.toString());
        const currentABV = parseFloat(whisky.abv.toString());
        return currentABV > maxABV ? whisky : max;
      }, distilleryWhiskies[0]);
      
      // Use the gathering color from the highest ABV whisky
      const color = getGatheringColor(highestABVWhisky.gathering, colorMode, totalGatherings);
      
      // Get region and country from first whisky
      const firstWhisky = distilleryWhiskies[0];
      
      return {
        type: 'Feature' as const,
        geometry: {
          type: 'Point' as const,
          coordinates,
        },
        properties: {
          distillery,
          region: firstWhisky.region,
          country: firstWhisky.country,
          whiskyCount: distilleryWhiskies.length,
          highestABV: parseFloat(highestABVWhisky.abv.toString()),
          color,
          // Store all whisky IDs for reference
          whiskyIds: distilleryWhiskies.map(w => w.id),
        },
      };
    });

    // Add distilleries without whiskies if showDistilleriesWithWhiskies is true
    if (showDistilleriesWithWhiskies && allDistilleries) {
      allDistilleries.forEach((distillery) => {
        // Skip if already added (has whiskies)
        if (distilleryMap.has(distillery.name)) return;
        
        // Only add if has coordinates
        if (distillery.coordinates && 
            Array.isArray(distillery.coordinates) && 
            distillery.coordinates.length === 2 &&
            typeof distillery.coordinates[0] === 'number' &&
            typeof distillery.coordinates[1] === 'number') {
          features.push({
            type: 'Feature' as const,
            geometry: {
              type: 'Point' as const,
              coordinates: distillery.coordinates as [number, number],
            },
            properties: {
              distillery: distillery.name,
              region: distillery.region || '',
              country: distillery.country || '',
              whiskyCount: 0,
              highestABV: 0,
              color: '#6b7280', // Gray color for distilleries without whiskies
              whiskyIds: [],
            },
          });
        }
      });
    }

    return {
      type: 'FeatureCollection' as const,
      features,
    };
  };

  // Helper function to remove event listeners
  const removeEventListeners = (
    clusterLayerId: string,
    clusterCountLayerId: string,
    unclusteredLayerId: string
  ) => {
    if (!map.current) return;
    
    const handlers = eventHandlersRef.current;
    
    // Remove cluster click listeners
    if (handlers.clusterClick) {
      map.current.off('click', clusterLayerId, handlers.clusterClick);
    }
    if (handlers.clusterCountClick) {
      map.current.off('click', clusterCountLayerId, handlers.clusterCountClick);
    }
    
    // Remove unclustered click listeners
    if (handlers.unclusteredClick) {
      map.current.off('click', unclusteredLayerId, handlers.unclusteredClick);
    }
    
    // Remove hover listeners
    if (handlers.unclusteredMouseEnter) {
      map.current.off('mouseenter', unclusteredLayerId, handlers.unclusteredMouseEnter);
    }
    if (handlers.unclusteredMouseLeave) {
      map.current.off('mouseleave', unclusteredLayerId, handlers.unclusteredMouseLeave);
    }
    if (handlers.clusterMouseEnter) {
      map.current.off('mouseenter', clusterLayerId, handlers.clusterMouseEnter);
    }
    if (handlers.clusterMouseLeave) {
      map.current.off('mouseleave', clusterLayerId, handlers.clusterMouseLeave);
    }
    if (handlers.clusterCountMouseEnter) {
      map.current.off('mouseenter', clusterCountLayerId, handlers.clusterCountMouseEnter);
    }
    if (handlers.clusterCountMouseLeave) {
      map.current.off('mouseleave', clusterCountLayerId, handlers.clusterCountMouseLeave);
    }
    
    // Clear handlers
    eventHandlersRef.current = {};
  };

  // Helper function to attach event listeners
  const attachEventListeners = (
    sourceId: string,
    clusterLayerId: string,
    clusterCountLayerId: string,
    unclusteredLayerId: string
  ) => {
    if (!map.current) return;

    // Remove any existing listeners first
    removeEventListeners(clusterLayerId, clusterCountLayerId, unclusteredLayerId);

    const source = () => map.current?.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
    const closePopups = () => {
      hoverPopupRef.current?.remove();
      hoverPopupRef.current = null;
      clusterPopupRef.current?.remove();
      clusterPopupRef.current = null;
    };

    // A cluster zooms in until it splits; one that never splits (shared coordinates) lists its
    // distilleries to pick from
    const handleClusterClick = async (e: maplibregl.MapLayerMouseEvent) => {
      const feature = map.current?.queryRenderedFeatures(e.point, { layers: [clusterLayerId] })[0];
      const src = source();
      if (!feature || !src || !map.current) return;
      const clusterId = feature.properties.cluster_id as number;
      const center = (feature.geometry as { coordinates: [number, number] }).coordinates;
      const expansionZoom = await src.getClusterExpansionZoom(clusterId);
      closePopups();

      if (expansionZoom <= MAP_MAX_ZOOM && map.current.getZoom() < MAP_MAX_ZOOM) {
        map.current.easeTo({ center, zoom: expansionZoom, duration: 500 });
        return;
      }

      const leaves = await src.getClusterLeaves(clusterId, 50, 0);
      const list = document.createElement('div');
      list.className = 'px-1.5 py-1.5';
      for (const leaf of leaves) {
        const props = leaf.properties as { distillery: string; whiskyCount: number; color?: string };
        const item = document.createElement('button');
        item.type = 'button';
        item.className = 'flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-accent';
        const swatch = document.createElement('span');
        swatch.className = 'h-2.5 w-2.5 shrink-0 rounded-full';
        swatch.style.backgroundColor = props.color || '#f59e0b';
        const name = document.createElement('span');
        name.className = 'flex-1 font-medium';
        name.textContent = props.distillery;
        const count = document.createElement('span');
        count.className = 'text-xs text-subtle tabular-nums';
        count.textContent = String(props.whiskyCount);
        item.appendChild(swatch);
        item.appendChild(name);
        item.appendChild(count);
        item.addEventListener('click', () => {
          closePopups();
          onDistillerySelect?.(
            props.distillery,
            distilleryWhiskiesMap?.get(props.distillery) || whiskies.filter((w) => w.distillery === props.distillery),
          );
        });
        list.appendChild(item);
      }
      clusterPopupRef.current = new maplibregl.Popup({ offset: 18, maxWidth: '260px' })
        .setLngLat(center)
        .setDOMContent(list)
        .addTo(map.current);
    };

    // The count label sits on the disc, so a click on either hits the disc layer: listen there only
    eventHandlersRef.current.clusterClick = handleClusterClick;
    map.current.on('click', clusterLayerId, handleClusterClick);

    // Handle distillery point clicks
    const handleUnclusteredClick = (e: maplibregl.MapLayerMouseEvent) => {
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: [unclusteredLayerId],
      });
      if (features.length === 0) return;

      const props = features[0].properties as { distillery: string; whiskyIds: string[] };
      if (props.distillery && onDistillerySelect) {
        // Find all whiskies from this distillery
        const distilleryWhiskies = distilleryWhiskiesMap?.get(props.distillery) || 
          whiskies.filter((w) => w.distillery === props.distillery);
        
        // Remove any hover popup when clicking
        if (hoverPopupRef.current) {
          hoverPopupRef.current.remove();
          hoverPopupRef.current = null;
        }
        
        onDistillerySelect(props.distillery, distilleryWhiskies);
      }
    };
    
    eventHandlersRef.current.unclusteredClick = handleUnclusteredClick;
    map.current.on('click', unclusteredLayerId, handleUnclusteredClick);

    // Show popup on hover for distillery points
    const handleUnclusteredMouseEnter = (e: maplibregl.MapLayerMouseEvent) => {
      map.current!.getCanvas().style.cursor = 'pointer';
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: [unclusteredLayerId],
      });
      if (features.length === 0) return;

      const props = features[0].properties as { distillery: string; region: string; country: string; whiskyCount: number; color?: string };
      if (props.distillery) {
        // Remove any existing hover popup before creating a new one
        if (hoverPopupRef.current) {
          hoverPopupRef.current.remove();
          hoverPopupRef.current = null;
        }
        
        // Also remove cluster popup if it exists
        if (clusterPopupRef.current) {
          clusterPopupRef.current.remove();
          clusterPopupRef.current = null;
        }
        
        // The dot's colour becomes a swatch; the popup itself uses the app surface
        const dotColor = props.color || '#f59e0b';

        hoverPopupRef.current = new maplibregl.Popup({
          offset: 25,
          closeButton: false,
          className: 'distillery-popup',
        })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="px-3 py-2.5">
              <div class="flex items-center gap-2">
                <span class="h-2.5 w-2.5 shrink-0 rounded-full" style="background-color: ${dotColor};"></span>
                <span class="text-sm font-semibold text-foreground">${props.distillery}</span>
              </div>
              <div class="mt-0.5 text-xs text-muted-foreground">${props.region}, ${props.country}</div>
              <div class="mt-0.5 text-xs text-subtle">${props.whiskyCount} ${props.whiskyCount === 1 ? 'whisky' : 'whiskies'}</div>
            </div>
          `)
          .addTo(map.current!);
        }
      };
      
      const handleUnclusteredMouseLeave = () => {
        map.current!.getCanvas().style.cursor = '';
        // Remove hover popup when mouse leaves
        if (hoverPopupRef.current) {
          hoverPopupRef.current.remove();
          hoverPopupRef.current = null;
        }
      };
      
      // Hovering a cluster names what's inside it
      const handleClusterMouseEnter = async (e: maplibregl.MapLayerMouseEvent) => {
        map.current!.getCanvas().style.cursor = 'pointer';
        const feature = e.features?.[0];
        const src = map.current?.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
        if (!feature || !src || clusterPopupRef.current) return;
        const { cluster_id, point_count, whiskyCount } = feature.properties as { cluster_id: number; point_count: number; whiskyCount: number };
        const leaves = await src.getClusterLeaves(cluster_id, 5, 0);
        const names = leaves.map((leaf) => leaf.properties?.distillery as string);
        const more = point_count - names.length;

        const body = document.createElement('div');
        body.className = 'px-3 py-2.5';
        const title = document.createElement('div');
        title.className = 'text-sm font-semibold text-foreground';
        title.textContent = `${point_count} distilleries · ${whiskyCount} ${whiskyCount === 1 ? 'whisky' : 'whiskies'}`;
        const detail = document.createElement('div');
        detail.className = 'mt-0.5 text-xs text-muted-foreground';
        detail.textContent = names.join(', ') + (more > 0 ? ` and ${more} more` : '');
        body.appendChild(title);
        body.appendChild(detail);

        hoverPopupRef.current?.remove();
        hoverPopupRef.current = new maplibregl.Popup({ offset: 18, closeButton: false, maxWidth: '260px' })
          .setLngLat((feature.geometry as { coordinates: [number, number] }).coordinates)
          .setDOMContent(body)
          .addTo(map.current!);
      };

      const handleClusterMouseLeave = () => {
        map.current!.getCanvas().style.cursor = '';
        hoverPopupRef.current?.remove();
        hoverPopupRef.current = null;
      };
      
      const handleClusterCountMouseEnter = () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      };
      
      const handleClusterCountMouseLeave = () => {
        map.current!.getCanvas().style.cursor = '';
      };
      
      // Store handlers
      eventHandlersRef.current.unclusteredMouseEnter = handleUnclusteredMouseEnter;
      eventHandlersRef.current.unclusteredMouseLeave = handleUnclusteredMouseLeave;
      eventHandlersRef.current.clusterMouseEnter = handleClusterMouseEnter;
      eventHandlersRef.current.clusterMouseLeave = handleClusterMouseLeave;
      eventHandlersRef.current.clusterCountMouseEnter = handleClusterCountMouseEnter;
      eventHandlersRef.current.clusterCountMouseLeave = handleClusterCountMouseLeave;
      
      // Attach hover listeners
      map.current.on('mouseenter', unclusteredLayerId, handleUnclusteredMouseEnter);
      map.current.on('mouseleave', unclusteredLayerId, handleUnclusteredMouseLeave);
      map.current.on('mouseenter', clusterLayerId, handleClusterMouseEnter);
      map.current.on('mouseleave', clusterLayerId, handleClusterMouseLeave);
      map.current.on('mouseenter', clusterCountLayerId, handleClusterCountMouseEnter);
      map.current.on('mouseleave', clusterCountLayerId, handleClusterCountMouseLeave);
    };

  // Update map source and layers when whiskies, selectedId, or colorMode changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    const whiskiesKey = JSON.stringify({
      whiskies: whiskies.map(w => ({ id: w.id, distillery: w.distillery, coordinates: w.coordinates })),
      colorMode,
      totalGatherings,
      showDistilleriesWithWhiskies,
      showDistilleriesWithoutTastings,
      allDistilleries: allDistilleries?.map(d => ({ id: d.id, name: d.name, coordinates: d.coordinates })),
    });

    const sourceId = 'distilleries-source';
    const clusterLayerId = 'distilleries-clusters';
    const clusterCountLayerId = 'distilleries-cluster-count';
    const unclusteredLayerId = 'distilleries-unclustered';

    // Only update if data changed
    if (whiskiesRef.current !== whiskiesKey) {
      whiskiesRef.current = whiskiesKey;

      const geoJSON = distilleriesToGeoJSON(whiskies, colorMode, totalGatherings);

      // Remove existing source and layers if they exist
      // First remove event listeners, then remove layers
      if (map.current.getSource(sourceId)) {
        listenersAddedRef.current = false;
        
        // Remove event listeners before removing layers
        removeEventListeners(clusterLayerId, clusterCountLayerId, unclusteredLayerId);
        
        const countLabelLayerId = 'distilleries-count-label';
        for (const id of [countLabelLayerId, unclusteredLayerId, clusterCountLayerId, clusterLayerId]) {
          if (map.current.getLayer(id)) map.current.removeLayer(id);
        }
        map.current.removeSource(sourceId);
      }

      // Pins that would overlap on screen merge into a cluster; the radius is about a pin's width so
      // pins that merely sit close keep their own colour. Clustering runs to the map's max zoom, so
      // distilleries sharing coordinates stay grouped and a click lists them instead.
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: geoJSON,
        cluster: true,
        clusterRadius: CLUSTER_RADIUS,
        clusterMaxZoom: MAP_MAX_ZOOM,
        clusterProperties: { whiskyCount: ['+', ['get', 'whiskyCount']] },
      });

      // Clusters: a dark disc with an amber ring, sized by how many distilleries it holds, so it never
      // reads as a gathering-coloured pin
      map.current.addLayer({
        id: clusterLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['has', 'point_count'],
        paint: {
          'circle-color': '#211c17',
          'circle-radius': ['step', ['get', 'point_count'], 12, 4, 15, 10, 18, 25, 22],
          'circle-stroke-width': 2,
          'circle-stroke-color': '#f7a830',
        },
      });

      map.current.addLayer({
        id: clusterCountLayerId,
        type: 'symbol',
        source: sourceId,
        filter: ['has', 'point_count'],
        layout: {
          'text-field': ['get', 'point_count_abbreviated'],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': 12,
          'text-allow-overlap': true,
        },
        paint: { 'text-color': '#ffffff' },
      });

      map.current.addLayer({
        id: unclusteredLayerId,
        type: 'circle',
        source: sourceId,
        filter: ['!', ['has', 'point_count']],
        paint: {
          'circle-color': [
            'case',
            ['==', ['get', 'distillery'], selectedDistillery || ''],
            '#fff',
            ['get', 'color'],
          ],
          'circle-radius': [
            'case',
            ['==', ['get', 'distillery'], selectedDistillery || ''],
            10,
            8,
          ],
          'circle-stroke-width': [
            'case',
            ['==', ['get', 'distillery'], selectedDistillery || ''],
            3,
            2,
          ],
          'circle-stroke-color': '#fff',
        },
      });

      // Add text label layer to show whisky count (only when zoomed in, and only when there is more
      // than one: a bare "1" on every pin is noise, and untasted distilleries carry 0)
      const countLabelLayerId = 'distilleries-count-label';
      map.current.addLayer({
        id: countLabelLayerId,
        type: 'symbol',
        source: sourceId,
        minzoom: 5, // Only show labels when zoomed in (zoom level 5 or higher)
        filter: ['all', ['!', ['has', 'point_count']], ['>', ['get', 'whiskyCount'], 1]],
        layout: {
          'text-field': ['to-string', ['get', 'whiskyCount']],
          'text-font': ['Open Sans Semibold', 'Arial Unicode MS Bold'],
          'text-size': [
            'case',
            ['==', ['get', 'distillery'], selectedDistillery || ''],
            14,
            12,
          ],
          'text-anchor': 'center',
          'visibility': 'visible',
        },
        paint: {
          'text-color': '#ffffff',
          'text-halo-color': '#000000',
          'text-halo-width': 2,
          'text-halo-blur': 1,
        },
      });

      // Attach event listeners immediately after layers are added
      // MapLibre GL allows attaching listeners to layers immediately
      attachEventListeners(sourceId, clusterLayerId, clusterCountLayerId, unclusteredLayerId);
      listenersAddedRef.current = true;
    }

    // Ensure event listeners are attached even if data hasn't changed but layers exist
    if (map.current.getSource(sourceId) && 
        map.current.getLayer(unclusteredLayerId) && 
        !listenersAddedRef.current) {
      attachEventListeners(sourceId, clusterLayerId, clusterCountLayerId, unclusteredLayerId);
      listenersAddedRef.current = true;
    }

    // Update source data when colorMode or selection changes (without recreating layers)
    if (map.current.getSource(sourceId)) {
      const geoJSON = distilleriesToGeoJSON(whiskies, colorMode, totalGatherings);
      const source = map.current.getSource(sourceId) as maplibregl.GeoJSONSource;
      source.setData(geoJSON);

      const countLabelLayerId = 'distilleries-count-label';

      // Update unclustered point styles based on selection
      if (map.current.getLayer(unclusteredLayerId)) {
        map.current.setPaintProperty(unclusteredLayerId, 'circle-color', [
          'case',
          ['==', ['get', 'distillery'], selectedDistillery || ''],
          '#fff',
          ['get', 'color'],
        ]);

        map.current.setPaintProperty(unclusteredLayerId, 'circle-radius', [
          'case',
          ['==', ['get', 'distillery'], selectedDistillery || ''],
          10,
          8,
        ]);

        map.current.setPaintProperty(unclusteredLayerId, 'circle-stroke-width', [
          'case',
          ['==', ['get', 'distillery'], selectedDistillery || ''],
          3,
          2,
        ]);
      }

      // Update text label size based on selection
      if (map.current.getLayer(countLabelLayerId)) {
        map.current.setLayoutProperty(countLabelLayerId, 'text-size', [
          'case',
          ['==', ['get', 'distillery'], selectedDistillery || ''],
          14,
          12,
        ]);
      }
    }
  }, [whiskies, selectedId, selectedDistillery, mapLoaded, colorMode, totalGatherings, onSelect, onDistillerySelect, showDistilleriesWithWhiskies, showDistilleriesWithoutTastings, allDistilleries]);

  const handleZoomIn = () => {
    if (map.current) {
      map.current.zoomIn({ duration: 500 });
    }
  };

  const handleZoomOut = () => {
    if (map.current) {
      map.current.zoomOut({ duration: 500 });
    }
  };

  const handleReset = () => {
    if (map.current) {
      map.current.flyTo({
        center: REGION_VIEWS.UK.center,
        zoom: REGION_VIEWS.UK.zoom,
        duration: 750,
      });
    }
  };

  const handleRegionNavigation = (region: keyof typeof REGION_VIEWS) => {
    if (map.current) {
      const view = REGION_VIEWS[region];
      map.current.flyTo({
        center: view.center,
        zoom: view.zoom,
        duration: 1000,
      });
    }
  };

  const handleGatheringFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    const gathering = value === '' ? undefined : parseInt(value, 10);
    onGatheringChange?.(gathering);
  };

  const regionButtons = (Object.keys(REGION_VIEWS) as (keyof typeof REGION_VIEWS)[]).map((region) => (
    <Button key={region} variant="secondary" size="sm" onClick={() => handleRegionNavigation(region)}>
      {region}
    </Button>
  ));

  const filtersActive = gatheringFilter !== undefined || showDistilleriesWithWhiskies || showDistilleriesWithoutTastings;

  // One options tree, shown in a floating card on desktop and a bottom sheet on phones
  const optionsPanel = (
    <div className="space-y-4">
      <div>
        <Label htmlFor="map-gathering">Gathering</Label>
        <Select id="map-gathering" value={gatheringFilter || ''} onChange={handleGatheringFilterChange}>
          <option value="">All gatherings</option>
          {gatherings.map((gathering) => {
            const theme = gatheringThemes.get(gathering);
            return (
              <option key={gathering} value={gathering}>
                {theme ? `Gathering ${gathering} · ${theme}` : `Gathering ${gathering}`}
              </option>
            );
          })}
        </Select>
      </div>

      <div>
        <Label htmlFor="map-colour">Colour key</Label>
        <Select id="map-colour" value={colorMode} onChange={(e) => setColorMode(e.target.value as ColorMode)}>
          <option value="orange">Amber shades by age</option>
          <option value="multi">One colour per gathering</option>
        </Select>
      </div>

      <div>
        <Label>Quick navigation</Label>
        <div className="grid grid-cols-4 gap-1.5">{regionButtons}</div>
      </div>

      <div className="space-y-2 border-t border-border pt-4">
        <Button
          variant={showRegions ? "default" : "outline"}
          size="sm"
          aria-pressed={showRegions}
          onClick={() => setShowRegions(!showRegions)}
          className="w-full"
        >
          {showRegions ? "Shading Scotland's regions" : "Shade Scotland's regions"}
        </Button>
        {onShowDistilleriesWithoutTastingsChange && (
          <Button
            variant={showDistilleriesWithoutTastings ? "default" : "outline"}
            size="sm"
            aria-pressed={showDistilleriesWithoutTastings}
            onClick={() => {
              onShowDistilleriesWithoutTastingsChange(!showDistilleriesWithoutTastings);
              // Disable other filter when this is enabled
              if (!showDistilleriesWithoutTastings && onShowDistilleriesWithWhiskiesChange) {
                onShowDistilleriesWithWhiskiesChange(false);
              }
            }}
            className="w-full"
          >
            {showDistilleriesWithoutTastings ? "Showing only untasted distilleries" : "Only untasted distilleries"}
          </Button>
        )}
        {onShowDistilleriesWithWhiskiesChange && (
          <Button
            variant={showDistilleriesWithWhiskies ? "default" : "outline"}
            size="sm"
            aria-pressed={showDistilleriesWithWhiskies}
            onClick={() => {
              onShowDistilleriesWithWhiskiesChange(!showDistilleriesWithWhiskies);
              // Disable other filter when this is enabled
              if (!showDistilleriesWithWhiskies && onShowDistilleriesWithoutTastingsChange) {
                onShowDistilleriesWithoutTastingsChange(false);
              }
            }}
            className="w-full"
            disabled={showDistilleriesWithoutTastings}
          >
            {showDistilleriesWithWhiskies ? "Showing every distillery" : "Show every distillery"}
          </Button>
        )}
      </div>
    </div>
  );

  const legendPanel = (
    <div className="space-y-4">
      <ul className="space-y-2">
        {gatherings.map((gathering) => {
          const color = getGatheringColor(gathering, colorMode, totalGatherings);
          const theme = gatheringThemes.get(gathering);
          return (
            <li key={gathering} className="flex items-center gap-2.5">
              <span className="h-3 w-3 shrink-0 rounded-full ring-1 ring-white/20" style={{ backgroundColor: color }} />
              <span className="min-w-0 text-xs">
                <span className="font-medium text-foreground">Gathering {gathering}</span>
                {theme && <span className="block truncate text-muted-foreground">{theme}</span>}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Square, translucent swatches so the regions never read as pins */}
      {showRegions && (
        <div className="border-t border-border pt-3">
          <h4 className="mb-2 text-xs font-medium text-subtle">Scotch regions</h4>
          <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            {WHISKY_REGION_NAMES.map((name) => {
              const color = WHISKY_REGION_COLORS[name];
              return (
                <li key={name} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span
                    className="h-3 w-3 shrink-0 rounded-[2px] border"
                    style={{ borderColor: color, backgroundColor: `${color}66` }}
                  />
                  {name}
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );

  return (
    <div className="relative h-full w-full overflow-hidden bg-background">
      <div ref={mapContainer} className="h-full w-full" />

      {!mapLoaded && (
        <div className="absolute inset-0 z-10 flex items-center justify-center bg-background p-6" aria-busy={!mapError}>
          {mapError ? (
            <EmptyState
              tone="error"
              icon={<MapPinOff />}
              title="The map tiles couldn't load"
              description="Check your connection and try again. The distilleries and whiskies pages still work."
              action={<Button variant="outline" onClick={() => window.location.reload()}>Try again</Button>}
              className="w-full max-w-md bg-card"
            />
          ) : (
            <div className="flex flex-col items-center gap-3 animate-fade-in">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span className="text-sm text-muted-foreground">Loading the atlas…</span>
            </div>
          )}
        </div>
      )}

      <MapPanel
        icon={<SlidersHorizontal size={18} />}
        label="Filters"
        title="Map options"
        position="top-left"
        open={showOptions}
        onOpenChange={setShowOptions}
        active={filtersActive}
      >
        {optionsPanel}
      </MapPanel>

      <MapPanel
        icon={<Info size={18} />}
        label="Legend"
        title="Gathering colours"
        position="bottom-left"
        open={showLegend}
        onOpenChange={setShowLegend}
      >
        {legendPanel}
      </MapPanel>

      {/* Zoom and reset */}
      <div className="absolute right-4 top-4 z-10 flex flex-col overflow-hidden rounded-xl border border-border bg-popover/90 shadow-lg backdrop-blur-md">
        <MapControl label="Zoom in" onClick={handleZoomIn}><ZoomIn size={18} /></MapControl>
        <MapControl label="Zoom out" onClick={handleZoomOut}><ZoomOut size={18} /></MapControl>
        <div className="mx-2 h-px bg-border" />
        <MapControl label="Reset view" onClick={handleReset} className="text-primary"><RotateCcw size={18} /></MapControl>
      </div>
    </div>
  );
};

function MapControl({ label, className, ...props }: React.ButtonHTMLAttributes<HTMLButtonElement> & { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={cn(
        "flex h-11 w-11 items-center justify-center text-muted-foreground transition-colors duration-(--duration-fast) hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:bg-accent focus-visible:text-foreground",
        className
      )}
      {...props}
    />
  );
}

interface MapPanelProps {
  icon: React.ReactNode;
  label: string;
  title: string;
  position: "top-left" | "bottom-left";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  active?: boolean;
  children: React.ReactNode;
}

// A toggle button with its panel: floating card beside it on desktop, bottom sheet on phones
function MapPanel({ icon, label, title, position, open, onOpenChange, active, children }: MapPanelProps) {
  const isDesktop = useMediaQuery("(min-width: 48rem)");
  return (
    <div className={cn("absolute left-4 z-10", position === "top-left" ? "top-4" : "bottom-4")}>
      <button
        type="button"
        onClick={() => onOpenChange(!open)}
        aria-expanded={open}
        aria-label={title}
        className={cn(
          "flex h-11 items-center gap-2 rounded-xl border px-3 text-sm font-medium shadow-lg backdrop-blur-md transition-colors duration-(--duration-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          open ? "border-primary/40 bg-popover text-primary" : "border-border bg-popover/90 text-foreground hover:bg-accent"
        )}
      >
        {icon}
        <span className="hidden sm:inline">{label}</span>
        {active && <span aria-label="Filters applied" className="h-1.5 w-1.5 rounded-full bg-primary" />}
      </button>

      {isDesktop ? (
        open && (
          <div
            className={cn(
              "absolute left-0 w-72 rounded-xl border border-border bg-popover/95 p-4 shadow-lg backdrop-blur-md animate-rise-in",
              position === "top-left" ? "top-13" : "bottom-13 max-h-[60vh] overflow-y-auto"
            )}
          >
            <h3 className="mb-3 text-sm font-semibold text-foreground">{title}</h3>
            {children}
          </div>
        )
      ) : (
        <Sheet open={open} onOpenChange={onOpenChange}>
          <SheetContent side="bottom" title={title}>
            <SheetHeader>
              <SheetTitle>{title}</SheetTitle>
            </SheetHeader>
            <SheetBody>{children}</SheetBody>
          </SheetContent>
        </Sheet>
      )}
    </div>
  );
}
