"use client";

import { ChevronDown, LogOut } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { signOut } from "@/app/(auth)/actions";
import { initialsOf } from "@/lib/utils/display-name";

/**
 * User chip (avatar with initials, name, subtitle) that opens a small menu with "Cerrar sesión".
 * Keyboard: Enter/Space opens (focus moves to the item), Escape closes and returns focus,
 * Tab out of the menu closes it.
 */
export function UserMenu({ name, email }: { name: string; email: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const itemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    itemRef.current?.focus();
    const onPointer = (event: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [open]);

  return (
    <div
      ref={rootRef}
      className="relative"
      onKeyDown={(event) => {
        if (event.key === "Escape" && open) {
          event.stopPropagation();
          setOpen(false);
          triggerRef.current?.focus();
        }
      }}
      onBlur={(event) => {
        if (open && !event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Menú de usuario, ${name}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2.5 rounded-full border border-line bg-surface py-1.5 pl-1.5 pr-3 text-left transition hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <span
          aria-hidden="true"
          className="grid size-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-primary-strong to-[#4338ca] text-xs font-bold text-white"
        >
          {initialsOf(name)}
        </span>
        <span className="hidden min-w-0 sm:block">
          <span className="block max-w-[10rem] truncate text-sm font-semibold leading-tight text-foreground">{name}</span>
          <span className="block text-[11px] leading-tight text-muted">Mi cuenta</span>
        </span>
        <ChevronDown className="size-4 text-muted" aria-hidden="true" />
      </button>
      {open ? (
        <div
          role="menu"
          aria-label="Cuenta"
          className="ft-fade-in absolute right-0 z-50 mt-2 w-64 rounded-2xl border border-white/10 bg-surface p-2 shadow-2xl shadow-black/60"
        >
          <p className="truncate px-3 py-2 text-xs text-muted" title={email}>
            {email}
          </p>
          <form action={signOut}>
            <button
              ref={itemRef}
              type="submit"
              role="menuitem"
              className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-foreground transition hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              <LogOut className="size-4" aria-hidden="true" />
              Cerrar sesión
            </button>
          </form>
        </div>
      ) : null}
    </div>
  );
}
