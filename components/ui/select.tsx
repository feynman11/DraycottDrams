import * as React from "react"
import { ChevronDown } from "lucide-react"

import { cn } from "@/lib/utils"
import { fieldClass } from "./input"

// A styled native <select>: it gets the OS picker on touch devices, which beats a custom listbox there.
const Select = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ className, children, ...props }, ref) => (
    <div className={cn("relative", className)}>
      <select
        ref={ref}
        className={cn(fieldClass, "h-10 appearance-none pr-9 cursor-pointer [&>option]:bg-popover")}
        {...props}
      >
        {children}
      </select>
      <ChevronDown
        size={16}
        aria-hidden
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-subtle"
      />
    </div>
  )
)
Select.displayName = "Select"

export { Select }
