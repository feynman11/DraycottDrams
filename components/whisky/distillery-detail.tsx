"use client";

import { type Whisky } from "@/db/schema";
import { X, MapPin, Droplets, Calendar } from 'lucide-react';

interface DistilleryDetailProps {
  distillery: string;
  whiskies: Whisky[];
  onClose: () => void;
}

export function DistilleryDetail({ distillery, whiskies, onClose }: DistilleryDetailProps) {
  if (!distillery || whiskies.length === 0) return null;

  // Group whiskies by gathering for better display
  const whiskiesByGathering = whiskies.reduce((acc, whisky) => {
    const key = whisky.gathering;
    if (!acc[key]) {
      acc[key] = [];
    }
    acc[key].push(whisky);
    return acc;
  }, {} as Record<number, Whisky[]>);

  const gatherings = Object.keys(whiskiesByGathering)
    .map(Number)
    .sort((a, b) => a - b);

  const firstWhisky = whiskies[0];
  const region = firstWhisky.region;
  const country = firstWhisky.country;

  return (
    <div className="absolute inset-y-0 right-0 w-full md:w-[480px] bg-slate-900/95 backdrop-blur-xl shadow-2xl border-l border-slate-700 transform transition-transform duration-300 z-[100] overflow-y-auto">
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-50"
        >
          <X size={20} />
        </button>

        <div className="h-48 w-full bg-gradient-to-br from-amber-900 to-slate-900 relative p-8 flex flex-col justify-end">
          <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')]"></div>
          <h4 className="text-amber-400 text-sm font-bold tracking-widest uppercase mb-1">{distillery}</h4>
          <div className="flex items-center gap-2 text-slate-300 text-sm">
            <MapPin size={16} />
            <span>{region}, {country}</span>
          </div>
          <div className="text-slate-400 text-xs mt-2">
            {whiskies.length} {whiskies.length === 1 ? 'whisky' : 'whiskies'}
          </div>
        </div>

        <div className="px-8 pt-12 pb-8 space-y-6">
          {gatherings.map((gathering) => {
            const gatheringWhiskies = whiskiesByGathering[gathering];
            const firstGatheringWhisky = gatheringWhiskies[0];
            const theme = firstGatheringWhisky.theme;
            const date = firstGatheringWhisky.date;

            return (
              <div key={gathering} className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                {/* Gathering Header */}
                <div className="mb-4 pb-3 border-b border-slate-700">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs text-slate-400">Gathering #{gathering}</p>
                    <div className="flex items-center gap-1 text-slate-400 text-xs">
                      <Calendar size={14} />
                      <span>
                        {new Date(date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-lg font-bold text-amber-400">{theme}</p>
                </div>

                {/* Whiskies from this gathering */}
                <div className="space-y-3">
                  {gatheringWhiskies.map((whisky) => (
                    <div key={whisky.id} className="bg-slate-900/50 p-3 rounded-lg border border-slate-700/50">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="text-sm font-semibold text-slate-200">{whisky.variety || 'No variety specified'}</p>
                          <div className="flex items-center gap-3 mt-1">
                            <div className="flex items-center gap-1 text-xs text-slate-400">
                              <Droplets size={12} className="text-amber-500" />
                              <span>{whisky.abv}% ABV</span>
                            </div>
                            <div className="text-xs text-slate-500">
                              Provider: {whisky.provider}
                            </div>
                          </div>
                        </div>
                      </div>
                      {whisky.notes && (
                        <p className="text-xs text-slate-400 mt-2 italic">{whisky.notes}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

