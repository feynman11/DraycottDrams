import { pgTable, text, timestamp, integer, decimal, jsonb, boolean, uuid } from "drizzle-orm/pg-core";
import { createInsertSchema, createSelectSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

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
  admin: boolean("admin").default(false).notNull(),
  member: boolean("member").default(false).notNull(),
  lastLogin: timestamp("last_login", { mode: "date" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const members = pgTable("members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  timesHosted: integer("times_hosted").default(0).notNull(),
  lastHosted: timestamp("last_hosted", { mode: "date" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const distilleries = pgTable("distilleries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  country: text("country").notNull(),
  region: text("region").notNull(),
  coordinates: jsonb("coordinates").$type<[number, number]>(),
  description: text("description"),
  website: text("website"),
  founded: integer("founded"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const gatherings = pgTable("gatherings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  number: integer("number").notNull().unique(),
  date: timestamp("date", { mode: "date" }).notNull(),
  hostId: text("host_id").references(() => members.id, { onDelete: "restrict" }).notNull(),
  theme: text("theme"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const whiskies = pgTable("whiskies", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  gatheringId: text("gathering_id").references(() => gatherings.id, { onDelete: "restrict" }).notNull(),
  provider: text("provider").notNull(),
  distilleryId: text("distillery_id").references(() => distilleries.id, { onDelete: "restrict" }).notNull(),
  variety: text("variety").notNull(),
  abv: decimal("abv", { precision: 4, scale: 1 }).notNull(),
  notes: text("notes"),
  // Legacy fields kept for backward compatibility (optional)
  name: text("name"),
  type: text("type"),
  age: integer("age"),
  priceRange: text("price_range"),
  description: text("description"),
  tastingNotes: jsonb("tasting_notes").$type<string[]>(),
  flavourProfile: jsonb("flavour_profile").$type<{
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

export const insertDistillerySchema = createInsertSchema(distilleries);
export const selectDistillerySchema = createSelectSchema(distilleries);

export const insertGatheringSchema = createInsertSchema(gatherings);
export const selectGatheringSchema = createSelectSchema(gatherings);

export const insertMemberSchema = createInsertSchema(members);
export const selectMemberSchema = createSelectSchema(members);

// Relations
export const usersRelations = relations(users, ({ one }) => ({
  member: one(members, {
    fields: [users.id],
    references: [members.userId],
  }),
}));

export const membersRelations = relations(members, ({ one, many }) => ({
  user: one(users, {
    fields: [members.userId],
    references: [users.id],
  }),
  hostedGatherings: many(gatherings),
}));

export const distilleriesRelations = relations(distilleries, ({ many }) => ({
  whiskies: many(whiskies),
}));

export const gatheringsRelations = relations(gatherings, ({ one, many }) => ({
  host: one(members, {
    fields: [gatherings.hostId],
    references: [members.id],
  }),
  whiskies: many(whiskies),
}));

export const whiskiesRelations = relations(whiskies, ({ one }) => ({
  distillery: one(distilleries, {
    fields: [whiskies.distilleryId],
    references: [distilleries.id],
  }),
  gathering: one(gatherings, {
    fields: [whiskies.gatheringId],
    references: [gatherings.id],
  }),
}));

// Types
export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;

export type Distillery = typeof distilleries.$inferSelect;
export type NewDistillery = typeof distilleries.$inferInsert;

export type Gathering = typeof gatherings.$inferSelect;
export type NewGathering = typeof gatherings.$inferInsert;

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;

export type Whisky = typeof whiskies.$inferSelect;
export type NewWhisky = typeof whiskies.$inferInsert;

export type Tasting = typeof tastings.$inferSelect;
export type NewTasting = typeof tastings.$inferInsert;

export type TastingNote = typeof tastingNotes.$inferSelect;
export type NewTastingNote = typeof tastingNotes.$inferInsert;
