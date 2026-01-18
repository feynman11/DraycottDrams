"use client";

import { type Distillery } from "@/lib/types";
import { Building2, MapPin, Globe, Trophy, Medal } from "lucide-react";

interface DistilleryCardProps {
  distillery: Distillery;
  whiskyCount?: number;
  avgRanking?: number | null;
  wins?: number;
  onClick?: () => void;
}

export function DistilleryCard({ distillery, whiskyCount = 0, avgRanking = null, wins = 0, onClick }: DistilleryCardProps) {
  const hasScore = avgRanking !== null;

  return (
    <div
      onClick={onClick}
      className={`group bg-slate-900 border rounded-xl p-0 overflow-hidden transition-all cursor-pointer shadow-lg flex flex-col ${
        hasScore && avgRanking !== null && avgRanking <= 2.5
          ? "border-amber-500/50 hover:border-amber-400 hover:shadow-amber-900/20 ring-1 ring-amber-500/20"
          : "border-slate-800 hover:border-amber-600/50 hover:shadow-amber-900/10"
      }`}
    >
      {/* Top gradient bar - gold for top performers */}
      <div className={`h-3 w-full ${
        hasScore && avgRanking !== null && avgRanking <= 2.5
          ? "bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500"
          : hasScore && avgRanking !== null && avgRanking <= 3.5
            ? "bg-gradient-to-r from-amber-700 to-orange-700"
            : "bg-gradient-to-r from-slate-700 to-slate-600"
      }`} />

      <div className="p-5 flex-1 flex flex-col relative">
        {/* Average ranking badge - positioned top right */}
        {hasScore && avgRanking !== null && (
          <div className="absolute top-3 right-3">
            <div className="flex items-center gap-1 bg-amber-500/20 px-2 py-1 rounded">
              <Medal className="text-amber-400" size={14} />
              <span className="text-xs font-bold text-amber-400">
                {avgRanking.toFixed(1)}
              </span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-start mb-2 pr-10">
          <span className="text-xs font-bold text-amber-500 bg-amber-950/50 px-2 py-1 rounded uppercase tracking-wider">
            {distillery.region}
          </span>
        </div>

        <h3 className={`text-xl font-bold transition-colors mb-1 ${
          hasScore && avgRanking !== null && avgRanking <= 2.5
            ? "text-amber-400 group-hover:text-amber-300"
            : "text-slate-100 group-hover:text-amber-400"
        }`}>
          {distillery.name}
        </h3>

        <div className="flex flex-wrap items-center gap-3 text-sm text-slate-400 mb-3">
          <div className="flex items-center gap-1">
            <MapPin size={14} />
            <span>{distillery.country}</span>
          </div>
          {distillery.founded && (
            <div className="flex items-center gap-1">
              <Building2 size={14} />
              <span>Founded {distillery.founded}</span>
            </div>
          )}
        </div>

        {distillery.description && (
          <p className="text-xs text-slate-400 mb-4 line-clamp-2">
            {distillery.description}
          </p>
        )}

        <div className="mt-auto pt-4 border-t border-slate-800 flex justify-between items-center">
          <div className="flex items-center gap-3">
            {whiskyCount > 0 && (
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500">{whiskyCount}</span>
                <span className="text-xs text-slate-600">
                  {whiskyCount === 1 ? "whisky" : "whiskies"}
                </span>
              </div>
            )}
            {wins > 0 && (
              <div className="flex items-center gap-1">
                <Trophy className="text-amber-500" size={14} />
                <span className="text-xs font-semibold text-amber-500">{wins}</span>
                <span className="text-xs text-slate-600">
                  {wins === 1 ? "win" : "wins"}
                </span>
              </div>
            )}
          </div>
          {distillery.website && (
            <a
              href={distillery.website}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-400 transition-colors"
            >
              <Globe size={12} />
              <span>Website</span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

