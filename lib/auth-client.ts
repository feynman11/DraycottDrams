import { createAuthClient } from "better-auth/react";
import { inferAdditionalFields } from "better-auth/client/plugins";
import type { Auth } from "@/worker/auth";

// Same-origin: the Worker serves Better Auth at /api/auth/*.
export const authClient = createAuthClient({
  plugins: [inferAdditionalFields<Auth>()],
});

export type AuthSession = typeof authClient.$Infer.Session;
