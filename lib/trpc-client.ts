import { createTRPCReact } from "@trpc/react-query";
import { type AppRouter } from "@/worker/routers/app";

export const api = createTRPCReact<AppRouter>();
