import { useState, useMemo } from "react";
import { api } from "@/lib/trpc-client";
import { Building2, SearchX, WifiOff } from "lucide-react";
import { type Distillery, type WhiskyWithGathering } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { FilterBar, SearchField } from "@/components/ui/filter-bar";
import { PageHeader, HeaderStat } from "@/components/ui/page-header";
import { PageContainer } from "@/components/layout/app-shell";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { WhiskyDetail } from "@/components/whisky/whisky-detail";
import { DistilleryCard } from "./distillery-card";
import { DistilleryDetail } from "@/components/whisky/distillery-detail";
import { useDebounce } from "@/hooks/use-debounce";
import { cn } from "@/lib/utils";

type SortByOption = "default" | "name" | "avgRanking" | "wins" | "whiskyCount";

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-5";

export function DistilleryList() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedCountry, setSelectedCountry] = useState<string>("");
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [sortBy, setSortBy] = useState<SortByOption>("default");
  const [selectedDistillery, setSelectedDistillery] = useState<Distillery | null>(null);
  const [selectedWhisky, setSelectedWhisky] = useState<WhiskyWithGathering | null>(null);
  const [showDistilleriesWithWhiskies, setShowDistilleriesWithWhiskies] = useState(false);

  const { data: distilleries, isLoading, isError, refetch } = api.distillery.getAll.useQuery({
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
    type PerformanceType = NonNullable<typeof distilleryPerformance>[number];

    if (!distilleryPerformance) return new Map<string, PerformanceType>();

    const map = new Map<string, PerformanceType>();
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

  const loading = isLoading || whiskiesLoading || performanceLoading;
  const hasFilters = !!(searchTerm || selectedCountry || selectedRegion || sortBy !== "default" || showDistilleriesWithWhiskies);
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedCountry("");
    setSelectedRegion("");
    setSortBy("default");
    setShowDistilleriesWithWhiskies(false);
  };

  return (
    <PageContainer>
      <PageHeader
        title="Distilleries"
        description="Where the club's drams come from, and how each house has fared at the table."
        aside={<HeaderStat value={loading ? "—" : filteredAndSortedDistilleries.length} label="Distilleries" />}
        className="mb-6 md:mb-8"
      />

      <FilterBar className="mb-6 md:mb-8">
        <SearchField
          placeholder="Search by name, country or region…"
          aria-label="Search distilleries"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <Select
          aria-label="Country"
          value={selectedCountry}
          onChange={(e) => {
            setSelectedCountry(e.target.value);
            setSelectedRegion("");
          }}
        >
          <option value="">All countries</option>
          {countries.map((country) => (
            <option key={country.country} value={country.country}>
              {country.country} ({country.count})
            </option>
          ))}
        </Select>

        <Select aria-label="Region" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
          <option value="">All regions</option>
          {regions.map((region) => (
            <option key={region.region} value={region.region}>
              {region.region} ({region.count})
            </option>
          ))}
        </Select>

        <Select aria-label="Sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortByOption)}>
          <option value="default">Default order</option>
          <option value="name">Name A–Z</option>
          <option value="avgRanking">Best average place</option>
          <option value="wins">Most wins</option>
          <option value="whiskyCount">Most whiskies tasted</option>
        </Select>

        <Button
          variant={showDistilleriesWithWhiskies ? "default" : "outline"}
          aria-pressed={showDistilleriesWithWhiskies}
          onClick={() => setShowDistilleriesWithWhiskies(!showDistilleriesWithWhiskies)}
          className={cn(!showDistilleriesWithWhiskies && "text-muted-foreground")}
        >
          {showDistilleriesWithWhiskies ? "Showing untasted too" : "Include untasted"}
        </Button>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </FilterBar>

      {loading ? (
        <div className={GRID} aria-busy>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <EmptyState
          tone="error"
          icon={<WifiOff />}
          title="The distilleries couldn't load"
          description="Something went wrong fetching the list."
          action={<Button variant="outline" onClick={() => refetch()}>Try again</Button>}
        />
      ) : filteredAndSortedDistilleries.length === 0 ? (
        <EmptyState
          icon={hasFilters ? <SearchX /> : <Building2 />}
          title={showDistilleriesWithWhiskies ? "No distilleries found" : "No tasted distilleries match"}
          description={
            showDistilleriesWithWhiskies
              ? "Try a different search or region."
              : "Only distilleries the club has tasted are shown. Include untasted ones to see the full list."
          }
          action={hasFilters && <Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
        />
      ) : (
        <div className={GRID}>
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

      <DistilleryDetail
        distillery={selectedDistillery?.name ?? null}
        whiskies={selectedDistilleryWhiskies}
        onClose={() => setSelectedDistillery(null)}
      />

      <WhiskyDetail whisky={selectedWhisky} onClose={() => setSelectedWhisky(null)} />
    </PageContainer>
  );
}
