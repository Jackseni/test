"use client";

import { ArrowLeftRight, ChevronRight, LayoutDashboard, PieChart, Tags, Wallet, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils/cn";

type NavItem = { href: string; label: string; icon: LucideIcon };

export const NAV_GROUPS: readonly { label: string; items: readonly NavItem[] }[] = [
  {
    label: "General",
    items: [
      { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { href: "/transactions", label: "Transacciones", icon: ArrowLeftRight },
      { href: "/categories", label: "Categorías", icon: Tags },
      { href: "/budgets", label: "Presupuestos", icon: Wallet },
    ],
  },
  { label: "Análisis", items: [{ href: "/reports", label: "Reportes", icon: PieChart }] },
];

/** Section label used by the nav groups and the sidebar footer. */
export function NavSectionLabel({ children }: { children: string }) {
  return <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-subtle">{children}</p>;
}

export function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Principal" className="flex flex-col gap-6">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <NavSectionLabel>{group.label}</NavSectionLabel>
          <ul className="flex flex-col gap-1">
            {group.items.map(({ href, label, icon: Icon }) => {
              const active = pathname === href || pathname.startsWith(`${href}/`);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group flex items-center gap-3 rounded-full border px-3.5 py-2.5 text-sm font-medium transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                      active
                        ? "border-primary/40 bg-gradient-to-r from-primary/25 via-primary/10 to-transparent text-foreground"
                        : "border-transparent text-muted hover:bg-white/[0.06] hover:text-foreground",
                    )}
                  >
                    <Icon className={cn("size-4 shrink-0", active ? "text-accent" : "")} aria-hidden="true" />
                    <span className="flex-1">{label}</span>
                    {active ? <ChevronRight className="size-4 text-accent" aria-hidden="true" /> : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}
