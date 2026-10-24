import type { ReactNode } from "react";
import { Icon, type IconName } from "./icon";

interface EmptyStateProps {
  icon: IconName;
  title: string;
  description: string;
  action?: ReactNode;
  compact?: boolean;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  compact = false,
}: EmptyStateProps) {
  return (
    <div className={compact ? "empty-state empty-state--compact" : "empty-state"}>
      <span aria-hidden="true" className="empty-state__icon">
        <Icon name={icon} size={24} />
      </span>
      <h3 className="empty-state__title">{title}</h3>
      <p className="empty-state__description">{description}</p>
      {action ? <div className="empty-state__action">{action}</div> : null}
    </div>
  );
}
