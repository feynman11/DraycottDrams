import { cn } from "@/lib/utils"

interface PageHeaderProps {
  title: string
  description?: string
  /** Right-hand slot: a count, an action, or nothing */
  aside?: React.ReactNode
  className?: string
  /** `h1` on pages, `h2` inside tabbed sections */
  as?: "h1" | "h2"
}

export function PageHeader({ title, description, aside, className, as: Heading = "h1" }: PageHeaderProps) {
  return (
    // The aside wraps under the title when it won't fit beside it (a row of buttons on a phone)
    <div className={cn("flex flex-wrap items-start justify-between gap-4 md:items-end md:gap-6", className)}>
      <div className="min-w-0 flex-1 basis-48">
        <Heading
          className={cn(
            "font-display tracking-tight text-foreground",
            Heading === "h1" ? "text-4xl md:text-display" : "text-3xl"
          )}
        >
          {title}
        </Heading>
        {description && <p className="mt-1.5 max-w-prose text-sm text-muted-foreground md:text-base">{description}</p>}
      </div>
      {aside && <div className="shrink-0">{aside}</div>}
    </div>
  )
}

// A big number with a caption, for the right of a page header
export function HeaderStat({ value, label }: { value: React.ReactNode; label: string }) {
  return (
    <div className="text-right">
      <div className="font-display text-3xl text-primary tabular-nums leading-none">{value}</div>
      <div className="mt-1 text-xs uppercase tracking-wider text-subtle">{label}</div>
    </div>
  )
}
