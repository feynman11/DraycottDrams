"use client";

import { useState, useMemo } from "react";
import { api } from "@/lib/trpc-client";
import { MapVisualization } from "./map-visualization";
import { DistilleryDetail } from "./distillery-detail";
import { type WhiskyWithGathering } from "@/lib/types";

export function WhiskyMap() {
  const [selectedDistillery, setSelectedDistillery] = useState<string | null>(null);
  const [selectedDistilleryWhiskies, setSelectedDistilleryWhiskies] = useState<WhiskyWithGathering[]>([]);
  const [gatheringFilter, setGatheringFilter] = useState<number | undefined>(undefined);
  const [showDistilleriesWithWhiskies, setShowDistilleriesWithWhiskies] = useState(false);
  
  const { data: whiskies, isLoading } = api.whisky.getAll.useQuery({
    gathering: gatheringFilter,
    limit: 1000, // Get all whiskies when filtered
  });
  
  const { data: allDistilleries } = api.distillery.getAll.useQuery({
    limit: 1000,
  });
  
  const { data: stats } = api.whisky.getStats.useQuery();

  const handleWhiskySelect = (whisky: WhiskyWithGathering) => {
    // Keep for backward compatibility if needed
  };

  const handleDistillerySelect = (distillery: string, distilleryWhiskies: WhiskyWithGathering[]) => {
    setSelectedDistillery(distillery);
    setSelectedDistilleryWhiskies(distilleryWhiskies);
  };

  const closeDetail = () => {
    setSelectedDistillery(null);
    setSelectedDistilleryWhiskies([]);
  };

  const handleGatheringChange = (gathering: number | undefined) => {
    setGatheringFilter(gathering);
    // Clear selection when filter changes
    setSelectedDistillery(null);
    setSelectedDistilleryWhiskies([]);
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

  // Create a map of distillery names to whisky counts
  const distilleryWhiskiesMap = useMemo(() => {
    if (!whiskies) return new Map<string, WhiskyWithGathering[]>();
    
    const map = new Map<string, WhiskyWithGathering[]>();
    whiskies.forEach((whisky) => {
      const distilleryName = whisky.distillery;
      if (!map.has(distilleryName)) {
        map.set(distilleryName, []);
      }
      map.get(distilleryName)!.push(whisky);
    });
    return map;
  }, [whiskies]);

  // Filter distilleries based on whisky count
  const filteredWhiskies = useMemo(() => {
    if (!whiskies || !allDistilleries) return whiskies || [];
    
    if (showDistilleriesWithWhiskies) {
      // Show all distilleries (including those without whiskies)
      // For distilleries without whiskies, we'll need to handle them in MapVisualization
      return whiskies;
    } else {
      // Default: Show only distilleries with whiskies
      return whiskies;
    }
  }, [whiskies, allDistilleries, showDistilleriesWithWhiskies]);

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
        whiskies={filteredWhiskies}
        allDistilleries={showDistilleriesWithWhiskies ? allDistilleries : undefined}
        distilleryWhiskiesMap={distilleryWhiskiesMap}
        onSelect={handleWhiskySelect}
        onDistillerySelect={handleDistillerySelect}
        selectedDistillery={selectedDistillery || undefined}
        gatheringFilter={gatheringFilter}
        gatherings={gatherings}
        gatheringThemes={gatheringThemes}
        onGatheringChange={handleGatheringChange}
        showDistilleriesWithWhiskies={showDistilleriesWithWhiskies}
        onShowDistilleriesWithWhiskiesChange={setShowDistilleriesWithWhiskies}
      />
      {selectedDistillery && (
        <DistilleryDetail
          distillery={selectedDistillery}
          whiskies={selectedDistilleryWhiskies}
          onClose={closeDetail}
        />
      )}
    </div>
  );
}
