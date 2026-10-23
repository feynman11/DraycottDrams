import { useState, useMemo } from "react";
import { api } from "@/lib/trpc-client";
import { MapVisualization } from "./map-visualization";
import { DistilleryDetail } from "./distillery-detail";
import { type WhiskyWithGathering } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Loader2, MapPinOff } from "lucide-react";

export function WhiskyMap() {
  const [selectedDistillery, setSelectedDistillery] = useState<string | null>(null);
  const [selectedDistilleryWhiskies, setSelectedDistilleryWhiskies] = useState<WhiskyWithGathering[]>([]);
  const [gatheringFilter, setGatheringFilter] = useState<number | undefined>(undefined);
  const [showDistilleriesWithWhiskies, setShowDistilleriesWithWhiskies] = useState(false);
  const [showDistilleriesWithoutTastings, setShowDistilleriesWithoutTastings] = useState(false);

  const { data: whiskies, isLoading, isError, refetch } = api.whisky.getAll.useQuery({
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

  // All hooks must be called before any early returns
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

  // Early returns after all hooks have been called
  if (isLoading) {
    return (
      <div className="flex h-full w-full items-center justify-center" aria-busy>
        <div className="flex flex-col items-center gap-3 animate-fade-in">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-sm text-muted-foreground">Loading the whisky atlas…</span>
        </div>
      </div>
    );
  }

  if (isError || !whiskies) {
    return (
      <div className="flex h-full w-full items-center justify-center p-6">
        <EmptyState
          tone="error"
          icon={<MapPinOff />}
          title="The atlas couldn't load"
          description="The whisky list didn't come back from the server. Check your connection and try again."
          action={<Button variant="outline" onClick={() => refetch()}>Try again</Button>}
          className="w-full max-w-md"
        />
      </div>
    );
  }

  const gatherings = stats?.gatherings
    ?.map((g) => g.gathering)
    .filter((g): g is number => g !== null)
    .sort((a, b) => a - b) || [];

  // Create a map of gathering numbers to themes from stats
  const gatheringThemes = new Map<number, string>();
  stats?.gatherings?.forEach((g) => {
    if (g.gathering !== null) {
      gatheringThemes.set(g.gathering, g.theme || '');
    }
  });

  return (
    <div className="relative h-full w-full overflow-hidden">
      <MapVisualization
        whiskies={whiskies}
        allDistilleries={showDistilleriesWithWhiskies || showDistilleriesWithoutTastings ? allDistilleries : undefined}
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
        showDistilleriesWithoutTastings={showDistilleriesWithoutTastings}
        onShowDistilleriesWithoutTastingsChange={setShowDistilleriesWithoutTastings}
      />
      <DistilleryDetail
        distillery={selectedDistillery}
        whiskies={selectedDistilleryWhiskies}
        onClose={closeDetail}
      />
    </div>
  );
}
