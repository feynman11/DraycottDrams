"use client";

import { Trophy, Medal } from "lucide-react";
import { cn } from "@/lib/utils";

interface RankingBadgeProps {
  ranking: number | null;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

const rankingConfig: Record<number, {
  label: string;
  bgColor: string;
  textColor: string;
  borderColor: string;
  icon: "trophy" | "medal" | "number";
  gradientFrom: string;
  gradientTo: string;
}> = {
  1: {
    label: "1st",
    bgColor: "bg-gradient-to-br from-amber-500 to-yellow-600",
    textColor: "text-amber-950",
    borderColor: "border-amber-400",
    icon: "trophy",
    gradientFrom: "from-amber-500",
    gradientTo: "to-yellow-600",
  },
  2: {
    label: "2nd",
    bgColor: "bg-gradient-to-br from-slate-300 to-slate-400",
    textColor: "text-slate-800",
    borderColor: "border-slate-300",
    icon: "medal",
    gradientFrom: "from-slate-300",
    gradientTo: "to-slate-400",
  },
  3: {
    label: "3rd",
    bgColor: "bg-gradient-to-br from-amber-700 to-orange-800",
    textColor: "text-amber-100",
    borderColor: "border-amber-600",
    icon: "medal",
    gradientFrom: "from-amber-700",
    gradientTo: "to-orange-800",
  },
};

const sizeConfig = {
  sm: {
    container: "w-6 h-6 text-xs",
    icon: 12,
  },
  md: {
    container: "w-8 h-8 text-sm",
    icon: 14,
  },
  lg: {
    container: "w-10 h-10 text-base",
    icon: 18,
  },
};

export function RankingBadge({ ranking, size = "md", showLabel = false, className }: RankingBadgeProps) {
  if (ranking === null || ranking === undefined) return null;

  const config = rankingConfig[ranking];
  const sizeStyles = sizeConfig[size];

  // For rankings 4-10, use a default style
  const defaultConfig = {
    label: `${ranking}${getOrdinalSuffix(ranking)}`,
    bgColor: "bg-slate-700",
    textColor: "text-slate-300",
    borderColor: "border-slate-600",
    icon: "number" as const,
    gradientFrom: "from-slate-700",
    gradientTo: "to-slate-800",
  };

  const finalConfig = config || defaultConfig;

  return (
    <div className={cn("flex items-center gap-1.5", className)}>
      <div
        className={cn(
          "rounded-full flex items-center justify-center font-bold shadow-lg border",
          finalConfig.bgColor,
          finalConfig.textColor,
          finalConfig.borderColor,
          sizeStyles.container
        )}
        title={`Ranked ${finalConfig.label} place`}
      >
        {finalConfig.icon === "trophy" ? (
          <Trophy size={sizeStyles.icon} className="drop-shadow" />
        ) : finalConfig.icon === "medal" ? (
          <Medal size={sizeStyles.icon} className="drop-shadow" />
        ) : (
          <span className="font-bold">{ranking}</span>
        )}
      </div>
      {showLabel && (
        <span className={cn("font-semibold", finalConfig.textColor === "text-amber-950" ? "text-amber-500" : "text-slate-400")}>
          {finalConfig.label}
        </span>
      )}
    </div>
  );
}

function getOrdinalSuffix(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] || s[v] || s[0];
}

// Larger podium-style badge for featured displays
interface PodiumBadgeProps {
  ranking: number;
  className?: string;
}

export function PodiumBadge({ ranking, className }: PodiumBadgeProps) {
  const config = rankingConfig[ranking];
  if (!config) return null;

  return (
    <div
      className={cn(
        "relative flex flex-col items-center justify-center rounded-xl p-4 shadow-xl border-2",
        `bg-gradient-to-br ${config.gradientFrom} ${config.gradientTo}`,
        config.borderColor,
        className
      )}
    >
      {config.icon === "trophy" ? (
        <Trophy size={32} className={cn(config.textColor, "drop-shadow-lg")} />
      ) : (
        <Medal size={32} className={cn(config.textColor, "drop-shadow-lg")} />
      )}
      <span className={cn("mt-1 font-bold text-lg", config.textColor)}>
        {config.label}
      </span>
    </div>
  );
}

// Horizontal ranking indicator bar
interface RankingBarProps {
  ranking: number | null;
  totalInGathering?: number;
  className?: string;
}

export function RankingBar({ ranking, totalInGathering = 6, className }: RankingBarProps) {
  if (ranking === null || ranking === undefined) return null;

  // Calculate color intensity based on ranking (1 = most intense amber, 6 = slate)
  const percentage = ((totalInGathering - ranking + 1) / totalInGathering) * 100;

  return (
    <div className={cn("h-1 rounded-full overflow-hidden bg-slate-800", className)}>
      <div
        className={cn(
          "h-full rounded-full transition-all",
          ranking === 1 ? "bg-gradient-to-r from-amber-500 to-yellow-500" :
          ranking === 2 ? "bg-gradient-to-r from-slate-300 to-slate-400" :
          ranking === 3 ? "bg-gradient-to-r from-amber-700 to-orange-700" :
          "bg-slate-600"
        )}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}
