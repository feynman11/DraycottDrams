import { useState, useMemo } from "react";
import { api } from "@/lib/trpc-client";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { FilterBar, SearchField } from "@/components/ui/filter-bar";
import { PageHeader, HeaderStat } from "@/components/ui/page-header";
import { PageContainer } from "@/components/layout/app-shell";
import { SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { WhiskyCard } from "./whisky-card";
import { WhiskyDetail } from "./whisky-detail";
import { type WhiskyWithGathering } from "@/lib/types";
import { useDebounce } from "@/hooks/use-debounce";
import { Trophy, SearchX, WifiOff } from "lucide-react";
import { cn } from "@/lib/utils";

type GroupByOption = "none" | "gathering" | "region" | "country" | "distillery" | "variety" | "provider";
type SortByOption = "default" | "ranking" | "ranking-desc";

const GRID = "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 md:gap-5";

export function WhiskyLibrary() {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearchTerm = useDebounce(searchTerm, 500);
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [selectedGathering, setSelectedGathering] = useState<string>("");
  const [groupBy, setGroupBy] = useState<GroupByOption>("none");
  const [sortBy, setSortBy] = useState<SortByOption>("default");
  const [showWinnersOnly, setShowWinnersOnly] = useState(false);
  const [selectedWhisky, setSelectedWhisky] = useState<WhiskyWithGathering | null>(null);

  const { data: whiskies, isLoading, isError, refetch } = api.whisky.getAll.useQuery({
    search: debouncedSearchTerm || undefined,
    region: selectedRegion || undefined,
    gathering: selectedGathering ? parseInt(selectedGathering) : undefined,
    limit: 1000, // Show all whiskies
  });

  const { data: stats } = api.whisky.getStats.useQuery();
  const { data: totalCount } = api.whisky.getCount.useQuery();

  const regions = stats?.regions || [];
  const gatherings = stats?.gatherings || [];

  const hasFilters = !!(searchTerm || selectedRegion || selectedGathering || groupBy !== "none" || sortBy !== "default" || showWinnersOnly);
  const clearFilters = () => {
    setSearchTerm("");
    setSelectedRegion("");
    setSelectedGathering("");
    setGroupBy("none");
    setSortBy("default");
    setShowWinnersOnly(false);
  };

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

  return (
    <PageContainer>
      <PageHeader
        title="The Library"
        description="Every dram the club has tasted, from the first gathering to the latest."
        aside={<HeaderStat value={totalCount ?? "—"} label="Whiskies" />}
        className="mb-6 md:mb-8"
      />

      <FilterBar className="mb-6 md:mb-8">
        <SearchField
          placeholder="Search by name, country or region…"
          aria-label="Search whiskies"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />

        <Select aria-label="Region" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
          <option value="">All regions</option>
          {regions.map((region) => (
            <option key={region.region} value={region.region}>
              {region.region} ({region.count})
            </option>
          ))}
        </Select>

        <Select aria-label="Gathering" value={selectedGathering} onChange={(e) => setSelectedGathering(e.target.value)}>
          <option value="">All gatherings</option>
          {gatherings
            .sort((a, b) => a.gathering - b.gathering)
            .map((gathering) => (
              <option key={gathering.gathering} value={gathering.gathering.toString()}>
                Gathering {gathering.gathering} ({gathering.count})
              </option>
            ))}
        </Select>

        <Select aria-label="Group by" value={groupBy} onChange={(e) => setGroupBy(e.target.value as GroupByOption)}>
          <option value="none">No grouping</option>
          <option value="gathering">Group by gathering</option>
          <option value="region">Group by region</option>
          <option value="country">Group by country</option>
          <option value="distillery">Group by distillery</option>
          <option value="variety">Group by variety</option>
          <option value="provider">Group by provider</option>
        </Select>

        <Select aria-label="Sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as SortByOption)}>
          <option value="default">Default order</option>
          <option value="ranking">Best placed first</option>
          <option value="ranking-desc">Worst placed first</option>
        </Select>

        <Button
          variant={showWinnersOnly ? "default" : "outline"}
          aria-pressed={showWinnersOnly}
          onClick={() => setShowWinnersOnly(!showWinnersOnly)}
          className={cn(!showWinnersOnly && "text-muted-foreground")}
        >
          <Trophy size={16} />
          Winners only
        </Button>

        {hasFilters && (
          <Button variant="ghost" onClick={clearFilters}>
            Clear filters
          </Button>
        )}
      </FilterBar>

      {isLoading ? (
        <div className={GRID} aria-busy>
          {Array.from({ length: 8 }).map((_, i) => <SkeletonCard key={i} />)}
        </div>
      ) : isError ? (
        <EmptyState
          tone="error"
          icon={<WifiOff />}
          title="The library couldn't load"
          description="Something went wrong fetching the whiskies."
          action={<Button variant="outline" onClick={() => refetch()}>Try again</Button>}
        />
      ) : filteredWhiskies.length === 0 ? (
        <EmptyState
          icon={<SearchX />}
          title="No whiskies match"
          description="Try a broader search, another region, or clear the filters."
          action={hasFilters && <Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
        />
      ) : groupBy !== "none" && groupedWhiskies ? (
        <div className="space-y-10">
          {groupedWhiskies.map(({ key, label, whiskies: groupWhiskies }) => (
            <section key={key} className="space-y-4">
              <h2 className="flex items-baseline gap-2 border-b border-border pb-2 font-display text-2xl text-foreground">
                {label}
                <span className="text-sm font-sans text-subtle">
                  {groupWhiskies.length} {groupWhiskies.length === 1 ? "whisky" : "whiskies"}
                </span>
              </h2>
              <div className={GRID}>
                {groupWhiskies.map((whisky) => (
                  <WhiskyCard key={whisky.id} whisky={whisky} onClick={() => setSelectedWhisky(whisky)} />
                ))}
              </div>
            </section>
          ))}
        </div>
      ) : (
        <div className={GRID}>
          {filteredWhiskies.map((whisky) => (
            <WhiskyCard key={whisky.id} whisky={whisky} onClick={() => setSelectedWhisky(whisky)} />
          ))}
        </div>
      )}

      <WhiskyDetail whisky={selectedWhisky} onClose={() => setSelectedWhisky(null)} />
    </PageContainer>
  );
}
