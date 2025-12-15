import { type DefaultSession } from "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      role: string;
      admin: boolean;
      member: boolean;
    } & DefaultSession["user"];
  }

  interface User {
    id: string;
    role: string;
    admin: boolean;
    member: boolean;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    role: string;
    admin?: boolean;
    member?: boolean;
  }
}
