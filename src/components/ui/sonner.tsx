"use client";

import { Toaster as SonnerToaster } from "sonner";

export function Toaster() {
  return (
    <SonnerToaster
      theme="dark"
      richColors
      closeButton
      position="top-right"
      toastOptions={{
        style: {
          background: "#0f182b",
          border: "1px solid rgba(255,255,255,0.1)",
          color: "#e8ecf6",
          borderRadius: "16px",
        },
      }}
    />
  );
}
