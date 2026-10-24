import Link from "next/link";
import type { ReactNode } from "react";
import { Icon } from "./icon";

interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  backHref?: string;
  backLabel?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  backHref,
  backLabel = "رجوع",
}: PageHeaderProps) {
  return (
    <header className="page-header">
      <div className="page-header__main">
        {backHref ? (
          <Link className="back-link" href={backHref}>
            <Icon name="chevron-right" size={16} />
            <span>{backLabel}</span>
          </Link>
        ) : null}
        <h1 className="page-header__title">{title}</h1>
        {description ? (
          <p className="page-header__description">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="page-header__actions">{actions}</div> : null}
    </header>
  );
}
