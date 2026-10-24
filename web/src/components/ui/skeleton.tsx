import type { CSSProperties } from "react";
import { cn } from "@/lib/cn";

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  style?: CSSProperties;
}

export function Skeleton({ className, width, height, style }: SkeletonProps) {
  return (
    <span
      aria-hidden="true"
      className={cn("skeleton", className)}
      style={{ width, height, ...style }}
    />
  );
}
