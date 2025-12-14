"use client";

import React, { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import { ZoomIn, ZoomOut, RotateCcw, Filter, MapPin, Info } from 'lucide-react';
import { type Whisky } from '@/db/schema';
import 'maplibre-gl/dist/maplibre-gl.css';

interface Props {
  whiskies: Whisky[];
  onSelect: (whisky: Whisky) => void;
  selectedId?: string;
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
  selectedId,
  gatheringFilter,
  gatherings = [],
  gatheringThemes = new Map(),
  onGatheringChange,
}) => {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<maplibregl.Map | null>(null);
  const markersRef = useRef<Map<string, maplibregl.Marker>>(new Map());
  const whiskiesRef = useRef<string>('');
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showOptions, setShowOptions] = useState(false);
  const [showLegend, setShowLegend] = useState(false);
  const [colorMode, setColorMode] = useState<ColorMode>('orange');
  
  // Calculate total number of gatherings for auto-scaling
  const totalGatherings = gatherings.length > 0 ? Math.max(...gatherings) : 1;

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    // Get MapTiler API key from environment variable
    const maptilerApiKey = process.env.NEXT_PUBLIC_MAPTILER_API_KEY || '';

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
  }, []);

  // Update markers when whiskies, selectedId, or colorMode changes
  useEffect(() => {
    if (!map.current || !mapLoaded) return;

    // Create a string key to detect if whiskies, colorMode, or totalGatherings changed
    const whiskiesKey = JSON.stringify({
      whiskies: whiskies.map(w => ({ id: w.id, coordinates: w.coordinates })),
      colorMode,
      totalGatherings,
    });
    
    // Filter whiskies with valid coordinates
    const whiskiesWithCoords = whiskies.filter(
      (whisky): whisky is Whisky & { coordinates: [number, number] } =>
        !!whisky.coordinates &&
        Array.isArray(whisky.coordinates) &&
        whisky.coordinates.length === 2 &&
        typeof whisky.coordinates[0] === 'number' &&
        typeof whisky.coordinates[1] === 'number'
    );

    // Only recreate markers if whiskies list or colorMode changed
    if (whiskiesRef.current !== whiskiesKey) {
      // Remove existing markers
      markersRef.current.forEach(marker => marker.remove());
      markersRef.current.clear();
      whiskiesRef.current = whiskiesKey;

      // Create markers for each whisky
      whiskiesWithCoords.forEach((whisky) => {
        const [lng, lat] = whisky.coordinates;

        // Get color based on gathering and color mode, with auto-scaling
        const gatheringColor = getGatheringColor(whisky.gathering, colorMode, totalGatherings);

        // Create marker element
        const el = document.createElement('div');
        el.className = 'whisky-marker';
        el.style.width = '12px';
        el.style.height = '12px';
        el.style.borderRadius = '50%';
        el.style.backgroundColor = gatheringColor;
        el.style.cursor = 'pointer';
        el.style.boxShadow = '0 2px 4px rgba(0,0,0,0.3)';
        el.style.zIndex = '1';
        // Store gathering for later reference
        el.setAttribute('data-gathering', whisky.gathering.toString());
        // Remove transition to prevent lag during map movement
        el.style.willChange = 'transform';

        // Create popup
        const popup = new maplibregl.Popup({
          offset: 25,
          closeButton: false,
          className: 'whisky-popup',
        }).setHTML(`
          <div class="whisky-popup-content">
            <div class="font-bold text-slate-100 text-sm">${whisky.name}</div>
            <div class="text-slate-400 text-xs">${whisky.region}, ${whisky.country}</div>
          </div>
        `);

        // Create marker
        const marker = new maplibregl.Marker({
          element: el,
          anchor: 'center',
        })
          .setLngLat([lng, lat])
          .setPopup(popup)
          .addTo(map.current!);

        // Add click handler
        el.addEventListener('click', (e) => {
          e.stopPropagation();
          onSelect(whisky);
          popup.addTo(map.current!);
        });

        // Show popup on hover
        el.addEventListener('mouseenter', () => {
          popup.addTo(map.current!);
        });

        el.addEventListener('mouseleave', () => {
          popup.remove();
        });

        markersRef.current.set(whisky.id, marker);
      });
    }

    // Update marker styles based on selection (without recreating)
    markersRef.current.forEach((marker, whiskyId) => {
      const isSelected = selectedId === whiskyId;
      const el = marker.getElement();
      
      // Get gathering number and color
      const gatheringNum = parseInt(el.getAttribute('data-gathering') || '1', 10);
      const gatheringColor = getGatheringColor(gatheringNum, colorMode, totalGatherings);
      
      if (isSelected) {
        el.style.width = '16px';
        el.style.height = '16px';
        el.style.backgroundColor = gatheringColor;
        el.style.border = '2px solid #fff';
        el.style.zIndex = '1000';
        
        // Add ripple effect if not already present
        if (!el.querySelector('.whisky-marker-ripple')) {
          const ripple = document.createElement('div');
          ripple.className = 'whisky-marker-ripple';
          ripple.style.position = 'absolute';
          ripple.style.width = '24px';
          ripple.style.height = '24px';
          ripple.style.borderRadius = '50%';
          ripple.style.border = `2px solid ${gatheringColor}`;
          ripple.style.top = '50%';
          ripple.style.left = '50%';
          ripple.style.transform = 'translate(-50%, -50%)';
          ripple.style.animation = 'ping 1s cubic-bezier(0, 0, 0.2, 1) infinite';
          ripple.style.opacity = '0.75';
          el.style.position = 'relative';
          el.appendChild(ripple);
        }
      } else {
        el.style.width = '12px';
        el.style.height = '12px';
        el.style.backgroundColor = gatheringColor;
        el.style.border = 'none';
        el.style.zIndex = '1';
        
        // Remove ripple effect
        const ripple = el.querySelector('.whisky-marker-ripple');
        if (ripple) {
          ripple.remove();
        }
      }
    });
  }, [whiskies, selectedId, mapLoaded, colorMode, totalGatherings, onSelect]);

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
