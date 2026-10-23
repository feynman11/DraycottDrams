import { MapPin, Droplets, Calendar, Globe, Building2, TrendingUp, Users, ExternalLink } from "lucide-react";
import { api } from "@/lib/trpc-client";
import { useMemo, useState } from "react";
import { type WhiskyWithGathering } from "@/lib/types";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { RankingBadge } from "./ranking-badge";

interface DistilleryDetailProps {
  distillery: string | null;
  whiskies: WhiskyWithGathering[];
  onClose: () => void;
}

export function DistilleryDetail({ distillery, whiskies, onClose }: DistilleryDetailProps) {
  const open = !!distillery && whiskies.length > 0;
  // Keep the last selection so the panel can animate out after it's cleared
  const [shown, setShown] = useState<{ distillery: string; whiskies: WhiskyWithGathering[] } | null>(null);
  if (open && (shown?.distillery !== distillery || shown.whiskies !== whiskies)) setShown({ distillery, whiskies });

  const firstWhisky = shown?.whiskies[0];
  const distilleryId = firstWhisky?.distilleryId ?? undefined;

  // Fetch distillery details - try by ID first, then by name
  const { data: distilleryDetailsById } = api.distillery.getById.useQuery(
    { id: distilleryId! },
    { enabled: !!distilleryId && !!shown }
  );

  const { data: distilleriesList } = api.distillery.getAll.useQuery(
    { search: shown?.distillery ?? "", limit: 1 },
    { enabled: !distilleryDetailsById && !!shown }
  );

  const distilleryDetails = distilleryDetailsById || distilleriesList?.[0];

  // Group whiskies by gathering for better display
  const whiskiesByGathering = useMemo(() => {
    const list = shown?.whiskies ?? [];
    return list.reduce((acc, whisky) => {
      const key = whisky.gathering;
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(whisky);
      return acc;
    }, {} as Record<number, WhiskyWithGathering[]>);
  }, [shown]);

  const gatherings = Object.keys(whiskiesByGathering)
    .map(Number)
    .sort((a, b) => a - b);

  const dateRange = useMemo(() => {
    const list = shown?.whiskies ?? [];
    const dates = list.map((w) => new Date(w.date).getTime()).filter(Boolean);
    if (dates.length === 0) return null;
    return { min: new Date(Math.min(...dates)), max: new Date(Math.max(...dates)) };
  }, [shown]);

  if (!shown || !firstWhisky) return null;

  const { region, country } = firstWhisky;
  const totalGatherings = gatherings.length;
  const totalWhiskies = shown.whiskies.length;

  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent title={shown.distillery} description="Distillery details">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {/* Hero */}
          <div className="relative bg-gradient-to-br from-primary/20 via-primary/5 to-card px-6 pb-6 pt-16">
            {region && <Badge variant="secondary" className="mb-3">{region}</Badge>}
            <h2 className="font-display text-display text-foreground">{shown.distillery}</h2>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <MapPin size={14} className="text-subtle" />
                {region}, {country}
              </span>
              {distilleryDetails?.founded && (
                <span className="inline-flex items-center gap-1.5">
                  <Building2 size={14} className="text-subtle" />
                  Founded {distilleryDetails.founded}
                </span>
              )}
            </div>
            {distilleryDetails?.description && (
              <p className="mt-3 line-clamp-3 text-sm leading-relaxed text-muted-foreground">{distilleryDetails.description}</p>
            )}
            <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-subtle">
              <span className="inline-flex items-center gap-1">
                <TrendingUp size={13} />
                {totalGatherings} {totalGatherings === 1 ? "gathering" : "gatherings"}
              </span>
              <span className="inline-flex items-center gap-1">
                <Droplets size={13} />
                {totalWhiskies} {totalWhiskies === 1 ? "whisky" : "whiskies"}
              </span>
              {dateRange && (
                <span className="inline-flex items-center gap-1">
                  <Calendar size={13} />
                  {dateRange.min.getFullYear()}–{dateRange.max.getFullYear()}
                </span>
              )}
            </div>
            {distilleryDetails?.website && (
              <a
                href={distilleryDetails.website}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 rounded text-sm text-primary transition-colors hover:text-primary/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Globe size={14} />
                Visit website
                <ExternalLink size={12} />
              </a>
            )}
          </div>

          <div className="space-y-4 px-6 pb-[calc(1.5rem+var(--safe-bottom))] pt-6">
            {gatherings.map((gathering) => {
              const gatheringWhiskies = whiskiesByGathering[gathering];
              const { theme, date, host } = gatheringWhiskies[0];

              return (
                <section key={gathering} className="rounded-xl border border-border bg-muted/30 p-4">
                  <div className="mb-3 border-b border-border pb-3">
                    <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <span className="inline-flex items-center gap-2">
                        <span className="font-medium text-foreground">Gathering {gathering}</span>
                        {host && (
                          <span className="inline-flex items-center gap-1 text-subtle">
                            <Users size={12} />
                            {host}
                          </span>
                        )}
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <Calendar size={12} />
                        {new Date(date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                      </span>
                    </div>
                    {theme && <p className="mt-1 text-base font-semibold text-primary">{theme}</p>}
                  </div>

                  <div className="space-y-2">
                    {gatheringWhiskies.map((whisky) => (
                      <div key={whisky.id} className="rounded-lg border border-border bg-card p-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-foreground">{whisky.variety || "No variety specified"}</p>
                            {whisky.name && whisky.name !== whisky.variety && (
                              <p className="mt-0.5 text-xs text-muted-foreground">{whisky.name}</p>
                            )}
                          </div>
                          <RankingBadge ranking={whisky.ranking} size="sm" />
                        </div>
                        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                          <span className="inline-flex items-center gap-1">
                            <Droplets size={12} className="text-primary" />
                            {whisky.abv}% ABV
                          </span>
                          {whisky.age && <span>{whisky.age} {whisky.age === 1 ? "year" : "years"} old</span>}
                          {whisky.type && <span>{whisky.type}</span>}
                          <span className="text-subtle">Provider: {whisky.provider}</span>
                        </div>
                        {whisky.description && <p className="mt-2 text-xs text-muted-foreground">{whisky.description}</p>}
                        {whisky.notes && <p className="mt-2 text-xs italic text-muted-foreground">{whisky.notes}</p>}
                        {whisky.tastingNotes && whisky.tastingNotes.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-1.5 border-t border-border pt-3">
                            {whisky.tastingNotes.map((note, idx) => (
                              <Badge key={idx}>{note}</Badge>
                            ))}
                          </div>
                        )}
                        {whisky.flavourProfile && typeof whisky.flavourProfile === "object" && (
                          <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5 border-t border-border pt-3">
                            {Object.entries(whisky.flavourProfile).map(([key, value]) => (
                              <div key={key} className="flex items-center gap-2 text-xs">
                                <span className="w-16 capitalize text-muted-foreground">{key}</span>
                                <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                                  <div className="h-full bg-primary" style={{ width: `${(value as number) * 20}%` }} />
                                </div>
                                <span className="w-6 text-right tabular-nums text-subtle">{value as number}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              );
            })}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
