import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: React.ReactNode
  tone?: "default" | "error"
  className?: string
}

// Empty, no-results and error states share one shape so pages never go blank
export function EmptyState({ icon, title, description, action, tone = "default", className }: EmptyStateProps) {
  return (
    <div
      role={tone === "error" ? "alert" : undefined}
      className={cn(
        "flex flex-col items-center justify-center rounded-xl border border-dashed border-border px-6 py-12 text-center animate-fade-in",
        tone === "error" && "border-destructive/40 bg-destructive/5",
        className
      )}
    >
      {icon && (
        <div
          className={cn(
            "mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-muted text-muted-foreground [&_svg]:size-6",
            tone === "error" && "bg-destructive/15 text-destructive"
          )}
        >
          {icon}
        </div>
      )}
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
