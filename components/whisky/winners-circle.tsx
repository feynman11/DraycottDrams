import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Trophy, Medal, Users, Building2, Calendar, BarChart3, Globe } from "lucide-react";
import { WhiskyDetail } from "./whisky-detail";
import { type WhiskyWithGathering } from "@/lib/types";
import { ProviderLeaderboard } from "./provider-leaderboard";
import { DistilleryPerformance } from "./distillery-performance";
import { PageContainer } from "@/components/layout/app-shell";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs } from "@/components/ui/tabs";
import { Select } from "@/components/ui/select";
import { FilterBar } from "@/components/ui/filter-bar";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Badge } from "@/components/ui/badge";

type WinnersTab = "winners" | "providers" | "distilleries" | "analytics";

const TABS = [
  { value: "winners" as const, label: "Winners", icon: <Trophy /> },
  { value: "providers" as const, label: "Providers", icon: <Users /> },
  { value: "distilleries" as const, label: "Distilleries", icon: <Building2 /> },
  { value: "analytics" as const, label: "Analytics", icon: <BarChart3 /> },
];

export function WinnersCircle() {
  const [selectedYear, setSelectedYear] = useState<number | undefined>();
  const [selectedRegion, setSelectedRegion] = useState<string>("");
  const [activeTab, setActiveTab] = useState<WinnersTab>("winners");
  const [selectedWhisky, setSelectedWhisky] = useState<WhiskyWithGathering | null>(null);

  const { data: winners, isLoading: winnersLoading } = api.whisky.getWinners.useQuery({
    year: selectedYear,
    region: selectedRegion || undefined,
  });

  const { data: stats, isLoading: statsLoading } = api.whisky.getRankingStats.useQuery();
  const { data: whiskyStats } = api.whisky.getStats.useQuery();
  const { data: countryStats, isLoading: countryStatsLoading } = api.whisky.getAverageRankingByCountry.useQuery();
  const { data: strengthStats, isLoading: strengthStatsLoading } = api.whisky.getAverageRankingByStrength.useQuery();

  const regions = whiskyStats?.regions || [];

  // Get unique years from winners
  const years = winners
    ? [...new Set(winners.map(w => new Date(w.date).getFullYear()))].sort((a, b) => b - a)
    : [];

  return (
    <PageContainer>
      <PageHeader
        title="Winners Circle"
        description="Celebrating the best whisky from every gathering, and the members who brought them."
        className="mb-6 md:mb-8"
      />

      {/* Stats Summary */}
      <div className="mb-6 grid grid-cols-2 gap-3 md:mb-8 md:grid-cols-4 md:gap-4">
        {statsLoading || !stats ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)
        ) : (
          <>
            <StatCard icon={<Trophy />} label="Winners" value={stats.totalRanked > 0 ? Math.floor(stats.gatheringsWithRankings) : 0} accent />
            <StatCard icon={<Calendar />} label="Gatherings ranked" value={stats.gatheringsWithRankings} />
            <StatCard
              icon={<Building2 />}
              label="Top distillery"
              value={stats.topDistillery?.distillery || "N/A"}
              subtitle={stats.topDistillery ? `${stats.topDistillery.wins} wins` : undefined}
            />
            <StatCard
              icon={<Users />}
              label="Top provider"
              value={stats.topProvider?.provider || "N/A"}
              subtitle={stats.topProvider ? `${stats.topProvider.wins} wins` : undefined}
            />
          </>
        )}
      </div>

      <Tabs items={TABS} value={activeTab} onChange={setActiveTab} label="Winners sections" className="mb-6" />

      {activeTab === "winners" && (
        <>
          <FilterBar className="mb-6">
            <Select
              aria-label="Year"
              value={selectedYear || ""}
              onChange={(e) => setSelectedYear(e.target.value ? parseInt(e.target.value) : undefined)}
            >
              <option value="">All years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </Select>

            <Select aria-label="Region" value={selectedRegion} onChange={(e) => setSelectedRegion(e.target.value)}>
              <option value="">All regions</option>
              {regions.map((region) => (
                <option key={region.region} value={region.region}>
                  {region.region}
                </option>
              ))}
            </Select>
          </FilterBar>

          {winnersLoading ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3" aria-busy>
              {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
            </div>
          ) : winners && winners.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              {winners.map((winner) => (
                <WinnerCard
                  key={winner.id}
                  winner={winner}
                  onClick={() => {
                    // Create a WhiskyWithGathering-like object for the detail view
                    setSelectedWhisky({
                      id: winner.id,
                      provider: winner.provider,
                      variety: winner.variety,
                      abv: winner.abv,
                      ranking: winner.ranking,
                      distillery: winner.distillery,
                      country: winner.country,
                      region: winner.region,
                      gathering: winner.gathering,
                      theme: winner.theme || '',
                      date: winner.date,
                      host: winner.host || '',
                    } as WhiskyWithGathering);
                  }}
                />
              ))}
            </div>
          ) : (
            <EmptyState icon={<Trophy />} title="No winners for these filters" description="Try another year or region." />
          )}
        </>
      )}

      {activeTab === "providers" && <ProviderLeaderboard />}
      {activeTab === "distilleries" && <DistilleryPerformance />}

      {activeTab === "analytics" && (
        <div className="space-y-10">
          <section>
            <SectionTitle icon={<BarChart3 />} title="Average place by strength" />
            {strengthStatsLoading ? (
              <BreakdownSkeleton />
            ) : strengthStats && strengthStats.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
                {strengthStats.map((stat, index) => (
                  <BreakdownCard key={index} title={stat.range} stat={stat} />
                ))}
              </div>
            ) : (
              <EmptyState icon={<BarChart3 />} title="No strength data yet" />
            )}
          </section>

          <section>
            <SectionTitle icon={<Globe />} title="Average place by country" />
            {countryStatsLoading ? (
              <BreakdownSkeleton />
            ) : countryStats && countryStats.length > 0 ? (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4">
                {countryStats.map((stat) => (
                  <BreakdownCard key={stat.country} title={stat.country} stat={stat} />
                ))}
              </div>
            ) : (
              <EmptyState icon={<Globe />} title="No country data yet" />
            )}
          </section>
        </div>
      )}

      <WhiskyDetail whisky={selectedWhisky} onClose={() => setSelectedWhisky(null)} />
    </PageContainer>
  );
}

function SectionTitle({ icon, title }: { icon: React.ReactNode; title: string }) {
  return (
    <h2 className="mb-4 flex items-center gap-2 font-display text-2xl text-foreground [&_svg]:size-5 [&_svg]:text-primary">
      {icon}
      {title}
    </h2>
  );
}

function BreakdownSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 md:gap-4" aria-busy>
      {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)}
    </div>
  );
}

interface WinnerCardProps {
  winner: {
    id: string;
    provider: string;
    variety: string;
    abv: string;
    ranking: number | null;
    distillery: string;
    country: string;
    region: string;
    gathering: number;
    theme: string | null;
    date: Date;
    host: string | null;
  };
  onClick: () => void;
}

function WinnerCard({ winner, onClick }: WinnerCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex w-full flex-col rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 to-card p-5 text-left shadow-sm transition-[transform,border-color,box-shadow] duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-0.5 hover:border-gold/60 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0"
    >
      <span aria-hidden className="absolute inset-y-5 left-0 w-0.5 rounded-r-full bg-gold" />

      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gold/15 text-gold">
            <Trophy size={15} />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-gold">Gathering {winner.gathering}</p>
            {winner.theme && <p className="truncate text-xs text-muted-foreground">{winner.theme}</p>}
          </div>
        </div>
        <span className="shrink-0 text-xs tabular-nums text-subtle">
          {new Date(winner.date).toLocaleDateString('en-GB', { month: 'short', year: 'numeric' })}
        </span>
      </div>

      <h3 className="mt-4 text-lg font-semibold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
        {winner.distillery}
      </h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{winner.variety}</p>

      <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-3 text-xs text-subtle">
        <span className="truncate">
          Provided by <span className="font-medium text-muted-foreground">{winner.provider}</span>
        </span>
        <span className="shrink-0 truncate">{[winner.region, winner.country].filter(Boolean).join(", ")}</span>
      </div>
    </button>
  );
}

interface BreakdownStat {
  avgRanking: number | null;
  totalEntries: number;
  rankedEntries: number;
  wins: number;
}

// One card for the by-country and by-strength breakdowns
function BreakdownCard({ title, stat }: { title: string; stat: BreakdownStat }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-border-strong">
      <div className="mb-3 flex items-center justify-between gap-3">
        <h3 className="truncate text-base font-semibold text-foreground">{title}</h3>
        {stat.avgRanking !== null && (
          <Badge variant="default" title="Average place">
            <Medal /> {stat.avgRanking.toFixed(2)}
          </Badge>
        )}
      </div>
      <dl className="grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-subtle">Entries</dt>
          <dd className="font-semibold tabular-nums text-foreground">{stat.totalEntries}</dd>
        </div>
        <div>
          <dt className="text-subtle">Ranked</dt>
          <dd className="font-semibold tabular-nums text-foreground">{stat.rankedEntries}</dd>
        </div>
        <div>
          <dt className="text-subtle">Wins</dt>
          <dd className="font-semibold tabular-nums text-gold">{stat.wins}</dd>
        </div>
      </dl>
    </div>
  );
}
