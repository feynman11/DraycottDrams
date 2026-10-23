import {
  createRootRoute,
  createRoute,
  createRouter,
  lazyRouteComponent,
  Link,
  Outlet,
  redirect,
} from "@tanstack/react-router";
import SignInPage from "./pages/signin";

// Each page is its own chunk, so the map (MapLibre, D3) and import (xlsx) code only loads where used.
// The sign-in page stays in the main bundle: it imports signinRoute from this file.
const MapPage = lazyRouteComponent(() => import("./pages/map"));
const LibraryPage = lazyRouteComponent(() => import("./pages/library"));
const DistilleriesPage = lazyRouteComponent(() => import("./pages/distilleries"));
const MembersPage = lazyRouteComponent(() => import("./pages/members"));
const WinnersPage = lazyRouteComponent(() => import("./pages/winners"));
const ImportPage = lazyRouteComponent(() => import("./pages/import"));

function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-950 text-slate-200 p-6">
      <h1 className="text-3xl font-bold text-amber-50 mb-2">Page not found</h1>
      <p className="text-slate-400 mb-6">The page you were looking for doesn&apos;t exist.</p>
      <Link to="/map" className="text-amber-500 hover:text-amber-400 underline">
        Back to the map
      </Link>
    </div>
  );
}

const rootRoute = createRootRoute({
  component: Outlet,
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
const importRoute = createRoute({ getParentRoute: () => rootRoute, path: "/import", component: ImportPage });

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
  importRoute,
  signinRoute,
]);

export const router = createRouter({ routeTree, defaultPreload: "intent" });

declare module "@tanstack/react-router" {
  interface Register {
    router: typeof router;
  }
}
