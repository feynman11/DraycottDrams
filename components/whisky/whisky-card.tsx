import { ArrowUpRight } from "lucide-react";
import { type WhiskyWithGathering } from "@/lib/types";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { RankingBadge, rankTone } from "./ranking-badge";

interface WhiskyCardProps {
  whisky: WhiskyWithGathering;
  onClick?: () => void;
}

export function WhiskyCard({ whisky, onClick }: WhiskyCardProps) {
  const podium = !!whisky.ranking && whisky.ranking <= 3;
  const tone = rankTone(whisky.ranking);

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full flex-col rounded-xl border bg-card p-5 text-left shadow-sm transition-[transform,border-color,box-shadow] duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0",
        whisky.ranking === 1
          ? "border-gold/35 bg-gradient-to-br from-gold/8 to-card hover:border-gold/60"
          : "border-border hover:border-border-strong"
      )}
    >
      {/* Podium places get a coloured rule down the left edge */}
      {podium && <span aria-hidden className={cn("absolute inset-y-5 left-0 w-0.5 rounded-r-full", tone.text.replace("text-", "bg-"))} />}

      <div className="flex items-start justify-between gap-3">
        {whisky.region ? <Badge variant="secondary">{whisky.region}</Badge> : <span />}
        <RankingBadge ranking={whisky.ranking} size="sm" />
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
        {whisky.distillery}
      </h3>
      <p className="mt-0.5 text-sm text-muted-foreground">{whisky.variety}</p>
      <p className="mt-1 text-xs text-subtle">Provided by {whisky.provider}</p>

      <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-xs text-subtle">
        <span className="truncate">
          {whisky.country}
          <span className="mx-1.5 text-border-strong">·</span>
          {whisky.abv}% ABV
        </span>
        <span className="inline-flex items-center gap-0.5 font-medium text-primary opacity-70 transition-opacity group-hover:opacity-100">
          Details <ArrowUpRight size={14} />
        </span>
      </div>
    </button>
  );
}
