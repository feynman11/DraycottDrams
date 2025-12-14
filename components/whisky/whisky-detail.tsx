"use client";

import { type Whisky } from "@/db/schema";
import { X, MapPin, Droplets, Banknote, Calendar, Map } from 'lucide-react';

interface WhiskyDetailProps {
  whisky: Whisky | null;
  onClose: () => void;
}

export function WhiskyDetail({ whisky, onClose }: WhiskyDetailProps) {
  if (!whisky) return null;

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
          {/* Map Icon Button */}
          <button
            className="absolute top-4 left-4 p-2 bg-amber-600/90 hover:bg-amber-500 rounded-full text-white transition-colors z-50 shadow-lg"
            title="View on map"
          >
            <Map size={20} />
          </button>
          <h4 className="text-amber-400 text-sm font-bold tracking-widest uppercase mb-1">{whisky.distillery}</h4>
          <h2 className="text-4xl font-serif font-bold text-white shadow-sm">{whisky.variety}</h2>
        </div>

        <div className="px-8 pt-12 pb-8 space-y-8">
          {/* Gathering Info */}
          <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
            <p className="text-xs text-slate-400 mb-1">Gathering #{whisky.gathering}</p>
            <p className="text-lg font-bold text-amber-400">{whisky.theme}</p>
            <p className="text-sm text-slate-300 mt-1">
              {new Date(whisky.date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex items-center gap-3">
              <MapPin className="text-amber-500" size={20} />
              <div>
                <p className="text-xs text-slate-400">Region</p>
                <p className="text-sm font-bold text-slate-200">{whisky.region}, {whisky.country}</p>
              </div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex items-center gap-3">
              <Droplets className="text-amber-500" size={20} />
              <div>
                <p className="text-xs text-slate-400">ABV</p>
                <p className="text-sm font-bold text-slate-200">{whisky.abv}%</p>
              </div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex items-center gap-3">
              <Calendar className="text-amber-500" size={20} />
              <div>
                <p className="text-xs text-slate-400">Provider</p>
                <p className="text-sm font-bold text-slate-200">{whisky.provider}</p>
              </div>
            </div>
            <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700 flex items-center gap-3">
              <Banknote className="text-amber-500" size={20} />
              <div>
                <p className="text-xs text-slate-400">Host</p>
                <p className="text-sm font-bold text-slate-200">{whisky.host}</p>
              </div>
            </div>
          </div>

          {/* Notes */}
          {whisky.notes && (
            <div>
              <h3 className="text-lg font-bold text-amber-400 mb-3">Notes</h3>
              <p className="text-slate-300 leading-relaxed">{whisky.notes}</p>
            </div>
          )}

          {/* Legacy fields (if available) */}
          {whisky.description && (
            <div>
              <h3 className="text-lg font-bold text-amber-400 mb-3">About</h3>
              <p className="text-slate-300 leading-relaxed">{whisky.description}</p>
            </div>
          )}

          {whisky.tastingNotes && whisky.tastingNotes.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-amber-400 mb-3">Tasting Notes</h3>
              <div className="flex flex-wrap gap-2">
                {whisky.tastingNotes.map((note, index) => (
                  <span
                    key={index}
                    className="px-3 py-1 bg-amber-950/50 border border-amber-800/50 rounded-full text-sm text-amber-300"
                  >
                    {note}
                  </span>
                ))}
              </div>
            </div>
          )}

          {whisky.flavorProfile && (
            <div>
              <h3 className="text-lg font-bold text-amber-400 mb-3">Flavor Profile</h3>
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <p className="text-slate-400 text-sm">
                  Flavor radar visualization will be implemented here.
                </p>
                <div className="mt-2 text-xs text-slate-500">
                  Peat: {whisky.flavorProfile.peat} |
                  Fruit: {whisky.flavorProfile.fruit} |
                  Floral: {whisky.flavorProfile.floral} |
                  Spice: {whisky.flavorProfile.spice} |
                  Wood: {whisky.flavorProfile.wood} |
                  Sweetness: {whisky.flavorProfile.sweetness}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
