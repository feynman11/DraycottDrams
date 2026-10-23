import * as React from "react"

import { cn } from "@/lib/utils"

const fieldClass =
  "flex w-full rounded-md border border-border bg-input px-3 text-sm text-foreground shadow-sm transition-[border-color,box-shadow] duration-(--duration-fast) placeholder:text-subtle hover:border-border-strong focus-visible:outline-none focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-ring/40 disabled:cursor-not-allowed disabled:opacity-50"

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input type={type} className={cn(fieldClass, "h-10", className)} ref={ref} {...props} />
  )
)
Input.displayName = "Input"

export { Input, fieldClass }
