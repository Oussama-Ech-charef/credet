import { avatarTone, initials } from "@/lib/format";
import { cn } from "@/lib/cn";

interface AvatarProps {
  name: string;
  size?: "sm" | "md" | "lg";
  className?: string;
}

export function Avatar({ name, size = "md", className }: AvatarProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "avatar",
        `avatar--${size}`,
        `avatar--tone-${avatarTone(name)}`,
        className,
      )}
    >
      {initials(name)}
    </span>
  );
}
