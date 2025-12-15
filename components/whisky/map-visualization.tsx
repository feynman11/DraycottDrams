"use client";

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { ZoomIn, ZoomOut, RotateCcw, Filter, MapPin, Info } from 'lucide-react';
import { type Whisky } from '@/db/schema';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Props {
  whiskies: Whisky[];
  onSelect: (whisky: Whisky) => void;
  onDistillerySelect?: (distillery: string, whiskies: Whisky[]) => void;
  selectedId?: string;
  selectedDistillery?: string;
  gatheringFilter?: number;
  gatherings?: number[];
  gatheringThemes?: Map<number, string>;
  onGatheringChange?: (gathering: number | undefined) => void;
}

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
  onSelect, 
  onDistillerySelect,
  selectedId,
  selectedDistillery,
  gatheringFilter,
  gatherings = [],
  gatheringThemes = new Map(),
  onGatheringChange,
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
    clusterMouseEnter?: () => void;
    clusterMouseLeave?: () => void;
    clusterCountMouseEnter?: () => void;
    clusterCountMouseLeave?: () => void;
  }>({});
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('orange');
  const [maptilerApiKey, setMaptilerApiKey] = useState<string>('');
  const [apiKeyFetched, setApiKeyFetched] = useState(false);
  
  // Calculate total number of gatherings for auto-scaling
  const totalGatherings = gatherings.length > 0 ? Math.max(...gatherings) : 1;

  // Fetch MapTiler API key from server
  useEffect(() => {
    const fetchApiKey = async () => {
      try {
        const response = await fetch('/api/map-key');
        const data = await response.json();
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
      maxZoom: 15,
    });

    map.current.on('load', () => {
      setMapLoaded(true);
    });

    // Cleanup
    return () => {
      if (map.current) {
        map.current.remove();
        map.current = null;
      }
    };
  }, [apiKeyFetched, maptilerApiKey]);

  // Group whiskies by distillery and convert to GeoJSON
  const distilleriesToGeoJSON = (whiskiesList: Whisky[], colorMode: ColorMode, totalGatherings: number) => {
    // Filter whiskies with valid coordinates
    const whiskiesWithCoords = whiskiesList.filter(
      (whisky): whisky is Whisky & { coordinates: [number, number] } =>
        !!whisky.coordinates &&
        Array.isArray(whisky.coordinates) &&
        whisky.coordinates.length === 2 &&
        typeof whisky.coordinates[0] === 'number' &&
        typeof whisky.coordinates[1] === 'number'
    );

    // Group by distillery
    const distilleryMap = new Map<string, Whisky[]>();
    whiskiesWithCoords.forEach((whisky) => {
      const key = whisky.distillery;
      if (!distilleryMap.has(key)) {
        distilleryMap.set(key, []);
      }
      distilleryMap.get(key)!.push(whisky);
    });

    // Create one feature per distillery
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

    // Cluster click handlers are disabled since clustering is off
    // No need to attach cluster listeners

    // Handle distillery point clicks
    const handleUnclusteredClick = (e: maplibregl.MapLayerMouseEvent) => {
      const features = map.current!.queryRenderedFeatures(e.point, {
        layers: [unclusteredLayerId],
      });
      if (features.length === 0) return;

      const props = features[0].properties as { distillery: string; whiskyIds: string[] };
      if (props.distillery && onDistillerySelect) {
        // Find all whiskies from this distillery
        const distilleryWhiskies = whiskies.filter((w: Whisky) => 
          w.distillery === props.distillery
        );
        
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
        
        // Get the dot color for this distillery
        const dotColor = props.color || '#f59e0b';
        
        // Convert hex to RGB and calculate brightness for text color
        const hex = dotColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const brightness = (r * 299 + g * 587 + b * 114) / 1000;
        const textColor = brightness > 128 ? '#1e293b' : '#f1f5f9'; // slate-800 for light, slate-100 for dark
        const secondaryTextColor = brightness > 128 ? '#475569' : '#cbd5e1'; // slate-600 for light, slate-300 for dark
        
        hoverPopupRef.current = new maplibregl.Popup({
          offset: 25,
          closeButton: false,
          className: 'distillery-popup',
        })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div class="distillery-popup-content p-2 rounded-lg" style="background-color: ${dotColor}; color: ${textColor}; border: 2px solid ${dotColor};">
              <div class="font-bold text-sm" style="color: ${textColor};">${props.distillery}</div>
              <div class="text-xs" style="color: ${secondaryTextColor};">${props.region}, ${props.country}</div>
              <div class="text-xs mt-1" style="color: ${secondaryTextColor};">${props.whiskyCount} ${props.whiskyCount === 1 ? 'whisky' : 'whiskies'}</div>
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
      
      const handleClusterMouseEnter = () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      };
      
      const handleClusterMouseLeave = () => {
        map.current!.getCanvas().style.cursor = '';
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
        if (map.current.getLayer(countLabelLayerId)) map.current.removeLayer(countLabelLayerId);
        if (map.current.getLayer(unclusteredLayerId)) map.current.removeLayer(unclusteredLayerId);
        map.current.removeSource(sourceId);
      }

      // Add source without clustering
      map.current.addSource(sourceId, {
        type: 'geojson',
        data: geoJSON,
        cluster: false,
      });

      // Add points layer (no clustering, so all points are shown individually)
      map.current.addLayer({
        id: unclusteredLayerId,
        type: 'circle',
        source: sourceId,
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

      // Add text label layer to show whisky count (only when zoomed in)
      const countLabelLayerId = 'distilleries-count-label';
      map.current.addLayer({
        id: countLabelLayerId,
        type: 'symbol',
        source: sourceId,
        minzoom: 5, // Only show labels when zoomed in (zoom level 5 or higher)
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
  }, [whiskies, selectedId, selectedDistillery, mapLoaded, colorMode, totalGatherings, onSelect, onDistillerySelect]);

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

  return (
    <div className="w-full h-full bg-slate-950 relative overflow-hidden group/map">
      <div ref={mapContainer} className="w-full h-full" />
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-950 z-10">
          <div className="animate-pulse flex flex-col items-center">
            <span className="text-xl font-serif text-amber-600">Loading Map...</span>
          </div>
        </div>
      )}

      {/* Options Panel - Desktop */}
      <div className="hidden md:block absolute top-6 left-6 z-10">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="p-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Toggle Options"
        >
          <Filter size={20} />
        </button>
        
        {showOptions && (
          <div className="mt-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl p-4 min-w-[240px]">
            <div className="flex items-center gap-2 mb-4">
              <Filter size={18} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-200">Map Options</h3>
            </div>
            
            {/* Gathering Filter */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Filter by Gathering
              </label>
              <select
                value={gatheringFilter || ''}
                onChange={handleGatheringFilterChange}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="">All Gatherings</option>
                {gatherings.map((gathering) => {
                  const theme = gatheringThemes.get(gathering);
                  const displayText = theme 
                    ? `Gathering ${gathering} - ${theme}`
                    : `Gathering ${gathering}`;
                  return (
                    <option key={gathering} value={gathering}>
                      {displayText}
                    </option>
                  );
                })}
              </select>
            </div>
            
            {/* Color Mode */}
            <div className="mb-4">
              <label className="block text-xs font-medium text-slate-400 mb-2">
                Color Key
              </label>
              <select
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value as ColorMode)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
              >
                <option value="orange">Orange Shades</option>
                <option value="multi">Multi-Colored</option>
              </select>
            </div>
            
            {/* Quick Navigation */}
            <div>
              <div className="flex items-center gap-2 mb-2">
                <MapPin size={16} className="text-amber-500" />
                <label className="text-xs font-medium text-slate-400">
                  Quick Navigation
                </label>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => handleRegionNavigation('UK')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium transition-colors"
                >
                  UK
                </button>
                <button
                  onClick={() => handleRegionNavigation('USA')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium transition-colors"
                >
                  USA
                </button>
                <button
                  onClick={() => handleRegionNavigation('Europe')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium transition-colors"
                >
                  Europe
                </button>
                <button
                  onClick={() => handleRegionNavigation('Asia')}
                  className="px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium transition-colors"
                >
                  Asia
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend Toggle Button - Desktop */}
      <div className="hidden md:block absolute bottom-6 left-6 z-10">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="p-2.5 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Toggle Legend"
        >
          <Info size={20} />
        </button>
        
        {showLegend && (
          <div className="mt-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl p-4 min-w-[240px] max-h-[400px] overflow-y-auto">
            <div className="flex items-center gap-2 mb-3">
              <Info size={18} className="text-amber-500" />
              <h3 className="text-sm font-semibold text-slate-200">Gathering Colors</h3>
            </div>
            <div className="space-y-2">
              {gatherings.map((gathering) => {
                const color = getGatheringColor(gathering, colorMode, totalGatherings);
                const theme = gatheringThemes.get(gathering);
                return (
                  <div key={gathering} className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-200">
                        Gathering {gathering}
                      </div>
                      {theme && (
                        <div className="text-xs text-slate-400 truncate">
                          {theme}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Map Controls - Desktop */}
      <div className="hidden md:flex absolute top-6 right-6 flex-col gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-2 rounded-xl shadow-2xl z-10">
        <button
          onClick={handleZoomIn}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-600"
          title="Zoom In"
        >
          <ZoomIn size={20} />
        </button>
        <button
          onClick={handleZoomOut}
          className="p-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-600"
          title="Zoom Out"
        >
          <ZoomOut size={20} />
        </button>
        <div className="h-px bg-slate-700 my-1 mx-2"></div>
        <button
          onClick={handleReset}
          className="p-2 text-amber-500 hover:text-amber-400 hover:bg-slate-800 rounded-lg transition-colors border border-transparent hover:border-slate-600"
          title="Reset View"
        >
          <RotateCcw size={20} />
        </button>
      </div>

      {/* Options Panel - Mobile */}
      <div className="md:hidden absolute top-4 left-4 z-10">
        <button
          onClick={() => setShowOptions(!showOptions)}
          className="p-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-lg shadow-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Toggle Options"
        >
          <Filter size={18} />
        </button>
        
        {showOptions && (
          <div className="mt-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-lg shadow-lg p-3 min-w-[200px]">
            <div className="flex items-center gap-2 mb-3">
              <Filter size={16} className="text-amber-500" />
              <h3 className="text-xs font-semibold text-slate-200">Options</h3>
            </div>
            
            {/* Gathering Filter */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Gathering
              </label>
              <select
                value={gatheringFilter || ''}
                onChange={handleGatheringFilterChange}
                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All</option>
                {gatherings.map((gathering) => {
                  const theme = gatheringThemes.get(gathering);
                  const displayText = theme 
                    ? `#${gathering} - ${theme}`
                    : `#${gathering}`;
                  return (
                    <option key={gathering} value={gathering}>
                      {displayText}
                    </option>
                  );
                })}
              </select>
            </div>
            
            {/* Color Mode */}
            <div className="mb-3">
              <label className="block text-xs font-medium text-slate-400 mb-1.5">
                Color Key
              </label>
              <select
                value={colorMode}
                onChange={(e) => setColorMode(e.target.value as ColorMode)}
                className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="orange">Orange</option>
                <option value="multi">Multi</option>
              </select>
            </div>
            
            {/* Quick Navigation */}
            <div>
              <div className="flex items-center gap-1.5 mb-1.5">
                <MapPin size={14} className="text-amber-500" />
                <label className="text-xs font-medium text-slate-400">
                  Regions
                </label>
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleRegionNavigation('UK')}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium transition-colors"
                >
                  UK
                </button>
                <button
                  onClick={() => handleRegionNavigation('USA')}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium transition-colors"
                >
                  USA
                </button>
                <button
                  onClick={() => handleRegionNavigation('Europe')}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium transition-colors"
                >
                  Europe
                </button>
                <button
                  onClick={() => handleRegionNavigation('Asia')}
                  className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-200 text-xs font-medium transition-colors"
                >
                  Asia
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Legend Toggle Button - Mobile */}
      <div className="md:hidden absolute bottom-4 left-4 z-10">
        <button
          onClick={() => setShowLegend(!showLegend)}
          className="p-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-lg shadow-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
          title="Toggle Legend"
        >
          <Info size={18} />
        </button>
        
        {showLegend && (
          <div className="mt-2 bg-slate-900/95 backdrop-blur-md border border-slate-700/50 rounded-lg shadow-lg p-3 min-w-[200px] max-h-[300px] overflow-y-auto">
            <div className="flex items-center gap-2 mb-2">
              <Info size={16} className="text-amber-500" />
              <h3 className="text-xs font-semibold text-slate-200">Colors</h3>
            </div>
            <div className="space-y-1.5">
              {gatherings.map((gathering) => {
                const color = getGatheringColor(gathering, colorMode, totalGatherings);
                const theme = gatheringThemes.get(gathering);
                return (
                  <div key={gathering} className="flex items-center gap-2">
                    <div
                      className="w-3 h-3 rounded-full flex-shrink-0"
                      style={{ backgroundColor: color }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-medium text-slate-200">
                        #{gathering}
                      </div>
                      {theme && (
                        <div className="text-xs text-slate-400 truncate">
                          {theme}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Reset Button - Mobile Only */}
      <div className="md:hidden absolute top-4 right-4 z-10">
        <button
          onClick={handleReset}
          className="p-1.5 text-amber-500 hover:text-amber-400 hover:bg-slate-900/90 bg-slate-900/80 backdrop-blur-md rounded-lg transition-colors border border-slate-700/50 shadow-lg"
          title="Reset View"
        >
          <RotateCcw size={16} />
        </button>
      </div>

    </div>
  );
};
