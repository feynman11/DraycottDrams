/**
 * Centralized type definitions inferred from tRPC router outputs
 * All types are derived from Drizzle DB queries via tRPC procedures
 */

import { type AppRouter } from "@/lib/routers/app";
import { type inferProcedureOutput } from "@trpc/server";

// Whisky types
export type WhiskyWithGathering = inferProcedureOutput<AppRouter["whisky"]["getAll"]>[number];
export type WhiskyById = inferProcedureOutput<AppRouter["whisky"]["getById"]>;

// Distillery types
export type Distillery = inferProcedureOutput<AppRouter["distillery"]["getAll"]>[number];
export type DistilleryById = inferProcedureOutput<AppRouter["distillery"]["getById"]>;

// Gathering types
export type Gathering = inferProcedureOutput<AppRouter["gathering"]["getAll"]>[number];
export type GatheringByNumber = inferProcedureOutput<AppRouter["gathering"]["getByNumber"]>;

// Tasting types
export type UserTasting = inferProcedureOutput<AppRouter["tasting"]["getUserTastings"]>[number];
export type TastingByWhisky = inferProcedureOutput<AppRouter["tasting"]["getByWhisky"]>[number];

// Stats types
export type WhiskyStats = inferProcedureOutput<AppRouter["whisky"]["getStats"]>;

