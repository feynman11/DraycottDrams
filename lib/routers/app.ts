import { createTRPCRouter } from "@/lib/trpc";
import { whiskyRouter } from "./whisky";
import { userRouter } from "./user";
import { tastingRouter } from "./tasting";
import { aiRouter } from "./ai";
import { importRouter } from "./import";
import { distilleryRouter } from "./distillery";
import { gatheringRouter } from "./gathering";
import { memberRouter } from "./member";

export const appRouter = createTRPCRouter({
  whisky: whiskyRouter,
  user: userRouter,
  tasting: tastingRouter,
  ai: aiRouter,
  import: importRouter,
  distillery: distilleryRouter,
  gathering: gatheringRouter,
  member: memberRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
