import * as React from "react"

import { cn } from "@/lib/utils"
import { fieldClass } from "./input"

const Textarea = React.forwardRef<HTMLTextAreaElement, React.TextareaHTMLAttributes<HTMLTextAreaElement>>(
  ({ className, ...props }, ref) => (
    <textarea className={cn(fieldClass, "min-h-20 py-2 leading-relaxed", className)} ref={ref} {...props} />
  )
)
Textarea.displayName = "Textarea"

export { Textarea }
