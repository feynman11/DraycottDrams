import { useState } from "react";
import { type WhiskyWithGathering } from "@/lib/types";
import { MapPin, Droplets, Banknote, Calendar, Trophy, UserRound } from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RankingBadge, rankTone, getOrdinalSuffix } from "./ranking-badge";

interface WhiskyDetailProps {
  whisky: WhiskyWithGathering | null;
  onClose: () => void;
}

const heroTone: Record<number, string> = {
  1: "from-gold/35 via-bronze/20",
  2: "from-silver/25 via-silver/10",
  3: "from-bronze/40 via-bronze/15",
};

export function WhiskyDetail({ whisky, onClose }: WhiskyDetailProps) {
  // Keep the last whisky so the panel can animate out after it's cleared
  const [shown, setShown] = useState(whisky);
  if (whisky && whisky !== shown) setShown(whisky);
  if (!shown) return null;

  const tone = rankTone(shown.ranking);

  return (
    <Sheet open={!!whisky} onOpenChange={(open) => !open && onClose()}>
      <SheetContent title={`${shown.distillery} ${shown.variety}`} description="Whisky details">
        <div className="flex-1 min-h-0 overflow-y-auto overscroll-contain">
          {/* Hero */}
          <div className={cn("relative bg-gradient-to-br to-card px-6 pb-6 pt-16", heroTone[shown.ranking ?? 0] ?? "from-primary/20 via-primary/5")}>
            <div className="mb-3 flex flex-wrap items-center gap-2">
              {shown.region && <Badge variant="secondary">{shown.region}</Badge>}
              {shown.ranking && <RankingBadge ranking={shown.ranking} size="sm" showLabel />}
            </div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{shown.distillery}</p>
            <h2 className="mt-1 font-display text-display text-foreground">{shown.variety}</h2>
          </div>

          <div className="space-y-6 px-6 pb-[calc(1.5rem+var(--safe-bottom))] pt-6">
            {shown.ranking && (
              <div className={cn("flex items-center gap-3 rounded-xl border p-4", tone.bg, tone.border)}>
                <Trophy className={tone.text} size={22} />
                <div>
                  <p className="text-xs text-muted-foreground">Gathering position</p>
                  <p className={cn("text-lg font-semibold", tone.text)}>
                    {shown.ranking}{getOrdinalSuffix(shown.ranking)} place
                  </p>
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-muted/40 p-4">
              <p className="text-xs text-muted-foreground">Gathering {shown.gathering}</p>
              <p className="mt-0.5 text-lg font-semibold text-primary">{shown.theme}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {new Date(shown.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
              </p>
            </div>

            <dl className="grid grid-cols-2 gap-3">
              <Fact icon={<MapPin />} label="Region" value={`${shown.region}, ${shown.country}`} />
              <Fact icon={<Droplets />} label="ABV" value={`${shown.abv}%`} />
              <Fact icon={<UserRound />} label="Provider" value={shown.provider} />
              <Fact icon={<Banknote />} label="Host" value={shown.host} />
            </dl>

            {shown.notes && <Section title="Notes">{shown.notes}</Section>}
            {shown.description && <Section title="About">{shown.description}</Section>}

            {shown.tastingNotes && shown.tastingNotes.length > 0 && (
              <Section title="Tasting notes">
                <div className="flex flex-wrap gap-2">
                  {shown.tastingNotes.map((note, index) => (
                    <Badge key={index} variant="default" className="rounded-full px-3 py-1 text-sm font-normal">
                      {note}
                    </Badge>
                  ))}
                </div>
              </Section>
            )}

            {shown.flavourProfile && (
              <Section title="Flavour profile">
                <div className="space-y-2">
                  {Object.entries(shown.flavourProfile).map(([key, value]) => (
                    <div key={key} className="flex items-center gap-3 text-xs">
                      <span className="w-20 capitalize text-muted-foreground">{key}</span>
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                        <div className="h-full rounded-full bg-primary" style={{ width: `${(value as number) * 20}%` }} />
                      </div>
                      <span className="w-7 text-right tabular-nums text-subtle">{value as number}/5</span>
                    </div>
                  ))}
                </div>
              </Section>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Fact({ icon, label, value }: { icon: React.ReactNode; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-border bg-muted/40 p-3">
      <span className="text-primary [&_svg]:size-5">{icon}</span>
      <div className="min-w-0">
        <dt className="text-xs text-muted-foreground">{label}</dt>
        <dd className="break-words text-sm font-semibold leading-snug text-foreground">{value}</dd>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-subtle">{title}</h3>
      <div className="text-sm leading-relaxed text-foreground/90">{children}</div>
    </section>
  );
}
