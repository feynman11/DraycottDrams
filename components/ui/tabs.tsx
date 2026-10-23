import * as React from "react"

import { cn } from "@/lib/utils"

export interface TabItem<T extends string> {
  value: T
  label: string
  icon?: React.ReactNode
  count?: number
}

interface TabsProps<T extends string> {
  items: TabItem<T>[]
  value: T
  onChange: (value: T) => void
  /** Accessible name for the tab list */
  label: string
  className?: string
}

// Underline tabs with roving focus (Left/Right/Home/End). Scrolls sideways when the list is wider
// than the viewport, with a fade so it reads as scrollable.
export function Tabs<T extends string>({ items, value, onChange, label, className }: TabsProps<T>) {
  const refs = React.useRef<Map<T, HTMLButtonElement>>(new Map())

  const onKeyDown = (e: React.KeyboardEvent, index: number) => {
    const keys: Record<string, number> = { ArrowRight: index + 1, ArrowLeft: index - 1, Home: 0, End: items.length - 1 }
    if (!(e.key in keys)) return
    e.preventDefault()
    const next = items[(keys[e.key] + items.length) % items.length]
    onChange(next.value)
    refs.current.get(next.value)?.focus()
  }

  return (
    <div className={cn("relative border-b border-border", className)}>
      <div
        role="tablist"
        aria-label={label}
        className="flex gap-1 overflow-x-auto scrollbar-hide -mb-px [mask-image:linear-gradient(to_right,black_calc(100%-2rem),transparent)] md:[mask-image:none]"
      >
        {items.map((item, i) => {
          const active = item.value === value
          return (
            <button
              key={item.value}
              ref={(el) => { if (el) refs.current.set(item.value, el); else refs.current.delete(item.value) }}
              role="tab"
              type="button"
              aria-selected={active}
              tabIndex={active ? 0 : -1}
              onClick={() => onChange(item.value)}
              onKeyDown={(e) => onKeyDown(e, i)}
              className={cn(
                "inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors duration-(--duration-fast) focus-visible:outline-none focus-visible:rounded-t-md focus-visible:ring-2 focus-visible:ring-ring",
                active
                  ? "border-primary text-foreground"
                  : "border-transparent text-muted-foreground hover:text-foreground hover:border-border-strong"
              )}
            >
              {item.icon && <span className={cn("[&_svg]:size-4", active ? "text-primary" : "")}>{item.icon}</span>}
              {item.label}
              {item.count !== undefined && (
                <span className={cn("rounded-full px-1.5 text-xs tabular-nums", active ? "bg-primary/15 text-primary" : "bg-muted text-subtle")}>
                  {item.count}
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}
