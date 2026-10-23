import { Search } from "lucide-react"

import { cn } from "@/lib/utils"
import { Input } from "./input"

// Filter rows: a two-column grid on phones, a wrapping row from md. Search takes a full row on
// phones and grows on desktop; everything else keeps a consistent 40px height.
function FilterBar({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("grid grid-cols-2 gap-2 md:flex md:flex-wrap md:items-center md:gap-3", className)} {...props} />
}

function SearchField({ className, ...props }: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={cn("relative col-span-2 md:min-w-64 md:flex-1 md:max-w-sm", className)}>
      <Search size={16} aria-hidden className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-subtle" />
      <Input type="search" className="pl-9" {...props} />
    </div>
  )
}

export { FilterBar, SearchField }
