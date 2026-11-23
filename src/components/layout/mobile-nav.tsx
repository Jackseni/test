"use client";

import { Menu } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { NavLinks } from "./nav";
import { UserMenu } from "./user-menu";
import { BrandLogo } from "@/components/brand/brand-logo";

/** Mobile top bar + drawer. `footer` (sign-out section) is rendered by the server shell. */
export function MobileNav({ footer, name, email }: { footer: ReactNode; name: string; email: string }) {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 flex h-16 items-center justify-between gap-2 border-b border-line bg-background/90 px-4 backdrop-blur md:hidden">
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Abrir menú" className="shrink-0">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        <SheetContent>
          <SheetTitle className="px-5 pt-5">
            <BrandLogo size={36} />
            <span className="sr-only">Menú</span>
          </SheetTitle>
          <SheetDescription className="sr-only">Navegación principal</SheetDescription>
          <div className="mt-6 flex-1 overflow-y-auto px-3">
            <NavLinks onNavigate={() => setOpen(false)} />
          </div>
          <div className="border-t border-line p-4">{footer}</div>
        </SheetContent>
      </Sheet>
      <BrandLogo size={32} />
      <UserMenu name={name} email={email} />
    </header>
  );
}
