"use client";

import { useState, useMemo } from "react";
import { api } from "@/lib/trpc-client";
import { Loader2, Building2, Search, Trophy, ArrowUpDown } from "lucide-react";
import { type Distillery, type WhiskyWithGathering } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { WhiskyCard } from "@/components/whisky/whisky-card";
import { WhiskyDetail } from "@/components/whisky/whisky-detail";
import { DistilleryCard } from "./distillery-card";
import { DistilleryDetail } from "@/components/whisky/distillery-detail";
import { useDebounce } from "@/hooks/use-debounce";

type GroupByOption = "none" | "gathering" | "region" | "country" | "variety" | "provider";
type SortByOption = "default" | "name" | "avgRanking" | "wins" | "whiskyCount";

export function DistilleryList() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortByOption>("default");
  const [selectedDistillery, setSelectedDistillery] = useState<Distillery | null>(null);
  const [selectedWhisky, setSelectedWhisky] = useState<WhiskyWithGathering | null>(null);
  const [showDistilleriesWithWhiskies, setShowDistilleriesWithWhiskies] = useState(false);

  const { data: distilleries, isLoading } = api.distillery.getAll.useQuery({
    search: debouncedSearchTerm || undefined,
    country: selectedCountry || undefined,
    region: selectedRegion || undefined,
    limit: 1000,
  });

  const { data: whiskies, isLoading: whiskiesLoading } = api.whisky.getAll.useQuery({
    limit: 1000,
  });

  const { data: distilleryPerformance, isLoading: performanceLoading } = api.whisky.getDistilleryPerformance.useQuery();
  const { data: stats } = api.whisky.getStats.useQuery();

  const countries = stats?.countries || [];
  const regions = stats?.regions || [];

  // Create a map of distillery names to whisky counts and lists
  const distilleryWhiskiesMap = useMemo(() => {
    if (!whiskies) return new Map<string, { count: number; whiskies: WhiskyWithGathering[] }>();
    
    const map = new Map<string, WhiskyWithGathering[]>();
    whiskies.forEach((whisky) => {
      const distilleryName = whisky.distillery;
      if (!map.has(distilleryName)) {
        map.set(distilleryName, []);
      }
      map.get(distilleryName)!.push(whisky);
    });

    const result = new Map<string, { count: number; whiskies: WhiskyWithGathering[] }>();
    map.forEach((whiskiesList, distilleryName) => {
      result.set(distilleryName, {
        count: whiskiesList.length,
        whiskies: whiskiesList,
      });
    });

    return result;
  }, [whiskies]);

  // Create a map of distillery performance data by distillery name
  const distilleryPerformanceMap = useMemo(() => {
    if (!distilleryPerformance) return new Map<string, typeof distilleryPerformance[0]>();
    
    const map = new Map<string, typeof distilleryPerformance[0]>();
    distilleryPerformance.forEach((perf) => {
      map.set(perf.distillery, perf);
    });
    
    return map;
  }, [distilleryPerformance]);

  // Get whiskies for selected distillery
  const selectedDistilleryWhiskies = useMemo(() => {
    if (!selectedDistillery || !whiskies) return [];
    return whiskies.filter((w) => w.distillery === selectedDistillery.name);
  }, [selectedDistillery, whiskies]);

  // Filter and sort distilleries
  const filteredAndSortedDistilleries = useMemo(() => {
    if (!distilleries) return [];
    
    // Filter distilleries
    let filtered = distilleries.filter((distillery) => {
      const whiskyData = distilleryWhiskiesMap.get(distillery.name);
      const whiskyCount = whiskyData?.count || 0;
      
      if (showDistilleriesWithWhiskies) {
        return true;
      } else {
        return whiskyCount > 0;
      }
    });

    // Sort distilleries
    const sorted = [...filtered].sort((a, b) => {
      const aWhiskyData = distilleryWhiskiesMap.get(a.name);
      const aWhiskyCount = aWhiskyData?.count || 0;
      const aPerf = distilleryPerformanceMap.get(a.name);
      const aAvgRanking = aPerf?.avgRanking ?? null;
      const aWins = aPerf?.wins ? Number(aPerf.wins) : 0;

      const bWhiskyData = distilleryWhiskiesMap.get(b.name);
      const bWhiskyCount = bWhiskyData?.count || 0;
      const bPerf = distilleryPerformanceMap.get(b.name);
      const bAvgRanking = bPerf?.avgRanking ?? null;
      const bWins = bPerf?.wins ? Number(bPerf.wins) : 0;

      switch (sortBy) {
        case "name":
          return a.name.localeCompare(b.name);
        case "avgRanking":
          if (aAvgRanking === null && bAvgRanking === null) return 0;
          if (aAvgRanking === null) return 1;
          if (bAvgRanking === null) return -1;
          return aAvgRanking - bAvgRanking;
        case "wins":
          return bWins - aWins;
        case "whiskyCount":
          return bWhiskyCount - aWhiskyCount;
        default:
          return 0;
      }
    });

    return sorted;
  }, [distilleries, distilleryWhiskiesMap, distilleryPerformanceMap, showDistilleriesWithWhiskies, sortBy]);

  if (isLoading || whiskiesLoading || performanceLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-slate-950">
      <div className="w-full h-full overflow-y-auto p-4 sm:p-6 lg:p-12">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-between mb-6 sm:mb-8 border-b border-slate-800 pb-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-bold mb-2 text-amber-50 flex items-center gap-2">
                <Building2 className="w-6 h-6 sm:w-8 sm:h-8" />
                Distilleries
              </h2>
              <p className="text-slate-400 text-sm sm:text-base">
                Explore distilleries from around the world
              </p>
            </div>
            <div className="text-right">
              <div className="text-xl sm:text-2xl font-bold text-amber-400">
                {filteredAndSortedDistilleries.length}
              </div>
              <div className="text-xs sm:text-sm text-slate-400">Total Distilleries</div>
            </div>
          </div>

          {/* Filters */}
          <div className="mb-6 sm:mb-8 space-y-4">
            <div className="flex flex-wrap gap-3 sm:gap-4">
              <input
                type="text"
                placeholder="Search by name, country, or region..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm sm:text-base placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500 flex-1 min-w-[200px]"
              />

              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setSelectedRegion("");
                }}
                className="px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Countries</option>
                {countries.map((country) => (
                  <option key={country.country} value={country.country}>
                    {country.country} ({country.count})
                  </option>
                ))}
              </select>

              <select
                value={selectedRegion}
                onChange={(e) => setSelectedRegion(e.target.value)}
                className="px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Regions</option>
                {regions.map((region) => (
                  <option key={region.region} value={region.region}>
                    {region.region} ({region.count})
                  </option>
                ))}
              </select>

              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as SortByOption)}
                className="px-3 sm:px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-amber-500 flex items-center gap-2"
              >
                <option value="default">Default Order</option>
                <option value="name">Sort by Name</option>
                <option value="avgRanking">Sort by Avg. Ranking (Best First)</option>
                <option value="wins">Sort by Wins</option>
                <option value="whiskyCount">Sort by Whisky Count</option>
              </select>

              <Button
                variant={showDistilleriesWithWhiskies ? "default" : "outline"}
                onClick={() => setShowDistilleriesWithWhiskies(!showDistilleriesWithWhiskies)}
                className={`text-sm sm:text-base ${
                  showDistilleriesWithWhiskies
                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                    : "text-slate-400 border-slate-700 hover:bg-slate-800"
                }`}
              >
                {showDistilleriesWithWhiskies ? "Showing All" : "Show All"}
              </Button>

              {(searchTerm || selectedCountry || selectedRegion || sortBy !== "default" || showDistilleriesWithWhiskies) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCountry("");
                    setSelectedRegion("");
                    setSortBy("default");
                    setShowDistilleriesWithWhiskies(false);
                  }}
                  className="text-slate-400 border-slate-700 hover:bg-slate-800 text-sm sm:text-base"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Distilleries Grid */}
          {!filteredAndSortedDistilleries || filteredAndSortedDistilleries.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">
                {showDistilleriesWithWhiskies 
                  ? "No distilleries found." 
                  : "No distilleries with whiskies found."}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
              {filteredAndSortedDistilleries.map((distillery: Distillery) => {
                const whiskyData = distilleryWhiskiesMap.get(distillery.name);
                const whiskyCount = whiskyData?.count || 0;
                const performance = distilleryPerformanceMap.get(distillery.name);
                const avgRanking = performance?.avgRanking ?? null;
                const wins = performance?.wins ? Number(performance.wins) : 0;

                return (
                  <DistilleryCard
                    key={distillery.id}
                    distillery={distillery}
                    whiskyCount={whiskyCount}
                    avgRanking={avgRanking}
                    wins={wins}
                    onClick={() => setSelectedDistillery(distillery)}
                  />
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Distillery Detail Panel */}
      {selectedDistillery && (
        <DistilleryDetail
          distillery={selectedDistillery.name}
          whiskies={selectedDistilleryWhiskies}
          onClose={() => setSelectedDistillery(null)}
        />
      )}

      {/* Whisky Detail Panel */}
      <WhiskyDetail
        whisky={selectedWhisky}
        onClose={() => setSelectedWhisky(null)}
      />
    </div>
  );
}

