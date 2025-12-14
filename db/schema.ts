import { pgTable, text, timestamp, integer, decimal, jsonb, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";

// Enums
export const UserRole = {
  PUBLIC: "public",
  USER: "user",
  MEMBER: "member",
  ADMIN: "admin",
} as const;

export const ParticipationStatus = {
  REGISTERED: "registered",
  ATTENDED: "attended",
  NO_SHOW: "no_show",
} as const;

// Tables
export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique().notNull(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  name: text("name"),
  image: text("image"),
  role: text("role").$default(() => UserRole.USER).notNull(),
  lastLogin: timestamp("last_login", { mode: "date" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const whiskies = pgTable("whiskies", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  gathering: integer("gathering").notNull(),
  theme: text("theme").notNull(),
  date: timestamp("date", { mode: "date" }).notNull(),
  provider: text("provider").notNull(),
  country: text("country").notNull(),
  region: text("region").notNull(),
  distillery: text("distillery").notNull(),
  variety: text("variety").notNull(),
  abv: decimal("abv", { precision: 4, scale: 1 }).notNull(),
  host: text("host").notNull(),
  notes: text("notes"),
  // Legacy fields kept for backward compatibility (optional)
  name: text("name"),
  type: text("type"),
  age: integer("age"),
  priceRange: text("price_range"),
  description: text("description"),
  tastingNotes: jsonb("tasting_notes").$type<string[]>(),
  coordinates: jsonb("coordinates").$type<[number, number]>(),
  flavorProfile: jsonb("flavor_profile").$type<{
    peat: number;
    fruit: number;
    floral: number;
    spice: number;
    wood: number;
    sweetness: number;
  }>(),
  imageUrl: text("image_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tastings = pgTable("tastings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  whiskyId: text("whisky_id").references(() => whiskies.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating").notNull(),
  notes: text("notes"),
  tastingDate: timestamp("tasting_date", { mode: "date" }).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tastingNotes = pgTable("tasting_notes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tastingId: text("tasting_id").references(() => tastings.id, { onDelete: "cascade" }).notNull(),
  note: text("note").notNull(),
  intensity: integer("intensity").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

// Zod schemas for validation
export const insertUserSchema = createInsertSchema(users);
export const selectUserSchema = createSelectSchema(users);

export const insertWhiskySchema = createInsertSchema(whiskies);

export const selectWhiskySchema = createSelectSchema(whiskies);

export const insertTastingSchema = createInsertSchema(tastings);
export const selectTastingSchema = createSelectSchema(tastings);

export const insertTastingNoteSchema = createInsertSchema(tastingNotes);
export const selectTastingNoteSchema = createSelectSchema(tastingNotes);

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Whisky = typeof whiskies.$inferSelect;
export type NewWhisky = typeof whiskies.$inferInsert;

export type Tasting = typeof tastings.$inferSelect;
export type NewTasting = typeof tastings.$inferInsert;

export type TastingNote = typeof tastingNotes.$inferSelect;
export type NewTastingNote = typeof tastingNotes.$inferInsert;
