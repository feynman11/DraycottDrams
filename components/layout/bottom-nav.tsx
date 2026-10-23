import { Link, useLocation } from "@tanstack/react-router";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActivePath } from "./nav-items";

// Mobile navigation: a persistent tab bar keeps every destination one thumb-tap away.
// Hidden from md up, where the header carries the links.
export function BottomNav() {
  const { data: session } = authClient.useSession();
  const pathname = useLocation({ select: (location) => location.pathname });
  const canSeeMembers = !!(session?.user?.admin || session?.user?.member);
  const items = NAV_ITEMS.filter((item) => !item.membersOnly || canSeeMembers);

  return (
    <nav
      aria-label="Primary"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/90 backdrop-blur-md pb-(--safe-bottom) md:hidden"
    >
      <ul className="flex h-(--bottom-nav-h) items-stretch">
        {items.map((item) => {
          const active = isActivePath(pathname, item.to);
          return (
            <li key={item.to} className="flex-1">
              <Link
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex h-full flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors duration-(--duration-fast) focus-visible:outline-none focus-visible:bg-accent",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-12 items-center justify-center rounded-full transition-colors duration-(--duration-fast)",
                    active && "bg-primary/15"
                  )}
                >
                  <item.icon size={20} aria-hidden />
                </span>
                {item.short ?? item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
