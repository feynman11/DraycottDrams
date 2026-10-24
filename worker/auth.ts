import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { magicLink, oAuthProxy } from "better-auth/plugins";
import { eq } from "drizzle-orm";
import { accounts, sessions, users, verifications } from "@/db/schema";
import type { Db } from "@/worker/db";
import { linkMemberForUser } from "@/worker/member-link";
import { sendSignInLink } from "@/worker/sign-in-email";

// Google sign-in with sessions in D1. Every user can sign in; admins mark members in the app,
// or give a member record an email so that sign-in links it automatically.
// Built per request because the D1 binding and secrets only exist inside a request.
export function createAuth(env: Env, db: Db) {
  const isStaging = env.APP_ENV === "staging";
  return betterAuth({
    // Staging infers its URL from the request, so each PR preview is its own origin. Its Google
    // sign-in goes through the staging URL (oAuthProxy), the only one registered with Google.
    baseURL: isStaging ? undefined : env.APP_URL,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: { user: users, session: sessions, account: accounts, verification: verifications },
    }),
    socialProviders: {
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
        redirectURI: isStaging ? `${env.APP_URL}/api/auth/callback/google` : undefined,
      },
    },
    // Users imported from the old Postgres database have no linked account yet: their first
    // Google sign-in links to the existing row (same id, so tastings stay theirs).
    account: { accountLinking: { enabled: true, trustedProviders: ["google"] } },
    user: {
      additionalFields: {
        role: { type: "string", defaultValue: "user", input: false },
        admin: { type: "boolean", defaultValue: false, input: false },
        member: { type: "boolean", defaultValue: false, input: false },
        lastLogin: { type: "date", required: false, input: false },
      },
    },
    databaseHooks: {
      user: {
        create: {
          // An admin may have given a member this email before they ever signed in.
          after: async (user) => {
            await linkMemberForUser(db, user);
          },
        },
      },
      session: {
        create: {
          after: async (session) => {
            await db.update(users).set({ lastLogin: new Date() }).where(eq(users.id, session.userId));
          },
        },
      },
    },
    plugins: [
      // Emailed sign-in links, for members without a Google account.
      magicLink({ expiresIn: 15 * 60, sendMagicLink: (data) => sendSignInLink(env, db, data) }),
      ...(isStaging ? [oAuthProxy({ productionURL: env.APP_URL })] : []),
    ],
  });
}

export type Auth = ReturnType<typeof createAuth>;
