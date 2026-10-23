import { LogIn, LogOut, User } from "lucide-react";
import { Link, useLocation } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, isActivePath } from "./nav-items";

export function Header() {
  const { data: session, isPending } = authClient.useSession();
  const pathname = useLocation({ select: (location) => location.pathname });
  const canSeeMembers = !!(session?.user?.admin || session?.user?.member);

  const signIn = () =>
    authClient.signIn.social({ provider: "google", callbackURL: window.location.href });
  const signOut = async () => {
    await authClient.signOut();
    window.location.reload();
  };

  return (
    <header
      className="sticky top-0 z-40 h-(--header-h) border-b border-border bg-background/85 backdrop-blur-md pt-[env(safe-area-inset-top)]"
    >
      <div className="mx-auto flex h-full max-w-screen-2xl items-center justify-between gap-4 px-4 md:px-6">
        <Link to="/map" className="flex min-w-0 items-center gap-3 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <img src="/logo.png" alt="" className="h-9 w-9 rounded-md object-cover" />
          <span className="min-w-0">
            <span className="block truncate font-display text-xl leading-none text-foreground lg:text-2xl">
              Draycott Drambusters
            </span>
            <span className="mt-1 hidden text-[10px] uppercase tracking-[0.2em] text-primary/80 lg:block">
              Est. 2019
            </span>
          </span>
        </Link>

        {/* Desktop navigation; the mobile bar lives in BottomNav */}
        <nav aria-label="Primary" className="hidden items-center gap-0.5 md:flex lg:gap-1">
          {NAV_ITEMS.filter((item) => !item.membersOnly || canSeeMembers).map((item) => {
            const active = isActivePath(pathname, item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "inline-flex h-9 items-center gap-2 rounded-md px-2.5 text-sm font-medium transition-colors duration-(--duration-fast) focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:px-3",
                  active ? "bg-primary/12 text-primary" : "text-muted-foreground hover:bg-accent hover:text-foreground"
                )}
              >
                <item.icon size={16} aria-hidden />
                <span className="hidden lg:inline">{item.label}</span>
                <span className="lg:hidden">{item.short ?? item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex shrink-0 items-center">
          {isPending ? (
            <Skeleton className="h-9 w-9 rounded-full" />
          ) : session?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  aria-label="Account menu"
                  className="flex h-10 w-10 items-center justify-center rounded-full transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {session.user.image ? (
                    <img src={session.user.image} alt="" className="h-8 w-8 rounded-full ring-1 ring-border" />
                  ) : (
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-muted text-muted-foreground">
                      <User size={16} />
                    </span>
                  )}
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>
                  <span className="block truncate font-medium text-foreground">{session.user.name}</span>
                  <span className="block truncate">{session.user.email}</span>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onSelect={() => signOut()}>
                  <LogOut /> Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button variant="ghost" size="sm" onClick={() => signIn()}>
              <LogIn size={16} />
              <span>Sign in</span>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
