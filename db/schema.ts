import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";
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
// `users` is also Better Auth's user model (worker/auth.ts maps it); role/admin/member/lastLogin
// are its additional fields.
export const users = sqliteTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text("email").unique().notNull(),
  emailVerified: integer("email_verified", { mode: "boolean" }).default(false).notNull(),
  name: text("name"),
  image: text("image"),
  role: text("role").$default(() => UserRole.USER).notNull(),
  admin: integer("admin", { mode: "boolean" }).default(false).notNull(),
  member: integer("member", { mode: "boolean" }).default(false).notNull(),
  lastLogin: integer("last_login", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

// Better Auth's own tables (sessions, linked Google accounts, OAuth state). Column set as
// required by better-auth 1.x; worker/auth.ts maps its models onto these.
export const sessions = sqliteTable("sessions", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
}, (t) => [index("sessions_user_id_idx").on(t.userId)]);

export const accounts = sqliteTable("accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  accountId: text("account_id").notNull(),
  providerId: text("provider_id").notNull(),
  accessToken: text("access_token"),
  refreshToken: text("refresh_token"),
  idToken: text("id_token"),
  accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
  scope: text("scope"),
  password: text("password"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
}, (t) => [index("accounts_user_id_idx").on(t.userId)]);

export const verifications = sqliteTable("verifications", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
}, (t) => [index("verifications_identifier_idx").on(t.identifier)]);

export const members = sqliteTable("members", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull(),
  // Lowercased. A Google sign-in with this email links to this member and grants member access.
  email: text("email").unique(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  timesHosted: integer("times_hosted").default(0).notNull(),
  lastHosted: integer("last_hosted", { mode: "timestamp_ms" }),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const distilleries = sqliteTable("distilleries", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  name: text("name").notNull().unique(),
  country: text("country").notNull(),
  region: text("region").notNull(),
  coordinates: text("coordinates", { mode: "json" }).$type<[number, number]>(),
  description: text("description"),
  website: text("website"),
  founded: integer("founded"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const gatherings = sqliteTable("gatherings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  number: integer("number").notNull().unique(),
  date: integer("date", { mode: "timestamp_ms" }).notNull(),
  hostId: text("host_id").references(() => members.id, { onDelete: "restrict" }).notNull(),
  theme: text("theme"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const whiskies = sqliteTable("whiskies", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  gatheringId: text("gathering_id").references(() => gatherings.id, { onDelete: "restrict" }).notNull(),
  provider: text("provider").notNull(),
  distilleryId: text("distillery_id").references(() => distilleries.id, { onDelete: "restrict" }).notNull(),
  variety: text("variety").notNull(),
  abv: text("abv").notNull(),
  notes: text("notes"),
  ranking: integer("ranking"), // 1-6 ranking within gathering (1 = first place, null = unranked)
  // Legacy fields kept for backward compatibility (optional)
  name: text("name"),
  type: text("type"),
  age: integer("age"),
  priceRange: text("price_range"),
  description: text("description"),
  tastingNotes: text("tasting_notes", { mode: "json" }).$type<string[]>(),
  flavourProfile: text("flavour_profile", { mode: "json" }).$type<{
    peat: number;
    fruit: number;
    floral: number;
    spice: number;
    wood: number;
    sweetness: number;
  }>(),
  imageUrl: text("image_url"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const tastings = sqliteTable("tastings", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  userId: text("user_id").references(() => users.id, { onDelete: "cascade" }).notNull(),
  whiskyId: text("whisky_id").references(() => whiskies.id, { onDelete: "cascade" }).notNull(),
  rating: integer("rating").notNull(),
  notes: text("notes"),
  tastingDate: integer("tasting_date", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
});

export const tastingNotes = sqliteTable("tasting_notes", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  tastingId: text("tasting_id").references(() => tastings.id, { onDelete: "cascade" }).notNull(),
  note: text("note").notNull(),
  intensity: integer("intensity").notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).$defaultFn(() => new Date()).notNull(),
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
