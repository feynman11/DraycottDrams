import "@fontsource-variable/inter";
import "@/styles/globals.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { RouterProvider } from "@tanstack/react-router";
import { Toaster } from "sonner";
import { TRPCProvider } from "@/components/trpc-provider";
import { router } from "./router";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <TRPCProvider>
      <RouterProvider router={router} />
      <Toaster richColors />
    </TRPCProvider>
  </StrictMode>
);
