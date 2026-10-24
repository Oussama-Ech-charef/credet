import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export type BadgeTone =
  | "debt"
  | "payment"
  | "neutral"
  | "warning"
  | "violet"
  | "outline";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  className?: string;
}

export function Badge({
  children,
  tone = "neutral",
  dot = false,
  className,
}: BadgeProps) {
  return (
    <span className={cn("badge", `badge--${tone}`, className)}>
      {dot ? <span aria-hidden="true" className="badge__dot" /> : null}
      {children}
    </span>
  );
}
