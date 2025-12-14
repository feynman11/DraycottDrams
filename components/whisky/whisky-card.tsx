"use client";

import { type Whisky } from "@/db/schema";
import { GlassWater } from "lucide-react";

interface WhiskyCardProps {
  whisky: Whisky;
  onClick?: () => void;
}

export function WhiskyCard({ whisky, onClick }: WhiskyCardProps) {
  return (
    <div
      onClick={onClick}
      className="group bg-slate-900 border border-slate-800 rounded-xl p-0 overflow-hidden hover:border-amber-600/50 transition-all cursor-pointer shadow-lg hover:shadow-amber-900/10 flex flex-col"
    >
      <div className="h-3 bg-gradient-to-r from-amber-700 to-amber-500 w-full" />
      <div className="p-5 flex-1 flex flex-col">
        <div className="flex justify-between items-start mb-2">
          <span className="text-xs font-bold text-amber-500 bg-amber-950/50 px-2 py-1 rounded uppercase tracking-wider">
            {whisky.region}
          </span>
          <span className="text-xs text-slate-500">{whisky.abv}% ABV</span>
        </div>
        <h3 className="text-xl font-bold text-slate-100 group-hover:text-amber-400 transition-colors mb-1">
          {whisky.name}
        </h3>
        <p className="text-sm text-slate-400 mb-4">{whisky.distillery}</p>
        <div className="mt-auto pt-4 border-t border-slate-800 flex justify-between items-center">
          <span className="text-xs text-slate-500">{whisky.type}</span>
          <span className="text-amber-600 font-bold text-sm">View Details →</span>
        </div>
      </div>
    </div>
  );
}
