import { WhiskyMap } from "@/components/whisky/whisky-map";
import { AppShell } from "@/components/layout/app-shell";
import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function MapPage() {
  const [showAtlasBox, setShowAtlasBox] = useState(true);

  // Load atlas box preference from localStorage on mount
  useEffect(() => {
    const saved = localStorage.getItem('atlas-box-dismissed');
    if (saved === 'true') {
      setShowAtlasBox(false);
    }
  }, []);

  const dismissAtlasBox = () => {
    setShowAtlasBox(false);
    localStorage.setItem('atlas-box-dismissed', 'true');
  };

  return (
    <AppShell fullBleed>
      <WhiskyMap />
      {/* First-visit hint; phones need the room, so it's md and up only. Bottom right, clear of
          the legend (bottom left) and the sommelier button (far right). */}
      {showAtlasBox && (
        <aside className="absolute bottom-4 right-20 z-10 hidden max-w-xs animate-rise-in md:block">
          <div className="relative rounded-xl border border-border bg-popover/90 p-4 pr-10 shadow-lg backdrop-blur-md">
            <button
              type="button"
              onClick={dismissAtlasBox}
              className="touch-exempt absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              aria-label="Dismiss"
            >
              <X size={14} />
            </button>
            <h2 className="font-display text-xl text-foreground">Interactive atlas</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Explore the origins of the whiskies tasted by the club. Click a pin to view tasting notes and flavour profiles.
            </p>
          </div>
        </aside>
      )}
    </AppShell>
  );
}
