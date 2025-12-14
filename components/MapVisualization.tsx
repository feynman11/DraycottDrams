import React, { useEffect, useState, useMemo, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react';
import { Whisky } from '../types';

interface Props {
  whiskies: Whisky[];
  onSelect: (whisky: Whisky) => void;
  selectedId?: string;
}

export const MapVisualization: React.FC<Props> = ({ whiskies, onSelect, selectedId }) => {
  const [worldData, setWorldData] = useState<any>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const gRef = useRef<SVGGElement>(null);
  const zoomRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>(null);

  useEffect(() => {
    // Fetch generic world atlas topology
    fetch('https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json')
      .then(response => response.json())
      .then(topology => {
        const geojson = topojson.feature(topology, topology.objects.countries);
        setWorldData(geojson);
      })
      .catch(err => console.error("Failed to load map data", err));
  }, []);

  // Dimensions
  const width = 1200;
  const height = 600;

  const projection = useMemo(() => {
    return d3.geoMercator()
      .scale(150)
      .translate([width / 2, height / 1.6]);
  }, []);

  const pathGenerator = useMemo(() => {
    return d3.geoPath().projection(projection);
  }, [projection]);

  // Helper to apply semantic scaling to elements based on current zoom k
  const applySemanticZoom = (k: number) => {
    if (!gRef.current) return;
    const selection = d3.select(gRef.current);

    // Keep country borders thin
    selection.selectAll('path.country-path')
      .attr('stroke-width', 0.5 / k);

    // Keep pins constant size relative to screen (inverse scale)
    selection.selectAll('.whisky-pin-circle').each(function() {
      const el = d3.select(this);
      const baseR = parseFloat(el.attr('data-base-r') || '4');
      el.attr('r', baseR / k);
    });

    // Keep selection rings constant size
    selection.selectAll('.whisky-pin-ring').each(function() {
       // ping ring is 12 base
       d3.select(this).attr('stroke-width', 2 / k); 
    });
    
    // Scale tooltips so they don't get huge
    selection.selectAll('.whisky-tooltip').attr('transform', `scale(${1/k})`);
  };

  // Initialize Zoom
  // Critical: This must run AFTER the SVG is rendered (i.e., after worldData is loaded)
  useEffect(() => {
    if (!svgRef.current || !gRef.current || !worldData) return;

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 12]) // Allow deep zoom for Scotland density
      .translateExtent([[0, 0], [width, height]]) // Prevent panning too far away
      .on('zoom', (event) => {
        if (!gRef.current) return;
        
        const { transform } = event;
        d3.select(gRef.current).attr('transform', transform.toString());
        applySemanticZoom(transform.k);
      });

    zoomRef.current = zoom;
    d3.select(svgRef.current).call(zoom);
  }, [worldData]); // Dependency ensures this runs when SVG appears

  // Re-apply semantic zoom when data changes (React re-renders DOM)
  useEffect(() => {
    if (svgRef.current && zoomRef.current) {
      const transform = d3.zoomTransform(svgRef.current);
      applySemanticZoom(transform.k);
    }
  }, [worldData, whiskies, selectedId]);

  const handleZoomIn = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.scaleBy, 1.5);
    }
  };

  const handleZoomOut = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(500).call(zoomRef.current.scaleBy, 0.66);
    }
  };

  const handleReset = () => {
    if (svgRef.current && zoomRef.current) {
      d3.select(svgRef.current).transition().duration(750).call(zoomRef.current.transform, d3.zoomIdentity);
    }
  };

  if (!worldData) {
    return (
      <div className="w-full h-full flex items-center justify-center text-slate-500">
        <div className="animate-pulse flex flex-col items-center">
            <span className="text-xl font-serif text-amber-600">Loading Atlas...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full bg-[#0B1120] relative overflow-hidden group/map">
      <svg ref={svgRef} viewBox={`0 0 ${width} ${height}`} className="w-full h-full cursor-move active:cursor-grabbing">
        <g ref={gRef}>
          {/* Map Paths */}
          <g>
            {worldData.features.map((feature: any, i: number) => (
              <path
                key={i}
                d={pathGenerator(feature) || ''}
                fill="#1e293b"
                stroke="#334155"
                strokeWidth={0.5}
                className="country-path transition-colors hover:fill-[#253248]"
              />
            ))}
          </g>

          {/* Whisky Pins */}
          <g>
            {whiskies.map((whisky) => {
                const [cx, cy] = projection(whisky.coordinates) || [0, 0];
                const isSelected = selectedId === whisky.id;
                const baseR = isSelected ? 8 : 4;

                return (
                    <g 
                        key={whisky.id} 
                        transform={`translate(${cx}, ${cy})`}
                        onClick={(e) => {
                            e.stopPropagation();
                            onSelect(whisky);
                        }}
                        className="cursor-pointer group/pin"
                    >
                        {/* Ripple effect for selected */}
                        {isSelected && (
                            <circle 
                                r="12" 
                                fill="none" 
                                stroke="#d97706" 
                                strokeWidth="2" 
                                className="whisky-pin-ring animate-ping opacity-75" 
                            />
                        )}
                        
                        {/* Pin Body */}
                        <circle 
                            className="whisky-pin-circle transition-all duration-300"
                            data-base-r={baseR}
                            r={baseR} 
                            fill={isSelected ? "#fbbf24" : "#d97706"}
                            fillOpacity={isSelected ? 1 : 0.8}
                            stroke={isSelected ? "#fff" : "none"}
                            strokeWidth={isSelected ? 1 : 0}
                        />
                        
                        {/* Tooltip on Hover */}
                        {/* We use a group for the tooltip that scales inversely via d3 logic above */}
                        <g className="whisky-tooltip opacity-0 group-hover/pin:opacity-100 transition-opacity duration-200 pointer-events-none">
                             {/* Positioned slightly above the pin */}
                             <g transform="translate(0, -15)">
                               <rect x="-70" y="-40" width="140" height="40" rx="4" fill="#0f172a" stroke="#d97706" strokeWidth="1" fillOpacity="0.95" />
                               <text x="0" y="-22" textAnchor="middle" fill="#e2e8f0" fontSize="10" fontWeight="bold">{whisky.name}</text>
                               <text x="0" y="-8" textAnchor="middle" fill="#94a3b8" fontSize="8">{whisky.region}, {whisky.country}</text>
                             </g>
                        </g>
                    </g>
                );
            })}
          </g>
        </g>
      </svg>

      {/* Map Controls */}
      <div className="absolute top-6 right-6 flex flex-col gap-2 bg-slate-900/90 backdrop-blur-md border border-slate-700/50 p-2 rounded-xl shadow-2xl z-10">
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
    </div>
  );
};