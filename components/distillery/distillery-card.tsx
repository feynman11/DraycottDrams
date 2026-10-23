import { type Distillery } from "@/lib/types";
import { Building2, MapPin, Globe, Trophy, Medal } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

interface DistilleryCardProps {
  distillery: Distillery;
  whiskyCount?: number;
  avgRanking?: number | null;
  wins?: number;
  onClick?: () => void;
}

export function DistilleryCard({ distillery, whiskyCount = 0, avgRanking = null, wins = 0, onClick }: DistilleryCardProps) {
  // An average place of 2.5 or better across the club's tastings is a standout distillery
  const standout = avgRanking !== null && avgRanking <= 2.5;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "group relative flex w-full flex-col rounded-xl border bg-card p-5 text-left shadow-sm transition-[transform,border-color,box-shadow] duration-(--duration-base) ease-(--ease-out-quart) hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background active:translate-y-0",
        standout ? "border-gold/35 bg-gradient-to-br from-gold/8 to-card hover:border-gold/60" : "border-border hover:border-border-strong"
      )}
    >
      <div className="flex items-start justify-between gap-3">
        {distillery.region ? <Badge variant="secondary">{distillery.region}</Badge> : <span />}
        {avgRanking !== null && (
          <Badge variant={standout ? "gold" : "outline"} title="Average place at gatherings">
            <Medal /> {avgRanking.toFixed(1)}
          </Badge>
        )}
      </div>

      <h3 className="mt-3 text-lg font-semibold leading-tight tracking-tight text-foreground transition-colors group-hover:text-primary">
        {distillery.name}
      </h3>

      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <MapPin size={14} className="text-subtle" />
          {distillery.country}
        </span>
        {distillery.founded && (
          <span className="inline-flex items-center gap-1">
            <Building2 size={14} className="text-subtle" />
            Founded {distillery.founded}
          </span>
        )}
      </div>

      {distillery.description && (
        <p className="mt-3 line-clamp-2 text-xs leading-relaxed text-subtle">{distillery.description}</p>
      )}

      <div className="mt-auto flex items-center justify-between border-t border-border pt-4 text-xs text-subtle">
        <span className="flex items-center gap-3">
          {whiskyCount > 0 && (
            <span>
              <span className="font-medium text-muted-foreground">{whiskyCount}</span> {whiskyCount === 1 ? "whisky" : "whiskies"}
            </span>
          )}
          {wins > 0 && (
            <span className="inline-flex items-center gap-1 text-gold">
              <Trophy size={13} />
              <span className="font-medium">{wins}</span> {wins === 1 ? "win" : "wins"}
            </span>
          )}
        </span>
        {distillery.website && (
          <a
            href={distillery.website}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="touch-exempt inline-flex items-center gap-1 rounded text-primary/80 transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <Globe size={12} />
            Website
          </a>
        )}
      </div>
    </button>
  );
}
