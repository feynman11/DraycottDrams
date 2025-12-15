"use client";

import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { MapVisualization } from "./map-visualization";
import { WhiskyDetail } from "./whisky-detail";

export function WhiskyMap() {
  const [selectedWhisky, setSelectedWhisky] = useState<any>(null);
  const [gatheringFilter, setGatheringFilter] = useState<number | undefined>(undefined);
  
  const { data: whiskies, isLoading } = api.whisky.getAll.useQuery({
    gathering: gatheringFilter,
    limit: 1000, // Get all whiskies when filtered
  });
  
  const { data: stats } = api.whisky.getStats.useQuery();

  const handleWhiskySelect = (whisky: any) => {
    setSelectedWhisky(whisky);
  };

  const closeDetail = () => {
    setSelectedWhisky(null);
  };

  const handleGatheringChange = (gathering: number | undefined) => {
    setGatheringFilter(gathering);
  };

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950">
        <div className="text-amber-500">Loading whisky atlas...</div>
      </div>
    );
  }

  if (!whiskies) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950">
        <div className="text-red-500">Failed to load whiskies</div>
      </div>
    );
  }

  const gatherings = stats?.gatherings
    ?.map((g) => g.gathering)
    .filter((g): g is number => g !== null)
    .sort((a, b) => a - b) || [];

  // Create a map of gathering numbers to themes
  // Use the first whisky from each gathering to get the theme
  const gatheringThemes = new Map<number, string>();
  whiskies.forEach((whisky) => {
    if (whisky.gathering && !gatheringThemes.has(whisky.gathering)) {
      gatheringThemes.set(whisky.gathering, whisky.theme || '');
    }
  });

  return (
    <div className="w-full h-full relative overflow-hidden">
      <MapVisualization
        whiskies={whiskies}
        onSelect={handleWhiskySelect}
        selectedId={selectedWhisky?.id}
        gatheringFilter={gatheringFilter}
        gatherings={gatherings}
        gatheringThemes={gatheringThemes}
        onGatheringChange={handleGatheringChange}
      />
      <WhiskyDetail whisky={selectedWhisky} onClose={closeDetail} />
    </div>
  );
}
