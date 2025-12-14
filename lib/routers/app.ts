import { createTRPCRouter } from "@/lib/trpc";
import { whiskyRouter } from "./whisky";
import { userRouter } from "./user";
import { tastingRouter } from "./tasting";
import { aiRouter } from "./ai";
import { importRouter } from "./import";

export const appRouter = createTRPCRouter({
  whisky: whiskyRouter,
  user: userRouter,
  tasting: tastingRouter,
  ai: aiRouter,
  import: importRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
