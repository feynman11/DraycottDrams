import "@fontsource-variable/inter";
import "@fontsource/instrument-serif";
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
      <Toaster
        theme="dark"
        position="top-center"
        toastOptions={{
          classNames: {
            toast: "!bg-popover !text-popover-foreground !border-border !shadow-lg",
            description: "!text-muted-foreground",
          },
        }}
      />
    </TRPCProvider>
  </StrictMode>
);
