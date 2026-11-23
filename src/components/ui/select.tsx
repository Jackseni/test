import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";
import { fieldClasses } from "./input";

/** Native <select> styled like the other fields: accessible and mobile friendly. */
export function Select({ className, children, ...props }: ComponentProps<"select">) {
  return (
    <select className={cn(fieldClasses, "h-10 pr-8", className)} {...props}>
      {children}
    </select>
  );
}
