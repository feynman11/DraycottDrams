"use client";

import { type WhiskyWithGathering } from "@/lib/types";
import { X, MapPin, Droplets, Banknote, Calendar, Map, Trophy } from 'lucide-react';
import { RankingBadge, PodiumBadge } from './ranking-badge';

interface WhiskyDetailProps {
  whisky: WhiskyWithGathering | null;
  onClose: () => void;
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

export function WhiskyDetail({ whisky, onClose }: WhiskyDetailProps) {
  if (!whisky) return null;

  const isWinner = whisky.ranking === 1;
  const isPodium = whisky.ranking && whisky.ranking <= 3;

  return (
    <div className="absolute inset-y-0 right-0 w-full md:w-[480px] bg-slate-900/95 backdrop-blur-xl shadow-2xl border-l border-slate-700 transform transition-transform duration-300 z-[100] overflow-y-auto">
      <div className="relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition-colors z-50"
        >
          <X size={20} />
        </button>

        <div className={`h-48 w-full relative p-8 flex flex-col justify-end ${
          isWinner
            ? "bg-gradient-to-br from-amber-600 via-yellow-600 to-amber-800"
            : whisky.ranking === 2
              ? "bg-gradient-to-br from-slate-400 via-slate-500 to-slate-600"
              : whisky.ranking === 3
                ? "bg-gradient-to-br from-amber-700 via-orange-700 to-amber-900"
                : "bg-gradient-to-br from-amber-900 to-slate-900"
        }`}>
          <div className="absolute inset-0 opacity-20 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48Y2lyY2xlIGN4PSIzMCIgY3k9IjMwIiByPSIxLjUiLz48L2c+PC9nPjwvc3ZnPg==')]"></div>

          {/* Map Icon Button */}
          <button
            className="absolute top-4 left-4 p-2 bg-amber-600/90 hover:bg-amber-500 rounded-full text-white transition-colors z-50 shadow-lg"
            title="View on map"
          >
            <Map size={20} />
          </button>

          {/* Ranking Badge - prominent display for winners */}
          {whisky.ranking && (
            <div className="absolute top-4 left-16">
              <RankingBadge ranking={whisky.ranking} size="lg" showLabel />
            </div>
          )}

          <h4 className={`text-sm font-bold tracking-widest uppercase mb-1 ${
            isWinner ? "text-amber-100" : "text-amber-400"
          }`}>{whisky.distillery}</h4>
          <h2 className="text-4xl font-serif font-bold text-white shadow-sm">{whisky.variety}</h2>
        </div>

        <div className="px-8 pt-12 pb-8 space-y-8">
          {/* Ranking Highlight - Show prominently for ranked whiskies */}
          {whisky.ranking && (
            <div className={`p-4 rounded-lg border ${
              whisky.ranking === 1
                ? "bg-gradient-to-r from-amber-900/50 to-yellow-900/30 border-amber-600/50"
                : whisky.ranking === 2
                  ? "bg-gradient-to-r from-slate-700/50 to-slate-600/30 border-slate-500/50"
                  : whisky.ranking === 3
                    ? "bg-gradient-to-r from-amber-800/50 to-orange-900/30 border-amber-700/50"
                    : "bg-slate-800/50 border-slate-700"
            }`}>
              <div className="flex items-center gap-3">
                <Trophy className={`${
                  whisky.ranking === 1 ? "text-amber-400" :
                  whisky.ranking === 2 ? "text-slate-300" :
                  whisky.ranking === 3 ? "text-amber-600" :
                  "text-slate-500"
                }`} size={24} />
                <div>
                  <p className="text-xs text-slate-400">Gathering Ranking</p>
                  <p className={`text-lg font-bold ${
                    whisky.ranking === 1 ? "text-amber-400" :
                    whisky.ranking === 2 ? "text-slate-300" :
                    whisky.ranking === 3 ? "text-amber-600" :
                    "text-slate-400"
                  }`}>
                    {whisky.ranking}{getOrdinalSuffix(whisky.ranking)} Place
                  </p>
                </div>
              </div>
            </div>
          )}

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

          {whisky.flavourProfile && (
            <div>
              <h3 className="text-lg font-bold text-amber-400 mb-3">flavour Profile</h3>
              <div className="bg-slate-800/50 p-4 rounded-lg border border-slate-700">
                <p className="text-slate-400 text-sm">
                  flavour radar visualization will be implemented here.
                </p>
                <div className="mt-2 text-xs text-slate-500">
                  Peat: {whisky.flavourProfile.peat} |
                  Fruit: {whisky.flavourProfile.fruit} |
                  Floral: {whisky.flavourProfile.floral} |
                  Spice: {whisky.flavourProfile.spice} |
                  Wood: {whisky.flavourProfile.wood} |
                  Sweetness: {whisky.flavourProfile.sweetness}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
