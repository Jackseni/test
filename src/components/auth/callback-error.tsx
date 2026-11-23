"use client";

import { useSearchParams } from "next/navigation";
import { FormMessage } from "./auth-ui";

/** Shows a generic message when /auth/callback bounced the user here. Wrap in <Suspense>. */
export function CallbackError() {
  const params = useSearchParams();
  if (params.get("error") !== "callback") return null;
  return (
    <div className="mb-4">
      <FormMessage error="El enlace no es válido o expiró. Inténtalo de nuevo." />
    </div>
  );
}
