"use client";

import { useState, useMemo } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { WhiskyCard } from "./whisky-card";
import { WhiskyDetail } from "./whisky-detail";
import { type WhiskyWithGathering } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";

type GroupByOption = "none" | "gathering" | "region" | "country" | "distillery" | "variety" | "provider";

export function WhiskyLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedGathering, setSelectedGathering] = useState<string>("");
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [selectedWhisky, setSelectedWhisky] = useState<WhiskyWithGathering | null>(null);

  const { data: whiskies, isLoading } = api.whisky.getAll.useQuery({
    search: debouncedSearchTerm || undefined,
    region: selectedRegion || undefined,
    gathering: selectedGathering ? parseInt(selectedGathering) : undefined,
    limit: groupBy !== "none" ? 1000 : 50, // Use max limit when grouping to show all whiskies
  });

  const { data: stats } = api.whisky.getStats.useQuery();

  const regions = stats?.regions || [];
  const gatherings = stats?.gatherings || [];

  // Group whiskies based on selected option
  const groupedWhiskies = useMemo(() => {
    if (groupBy === "none" || !whiskies) return null;

    const grouped = whiskies.reduce((acc, whisky) => {
      let key: string | number;
      
      switch (groupBy) {
        case "gathering":
          key = whisky.gathering;
          break;
        case "region":
          key = whisky.region || "Unknown Region";
          break;
        case "country":
          key = whisky.country || "Unknown Country";
          break;
        case "distillery":
          key = whisky.distillery || "Unknown Distillery";
          break;
        case "variety":
          key = whisky.variety || "Unknown Variety";
          break;
        case "provider":
          key = whisky.provider || "Unknown Provider";
          break;
        default:
          return acc;
      }

      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(whisky);
      return acc;
    }, {} as Record<string | number, typeof whiskies>);

    // Sort groups based on type
    const entries = Object.entries(grouped);
    
    switch (groupBy) {
      case "gathering":
        return entries
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([key, items]) => ({
            key: parseInt(key),
            label: `Gathering ${key}`,
            whiskies: items,
          }));
      case "region":
      case "country":
      case "distillery":
      case "variety":
      case "provider":
        return entries
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([key, items]) => ({
            key,
            label: key as string,
            whiskies: items,
          }));
      default:
        return [];
    }
  }, [whiskies, groupBy]);

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
              placeholder="Search by name, country, or region..."
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

            <select
              value={groupBy}
              onChange={(e) => setGroupBy(e.target.value as GroupByOption)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="none">No Grouping</option>
              <option value="gathering">Group by Gathering</option>
              <option value="region">Group by Region</option>
              <option value="country">Group by Country</option>
              <option value="distillery">Group by Distillery</option>
              <option value="variety">Group by Variety</option>
              <option value="provider">Group by Provider</option>
            </select>

            {(searchTerm || selectedRegion || selectedGathering || groupBy !== "none") && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedRegion("");
                  setSelectedGathering("");
                  setGroupBy("none");
                }}
                className="text-slate-400 border-slate-700 hover:bg-slate-800"
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>

        {/* Whisky Grid */}
        {groupBy !== "none" && groupedWhiskies ? (
          <div className="space-y-8">
            {groupedWhiskies.map(({ key, label, whiskies: groupWhiskies }) => (
              <div key={key} className="space-y-4">
                <h3 className="text-2xl font-semibold text-amber-50 border-b border-slate-800 pb-2">
                  {label}
                  <span className="text-lg font-normal text-slate-400 ml-2">
                    ({groupWhiskies.length} {groupWhiskies.length === 1 ? "whisky" : "whiskies"})
                  </span>
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  {groupWhiskies.map((whisky) => (
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
                setGroupBy("none");
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
