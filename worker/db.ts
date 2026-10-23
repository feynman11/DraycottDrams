import { drizzle } from "drizzle-orm/d1";
import { getTableColumns, type Table } from "drizzle-orm";
import type { BatchItem } from "drizzle-orm/batch";
import * as schema from "@/db/schema";

// One Drizzle instance per request, over the request's D1 binding.
export const createDb = (d1: D1Database) => drizzle(d1, { schema });

export type Db = ReturnType<typeof createDb>;

// D1 allows at most 100 bound parameters per statement: rows per multi-row insert into `table`
export function maxInsertRows(table: Table): number {
  return Math.floor(100 / Object.keys(getTableColumns(table)).length);
}

export function chunk<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

// Run write statements in order via db.batch (D1 has no interactive transactions). Each batch
// of up to 50 statements is atomic; a larger set is applied as several batches.
export async function runBatched(db: Db, statements: BatchItem<"sqlite">[]): Promise<void> {
  for (const group of chunk(statements, 50)) {
    await db.batch(group as [BatchItem<"sqlite">, ...BatchItem<"sqlite">[]]);
  }
}
