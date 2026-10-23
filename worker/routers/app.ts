import { createTRPCRouter } from "@/worker/trpc";
import { whiskyRouter } from "./whisky";
import { userRouter } from "./user";
import { tastingRouter } from "./tasting";
import { aiRouter } from "./ai";
import { distilleryRouter } from "./distillery";
import { gatheringRouter } from "./gathering";
import { memberRouter } from "./member";
import { dramsRouter } from "./drams";

export const appRouter = createTRPCRouter({
  whisky: whiskyRouter,
  user: userRouter,
  tasting: tastingRouter,
  ai: aiRouter,
  distillery: distilleryRouter,
  gathering: gatheringRouter,
  member: memberRouter,
  drams: dramsRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
