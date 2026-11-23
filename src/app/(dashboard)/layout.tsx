import { redirect } from "next/navigation";
import { Suspense, type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/server";
import { displayName } from "@/lib/utils/display-name";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  // With cacheComponents, reading cookies/user must happen under <Suspense>.
  return (
    <Suspense fallback={<ShellFallback />}>
      <AuthedShell>{children}</AuthedShell>
    </Suspense>
  );
}

async function AuthedShell({ children }: { children: ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const email = user.email ?? "";
  return (
    <AppShell name={displayName(user.user_metadata, email)} email={email}>
      {children}
    </AppShell>
  );
}

function ShellFallback() {
  return (
    <div className="flex min-h-screen">
      <div className="hidden w-64 shrink-0 border-r border-line bg-background/60 md:block" />
      <div className="flex-1 space-y-4 p-8">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
      </div>
    </div>
  );
}
