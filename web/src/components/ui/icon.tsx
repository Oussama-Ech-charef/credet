import type { ReactNode, SVGProps } from "react";

export type IconName =
  | "home"
  | "users"
  | "settings"
  | "plus"
  | "minus"
  | "phone"
  | "message"
  | "search"
  | "close"
  | "chevron-left"
  | "chevron-right"
  | "arrow-left"
  | "arrow-right"
  | "download"
  | "edit"
  | "trash"
  | "check"
  | "alert"
  | "calendar"
  | "wallet"
  | "receipt"
  | "database"
  | "file-json"
  | "save"
  | "refresh"
  | "loader"
  | "external"
  | "clock"
  | "map-pin"
  | "note"
  | "shield"
  | "chevron-down";

const paths: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M3.5 10.5 12 3.5l8.5 7" />
      <path d="M5.5 9.5V21h13V9.5" />
      <path d="M9.5 21v-6h5v6" />
    </>
  ),
  users: (
    <>
      <path d="M16 20v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 18.5V20" />
      <circle cx="10" cy="7.5" r="3.5" />
      <path d="M16.5 4.2a3.4 3.4 0 0 1 0 6.6" />
      <path d="M20 20v-1.5a3.5 3.5 0 0 0-2.5-3.35" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3.2" />
      <path d="M19.2 14.7a1.6 1.6 0 0 0 .32 1.77l.06.06-2 2-.06-.06a1.6 1.6 0 0 0-1.77-.32 1.6 1.6 0 0 0-.97 1.47V20h-2.83v-.08a1.6 1.6 0 0 0-.97-1.47 1.6 1.6 0 0 0-1.77.32l-.06.06-2-2 .06-.06a1.6 1.6 0 0 0 .32-1.77 1.6 1.6 0 0 0-1.47-.97H4v-2.83h.08a1.6 1.6 0 0 0 1.47-.97 1.6 1.6 0 0 0-.32-1.77l-.06-.06 2-2 .06.06a1.6 1.6 0 0 0 1.77.32 1.6 1.6 0 0 0 .97-1.47V4h2.83v.08a1.6 1.6 0 0 0 .97 1.47 1.6 1.6 0 0 0 1.77-.32l.06-.06 2 2-.06.06a1.6 1.6 0 0 0-.32 1.77 1.6 1.6 0 0 0 1.47.97H20v2.83h-.08a1.6 1.6 0 0 0-1.47.97Z" />
    </>
  ),
  plus: (
    <>
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </>
  ),
  minus: <path d="M5 12h14" />,
  phone: (
    <path d="M6.6 3.8 9 3.2a1.4 1.4 0 0 1 1.6.8l1.2 2.7a1.4 1.4 0 0 1-.35 1.55L10.1 9.6a14.4 14.4 0 0 0 4.3 4.3l1.35-1.35a1.4 1.4 0 0 1 1.55-.35l2.7 1.2a1.4 1.4 0 0 1 .8 1.6l-.6 2.4a2.2 2.2 0 0 1-2.1 1.7C10.3 19.1 4.9 13.7 4.9 5.9a2.2 2.2 0 0 1 1.7-2.1Z" />
  ),
  message: (
    <>
      <path d="M20.5 11.5a8.5 8.5 0 0 1-12.4 7.55L3.5 20.5l1.45-4.6A8.5 8.5 0 1 1 20.5 11.5Z" />
      <path d="M8.5 10.2c.4 2.3 1.9 3.8 4.2 4.2" />
    </>
  ),
  search: (
    <>
      <circle cx="10.8" cy="10.8" r="6.3" />
      <path d="m16 16 4 4" />
    </>
  ),
  close: (
    <>
      <path d="m6 6 12 12" />
      <path d="M18 6 6 18" />
    </>
  ),
  "chevron-left": <path d="m14.5 6-6 6 6 6" />,
  "chevron-right": <path d="m9.5 6 6 6-6 6" />,
  "arrow-left": (
    <>
      <path d="M19 12H5" />
      <path d="m11 6-6 6 6 6" />
    </>
  ),
  "arrow-right": (
    <>
      <path d="M5 12h14" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  download: (
    <>
      <path d="M12 3v12" />
      <path d="m7 10 5 5 5-5" />
      <path d="M4 20h16" />
    </>
  ),
  edit: (
    <>
      <path d="M4 20h4l11-11a2.8 2.8 0 0 0-4-4L4 16v4Z" />
      <path d="m13.5 6.5 4 4" />
    </>
  ),
  trash: (
    <>
      <path d="M4 7h16" />
      <path d="M9 7V4h6v3" />
      <path d="m6 7 1 13h10l1-13" />
      <path d="M10 11v5M14 11v5" />
    </>
  ),
  check: <path d="m5 12.5 4.5 4.5L19 6.5" />,
  alert: (
    <>
      <path d="M12 3 2.8 20h18.4L12 3Z" />
      <path d="M12 9v5" />
      <path d="M12 17.5v.1" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2" />
      <path d="M7.5 3v4M16.5 3v4M3.5 10h17" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 6.5A2.5 2.5 0 0 1 6.5 4H19a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H6.5A2.5 2.5 0 0 1 4 17.5v-11Z" />
      <path d="M4 7h16" />
      <path d="M15 12h5v4h-5a2 2 0 0 1 0-4Z" />
    </>
  ),
  receipt: (
    <>
      <path d="M6 3h12v18l-3-2-3 2-3-2-3 2V3Z" />
      <path d="M9 7h6M9 11h6M9 15h4" />
    </>
  ),
  database: (
    <>
      <ellipse cx="12" cy="5.5" rx="7.5" ry="3" />
      <path d="M4.5 5.5v6c0 1.65 3.36 3 7.5 3s7.5-1.35 7.5-3v-6" />
      <path d="M4.5 11.5v6c0 1.65 3.36 3 7.5 3s7.5-1.35 7.5-3v-6" />
    </>
  ),
  "file-json": (
    <>
      <path d="M6 3h8l4 4v14H6V3Z" />
      <path d="M14 3v5h5" />
      <path d="M9 12h6M9 16h6" />
    </>
  ),
  save: (
    <>
      <path d="M5 3h11l3 3v15H5V3Z" />
      <path d="M8 3v6h8V3" />
      <path d="M8 21v-7h8v7" />
    </>
  ),
  refresh: (
    <>
      <path d="M20 7v5h-5" />
      <path d="M19 12a7 7 0 1 1-2.05-4.95L20 10" />
    </>
  ),
  loader: (
    <>
      <path d="M12 3a9 9 0 1 0 9 9" />
    </>
  ),
  external: (
    <>
      <path d="M14 4h6v6" />
      <path d="m20 4-9 9" />
      <path d="M19 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7v5l3.5 2" />
    </>
  ),
  "map-pin": (
    <>
      <path d="M19 10c0 5-7 11-7 11S5 15 5 10a7 7 0 1 1 14 0Z" />
      <circle cx="12" cy="10" r="2.5" />
    </>
  ),
  note: (
    <>
      <path d="M6 3h9l4 4v14H6V3Z" />
      <path d="M14 3v5h5M9 12h6M9 16h6" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 20 6v5.5c0 5-3.5 8.2-8 9.5-4.5-1.3-8-4.5-8-9.5V6l8-3Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  "chevron-down": <path d="m6 9 6 6 6-6" />,
};

interface IconProps extends SVGProps<SVGSVGElement> {
  name: IconName;
  size?: number;
  label?: string;
}

export function Icon({
  name,
  size = 20,
  label,
  className,
  ...props
}: IconProps) {
  return (
    <svg
      aria-hidden={label ? undefined : true}
      aria-label={label}
      className={className}
      fill="none"
      height={size}
      role={label ? "img" : undefined}
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
      width={size}
      {...props}
    >
      {paths[name]}
    </svg>
  );
}
