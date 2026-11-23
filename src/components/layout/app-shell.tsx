import { LogOut } from "lucide-react";
import type { ReactNode } from "react";
import { signOut } from "@/app/(auth)/actions";
import { MobileNav } from "./mobile-nav";
import { NavLinks, NavSectionLabel } from "./nav";
import { Topbar } from "./topbar";
import { BrandLogo } from "@/components/brand/brand-logo";

/** "Usuario" section: sign-out lives at the bottom of the sidebar / drawer. */
function UserSection() {
  return (
    <div>
      <NavSectionLabel>Usuario</NavSectionLabel>
      <form action={signOut}>
        <button
          type="submit"
          className="flex w-full items-center gap-3 rounded-full border border-transparent px-3.5 py-2.5 text-sm font-medium text-muted transition hover:bg-white/[0.06] hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <LogOut className="size-4" aria-hidden="true" />
          Cerrar sesión
        </button>
      </form>
    </div>
  );
}

/** Desktop sidebar + top bar, mobile top bar/drawer. Server component (no user data cached). */
export function AppShell({ name, email, children }: { name: string; email: string; children: ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col border-r border-line bg-background/60 px-3 py-6 backdrop-blur md:flex">
        <div className="px-3 pb-8">
          <BrandLogo priority />
        </div>
        <div className="flex-1 overflow-y-auto">
          <NavLinks />
        </div>
        <div className="border-t border-line pt-4">
          <UserSection />
        </div>
      </aside>
      <MobileNav footer={<UserSection />} name={name} email={email} />
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar name={name} email={email} />
        <main className="min-w-0 flex-1 px-4 py-6 md:px-8 md:py-6">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
