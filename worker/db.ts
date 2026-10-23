import { drizzle } from "drizzle-orm/d1";
import * as schema from "@/db/schema";

// One Drizzle instance per request, over the request's D1 binding.
export const createDb = (d1: D1Database) => drizzle(d1, { schema });

export type Db = ReturnType<typeof createDb>;
