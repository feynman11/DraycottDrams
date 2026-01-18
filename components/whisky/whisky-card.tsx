"use client";

import { type WhiskyWithGathering } from "@/lib/types";
import { RankingBadge, RankingBar } from "./ranking-badge";

interface WhiskyCardProps {
  whisky: WhiskyWithGathering;
  onClick?: () => void;
}

export function WhiskyCard({ whisky, onClick }: WhiskyCardProps) {
  const isWinner = whisky.ranking === 1;

  return (
    <div
      onClick={onClick}
      className={`group bg-slate-900 border rounded-xl p-0 overflow-hidden transition-all cursor-pointer shadow-lg flex flex-col ${
        isWinner
          ? "border-amber-500/50 hover:border-amber-400 hover:shadow-amber-900/20 ring-1 ring-amber-500/20"
          : "border-slate-800 hover:border-amber-600/50 hover:shadow-amber-900/10"
      }`}
    >
      {/* Top gradient bar - gold for winners */}
      <div className={`h-3 w-full ${
        isWinner
          ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"
          : whisky.ranking === 2
            ? "bg-gradient-to-r from-slate-400 to-slate-300"
            : whisky.ranking === 3
              ? "bg-gradient-to-r from-amber-700 to-orange-700"
              : "bg-gradient-to-r from-amber-700 to-amber-500"
      }`} />

      <div className="p-5 flex-1 flex flex-col relative">
        {/* Ranking badge - positioned top right */}
        {whisky.ranking && (
          <div className="absolute top-3 right-3">
            <RankingBadge ranking={whisky.ranking} size="md" />
          </div>
        )}

        <div className="flex justify-between items-start mb-2 pr-10">
          <span className="text-xs font-bold text-amber-500 bg-amber-950/50 px-2 py-1 rounded uppercase tracking-wider">
            {whisky.region}
          </span>
        </div>

        <h3 className={`text-xl font-bold transition-colors mb-1 ${
          isWinner
            ? "text-amber-400 group-hover:text-amber-300"
            : "text-slate-100 group-hover:text-amber-400"
        }`}>
          {whisky.distillery}
        </h3>
        <p className="text-sm text-slate-400 mb-2">{whisky.variety}</p>
        <p className="text-xs text-slate-500 mb-4">Provided by {whisky.provider}</p>

        {/* Ranking bar indicator */}
        {whisky.ranking && (
          <RankingBar ranking={whisky.ranking} className="mb-4" />
        )}

        <div className="mt-auto pt-4 border-t border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">{whisky.country}</span>
            <span className="text-xs text-slate-600">|</span>
            <span className="text-xs text-slate-500">{whisky.abv}% ABV</span>
          </div>
          <span className="text-amber-600 font-bold text-sm">View Details →</span>
        </div>
      </div>
    </div>
  );
}
