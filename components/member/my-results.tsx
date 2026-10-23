import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { Trophy, Medal, TrendingUp, Wine, Home, UserX } from "lucide-react";
import { RankingBadge } from "@/components/whisky/ranking-badge";
import { PageHeader } from "@/components/ui/page-header";
import { StatCard } from "@/components/ui/stat-card";
import { Tabs } from "@/components/ui/tabs";
import { Skeleton, SkeletonRows } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableHeader, TableRow, TableScroll } from "@/components/ui/table";
import { cn } from "@/lib/utils";

export function MyResults() {
  const [selectedTab, setSelectedTab] = useState<"contributions" | "hosted">("contributions");

  const { data, isLoading } = api.member.getMyResults.useQuery();

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy>
        <Skeleton className="h-10 w-48" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <div className="rounded-xl border border-border bg-card"><SkeletonRows rows={5} cols={4} /></div>
      </div>
    );
  }

  if (!data?.member) {
    return (
      <div className="space-y-6">
        <PageHeader as="h2" title="My results" description="Your whisky contributions and scores." />
        <EmptyState
          icon={<UserX />}
          title="Your account isn't linked to a member profile yet"
          description="Ask an administrator to link your account and your results will appear here."
        />
      </div>
    );
  }

  const { member, contributions, hostedGatherings, stats } = data;

  return (
    <div className="space-y-6">
      <PageHeader as="h2" title="My results" description={`Welcome back, ${member.name}.`} />

      <div className="grid grid-cols-2 gap-3 md:grid-cols-5 md:gap-4">
        <StatCard icon={<Wine />} label="Contributions" value={stats.totalContributions} />
        <StatCard icon={<Trophy />} label="Wins" value={stats.wins} accent />
        <StatCard icon={<Medal />} label="Podiums" value={stats.podiums} />
        <StatCard icon={<TrendingUp />} label="Avg place" value={stats.avgRanking !== null ? stats.avgRanking.toFixed(1) : "–"} />
        <StatCard icon={<Home />} label="Times hosted" value={member.timesHosted} className="col-span-2 md:col-span-1" />
      </div>

      <Tabs
        items={[
          { value: "contributions" as const, label: "My contributions", count: contributions.length },
          { value: "hosted" as const, label: "Hosted gatherings", count: hostedGatherings.length },
        ]}
        value={selectedTab}
        onChange={setSelectedTab}
        label="Results"
      />

      {selectedTab === "contributions" ? (
        contributions.length === 0 ? (
          <EmptyState icon={<Wine />} title="No contributions yet" description="Drams you bring to a gathering will show up here." />
        ) : (
          <TableScroll>
            <Table>
              <TableHeader>
                <tr>
                  <th>Gathering</th>
                  <th>Whisky</th>
                  <th className="hidden md:table-cell">Region</th>
                  <th className="text-center!">Place</th>
                </tr>
              </TableHeader>
              <TableBody>
                {contributions.map((contribution) => (
                  <TableRow key={contribution.id} className={cn(contribution.ranking === 1 && "bg-gold/5")}>
                    <td>
                      <div className="font-medium text-foreground">Gathering {contribution.gatheringNumber}</div>
                      <div className="text-xs text-subtle">{new Date(contribution.gatheringDate).toLocaleDateString("en-GB")}</div>
                      {contribution.gatheringTheme && (
                        <div className="mt-0.5 text-xs text-muted-foreground">{contribution.gatheringTheme}</div>
                      )}
                    </td>
                    <td>
                      <div className="font-medium text-foreground">{contribution.distillery}</div>
                      <div className="text-sm text-muted-foreground">{contribution.variety}</div>
                      <div className="text-xs text-subtle">{contribution.abv}% ABV</div>
                    </td>
                    <td className="hidden md:table-cell">
                      <div className="text-sm text-muted-foreground">{contribution.region}</div>
                      <div className="text-xs text-subtle">{contribution.country}</div>
                    </td>
                    <td className="text-center">
                      {contribution.ranking !== null ? (
                        <RankingBadge ranking={contribution.ranking} size="md" />
                      ) : (
                        <span className="text-sm text-subtle">–</span>
                      )}
                    </td>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>
        )
      ) : hostedGatherings.length === 0 ? (
        <EmptyState icon={<Home />} title="No hosted gatherings yet" />
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {hostedGatherings.map((gathering) => (
            <div key={gathering.id} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-3">
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/15 text-primary">
                  <Home size={20} />
                </span>
                <div>
                  <div className="font-semibold text-foreground">Gathering {gathering.number}</div>
                  <div className="text-sm text-muted-foreground">
                    {new Date(gathering.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                  </div>
                </div>
              </div>
              {gathering.theme && <p className="mt-3 text-sm text-primary">{gathering.theme}</p>}
            </div>
          ))}
        </div>
      )}

      {/* Win Highlights */}
      {stats.wins > 0 && (
        <section className="rounded-xl border border-gold/30 bg-gradient-to-br from-gold/10 to-card p-5">
          <h3 className="mb-4 flex items-center gap-2 font-display text-xl text-foreground">
            <Trophy size={18} className="text-gold" />
            Winning whiskies
          </h3>
          <div className="grid gap-3 md:grid-cols-2">
            {contributions
              .filter((c) => c.ranking === 1)
              .map((win) => (
                <div key={win.id} className="flex items-center gap-3 rounded-lg bg-background/50 p-3">
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gold text-primary-foreground">
                    <Trophy size={15} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium text-foreground">
                      {win.distillery} · {win.variety}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      Gathering {win.gatheringNumber}
                      {win.gatheringTheme && ` · ${win.gatheringTheme}`}
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>
      )}
    </div>
  );
}
