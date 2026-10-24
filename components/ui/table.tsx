import * as React from "react"

import { cn } from "@/lib/utils"

// Tables scroll sideways inside this wrapper; the fades tell the reader there's more.
function TableScroll({ className, children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("relative overflow-hidden rounded-xl border border-border bg-card", className)} {...props}>
      <div className="overflow-x-auto [mask-image:linear-gradient(to_right,black_calc(100%-1.5rem),transparent)] md:[mask-image:none]">
        {children}
      </div>
    </div>
  )
}

const Table = React.forwardRef<HTMLTableElement, React.TableHTMLAttributes<HTMLTableElement>>(
  ({ className, ...props }, ref) => (
    // Cells don't wrap: narrow screens scroll the table sideways instead of stacking words
    <table ref={ref} className={cn("w-full whitespace-nowrap text-sm", className)} {...props} />
  )
)
Table.displayName = "Table"

const TableHeader = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <thead className={cn("bg-muted/60 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:text-[11px] [&_th]:font-medium [&_th]:uppercase [&_th]:tracking-wider [&_th]:text-subtle", className)} {...props} />
)

const TableBody = ({ className, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) => (
  <tbody className={cn("divide-y divide-border [&_td]:px-4 [&_td]:py-3 [&_td]:align-middle", className)} {...props} />
)

const TableRow = ({ className, ...props }: React.HTMLAttributes<HTMLTableRowElement>) => (
  <tr className={cn("transition-colors duration-(--duration-fast) hover:bg-accent/40", className)} {...props} />
)

export { TableScroll, Table, TableHeader, TableBody, TableRow }
