import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { cva, type VariantProps } from "class-variance-authority"
import { X } from "lucide-react"

import { cn } from "@/lib/utils"

// A side panel on Radix Dialog: portal, overlay, focus trap and Escape for free.
// Below md every side becomes a full-screen panel so content never fights the viewport.
const Sheet = DialogPrimitive.Root
const SheetTrigger = DialogPrimitive.Trigger
const SheetClose = DialogPrimitive.Close
const SheetPortal = DialogPrimitive.Portal

const SheetOverlay = React.forwardRef<
  React.ComponentRef<typeof DialogPrimitive.Overlay>,
  React.ComponentPropsWithoutRef<typeof DialogPrimitive.Overlay>
>(({ className, ...props }, ref) => (
  <DialogPrimitive.Overlay
    ref={ref}
    className={cn(
      "fixed inset-0 z-50 bg-background/70 backdrop-blur-[2px] data-[state=open]:animate-fade-in data-[state=closed]:animate-fade-in data-[state=closed]:[animation-direction:reverse]",
      className
    )}
    {...props}
  />
))
SheetOverlay.displayName = DialogPrimitive.Overlay.displayName

const sheetVariants = cva(
  "fixed z-50 flex flex-col bg-card text-card-foreground shadow-lg focus:outline-none",
  {
    variants: {
      side: {
        right:
          "inset-y-0 right-0 w-full border-l border-border md:w-[480px] md:max-w-[90vw] data-[state=open]:animate-in-right data-[state=closed]:animate-out-right",
        left: "inset-y-0 left-0 w-full border-r border-border md:w-80 data-[state=open]:animate-in-left data-[state=closed]:animate-out-left",
        bottom:
          "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-2xl border-t border-border data-[state=open]:animate-in-bottom data-[state=closed]:animate-out-bottom",
      },
    },
    defaultVariants: { side: "right" },
  }
)

interface SheetContentProps
  extends React.ComponentPropsWithoutRef<typeof DialogPrimitive.Content>,
    VariantProps<typeof sheetVariants> {
  /** Accessible name for the panel; rendered visually hidden when `title` is not shown */
  title: string
  description?: string
  hideClose?: boolean
}

const SheetContent = React.forwardRef<React.ComponentRef<typeof DialogPrimitive.Content>, SheetContentProps>(
  ({ side = "right", className, children, title, description, hideClose, ...props }, ref) => (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content ref={ref} className={cn(sheetVariants({ side }), className)} {...props}>
        <DialogPrimitive.Title className="sr-only">{title}</DialogPrimitive.Title>
        <DialogPrimitive.Description className="sr-only">{description ?? title}</DialogPrimitive.Description>
        {children}
        {!hideClose && (
          <DialogPrimitive.Close
            className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-background/60 text-muted-foreground backdrop-blur transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label="Close"
          >
            <X size={18} />
          </DialogPrimitive.Close>
        )}
      </DialogPrimitive.Content>
    </SheetPortal>
  )
)
SheetContent.displayName = "SheetContent"

const SheetHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex flex-col gap-1.5 px-6 pt-6 pb-4", className)} {...props} />
)

const SheetBody = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <div className={cn("flex-1 min-h-0 overflow-y-auto overscroll-contain px-6 pb-[calc(1.5rem+var(--safe-bottom))]", className)} {...props} />
)

const SheetTitle = React.forwardRef<HTMLHeadingElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h2 ref={ref} className={cn("text-lg font-semibold tracking-tight", className)} {...props} />
  )
)
SheetTitle.displayName = "SheetTitle"

export { Sheet, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetBody, SheetTitle, SheetOverlay }
