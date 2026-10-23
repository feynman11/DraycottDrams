import { type WhiskyWithGathering } from "@/lib/types";
import { Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";
import { rankTone } from "./ranking-badge";

interface GatheringPodiumProps {
  whiskies: WhiskyWithGathering[];
  gatheringNumber: number;
  theme?: string;
  onWhiskyClick?: (whisky: WhiskyWithGathering) => void;
}

export function GatheringPodium({ whiskies, gatheringNumber, theme, onWhiskyClick }: GatheringPodiumProps) {
  // Get top 3 whiskies by ranking
  const rankedWhiskies = whiskies
    .filter(w => w.ranking !== null && w.ranking <= 3)
    .sort((a, b) => (a.ranking || 0) - (b.ranking || 0));

  const first = rankedWhiskies.find(w => w.ranking === 1);
  const second = rankedWhiskies.find(w => w.ranking === 2);
  const third = rankedWhiskies.find(w => w.ranking === 3);

  // Get remaining whiskies (4th and below)
  const otherWhiskies = whiskies
    .filter(w => w.ranking === null || w.ranking > 3)
    .sort((a, b) => (a.ranking || 999) - (b.ranking || 999));

  if (!first && !second && !third) {
    return null; // No ranking data for this gathering
  }

  // Second, first, third: the winner stands in the middle on the tallest block
  const steps: { whisky?: WhiskyWithGathering; position: 1 | 2 | 3; height: string }[] = [
    { whisky: second, position: 2, height: "h-16" },
    { whisky: first, position: 1, height: "h-24" },
    { whisky: third, position: 3, height: "h-12" },
  ];

  return (
    <div className="rounded-xl border border-border bg-card p-5 md:p-6">
      <div className="mb-6 text-center">
        <h3 className="font-display text-2xl text-foreground">Gathering {gatheringNumber}</h3>
        {theme && <p className="mt-1 text-sm text-muted-foreground">{theme}</p>}
      </div>

      <div className="grid grid-cols-3 items-end gap-2 sm:gap-4">
        {steps.map(({ whisky, position, height }) => {
          const tone = rankTone(position);
          return (
            <div key={position} className="flex min-w-0 flex-col items-center">
              {whisky && <PodiumCard whisky={whisky} position={position} onClick={() => onWhiskyClick?.(whisky)} />}
              <div
                className={cn(
                  "mt-2 flex w-full items-center justify-center rounded-t-lg border border-b-0 font-display text-2xl",
                  height,
                  tone.bg,
                  tone.border,
                  tone.text
                )}
              >
                {position === 1 ? <Trophy size={28} /> : position}
              </div>
            </div>
          );
        })}
      </div>

      {otherWhiskies.length > 0 && (
        <div className="mt-4 border-t border-border pt-4">
          <p className="mb-3 text-xs font-medium uppercase tracking-wider text-subtle">Also tasted</p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 md:grid-cols-3">
            {otherWhiskies.map((whisky) => (
              <button
                key={whisky.id}
                type="button"
                onClick={() => onWhiskyClick?.(whisky)}
                className="flex items-center gap-2 rounded-lg bg-muted/60 p-2 text-left transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {whisky.ranking && (
                  <span className="w-6 text-xs font-semibold tabular-nums text-subtle">{whisky.ranking}th</span>
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium text-foreground">{whisky.distillery}</span>
                  <span className="block truncate text-xs text-subtle">{whisky.variety}</span>
                </span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

interface PodiumCardProps {
  whisky: WhiskyWithGathering;
  position: 1 | 2 | 3;
  onClick?: () => void;
}

function PodiumCard({ whisky, position, onClick }: PodiumCardProps) {
  const tone = rankTone(position);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "w-full min-w-0 rounded-lg border bg-card p-3 text-center transition-[transform,box-shadow] duration-(--duration-base) hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
        tone.border
      )}
    >
      <span className={cn("mb-2 inline-flex", tone.text)}>{position === 1 ? <Trophy size={20} /> : <Medal size={20} />}</span>
      <p className={cn("truncate text-sm font-semibold", tone.text)}>{whisky.distillery}</p>
      <p className="mt-1 truncate text-xs text-muted-foreground">{whisky.variety}</p>
      <p className="mt-1 truncate text-xs text-subtle">by {whisky.provider}</p>
    </button>
  );
}

// Compact inline podium for list views
interface InlinePodiumProps {
  whiskies: WhiskyWithGathering[];
  onWhiskyClick?: (whisky: WhiskyWithGathering) => void;
}

export function InlinePodium({ whiskies, onWhiskyClick }: InlinePodiumProps) {
  const top3 = whiskies
    .filter(w => w.ranking !== null && w.ranking <= 3)
    .sort((a, b) => (a.ranking || 0) - (b.ranking || 0));

  if (top3.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 py-2">
      {top3.map((whisky) => {
        const tone = rankTone(whisky.ranking);
        return (
          <button
            key={whisky.id}
            type="button"
            onClick={() => onWhiskyClick?.(whisky)}
            className={cn(
              "touch-exempt inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors hover:brightness-110 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              tone.bg,
              tone.text
            )}
          >
            {whisky.ranking === 1 ? <Trophy size={12} /> : <Medal size={12} />}
            <span className="max-w-[100px] truncate">{whisky.distillery}</span>
          </button>
        );
      })}
    </div>
  );
}
