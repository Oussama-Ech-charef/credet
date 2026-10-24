import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./icon";

interface StatCardProps {
  label: string;
  value: string;
  meta?: string;
  tone?: "neutral" | "debt" | "payment" | "violet";
  icon?: IconName;
  className?: string;
}

export function StatCard({
  label,
  value,
  meta,
  tone = "neutral",
  icon,
  className,
}: StatCardProps) {
  return (
    <div className={cn("stat", `stat--${tone}`, className)}>
      <div className="stat__top">
        <span className="stat__label">{label}</span>
        {icon ? (
          <span aria-hidden="true" className="stat__icon">
            <Icon name={icon} size={18} />
          </span>
        ) : null}
      </div>
      <strong className="stat__value">{value}</strong>
      {meta ? <span className="stat__meta">{meta}</span> : null}
    </div>
  );
}
