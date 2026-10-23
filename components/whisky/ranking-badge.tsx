import { Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

// One place that maps a gathering position to its colour tokens
export function rankTone(ranking: number | null | undefined) {
  switch (ranking) {
    case 1:
      return { variant: "gold" as const, text: "text-gold", bg: "bg-gold/15", border: "border-gold/40", label: "1st" };
    case 2:
      return { variant: "silver" as const, text: "text-silver", bg: "bg-silver/15", border: "border-silver/40", label: "2nd" };
    case 3:
      return { variant: "bronze" as const, text: "text-bronze", bg: "bg-bronze/20", border: "border-bronze/40", label: "3rd" };
    default:
      return {
        variant: "secondary" as const,
        text: "text-muted-foreground",
        bg: "bg-muted",
        border: "border-border",
        label: ranking ? `${ranking}${getOrdinalSuffix(ranking)}` : "",
      };
  }
}

export function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

interface RankingBadgeProps {
  ranking: number | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const sizeConfig = {
  sm: { container: "h-6 w-6 text-[11px]", icon: 12 },
  md: { container: "h-8 w-8 text-xs", icon: 14 },
  lg: { container: "h-10 w-10 text-sm", icon: 18 },
};

export function RankingBadge({ ranking, size = "md", showLabel = false, className }: RankingBadgeProps) {
  if (ranking === null || ranking === undefined) return null;

  const tone = rankTone(ranking);
  const sizeStyles = sizeConfig[size];

  return (
    <span className={cn("inline-flex items-center gap-1.5", className)} title={`Ranked ${tone.label} place`}>
      <span
        className={cn(
          "inline-flex items-center justify-center rounded-full border font-semibold tabular-nums",
          tone.bg,
          tone.text,
          tone.border,
          sizeStyles.container
        )}
      >
        {ranking === 1 ? (
          <Trophy size={sizeStyles.icon} />
        ) : ranking <= 3 ? (
          <Medal size={sizeStyles.icon} />
        ) : (
          ranking
        )}
      </span>
      {showLabel && <span className={cn("text-sm font-medium", tone.text)}>{tone.label}</span>}
    </span>
  );
}
