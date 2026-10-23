import { cn } from "@/lib/utils"

interface StatCardProps {
  icon?: React.ReactNode
  label: string
  value: React.ReactNode
  subtitle?: string
  /** Highlights the value in amber (for the stat that matters most) */
  accent?: boolean
  className?: string
}

export function StatCard({ icon, label, value, subtitle, accent, className }: StatCardProps) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-4", className)}>
      <div className="mb-2 flex items-center gap-2 text-subtle [&_svg]:size-4">
        {icon}
        <span className="text-[11px] font-medium uppercase tracking-wider">{label}</span>
      </div>
      <p className={cn("truncate text-2xl font-semibold tracking-tight tabular-nums", accent ? "text-primary" : "text-foreground")}>
        {value}
      </p>
      {subtitle && <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p>}
    </div>
  )
}
