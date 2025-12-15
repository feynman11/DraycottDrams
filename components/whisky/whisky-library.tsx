"use client";

import { useState, useMemo } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { WhiskyCard } from "./whisky-card";
import { WhiskyDetail } from "./whisky-detail";
import { type Whisky } from "@/db/schema";

export function WhiskyLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedGathering, setSelectedGathering] = useState<string>("");
  const [groupByGathering, setGroupByGathering] = useState(false);
  const [selectedWhisky, setSelectedWhisky] = useState<Whisky | null>(null);

  const { data: whiskies, isLoading } = api.whisky.getAll.useQuery({
    search: searchTerm || undefined,
    region: selectedRegion || undefined,
    gathering: selectedGathering ? parseInt(selectedGathering) : undefined,
    limit: groupByGathering ? 100 : 50, // Use max limit when grouping to show all whiskies
  });

  const { data: stats } = api.whisky.getStats.useQuery();

  const regions = stats?.regions || [];
  const gatherings = stats?.gatherings || [];

  // Group whiskies by gathering when grouping is enabled
  const groupedWhiskies = useMemo(() => {
    if (!groupByGathering || !whiskies) return null;

    const grouped = whiskies.reduce((acc, whisky) => {
      const gatheringNum = whisky.gathering;
      if (!acc[gatheringNum]) {
        acc[gatheringNum] = [];
      }
      acc[gatheringNum].push(whisky);
      return acc;
    }, {} as Record<number, typeof whiskies>);

    // Sort by gathering number
    return Object.entries(grouped)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .map(([gathering, items]) => ({
        gathering: parseInt(gathering),
        whiskies: items,
      }));
  }, [whiskies, groupByGathering]);

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-slate-950">
        <div className="text-amber-500">Loading whisky library...</div>
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-slate-950">
      <div className="w-full h-full overflow-y-auto p-6 lg:p-12">
        <div className="max-w-7xl mx-auto">
        <h2 className="text-3xl font-bold mb-8 text-amber-50 border-b border-slate-800 pb-4">
          The Library
        </h2>

        {/* Filters */}
        <div className="mb-8 space-y-4">
          <div className="flex flex-wrap gap-4">
            <input
              type="text"
              placeholder="Search whiskies..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
            />

            <select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Regions</option>
              {regions.map((region) => (
                <option key={region.region} value={region.region}>
                  {region.region} ({region.count})
                </option>
              ))}
            </select>

            <select
              value={selectedGathering}
              onChange={(e) => setSelectedGathering(e.target.value)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="">All Gatherings</option>
              {gatherings
                .sort((a, b) => a.gathering - b.gathering)
                .map((gathering) => (
                  <option key={gathering.gathering} value={gathering.gathering.toString()}>
                    Gathering {gathering.gathering} ({gathering.count})
                  </option>
                ))}
            </select>

            <label className="flex items-center gap-2 px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 cursor-pointer hover:bg-slate-700">
              <input
                type="checkbox"
                checked={groupByGathering}
                onChange={(e) => setGroupByGathering(e.target.checked)}
                className="w-4 h-4 text-amber-500 bg-slate-700 border-slate-600 rounded focus:ring-amber-500"
              />
              <span>Group by Gathering</span>
            </label>

            {(searchTerm || selectedRegion || selectedGathering) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedRegion("");
                  setSelectedGathering("");
                }}
                className="text-slate-400 border-slate-700 hover:bg-slate-800"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Whisky Grid */}
        {groupByGathering && groupedWhiskies ? (
          <div className="space-y-8">
            {groupedWhiskies.map(({ gathering, whiskies: gatheringWhiskies }) => (
              <div key={gathering} className="space-y-4">
                <h3 className="text-2xl font-semibold text-amber-50 border-b border-slate-800 pb-2">
                  Gathering {gathering}
                  <span className="text-lg font-normal text-slate-400 ml-2">
                    ({gatheringWhiskies.length} {gatheringWhiskies.length === 1 ? "whisky" : "whiskies"})
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {gatheringWhiskies.map((whisky) => (
                    <WhiskyCard 
                      key={whisky.id} 
                      whisky={whisky} 
                      onClick={() => setSelectedWhisky(whisky)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {whiskies?.map((whisky) => (
              <WhiskyCard 
                key={whisky.id} 
                whisky={whisky} 
                onClick={() => setSelectedWhisky(whisky)}
              />
            ))}
          </div>
        )}

        {whiskies?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No whiskies found matching your criteria.</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setSelectedRegion("");
                setSelectedGathering("");
              }}
              className="mt-4 text-slate-400 border-slate-700 hover:bg-slate-800"
            >
              Clear Filters
            </Button>
          </div>
        )}
        </div>
      </div>
      
      {/* Whisky Detail Panel */}
      <WhiskyDetail 
        whisky={selectedWhisky} 
        onClose={() => setSelectedWhisky(null)} 
      />
    </div>
  );
}
