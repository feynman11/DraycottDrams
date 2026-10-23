import { cn } from "@/lib/utils";
import { Header } from "./header";
import { BottomNav } from "./bottom-nav";

interface AppShellProps {
  children: React.ReactNode;
  /** The map pins its height to the viewport instead of scrolling the document */
  fullBleed?: boolean;
}

// Sticky header, document-scrolling main, mobile tab bar. Every page except sign-in uses it.
export function AppShell({ children, fullBleed }: AppShellProps) {
  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <main
        className={cn(
          // A definite height (not flex) so the map's h-full chain resolves
          fullBleed ? "relative flex-none h-viewport overflow-hidden" : "flex-1 pb-[calc(var(--bottom-nav-h)+var(--safe-bottom))]"
        )}
      >
        {children}
      </main>
      <BottomNav />
    </div>
  );
}

// Standard page width and gutters
export function PageContainer({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <div className={cn("mx-auto w-full max-w-screen-2xl px-4 py-6 md:px-8 md:py-10", className)}>{children}</div>
  );
}
