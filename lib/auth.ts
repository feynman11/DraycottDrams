import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import { db } from "@/lib/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

// Validate required environment variables
if (!process.env.GOOGLE_CLIENT_ID) {
  throw new Error("GOOGLE_CLIENT_ID is not set");
}
if (!process.env.GOOGLE_CLIENT_SECRET) {
  throw new Error("GOOGLE_CLIENT_SECRET is not set");
}
if (!process.env.NEXTAUTH_SECRET) {
  throw new Error("NEXTAUTH_SECRET is not set");
}
if (!process.env.NEXTAUTH_URL) {
  console.warn("NEXTAUTH_URL is not set - this may cause OAuth issues in production");
}

export const authOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
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
            // Create new user for OAuth - all users start as non-members
            // Try with admin/member fields first, fallback to basic insert if columns don't exist
            try {
              await db.insert(users).values({
                id: user.id,
                email: user.email,
                name: user.name || null,
                image: user.image || null,
                emailVerified: new Date(),
                admin: false,
                member: false,
              });
            } catch (insertError: any) {
              // If admin/member columns don't exist yet, try without them
              if (insertError?.message?.includes('admin') || insertError?.message?.includes('member')) {
                console.warn("admin/member columns may not exist yet, inserting without them");
                await db.insert(users).values({
                  id: user.id,
                  email: user.email,
                  name: user.name || null,
                  image: user.image || null,
                  emailVerified: new Date(),
                });
              } else {
                throw insertError;
              }
            }
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
          // Log error but don't block sign-in - allow authentication to proceed
          // The user can still sign in, and we can fix database issues separately
          console.error("Error creating/updating user in database:", error);
          // Don't return false - allow sign-in to proceed
        }
      }

      // Always allow sign-in - all users can authenticate
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
          .select({ id: users.id, role: users.role, admin: users.admin, member: users.member })
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
          session.user.admin = dbUser[0].admin;
          session.user.member = dbUser[0].member;
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
              .select({ id: users.id, role: users.role, admin: users.admin, member: users.member })
              .from(users)
              .where(eq(users.email, user.email))
              .limit(1);

            if (dbUser.length > 0) {
              token.sub = dbUser[0].id;
              token.role = dbUser[0].role;
              token.admin = dbUser[0].admin;
              token.member = dbUser[0].member;
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

      // On subsequent requests, verify the user still exists and refresh role/admin/member
      if (token.sub && !user) {
        try {
          const dbUser = await db
            .select({ id: users.id, role: users.role, admin: users.admin, member: users.member })
            .from(users)
            .where(eq(users.id, token.sub))
            .limit(1);

          if (dbUser.length === 0) {
            // User was deleted, clear the token
            token.sub = undefined;
            token.role = undefined;
            token.admin = undefined;
            token.member = undefined;
            console.warn(`User ${token.sub} not found in database, clearing token`);
          } else {
            // Refresh role, admin, and member in case they changed
            token.role = dbUser[0].role;
            token.admin = dbUser[0].admin;
            token.member = dbUser[0].member;
          }
        } catch (error) {
          console.error("Error verifying user in database:", error);
        }
      }

      return token;
    },
    async redirect({ url, baseUrl }: { url: string; baseUrl: string }) {
      // After sign-in, redirect to the map page (home page)
      if (url === baseUrl || url === `${baseUrl}/`) {
        return `${baseUrl}/`;
      }
      // Allow relative callback URLs
      if (url.startsWith("/")) return `${baseUrl}${url}`;
      // Allow callback URLs on the same origin
      if (new URL(url).origin === baseUrl) return url;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  session: {
    strategy: "jwt" as const,
  },
};

const auth = NextAuth(authOptions);

export default auth;
export { auth };
