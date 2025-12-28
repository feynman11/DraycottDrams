import { config } from "dotenv";
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@/db/schema";

// Load environment variables
// Prefer `.env.local` (common in Next.js) but still allow `.env`.
config({ path: ".env.local" });
config();

// Database connection
const connectionString = process.env.DATABASE_URL!;



// Create the connection
const client = postgres(connectionString, { prepare: false });

// Create the drizzle instance
export const db = drizzle(client, { schema });

// Export for testing/cleanup
export { client };
