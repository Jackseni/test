import Image from "next/image";
import { cn } from "@/lib/utils/cn";

/**
 * FinTrack logo: robot mascot (image) + live-text wordmark, "Fin" in white and "Track" in violet.
 * The image carries the accessible name; the visible text is aria-hidden to avoid announcing it twice.
 */
export function BrandLogo({
  size = 36,
  priority = false,
  glow = false,
  className,
}: {
  size?: number;
  priority?: boolean;
  glow?: boolean;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex items-center gap-2.5", className)}>
      <span className="relative inline-flex shrink-0">
        {glow ? (
          <span aria-hidden="true" className="absolute inset-0 -z-0 scale-125 rounded-full bg-primary/30 blur-xl" />
        ) : null}
        <Image
          src="/brand/mark.png"
          alt="FinTrack"
          width={size}
          height={size}
          priority={priority}
          className="relative"
          style={{ width: size, height: size }}
        />
      </span>
      <span aria-hidden="true" className="text-xl font-bold tracking-tight text-foreground" style={{ fontSize: Math.max(18, size * 0.55) }}>
        Fin<span className="text-accent">Track</span>
      </span>
    </span>
  );
}
