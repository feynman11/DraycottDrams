"use client";

import { WhiskyMap } from "@/components/whisky/whisky-map";
import { Header } from "@/components/layout/header";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function MapPage() {
  const [showAtlasBox, setShowAtlasBox] = useState(true);

  // Load atlas box preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('atlas-box-dismissed');
    if (saved === 'true') {
      setShowAtlasBox(false);
    }
  }, []);

  const dismissAtlasBox = () => {
    setShowAtlasBox(false);
    localStorage.setItem('atlas-box-dismissed', 'true');
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-slate-950 text-slate-200">
      <Header />

      <main className="flex-1 min-h-0 relative overflow-hidden">
        <div className="w-full h-full relative bg-slate-950 overflow-hidden">
          <WhiskyMap />
          {showAtlasBox && (
            <div className="absolute bottom-6 left-6 max-w-sm pointer-events-none">
              <div className="bg-slate-900/80 backdrop-blur-md p-4 rounded-xl border border-slate-700/50 shadow-2xl pointer-events-auto relative">
                <button
                  onClick={dismissAtlasBox}
                  className="absolute top-2 right-2 p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                  title="Dismiss"
                >
                  <X size={14} />
                </button>
                <h3 className="text-amber-500 font-bold mb-1 pr-6">Interactive Atlas</h3>
                <p className="text-sm text-slate-300">
                  Explore the origins of the whiskies tasted by the club. Click a pin to view tasting notes and flavour profiles.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}


