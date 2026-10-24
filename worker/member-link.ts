import { eq, sql } from "drizzle-orm";
import type { SQLiteColumn } from "drizzle-orm/sqlite-core";
import { members, users } from "@/db/schema";
import type { Db } from "@/worker/db";

// Lowercased, with @googlemail.com folded into @gmail.com (the same Google account; UK accounts
// can report either).
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase().replace(/@googlemail\.com$/, "@gmail.com");
}

/** SQL form of normalizeEmail, for comparing stored user emails. */
export function normalizedEmailSql(column: SQLiteColumn) {
  return sql`replace(lower(${column}), '@googlemail.com', '@gmail.com')`;
}

// Link an unlinked member record to a user and give that user member access. Only fills an
// empty link, so an admin's later changes (unlinking, revoking access) aren't undone.
async function link(db: Db, memberId: string, userId: string) {
  const now = new Date();
  await db.batch([
    db.update(members).set({ userId, updatedAt: now }).where(eq(members.id, memberId)),
    db.update(users).set({ member: true, updatedAt: now }).where(eq(users.id, userId)),
  ]);
}

/** On first sign-in: link the member whose email matches this new user, if there is one. */
export async function linkMemberForUser(db: Db, user: { id: string; email: string }) {
  const [member] = await db
    .select({ id: members.id, userId: members.userId })
    .from(members)
    .where(eq(members.email, normalizeEmail(user.email)))
    .limit(1);
  if (member && !member.userId) await link(db, member.id, user.id);
}

/** When an admin sets a member's email: link the user who has already signed in with it, if any. */
export async function linkUserForMember(db: Db, member: { id: string; email: string | null; userId: string | null }) {
  if (!member.email || member.userId) return;
  const [user] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(normalizedEmailSql(users.email), member.email))
    .limit(1);
  if (!user) return;
  const [taken] = await db.select({ id: members.id }).from(members).where(eq(members.userId, user.id)).limit(1);
  if (!taken) await link(db, member.id, user.id);
}
