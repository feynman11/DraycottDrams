"use client";

import { useState, useMemo } from "react";
import { api } from "@/lib/trpc-client";
import { Loader2, Building2, MapPin, Globe, Search, ChevronDown, ChevronUp, Droplets } from "lucide-react";
import { type Distillery, type WhiskyWithGathering } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { WhiskyCard } from "@/components/whisky/whisky-card";
import { WhiskyDetail } from "@/components/whisky/whisky-detail";
import { useDebounce } from "@/hooks/use-debounce";

type GroupByOption = "none" | "gathering" | "region" | "country" | "variety" | "provider";

export function DistilleryList() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedGathering, setSelectedGathering] = useState<string>("");
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [expandedDistillery, setExpandedDistillery] = useState<string | null>(null);
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

  const { data: stats } = api.whisky.getStats.useQuery();

  const countries = stats?.countries || [];
  const regions = stats?.regions || [];
  const gatherings = stats?.gatherings || [];

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

  // Get whiskies for expanded distillery with filters
  const expandedDistilleryWhiskies = useMemo(() => {
    if (!expandedDistillery || !whiskies) return [];
    
    let filtered = whiskies.filter((w) => w.distillery === expandedDistillery);

    if (selectedGathering) {
      filtered = filtered.filter((w) => w.gathering === parseInt(selectedGathering));
    }

    if (searchTerm) {
      const searchLower = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (w) =>
          w.variety?.toLowerCase().includes(searchLower) ||
          w.provider?.toLowerCase().includes(searchLower) ||
          w.notes?.toLowerCase().includes(searchLower)
      );
    }

    return filtered;
  }, [expandedDistillery, whiskies, selectedGathering, searchTerm]);

  // Group whiskies for expanded distillery
  const groupedExpandedWhiskies = useMemo(() => {
    if (groupBy === "none" || !expandedDistilleryWhiskies.length) return null;

    const grouped = expandedDistilleryWhiskies.reduce((acc, whisky) => {
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
    }, {} as Record<string | number, typeof expandedDistilleryWhiskies>);

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
  }, [expandedDistilleryWhiskies, groupBy]);

  // Filter distilleries based on whisky count
  const filteredDistilleries = useMemo(() => {
    if (!distilleries) return [];
    
    return distilleries.filter((distillery) => {
      const whiskyData = distilleryWhiskiesMap.get(distillery.name);
      const whiskyCount = whiskyData?.count || 0;
      
      if (showDistilleriesWithWhiskies) {
        // Show all distilleries (including those without whiskies)
        return true;
      } else {
        // Default: Show only distilleries with whiskies
        return whiskyCount > 0;
      }
    });
  }, [distilleries, distilleryWhiskiesMap, showDistilleriesWithWhiskies]);

  const handleDistilleryToggle = (distilleryName: string) => {
    if (expandedDistillery === distilleryName) {
      setExpandedDistillery(null);
    } else {
      setExpandedDistillery(distilleryName);
    }
  };

  if (isLoading || whiskiesLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    );
  }

  return (
    <div className="w-full h-full relative bg-slate-950">
      <div className="w-full h-full overflow-y-auto p-6 lg:p-12">
        <div className="max-w-7xl mx-auto">
          <div className="mb-8">
            <h2 className="text-3xl font-bold mb-2 text-amber-50 flex items-center gap-2">
              <Building2 className="w-8 h-8" />
              Distilleries
            </h2>
            <p className="text-slate-400">
              Explore distilleries from around the world
            </p>
          </div>

          {/* Filters */}
          <div className="mb-8 space-y-4">
            <div className="flex flex-wrap gap-4 items-center">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400" size={18} />
                <input
                  type="text"
                  placeholder={expandedDistillery ? "Search whiskies..." : "Search by name, country, or region..."}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <Button
                variant={showDistilleriesWithWhiskies ? "default" : "outline"}
                onClick={() => setShowDistilleriesWithWhiskies(!showDistilleriesWithWhiskies)}
                className={`${
                  showDistilleriesWithWhiskies
                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                    : "text-slate-400 border-slate-700 hover:bg-slate-800"
                }`}
              >
                {showDistilleriesWithWhiskies ? "Showing All" : "Show Distilleries without Whiskies"}
              </Button>

              <select
                value={selectedCountry}
                onChange={(e) => {
                  setSelectedCountry(e.target.value);
                  setSelectedRegion("");
                }}
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
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
                className="px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg text-slate-200 focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="">All Regions</option>
                {regions.map((region) => (
                  <option key={region.region} value={region.region}>
                    {region.region} ({region.count})
                  </option>
                ))}
              </select>

              {expandedDistillery && (
                <>
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
                    <option value="variety">Group by Variety</option>
                    <option value="provider">Group by Provider</option>
                  </select>
                </>
              )}

              {(searchTerm || selectedCountry || selectedRegion || selectedGathering || groupBy !== "none" || showDistilleriesWithWhiskies) && (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSearchTerm("");
                    setSelectedCountry("");
                    setSelectedRegion("");
                    setSelectedGathering("");
                    setGroupBy("none");
                    setShowDistilleriesWithWhiskies(false);
                  }}
                  className="text-slate-400 border-slate-700 hover:bg-slate-800"
                >
                  Clear Filters
                </Button>
              )}
            </div>
          </div>

          {/* Distilleries List */}
          {!filteredDistilleries || filteredDistilleries.length === 0 ? (
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-8 text-center">
              <Building2 className="w-12 h-12 text-slate-600 mx-auto mb-4" />
              <p className="text-slate-400">
                {showDistilleriesWithWhiskies 
                  ? "No distilleries found." 
                  : "No distilleries with whiskies found."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredDistilleries.map((distillery: Distillery) => {
                const whiskyData = distilleryWhiskiesMap.get(distillery.name);
                const whiskyCount = whiskyData?.count || 0;
                const isExpanded = expandedDistillery === distillery.name;

                return (
                  <div
                    key={distillery.id}
                    className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden transition-all"
                  >
                    {/* Distillery Card Header */}
                    <button
                      onClick={() => handleDistilleryToggle(distillery.name)}
                      className="w-full p-6 text-left hover:bg-slate-800/50 transition-colors flex items-center justify-between group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <h3 className="text-xl font-bold text-slate-100 group-hover:text-amber-400 transition-colors">
                            {distillery.name}
                          </h3>
                          <div className="flex items-center gap-2 ml-4">
                            {distillery.coordinates && (
                              <MapPin className="w-5 h-5 text-amber-500 flex-shrink-0" />
                            )}
                            {isExpanded ? (
                              <ChevronUp className="w-5 h-5 text-slate-400" />
                            ) : (
                              <ChevronDown className="w-5 h-5 text-slate-400" />
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
                          <div className="flex items-center gap-2">
                            <MapPin size={14} />
                            <span>{distillery.region}, {distillery.country}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Droplets size={14} />
                            <span className="font-semibold text-amber-500">
                              {whiskyCount} {whiskyCount === 1 ? "whisky" : "whiskies"}
                            </span>
                          </div>
                          {distillery.founded && (
                            <div className="flex items-center gap-2">
                              <Building2 size={14} />
                              <span>Founded {distillery.founded}</span>
                            </div>
                          )}
                          {distillery.website && (
                            <a
                              href={distillery.website}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-2 hover:text-amber-400 transition-colors"
                            >
                              <Globe size={14} />
                              <span className="truncate max-w-[200px]">Website</span>
                            </a>
                          )}
                        </div>

                        {distillery.description && (
                          <p className="mt-3 text-sm text-slate-300 line-clamp-2">
                            {distillery.description}
                          </p>
                        )}
                      </div>
                    </button>

                    {/* Expanded Whisky List */}
                    {isExpanded && whiskyData && (
                      <div className="border-t border-slate-800 p-6">
                        {expandedDistilleryWhiskies.length === 0 ? (
                          <div className="text-center py-8 text-slate-400">
                            No whiskies found matching your filters.
                          </div>
                        ) : groupBy !== "none" && groupedExpandedWhiskies ? (
                          <div className="space-y-6">
                            {groupedExpandedWhiskies.map(({ key, label, whiskies: groupWhiskies }) => (
                              <div key={key} className="space-y-4">
                                <h4 className="text-lg font-semibold text-amber-50 border-b border-slate-800 pb-2">
                                  {label}
                                  <span className="text-sm font-normal text-slate-400 ml-2">
                                    ({groupWhiskies.length} {groupWhiskies.length === 1 ? "whisky" : "whiskies"})
                                  </span>
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                            {expandedDistilleryWhiskies.map((whisky) => (
                              <WhiskyCard
                                key={whisky.id}
                                whisky={whisky}
                                onClick={() => setSelectedWhisky(whisky)}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
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

