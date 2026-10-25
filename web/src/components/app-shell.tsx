"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";
import { formatToday } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Icon, type IconName } from "./ui/icon";
import { Logo } from "./ui/logo";

const navItems: Array<{ href: string; label: string; icon: IconName }> = [
  { href: "/", label: "الرئيسية", icon: "home" },
  { href: "/clients", label: "العملاء", icon: "users" },
  { href: "/settings", label: "الإعدادات", icon: "settings" },
];

function isActivePath(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const [today, setToday] = useState("");

  useEffect(() => {
    setToday(formatToday());
  }, []);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar__top">
          <Link aria-label="Credet — الرئيسية" className="brand" href="/">
            <Logo size={40} />
            <span className="brand__copy">
              <strong className="brand__name">Credet</strong>
              <span className="brand__tag">دفتر الديون</span>
            </span>
          </Link>

          <nav aria-label="التنقل الرئيسي" className="nav">
            {navItems.map((item) => {
              const active = isActivePath(pathname, item.href);

              return (
                <Link
                  aria-current={active ? "page" : undefined}
                  className={cn("nav__link", active && "is-active")}
                  href={item.href}
                  key={item.href}
                >
                  <Icon name={item.icon} size={19} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="sidebar__footer">
          <div className="local-note">
            <span aria-hidden="true" className="local-note__icon">
              <Icon name="shield" size={18} />
            </span>
            <div>
              <strong>سجل محلي</strong>
              <span>البيانات محفوظة في قاعدة بيانات جهازك</span>
            </div>
          </div>
          {today ? <p className="sidebar__date">{today}</p> : null}
        </div>
      </aside>

      <div className="app-frame">
        <header className="mobile-topbar">
          <Link aria-label="Credet — الرئيسية" className="brand brand--compact" href="/">
            <Logo size={32} />
            <span className="brand__copy">
              <strong className="brand__name">Credet</strong>
              <span className="brand__tag">دفتر الديون</span>
            </span>
          </Link>
          <Link
            aria-label="الإعدادات"
            className="btn btn--ghost btn--sm btn--icon-only"
            href="/settings"
          >
            <Icon name="settings" size={19} />
          </Link>
        </header>

        <main className="main">{children}</main>
      </div>

      <nav aria-label="التنقل السفلي" className="mobile-nav">
        {navItems.map((item) => {
          const active = isActivePath(pathname, item.href);

          return (
            <Link
              aria-current={active ? "page" : undefined}
              className={cn("mobile-nav__link", active && "is-active")}
              href={item.href}
              key={item.href}
            >
              <Icon name={item.icon} size={21} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
