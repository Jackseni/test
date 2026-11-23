import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export const fieldClasses =
  "block w-full rounded-full border border-white/10 bg-background/70 px-4 py-2 text-sm text-foreground placeholder:text-subtle focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-60 aria-[invalid=true]:border-danger";

export function Input({ className, ...props }: ComponentProps<"input">) {
  return <input className={cn(fieldClasses, "h-10", className)} {...props} />;
}
