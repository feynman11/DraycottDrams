import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }: any) {
      // If signing in with OAuth (Google), create or update user in database
      if (account?.provider === "google" && user.email) {
        try {
          const existingUser = await db
            .select()
            .from(users)
            .where(eq(users.email, user.email))
            .limit(1);

          if (existingUser.length === 0) {
            // Create new user for OAuth
            await db.insert(users).values({
              id: user.id,
              email: user.email,
              name: user.name || null,
              image: user.image || null,
              emailVerified: new Date(),
            });
          } else {
            // Update existing user with OAuth info if needed
            await db
              .update(users)
              .set({
                name: user.name || existingUser[0].name,
                image: user.image || existingUser[0].image,
                emailVerified: existingUser[0].emailVerified || new Date(),
              })
              .where(eq(users.email, user.email));
          }
        } catch (error) {
          console.error("Error creating/updating user:", error);
          return false;
        }
      }

      return true;
    },
    async session({ session, token }: any) {
      // Verify user still exists before allowing session
      if (!token.sub) {
        // Token was invalidated (user deleted), don't set user id/role
        return session;
      }

      try {
        const dbUser = await db
          .select({ id: users.id, role: users.role })
          .from(users)
          .where(eq(users.id, token.sub))
          .limit(1);

        if (dbUser.length === 0) {
          // User was deleted, don't set user id/role (session will be invalid)
          return session;
        }

        if (session.user) {
          session.user.id = token.sub;
          session.user.role = dbUser[0].role;
        }
      } catch (error) {
        console.error("Error verifying user in session callback:", error);
        // On error, don't set user id/role
      }
      return session;
    },
    async jwt({ token, user, account }: any) {
      // On initial sign in, set the user ID and role, and update lastLogin
      if (user) {
        // For OAuth users, fetch user ID and role from database and update lastLogin
        if (account?.provider === "google" && user.email) {
          try {
            const dbUser = await db
              .select({ id: users.id, role: users.role })
              .from(users)
              .where(eq(users.email, user.email))
              .limit(1);

            if (dbUser.length > 0) {
              token.sub = dbUser[0].id;
              token.role = dbUser[0].role;
              // Update lastLogin
              await db
                .update(users)
                .set({ lastLogin: new Date() })
                .where(eq(users.id, dbUser[0].id));
            } else {
              console.error(`User ${user.email} not found in database after OAuth login`);
            }
          } catch (error) {
            console.error("Error fetching user from database:", error);
          }
        }
      }

      // On subsequent requests, verify the user still exists and refresh role
      if (token.sub && !user) {
        try {
          const dbUser = await db
            .select({ id: users.id, role: users.role })
            .from(users)
            .where(eq(users.id, token.sub))
            .limit(1);

          if (dbUser.length === 0) {
            // User was deleted, clear the token
            token.sub = undefined;
            token.role = undefined;
            console.warn(`User ${token.sub} not found in database, clearing token`);
          } else {
            // Refresh role in case it changed
            token.role = dbUser[0].role;
          }
        } catch (error) {
          console.error("Error verifying user in database:", error);
        }
      }

      return token;
    },
  },
  pages: {
    signIn: "/signin",
  },
  session: {
    strategy: "jwt" as const,
  },
};

const auth = NextAuth(authOptions);

export default auth;
export { auth };
