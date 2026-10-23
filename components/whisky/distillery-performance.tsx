import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Building2, Trophy, Medal, TrendingUp, MapPin } from "lucide-react";
import { Select } from "@/components/ui/select";
import { FilterBar } from "@/components/ui/filter-bar";
import { Table, TableBody, TableHeader, TableRow, TableScroll } from "@/components/ui/table";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { AvgRank } from "./provider-leaderboard";
import { rankTone } from "./ranking-badge";
import { cn } from "@/lib/utils";

export function DistilleryPerformance() {
  const [sortBy, setSortBy] = useState<"wins" | "avgRanking" | "entries">("wins");
  const [filterRegion, setFilterRegion] = useState<string>("");

  const { data: distilleries, isLoading } = api.whisky.getDistilleryPerformance.useQuery();
  const { data: stats } = api.whisky.getStats.useQuery();

  const regions = stats?.regions || [];

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy>
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
        <div className="rounded-xl border border-border bg-card"><SkeletonRows rows={6} cols={5} /></div>
      </div>
    );
  }

  if (!distilleries || distilleries.length === 0) {
    return <EmptyState icon={<Building2 />} title="No ranking data yet" description="Distillery stats appear once gatherings have positions recorded." />;
  }

  // Filter by region
  let filteredDistilleries = filterRegion
    ? distilleries.filter(d => d.region === filterRegion)
    : distilleries;

  // Only show distilleries with ranking data
  filteredDistilleries = filteredDistilleries.filter(d => d.avgRanking !== null);

  // Sort
  const sortedDistilleries = [...filteredDistilleries].sort((a, b) => {
    if (sortBy === "wins") {
      return Number(b.wins) - Number(a.wins);
    } else if (sortBy === "avgRanking") {
      if (a.avgRanking === null) return 1;
      if (b.avgRanking === null) return -1;
      return a.avgRanking - b.avgRanking;
    } else {
      return b.totalEntries - a.totalEntries;
    }
  });

  // Get top performers for highlight cards
  const topByWins = [...filteredDistilleries]
    .filter(d => Number(d.wins) > 0)
    .sort((a, b) => Number(b.wins) - Number(a.wins))
    .slice(0, 5);

  const topByAvgRank = [...filteredDistilleries]
    .filter(d => d.avgRanking !== null && d.totalEntries >= 2)
    .sort((a, b) => (a.avgRanking || 999) - (b.avgRanking || 999))
    .slice(0, 5);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-foreground">Distillery performance</h2>
        <p className="mt-1 text-sm text-muted-foreground">Which distilleries consistently produce winning whiskies.</p>
      </div>

      {/* Top Performers Cards */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <HighlightList icon={<Trophy className="text-gold" />} title="Most wins">
          {topByWins.map((distillery, index) => (
            <HighlightRow
              key={distillery.distilleryId}
              index={index}
              title={distillery.distillery}
              subtitle={`${distillery.region}, ${distillery.country}`}
              value={
                <span className="inline-flex items-center gap-1 rounded-md bg-gold/15 px-2 py-1 text-sm font-semibold tabular-nums text-gold">
                  <Trophy size={12} /> {distillery.wins}
                </span>
              }
            />
          ))}
        </HighlightList>

        <HighlightList icon={<TrendingUp className="text-success" />} title="Best average place" note="min. 2 entries">
          {topByAvgRank.map((distillery, index) => (
            <HighlightRow
              key={distillery.distilleryId}
              index={index}
              title={distillery.distillery}
              subtitle={`${distillery.totalEntries} entries`}
              value={
                <span className="inline-flex items-baseline gap-1 rounded-md bg-success/15 px-2 py-1 text-sm font-semibold tabular-nums text-success">
                  {distillery.avgRanking?.toFixed(1)} <span className="text-xs font-normal">avg</span>
                </span>
              }
            />
          ))}
        </HighlightList>
      </div>

      <FilterBar>
        <Select aria-label="Region" value={filterRegion} onChange={(e) => setFilterRegion(e.target.value)}>
          <option value="">All regions</option>
          {regions.map((region) => (
            <option key={region.region} value={region.region}>
              {region.region}
            </option>
          ))}
        </Select>

        <Select aria-label="Sort" value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)}>
          <option value="wins">Most wins</option>
          <option value="avgRanking">Best average place</option>
          <option value="entries">Most entries</option>
        </Select>
      </FilterBar>

      <TableScroll>
        <Table>
          <TableHeader>
            <tr>
              <th>Distillery</th>
              <th>Region</th>
              <th className="text-center!"><span className="inline-flex items-center gap-1"><Trophy size={12} className="text-gold" /> Wins</span></th>
              <th className="text-center!"><span className="inline-flex items-center gap-1"><Medal size={12} /> Podiums</span></th>
              <th className="text-center!">Entries</th>
              <th className="text-center!">Avg place</th>
              <th>Podium rate</th>
            </tr>
          </TableHeader>
          <TableBody>
            {sortedDistilleries.map((distillery) => (
              <TableRow key={distillery.distilleryId}>
                <td className="font-medium text-foreground">{distillery.distillery}</td>
                <td>
                  <span className="inline-flex items-center gap-1 text-muted-foreground">
                    <MapPin size={12} className="text-subtle" />
                    {distillery.region}
                  </span>
                </td>
                <td className={cn("text-center font-semibold tabular-nums", Number(distillery.wins) > 0 ? "text-gold" : "text-subtle")}>
                  {distillery.wins}
                </td>
                <td className={cn("text-center tabular-nums", Number(distillery.podiums) > 0 ? "text-foreground" : "text-subtle")}>
                  {distillery.podiums}
                </td>
                <td className="text-center tabular-nums text-muted-foreground">{distillery.totalEntries}</td>
                <td className="text-center"><AvgRank value={distillery.avgRanking} /></td>
                <td>
                  <PerformanceBar
                    wins={Number(distillery.wins)}
                    podiums={Number(distillery.podiums)}
                    total={distillery.totalEntries}
                  />
                </td>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableScroll>
    </div>
  );
}

function HighlightList({ icon, title, note, children }: { icon: React.ReactNode; title: string; note?: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 [&_svg]:size-4">
        {icon}
        <h3 className="font-semibold text-foreground">{title}</h3>
        {note && <span className="text-xs text-subtle">({note})</span>}
      </div>
      <ol className="space-y-2.5">{children}</ol>
    </div>
  );
}

function HighlightRow({ index, title, subtitle, value }: { index: number; title: string; subtitle: string; value: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3">
      <span className={cn("w-5 text-center text-sm font-semibold tabular-nums", index < 3 ? rankTone(index + 1).text : "text-subtle")}>
        {index + 1}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-subtle">{subtitle}</p>
      </div>
      {value}
    </li>
  );
}

interface PerformanceBarProps {
  wins: number;
  podiums: number;
  total: number;
}

function PerformanceBar({ wins, podiums, total }: PerformanceBarProps) {
  if (total === 0) return <span className="text-subtle">–</span>;

  const winPercent = (wins / total) * 100;
  const podiumPercent = (podiums / total) * 100;
  const otherPodiumPercent = podiumPercent - winPercent;

  return (
    <div className="flex items-center gap-2" title={`${Math.round(winPercent)}% wins, ${Math.round(podiumPercent)}% podiums`}>
      <div className="flex h-1.5 w-20 overflow-hidden rounded-full bg-muted">
        <div className="h-full bg-gold" style={{ width: `${winPercent}%` }} />
        <div className="h-full bg-silver" style={{ width: `${otherPodiumPercent}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{Math.round(podiumPercent)}%</span>
    </div>
  );
}
