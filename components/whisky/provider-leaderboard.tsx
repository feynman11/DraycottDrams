import { api } from "@/lib/trpc-client";
import { Trophy, Medal, TrendingUp, Users } from "lucide-react";
import { Table, TableBody, TableHeader, TableRow, TableScroll } from "@/components/ui/table";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { RankingBadge, rankTone } from "./ranking-badge";
import { cn } from "@/lib/utils";

export function ProviderLeaderboard() {
  const { data: leaderboard, isLoading } = api.whisky.getProviderLeaderboard.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy>
        <div className="grid grid-cols-3 gap-3 md:gap-4">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-36 rounded-xl" />)}
        </div>
        <div className="rounded-xl border border-border bg-card"><SkeletonRows rows={6} cols={5} /></div>
      </div>
    );
  }

  if (!leaderboard || leaderboard.length === 0) {
    return <EmptyState icon={<Users />} title="No ranking data yet" description="Leaderboards appear once gatherings have positions recorded." />;
  }

  // Filter to only show providers with at least one ranked whisky
  const rankedProviders = leaderboard.filter(p => p.avgRanking !== null);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl text-foreground">Provider leaderboard</h2>
        <p className="mt-1 text-sm text-muted-foreground">Which members bring the best whiskies to gatherings.</p>
      </div>

      {/* Top 3 Podium */}
      <div className="grid grid-cols-3 gap-3 md:gap-4">
        {rankedProviders.slice(0, 3).map((provider, index) => (
          <TopProviderCard key={provider.provider} provider={provider} position={index + 1} />
        ))}
      </div>

      <TableScroll>
        <Table>
          <TableHeader>
            <tr>
              <th>Rank</th>
              <th>Provider</th>
              <th className="text-center!"><span className="inline-flex items-center gap-1"><Trophy size={12} className="text-gold" /> Wins</span></th>
              <th className="text-center!"><span className="inline-flex items-center gap-1"><Medal size={12} /> Podiums</span></th>
              <th className="text-center!">Entries</th>
              <th className="text-center!"><span className="inline-flex items-center gap-1"><TrendingUp size={12} /> Avg place</span></th>
              <th>Win rate</th>
            </tr>
          </TableHeader>
          <TableBody>
            {rankedProviders.map((provider, index) => {
              const winRate = provider.totalEntries > 0
                ? ((Number(provider.wins) / provider.totalEntries) * 100).toFixed(0)
                : 0;

              return (
                <TableRow key={provider.provider}>
                  <td><RankingBadge ranking={index + 1} size="sm" /></td>
                  <td className="font-medium text-foreground">{provider.provider}</td>
                  <td className={cn("text-center font-semibold tabular-nums", Number(provider.wins) > 0 ? "text-gold" : "text-subtle")}>
                    {provider.wins}
                  </td>
                  <td className={cn("text-center tabular-nums", Number(provider.podiums) > 0 ? "text-foreground" : "text-subtle")}>
                    {provider.podiums}
                  </td>
                  <td className="text-center tabular-nums text-muted-foreground">{provider.totalEntries}</td>
                  <td className="text-center"><AvgRank value={provider.avgRanking} /></td>
                  <td><WinRateBar winRate={Number(winRate)} /></td>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </TableScroll>
    </div>
  );
}

interface TopProviderCardProps {
  provider: {
    provider: string;
    wins: number;
    podiums: number;
    totalEntries: number;
    avgRanking: number | null;
  };
  position: number;
}

function TopProviderCard({ provider, position }: TopProviderCardProps) {
  const tone = rankTone(position);

  return (
    <div className={cn("flex flex-col items-center rounded-xl border p-4 text-center", tone.bg, tone.border)}>
      <span className={cn("mb-2 [&_svg]:size-6", tone.text)}>{position === 1 ? <Trophy /> : <Medal />}</span>
      <p className={cn("text-xs font-medium", tone.text)}>{tone.label} place</p>
      <p className="mt-1 w-full truncate text-base font-semibold text-foreground md:text-lg">{provider.provider}</p>
      <div className="mt-3 flex w-full flex-col items-center gap-1 border-t border-border/60 pt-3 text-xs sm:flex-row sm:justify-center sm:gap-4">
        <span><span className="font-semibold tabular-nums text-gold">{provider.wins}</span> <span className="text-subtle">wins</span></span>
        <span><span className="font-semibold tabular-nums text-foreground">{provider.podiums}</span> <span className="text-subtle">podiums</span></span>
      </div>
    </div>
  );
}

// Lower is better: 2 or under is excellent, 3 solid, 4 middling
export function AvgRank({ value }: { value: number | null }) {
  if (value === null) return <span className="text-subtle">–</span>;

  const color =
    value <= 2 ? "text-success" :
    value <= 3 ? "text-primary" :
    value <= 4 ? "text-warning" :
    "text-muted-foreground";

  return <span className={cn("font-medium tabular-nums", color)}>{value.toFixed(1)}</span>;
}

function WinRateBar({ winRate }: { winRate: number }) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full bg-primary" style={{ width: `${Math.min(winRate, 100)}%` }} />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{winRate}%</span>
    </div>
  );
}
