import { useState } from "react";
import { api } from "@/lib/trpc-client";
import { AlertTriangle, MapPin, Globe, Map, Trophy, ChevronDown, ChevronRight, ExternalLink, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, TableBody, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

type IssueTab = "coordinates" | "country" | "region" | "ranking" | "distilleries";

interface DataIssuesProps {
  onEditDistillery?: (distilleryName: string) => void;
}

const CATEGORIES: { value: IssueTab; label: string; title: string; icon: React.ReactNode }[] = [
  { value: "coordinates", label: "Missing coordinates", title: "Whiskies missing coordinates", icon: <MapPin /> },
  { value: "country", label: "Missing country", title: "Whiskies missing a country", icon: <Globe /> },
  { value: "region", label: "Missing region", title: "Whiskies missing a region", icon: <Map /> },
  { value: "ranking", label: "Missing position", title: "Whiskies missing a position", icon: <Trophy /> },
  { value: "distilleries", label: "Distilleries with issues", title: "Distilleries with issues", icon: <AlertTriangle /> },
];

export function DataIssues({ onEditDistillery }: DataIssuesProps) {
  const [activeTab, setActiveTab] = useState<IssueTab>("coordinates");
  const [expandedDistilleries, setExpandedDistilleries] = useState<Set<string>>(new Set());

  const { data, isLoading } = api.whisky.getDataIssues.useQuery();

  const toggleDistillery = (id: string) => {
    const newExpanded = new Set(expandedDistilleries);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedDistilleries(newExpanded);
  };

  if (isLoading) {
    return (
      <div className="space-y-6" aria-busy>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-xl" />)}
        </div>
        <Skeleton className="h-64 rounded-xl" />
      </div>
    );
  }

  if (!data) {
    return <EmptyState icon={<AlertTriangle />} title="No data available" />;
  }

  const { summary } = data;
  const totalIssues = summary.totalMissingCoordinates + summary.totalMissingCountry + summary.totalMissingRegion;
  const counts: Record<IssueTab, number> = {
    coordinates: summary.totalMissingCoordinates,
    country: summary.totalMissingCountry,
    region: summary.totalMissingRegion,
    ranking: summary.totalMissingRanking,
    distilleries: summary.uniqueDistilleriesWithIssues,
  };
  const active = CATEGORIES.find((c) => c.value === activeTab)!;

  return (
    <div className="space-y-6">
      {/* Summary cards double as the category picker */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-5" role="tablist" aria-label="Issue categories">
        {CATEGORIES.map((category) => {
          const selected = activeTab === category.value;
          const count = counts[category.value];
          return (
            <button
              key={category.value}
              type="button"
              role="tab"
              aria-selected={selected}
              onClick={() => setActiveTab(category.value)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors duration-(--duration-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                selected ? "border-primary/50 bg-primary/10" : "border-border bg-card hover:border-border-strong"
              )}
            >
              <div className={cn("mb-2 flex items-center gap-2 text-xs [&_svg]:size-4", count > 0 ? "text-warning" : "text-subtle")}>
                {category.icon}
                <span className="text-muted-foreground">{category.label}</span>
              </div>
              <div className={cn("text-2xl font-semibold tabular-nums", count > 0 ? "text-foreground" : "text-subtle")}>{count}</div>
            </button>
          );
        })}
      </div>

      {totalIssues > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 shrink-0 text-warning" size={20} />
          <div>
            <p className="font-medium text-foreground">{totalIssues} whiskies have distillery data issues</p>
            <p className="text-sm text-muted-foreground">They may not appear correctly on the map or in filtered views.</p>
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-xl border border-success/40 bg-success/10 p-4">
          <CheckCircle2 className="shrink-0 text-success" size={20} />
          <p className="font-medium text-foreground">Every whisky has a located distillery.</p>
        </div>
      )}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="border-b border-border p-4">
          <h3 className="font-semibold text-foreground">{active.title}</h3>
        </div>

        <div className="max-h-[500px] overflow-y-auto">
          {activeTab === "distilleries" ? (
            data.distilleriesWithIssues.length === 0 ? (
              <EmptyState icon={<CheckCircle2 />} title="No distilleries with issues" className="m-4" />
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0">
                    <tr>
                      <th>Distillery</th>
                      <th>Country</th>
                      <th>Region</th>
                      <th className="text-center!">Coordinates</th>
                      <th className="text-center!">Whiskies</th>
                      <th className="text-right!">Action</th>
                    </tr>
                  </TableHeader>
                  <TableBody>
                    {data.distilleriesWithIssues.map((distillery) => (
                      <TableRow key={distillery.id}>
                        <td className="font-medium text-foreground">{distillery.name}</td>
                        <td className="text-muted-foreground">{distillery.country || <Missing />}</td>
                        <td className="text-muted-foreground">{distillery.region || <Missing />}</td>
                        <td className="text-center">
                          {distillery.hasCoordinates ? <span className="text-success">Yes</span> : <Missing label="No" />}
                        </td>
                        <td className="text-center tabular-nums text-muted-foreground">{distillery.whiskyCount}</td>
                        <td className="text-right">
                          <EditLink onClick={() => onEditDistillery?.(distillery.name)} />
                        </td>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )
          ) : (
            // Whisky issues view
            (() => {
              const issues =
                activeTab === "coordinates"
                  ? data.missingCoordinates
                  : activeTab === "country"
                  ? data.missingCountry
                  : activeTab === "region"
                  ? data.missingRegion
                  : data.missingRanking;

              if (issues.length === 0) {
                return <EmptyState icon={<CheckCircle2 />} title="No issues in this category" className="m-4" />;
              }

              // Group by distillery for better organization
              const byDistillery = issues.reduce((acc, whisky) => {
                const key = whisky.distillery;
                if (!acc[key]) {
                  acc[key] = [];
                }
                acc[key].push(whisky);
                return acc;
              }, {} as Record<string, typeof issues>);

              return (
                <div className="divide-y divide-border">
                  {Object.entries(byDistillery)
                    .sort(([a], [b]) => a.localeCompare(b))
                    .map(([distilleryName, whiskies]) => {
                      const expanded = expandedDistilleries.has(distilleryName);
                      return (
                        <div key={distilleryName}>
                          <div className="flex items-center justify-between gap-3 px-3 py-2 transition-colors hover:bg-accent/40">
                            <button
                              type="button"
                              onClick={() => toggleDistillery(distilleryName)}
                              aria-expanded={expanded}
                              className="flex min-w-0 flex-1 items-center gap-2 rounded py-1.5 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                            >
                              {expanded ? <ChevronDown size={18} className="shrink-0 text-subtle" /> : <ChevronRight size={18} className="shrink-0 text-subtle" />}
                              <span className="truncate font-medium text-foreground">{distilleryName}</span>
                              <span className="hidden truncate text-sm text-subtle sm:inline">
                                {whiskies[0].country || "Unknown"}, {whiskies[0].region || "Unknown"}
                              </span>
                            </button>
                            <div className="flex shrink-0 items-center gap-3">
                              <span className="text-sm tabular-nums text-primary">
                                {whiskies.length} {whiskies.length === 1 ? "whisky" : "whiskies"}
                              </span>
                              <EditLink onClick={() => onEditDistillery?.(distilleryName)} />
                            </div>
                          </div>

                          {expanded && (
                            <div className="border-t border-border bg-muted/30">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="text-left text-[11px] uppercase tracking-wider text-subtle">
                                    <th className="p-2 pl-11 font-medium">Gathering</th>
                                    <th className="p-2 font-medium">Variety</th>
                                    <th className="p-2 font-medium">Provider</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {whiskies.map((whisky) => (
                                    <tr key={whisky.id} className="border-t border-border/60">
                                      <td className="p-2 pl-11 text-muted-foreground">
                                        G{whisky.gathering}
                                        {whisky.theme && <span className="ml-2 text-subtle">({whisky.theme})</span>}
                                      </td>
                                      <td className="p-2 text-foreground">{whisky.variety || "-"}</td>
                                      <td className="p-2 text-muted-foreground">{whisky.provider}</td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              );
            })()
          )}
        </div>
      </div>
    </div>
  );
}

function Missing({ label = "Missing" }: { label?: string }) {
  return <span className="text-warning">{label}</span>;
}

function EditLink({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="ghost" size="sm" className="h-8 text-primary hover:text-primary" onClick={onClick}>
      <ExternalLink size={14} />
      Edit
    </Button>
  );
}
