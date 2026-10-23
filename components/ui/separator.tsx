import { cn } from "@/lib/utils"

function Separator({
  orientation = "horizontal",
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn("shrink-0 bg-border", orientation === "horizontal" ? "h-px w-full" : "w-px self-stretch", className)}
      {...props}
    />
  )
}

export { Separator }
