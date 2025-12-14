"use client";

import { useState, useEffect } from "react";
import { api } from "@/lib/trpc-client";
import { MapVisualization } from "./map-visualization";
import { WhiskyDetail } from "./whisky-detail";

export function WhiskyMap() {
  const [selectedWhisky, setSelectedWhisky] = useState<any>(null);
  const { data: whiskies, isLoading } = api.whisky.getAll.useQuery();

  const handleWhiskySelect = (whisky: any) => {
    setSelectedWhisky(whisky);
  };

  const closeDetail = () => {
    setSelectedWhisky(null);
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

  return (
    <div className="w-full h-full relative">
      <MapVisualization
        whiskies={whiskies}
        onSelect={handleWhiskySelect}
        selectedId={selectedWhisky?.id}
      />
      <WhiskyDetail whisky={selectedWhisky} onClose={closeDetail} />
    </div>
  );
}
