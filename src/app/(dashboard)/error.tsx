"use client";

import { Button } from "@/components/ui/button";

// Generic message only: never render error.message / stack to the user.
export default function DashboardError({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="rounded-2xl border border-danger/30 bg-danger/10 p-8 text-center">
      <h2 className="text-lg font-semibold text-danger">Algo salió mal</h2>
      <p className="mt-1 text-sm text-danger">No pudimos cargar esta sección. Inténtalo de nuevo.</p>
      <Button className="mt-4" variant="outline" onClick={reset}>
        Reintentar
      </Button>
    </div>
  );
}
