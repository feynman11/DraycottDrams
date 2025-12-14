import React, { useState } from 'react';
import { MapVisualization } from './components/MapVisualization';
import { WhiskyDetail } from './components/WhiskyDetail';
import { Sommelier } from './components/Sommelier';
import { WHISKY_DATA } from './constants';
import { Whisky } from './types';
import { GlassWater, Map, MessageCircle, List } from 'lucide-react';

export default function App() {
  const [selectedWhisky, setSelectedWhisky] = useState<Whisky | null>(null);
  const [viewMode, setViewMode] = useState<'map' | 'list'>('map');
  const [showSommelier, setShowSommelier] = useState(false);

  const handleWhiskySelect = (whisky: Whisky) => {
    setSelectedWhisky(whisky);
  };

  const closeDetail = () => {
    setSelectedWhisky(null);
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">
      {/* Header */}
      <header className="flex-none h-16 bg-slate-900 border-b border-amber-900/30 flex items-center justify-between px-6 shadow-lg z-20 relative">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-600/20 rounded-full border border-amber-600/50">
            <GlassWater className="w-6 h-6 text-amber-500" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-amber-50 tracking-wide">Draycott Drams</h1>
            <p className="text-xs text-amber-500/80 uppercase tracking-widest">Est. 2023</p>
          </div>
        </div>
        
        <nav className="flex items-center gap-4">
          <button 
            onClick={() => setViewMode('map')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'map' ? 'bg-amber-700 text-white shadow-amber-900/20 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <Map size={18} />
            <span className="hidden sm:inline">World Map</span>
          </button>
          <button 
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-all ${viewMode === 'list' ? 'bg-amber-700 text-white shadow-amber-900/20 shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            <List size={18} />
            <span className="hidden sm:inline">Library</span>
          </button>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative overflow-hidden">
        {viewMode === 'map' ? (
          <div className="w-full h-full relative bg-slate-950">
             <MapVisualization 
               whiskies={WHISKY_DATA} 
               onSelect={handleWhiskySelect} 
               selectedId={selectedWhisky?.id}
             />
             <div className="absolute bottom-6 left-6 max-w-sm pointer-events-none">
                <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-700/50 shadow-2xl pointer-events-auto">
                  <h3 className="text-amber-500 font-bold mb-1">Interactive Atlas</h3>
                  <p className="text-sm text-slate-300">
                    Explore the origins of the whiskies tasted by the club. Click a pin to view tasting notes and flavor profiles.
                  </p>
                </div>
             </div>
          </div>
        ) : (
          <div className="w-full h-full overflow-y-auto p-6 lg:p-12 bg-slate-950">
            <div className="max-w-7xl mx-auto">
              <h2 className="text-3xl font-bold mb-8 text-amber-50 border-b border-slate-800 pb-4">The Library</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {WHISKY_DATA.map(whisky => (
                  <div 
                    key={whisky.id}
                    onClick={() => handleWhiskySelect(whisky)}
                    className="group bg-slate-900 border border-slate-800 rounded-xl p-0 overflow-hidden hover:border-amber-600/50 transition-all cursor-pointer shadow-lg hover:shadow-amber-900/10 flex flex-col"
                  >
                    <div className="h-3 bg-gradient-to-r from-amber-700 to-amber-500 w-full" />
                    <div className="p-5 flex-1 flex flex-col">
                      <div className="flex justify-between items-start mb-2">
                        <span className="text-xs font-bold text-amber-500 bg-amber-950/50 px-2 py-1 rounded uppercase tracking-wider">{whisky.region}</span>
                        <span className="text-xs text-slate-500">{whisky.abv}% ABV</span>
                      </div>
                      <h3 className="text-xl font-bold text-slate-100 group-hover:text-amber-400 transition-colors mb-1">{whisky.name}</h3>
                      <p className="text-sm text-slate-400 mb-4">{whisky.distillery}</p>
                      <div className="mt-auto pt-4 border-t border-slate-800 flex justify-between items-center">
                         <span className="text-xs text-slate-500">{whisky.type}</span>
                         <span className="text-amber-600 font-bold text-sm">View Notes →</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Floating AI Button */}
        <button
          onClick={() => setShowSommelier(!showSommelier)}
          className="absolute bottom-6 right-6 z-30 bg-amber-600 hover:bg-amber-500 text-white p-4 rounded-full shadow-lg shadow-amber-900/40 transition-all transform hover:scale-105 flex items-center justify-center"
          title="Ask the AI Sommelier"
        >
          <MessageCircle className="w-6 h-6" />
        </button>

        {/* Panels */}
        <Sommelier isOpen={showSommelier} onClose={() => setShowSommelier(false)} />
        <WhiskyDetail whisky={selectedWhisky} onClose={closeDetail} />
      </main>
    </div>
  );
}