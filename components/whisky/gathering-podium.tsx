"use client";

import { type WhiskyWithGathering } from "@/lib/types";
import { Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

interface GatheringPodiumProps {
  whiskies: WhiskyWithGathering[];
  gatheringNumber: number;
  theme?: string;
  onWhiskyClick?: (whisky: WhiskyWithGathering) => void;
}

export function GatheringPodium({ whiskies, gatheringNumber, theme, onWhiskyClick }: GatheringPodiumProps) {
  // Get top 3 whiskies by ranking
  const rankedWhiskies = whiskies
    .filter(w => w.ranking !== null && w.ranking <= 3)
    .sort((a, b) => (a.ranking || 0) - (b.ranking || 0));

  const first = rankedWhiskies.find(w => w.ranking === 1);
  const second = rankedWhiskies.find(w => w.ranking === 2);
  const third = rankedWhiskies.find(w => w.ranking === 3);

  // Get remaining whiskies (4th and below)
  const otherWhiskies = whiskies
    .filter(w => w.ranking === null || w.ranking > 3)
    .sort((a, b) => (a.ranking || 999) - (b.ranking || 999));

  if (!first && !second && !third) {
    return null; // No ranking data for this gathering
  }

  return (
    <div className="bg-slate-900/50 rounded-xl p-6 border border-slate-800">
      {/* Header */}
      <div className="text-center mb-6">
        <h3 className="text-xl font-bold text-amber-400">Gathering {gatheringNumber}</h3>
        {theme && <p className="text-slate-400 text-sm mt-1">{theme}</p>}
      </div>

      {/* Podium Display */}
      <div className="flex items-end justify-center gap-4 mb-6">
        {/* Second Place */}
        <div className="flex flex-col items-center">
          {second && (
            <PodiumCard
              whisky={second}
              position={2}
              onClick={() => onWhiskyClick?.(second)}
            />
          )}
          <div className="w-24 h-16 bg-gradient-to-b from-slate-400 to-slate-500 rounded-t-lg flex items-center justify-center mt-2">
            <span className="text-2xl font-bold text-slate-800">2</span>
          </div>
        </div>

        {/* First Place (tallest) */}
        <div className="flex flex-col items-center -mt-4">
          {first && (
            <PodiumCard
              whisky={first}
              position={1}
              onClick={() => onWhiskyClick?.(first)}
            />
          )}
          <div className="w-28 h-24 bg-gradient-to-b from-amber-400 to-amber-600 rounded-t-lg flex items-center justify-center mt-2 shadow-lg shadow-amber-500/20">
            <Trophy className="text-amber-900" size={32} />
          </div>
        </div>

        {/* Third Place */}
        <div className="flex flex-col items-center">
          {third && (
            <PodiumCard
              whisky={third}
              position={3}
              onClick={() => onWhiskyClick?.(third)}
            />
          )}
          <div className="w-24 h-12 bg-gradient-to-b from-amber-700 to-amber-800 rounded-t-lg flex items-center justify-center mt-2">
            <span className="text-2xl font-bold text-amber-200">3</span>
          </div>
        </div>
      </div>

      {/* Other Rankings */}
      {otherWhiskies.length > 0 && (
        <div className="border-t border-slate-800 pt-4 mt-4">
          <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Also Tasted</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {otherWhiskies.map((whisky) => (
              <button
                key={whisky.id}
                onClick={() => onWhiskyClick?.(whisky)}
                className="flex items-center gap-2 p-2 rounded-lg bg-slate-800/50 hover:bg-slate-700/50 transition-colors text-left"
              >
                {whisky.ranking && (
                  <span className="text-xs font-bold text-slate-500 w-6">
                    {whisky.ranking}th
                  </span>
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-300 truncate">{whisky.distillery}</p>
                  <p className="text-xs text-slate-500 truncate">{whisky.variety}</p>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface PodiumCardProps {
  whisky: WhiskyWithGathering;
  position: 1 | 2 | 3;
  onClick?: () => void;
}

function PodiumCard({ whisky, position, onClick }: PodiumCardProps) {
  const positionStyles = {
    1: {
      bg: "bg-gradient-to-br from-amber-900/80 to-yellow-900/60",
      border: "border-amber-500/50",
      text: "text-amber-400",
      shadow: "shadow-amber-500/20",
    },
    2: {
      bg: "bg-gradient-to-br from-slate-700/80 to-slate-600/60",
      border: "border-slate-400/50",
      text: "text-slate-300",
      shadow: "shadow-slate-400/10",
    },
    3: {
      bg: "bg-gradient-to-br from-amber-800/80 to-orange-900/60",
      border: "border-amber-600/50",
      text: "text-amber-500",
      shadow: "shadow-amber-600/10",
    },
  };

  const styles = positionStyles[position];

  return (
    <button
      onClick={onClick}
      className={cn(
        "w-28 p-3 rounded-lg border transition-all hover:scale-105 cursor-pointer",
        styles.bg,
        styles.border,
        `shadow-lg ${styles.shadow}`
      )}
    >
      <div className="flex items-center justify-center mb-2">
        {position === 1 ? (
          <Trophy className="text-amber-400" size={20} />
        ) : (
          <Medal className={position === 2 ? "text-slate-300" : "text-amber-600"} size={20} />
        )}
      </div>
      <p className={cn("text-sm font-bold truncate text-center", styles.text)}>
        {whisky.distillery}
      </p>
      <p className="text-xs text-slate-400 truncate text-center mt-1">
        {whisky.variety}
      </p>
      <p className="text-xs text-slate-500 text-center mt-1">
        by {whisky.provider}
      </p>
    </button>
  );
}

// Compact inline podium for list views
interface InlinePodiumProps {
  whiskies: WhiskyWithGathering[];
  onWhiskyClick?: (whisky: WhiskyWithGathering) => void;
}

export function InlinePodium({ whiskies, onWhiskyClick }: InlinePodiumProps) {
  const top3 = whiskies
    .filter(w => w.ranking !== null && w.ranking <= 3)
    .sort((a, b) => (a.ranking || 0) - (b.ranking || 0));

  if (top3.length === 0) return null;

  return (
    <div className="flex items-center gap-2 py-2">
      {top3.map((whisky) => (
        <button
          key={whisky.id}
          onClick={() => onWhiskyClick?.(whisky)}
          className={cn(
            "flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-colors",
            whisky.ranking === 1
              ? "bg-amber-500/20 text-amber-400 hover:bg-amber-500/30"
              : whisky.ranking === 2
                ? "bg-slate-400/20 text-slate-300 hover:bg-slate-400/30"
                : "bg-amber-700/20 text-amber-500 hover:bg-amber-700/30"
          )}
        >
          {whisky.ranking === 1 ? (
            <Trophy size={12} />
          ) : (
            <Medal size={12} />
          )}
          <span className="truncate max-w-[100px]">{whisky.distillery}</span>
        </button>
      ))}
    </div>
  );
}
