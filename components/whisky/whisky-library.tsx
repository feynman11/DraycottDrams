"use client";

import { useState, useMemo } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { WhiskyCard } from "./whisky-card";
import { WhiskyDetail } from "./whisky-detail";
import { type WhiskyWithGathering } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { Trophy, ArrowUpDown } from "lucide-react";

type GroupByOption = "none" | "gathering" | "region" | "country" | "distillery" | "variety" | "provider";
type SortByOption = "default" | "ranking" | "ranking-desc";

export function WhiskyLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedGathering, setSelectedGathering] = useState<string>("");
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [sortBy, setSortBy] = useState<SortByOption>("default");
  const [showWinnersOnly, setShowWinnersOnly] = useState(false);
  const [selectedWhisky, setSelectedWhisky] = useState<WhiskyWithGathering | null>(null);

  const { data: whiskies, isLoading } = api.whisky.getAll.useQuery({
    search: debouncedSearchTerm || undefined,
    region: selectedRegion || undefined,
    gathering: selectedGathering ? parseInt(selectedGathering) : undefined,
    limit: 1000, // Show all whiskies
  });

  const { data: stats } = api.whisky.getStats.useQuery();
  const { data: totalCount } = api.whisky.getCount.useQuery();

  const regions = stats?.regions || [];
  const gatherings = stats?.gatherings || [];

  // Sort function for whiskies
  const sortWhiskies = (whiskyList: typeof whiskies) => {
    if (!whiskyList) return [];

    const sorted = [...whiskyList];

    if (sortBy === "ranking") {
      // Sort by ranking (1st first), unranked at the end
      sorted.sort((a, b) => {
        if (a.ranking === null && b.ranking === null) return 0;
        if (a.ranking === null) return 1;
        if (b.ranking === null) return -1;
        return a.ranking - b.ranking;
      });
    } else if (sortBy === "ranking-desc") {
      // Sort by ranking descending (worst first), unranked at the end
      sorted.sort((a, b) => {
        if (a.ranking === null && b.ranking === null) return 0;
        if (a.ranking === null) return 1;
        if (b.ranking === null) return -1;
        return b.ranking - a.ranking;
      });
    }

    return sorted;
  };

  // Filter whiskies based on winners only option
  const filteredWhiskies = useMemo(() => {
    if (!whiskies) return [];
    let result = [...whiskies];

    if (showWinnersOnly) {
      result = result.filter(w => w.ranking === 1);
    }

    return sortWhiskies(result);
  }, [whiskies, showWinnersOnly, sortBy]);

  // Group whiskies based on selected option
  const groupedWhiskies = useMemo(() => {
    if (groupBy === "none" || !filteredWhiskies.length) return null;

    const grouped = filteredWhiskies.reduce((acc, whisky) => {
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
    }, {} as Record<string | number, WhiskyWithGathering[]>);

    // Sort groups based on type
    const entries = Object.entries(grouped);

    switch (groupBy) {
      case "gathering":
        return entries
          .sort(([a], [b]) => parseInt(a) - parseInt(b))
          .map(([key, items]) => {
            // Sort items within gathering by ranking
            const sortedItems = sortWhiskies(items);
            const winner = sortedItems.find(w => w.ranking === 1);
            return {
              key: parseInt(key),
              label: `Gathering ${key}`,
              whiskies: sortedItems,
              winner,
            };
          });
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
            whiskies: sortWhiskies(items),
          }));
      default:
        return [];
    }
  }, [filteredWhiskies, groupBy, sortBy]);

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
        <div className="flex items-center justify-between mb-8 border-b border-slate-800 pb-4">
          <h2 className="text-3xl font-bold text-amber-50">
            The Library
          </h2>
          <div className="text-right">
            <div className="text-2xl font-bold text-amber-400">{totalCount ?? 0}</div>
            <div className="text-sm text-slate-400">Total Whiskies</div>
          </div>
        </div>

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

            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortByOption)}
              className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
            >
              <option value="default">Default Order</option>
              <option value="ranking">Sort by Ranking (Best First)</option>
              <option value="ranking-desc">Sort by Ranking (Worst First)</option>
            </select>

            {/* Winners Only Toggle */}
            <button
              onClick={() => setShowWinnersOnly(!showWinnersOnly)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${
                showWinnersOnly
                  ? "bg-amber-600 border-amber-500 text-white"
                  : "bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700"
              }`}
            >
              <Trophy size={16} />
              <span>Winners Only</span>
            </button>

            {(searchTerm || selectedRegion || selectedGathering || groupBy !== "none" || sortBy !== "default" || showWinnersOnly) && (
              <Button
                variant="outline"
                onClick={() => {
                  setSearchTerm("");
                  setSelectedRegion("");
                  setSelectedGathering("");
                  setGroupBy("none");
                  setSortBy("default");
                  setShowWinnersOnly(false);
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
            {filteredWhiskies?.map((whisky) => (
              <WhiskyCard
                key={whisky.id}
                whisky={whisky}
                onClick={() => setSelectedWhisky(whisky)}
              />
            ))}
          </div>
        )}

        {filteredWhiskies?.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-400 text-lg">No whiskies found matching your criteria.</p>
            <Button
              variant="outline"
              onClick={() => {
                setSearchTerm("");
                setSelectedRegion("");
                setSelectedGathering("");
                setGroupBy("none");
                setSortBy("default");
                setShowWinnersOnly(false);
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
