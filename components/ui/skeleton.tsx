import { cn } from "@/lib/utils"

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div aria-hidden className={cn("rounded-md shimmer", className)} {...props} />
}

// A card-shaped placeholder for list grids while a query is in flight
function SkeletonCard({ className }: { className?: string }) {
  return (
    <div className={cn("rounded-xl border border-border bg-card p-5 space-y-3", className)}>
      <Skeleton className="h-5 w-20" />
      <Skeleton className="h-6 w-2/3" />
      <Skeleton className="h-4 w-1/2" />
      <Skeleton className="h-4 w-1/3" />
      <div className="pt-3 border-t border-border">
        <Skeleton className="h-4 w-full" />
      </div>
    </div>
  )
}

// Table-row placeholders that keep the table's height stable
function SkeletonRows({ rows = 5, cols = 4 }: { rows?: number; cols?: number }) {
  return (
    <div className="divide-y divide-border" aria-busy>
      {Array.from({ length: rows }).map((_, r) => (
        <div key={r} className="flex items-center gap-6 px-4 py-4">
          {Array.from({ length: cols }).map((_, c) => (
            <Skeleton key={c} className={cn("h-4", c === 0 ? "w-1/4" : "flex-1")} />
          ))}
        </div>
      ))}
    </div>
  )
}

export { Skeleton, SkeletonCard, SkeletonRows }
