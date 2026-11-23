import type { ComponentProps } from "react";
import { cn } from "@/lib/utils/cn";

export function Skeleton({ className, ...props }: ComponentProps<"div">) {
  return <div aria-hidden="true" className={cn("animate-pulse rounded-2xl bg-white/[0.06]", className)} {...props} />;
}
