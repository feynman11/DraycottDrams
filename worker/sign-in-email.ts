import { eq } from "drizzle-orm";
import { members, users } from "@/db/schema";
import type { Db } from "@/worker/db";
import { normalizeEmail, normalizedEmailSql } from "@/worker/member-link";

const FROM = { email: "signin@draycottdrams.co.uk", name: "Draycott Drambusters" };

// Links go only to addresses the club knows: a member's email or an existing account. Anyone
// else gets no email (and no error, so the form doesn't reveal who is a member).
async function isKnownEmail(db: Db, email: string): Promise<boolean> {
  const [member] = await db.select({ id: members.id }).from(members).where(eq(members.email, email)).limit(1);
  if (member) return true;
  const [user] = await db.select({ id: users.id }).from(users).where(eq(normalizedEmailSql(users.email), email)).limit(1);
  return !!user;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

export async function sendSignInLink(env: Env, db: Db, { email, url }: { email: string; url: string }) {
  const to = normalizeEmail(email);
  if (!(await isKnownEmail(db, to))) return;

  const href = escapeHtml(url);
  await env.EMAIL.send({
    to,
    from: FROM,
    subject: "Your Draycott Drambusters sign-in link",
    text: `Sign in to Draycott Drambusters:\n\n${url}\n\nThe link works once and expires in 15 minutes. If you didn't ask for it, ignore this email.`,
    html: `<div style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#1c1917">
  <h1 style="font-size:20px;margin:0 0 12px">Sign in to Draycott Drambusters</h1>
  <p style="margin:0 0 20px">Tap the button to sign in. The link works once and expires in 15 minutes.</p>
  <p style="margin:0 0 24px"><a href="${href}" style="display:inline-block;background:#b45309;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">Sign in</a></p>
  <p style="margin:0;font-size:13px;color:#78716c">If you didn't ask for this, ignore this email.</p>
</div>`,
  });
}
