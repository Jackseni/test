"use client";

import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "./nav";
import { UserMenu } from "./user-menu";

/** Desktop top bar: muted breadcrumb on the left, user chip on the right. */
export function Topbar({ name, email }: { name: string; email: string }) {
  const pathname = usePathname();
  const current = NAV_GROUPS.flatMap((g) => g.items).find((i) => pathname === i.href || pathname.startsWith(`${i.href}/`));
  return (
    <div className="hidden items-center justify-between px-8 pt-6 md:flex">
      <p className="text-sm text-muted">
        FinTrack
        {current ? (
          <>
            <span aria-hidden="true" className="mx-2 text-subtle">
              /
            </span>
            <span className="text-foreground/80">{current.label}</span>
          </>
        ) : null}
      </p>
      <UserMenu name={name} email={email} />
    </div>
  );
}
