import { cloudflare } from "@cloudflare/vite-plugin";
import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vite";

// `vite dev` runs the Worker (worker/index.ts) in workerd next to the app, with local D1 state in
// .wrangler/. `vite build` writes the app to dist/client and the Worker to dist/draycottdrams*;
// CLOUDFLARE_ENV=staging picks wrangler.jsonc's staging environment.
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // The AI binding only exists on Cloudflare. `pnpm dev` stays offline (AI calls fail);
    // `pnpm dev:ai` connects it, after `wrangler login`.
    cloudflare({ remoteBindings: process.env.DD_REMOTE_BINDINGS === "1" }),
  ],
  resolve: {
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
});
