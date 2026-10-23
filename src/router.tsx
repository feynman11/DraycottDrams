import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Link,
  Outlet,
  redirect,
  useRouterState,
} from "@tanstack/react-router";
import { useState } from "react";
import { AIButton } from "@/components/ai/ai-button";
import { SommelierPanel } from "@/components/ai/sommelier-panel";
import { authClient } from "@/lib/auth-client";
import SignInPage from "./pages/signin";

// Each page is its own chunk, so the map (MapLibre, D3) code only loads where used (xlsx loads on demand).
// The sign-in page stays in the main bundle: it imports signinRoute from this file.
const MapPage = lazyRouteComponent(() => import("./pages/map"));
const LibraryPage = lazyRouteComponent(() => import("./pages/library"));
const DistilleriesPage = lazyRouteComponent(() => import("./pages/distilleries"));
const MembersPage = lazyRouteComponent(() => import("./pages/members"));
const WinnersPage = lazyRouteComponent(() => import("./pages/winners"));

function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center p-6 text-center">
      <h1 className="font-display text-display text-foreground mb-2">Page not found</h1>
      <p className="text-muted-foreground mb-6">The page you were looking for doesn&apos;t exist.</p>
      <Link to="/map" className="text-primary underline underline-offset-4 hover:text-primary/80">
        Back to the map
      </Link>
    </div>
  );
}

// Signed-in users get the AI sommelier button (bottom right) on every page except sign-in.
function RootLayout() {
  const [showSommelier, setShowSommelier] = useState(false);
  const { data: session } = authClient.useSession();
  const onSignIn = useRouterState({ select: (s) => s.location.pathname === "/signin" });
  return (
    <>
      <Outlet />
      {session?.user && !onSignIn && (
        <>
          <AIButton onClick={() => setShowSommelier(!showSommelier)} isOpen={showSommelier} />
          <SommelierPanel isOpen={showSommelier} onClose={() => setShowSommelier(false)} />
        </>
      )}
    </>
  );
}

const rootRoute = createRootRoute({
  component: RootLayout,
  notFoundComponent: NotFound,
});

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/",
  beforeLoad: () => {
    throw redirect({ to: "/map", replace: true });
  },
});

const mapRoute = createRoute({ getParentRoute: () => rootRoute, path: "/map", component: MapPage });
const libraryRoute = createRoute({ getParentRoute: () => rootRoute, path: "/library", component: LibraryPage });
const distilleriesRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/distilleries",
  component: DistilleriesPage,
});
const membersRoute = createRoute({ getParentRoute: () => rootRoute, path: "/members", component: MembersPage });
const winnersRoute = createRoute({ getParentRoute: () => rootRoute, path: "/winners", component: WinnersPage });

export type SignInSearch = { error?: string; callbackUrl?: string };

export const signinRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: "/signin",
  validateSearch: (search: Record<string, unknown>): SignInSearch => ({
    error: typeof search.error === "string" ? search.error : undefined,
    callbackUrl: typeof search.callbackUrl === "string" ? search.callbackUrl : undefined,
  }),
  component: SignInPage,
});

const routeTree = rootRoute.addChildren([
  indexRoute,
  mapRoute,
  libraryRoute,
  distilleriesRoute,
  membersRoute,
  winnersRoute,
  signinRoute,
]);

export const router = createRouter({ routeTree, defaultPreload: "intent", defaultViewTransition: true });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
