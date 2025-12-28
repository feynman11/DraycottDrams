import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "@/lib/routers/app";
import { createTRPCContext } from "@/lib/trpc";

const handler = (request: Request) =>
  fetchRequestHandler({
    endpoint: "/api/trpc",
    req: request,
    router: appRouter,
    createContext: () => createTRPCContext(request as any),
    onError: ({ error, path }) => {
      console.error(`❌ tRPC Error on '${path}':`, error);
    },
  });

export { handler as GET, handler as POST };
