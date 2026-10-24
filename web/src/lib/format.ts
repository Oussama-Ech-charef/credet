import type { Client } from "./types";

const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const countFormatter = new Intl.NumberFormat("ar-MA", {
  numberingSystem: "latn",
});

const dateFormatter = new Intl.DateTimeFormat("ar-MA", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  numberingSystem: "latn",
});

const shortDateFormatter = new Intl.DateTimeFormat("ar-MA", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  numberingSystem: "latn",
});

const weekdayFormatter = new Intl.DateTimeFormat("ar-MA", {
  weekday: "long",
  day: "numeric",
  month: "long",
  year: "numeric",
  numberingSystem: "latn",
});

export function formatAmount(value: number, currency = "DH"): string {
  return `${amountFormatter.format(Number.isFinite(value) ? value : 0)} ${currency}`;
}

export function formatSignedAmount(
  value: number,
  operationType: "DEBT" | "PAYMENT",
  currency = "DH",
): string {
  const sign = operationType === "DEBT" ? "+" : "−";
  return `${sign} ${formatAmount(value, currency)}`;
}

export function formatCount(value: number): string {
  return countFormatter.format(Number.isFinite(value) ? value : 0);
}

export function parseLocalDate(value: string): Date {
  if (!value) {
    return new Date();
  }

  const datePart = value.slice(0, 10);
  const [year, month, day] = datePart.split("-").map(Number);

  if (!year || !month || !day) {
    return new Date(value);
  }

  return new Date(year, month - 1, day, 12, 0, 0);
}

export function parseTimestamp(value: string): Date {
  if (!value) {
    return new Date();
  }

  if (value.includes("T")) {
    return new Date(value);
  }

  return new Date(`${value.replace(" ", "T")}Z`);
}

export function formatDate(value: string): string {
  return dateFormatter.format(parseLocalDate(value));
}

export function formatShortDate(value: string): string {
  return shortDateFormatter.format(parseLocalDate(value));
}

export function formatToday(): string {
  return weekdayFormatter.format(new Date());
}

export function todayInputValue(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function relativeDayLabel(value: string): string {
  const date = parseLocalDate(value);
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const difference = Math.round(
    (startToday.getTime() - startDate.getTime()) / 86_400_000,
  );

  if (difference === 0) {
    return "اليوم";
  }

  if (difference === 1) {
    return "أمس";
  }

  return formatDate(value);
}

export function initials(name: string): string {
  const words = name
    .trim()
    .split(/\s+/)
    .filter(Boolean);

  if (words.length === 0) {
    return "؟";
  }

  if (words.length === 1) {
    return words[0].slice(0, 2);
  }

  return `${words[0][0]}${words[words.length - 1][0]}`;
}

export function avatarTone(name: string): number {
  const total = Array.from(name).reduce(
    (sum, character) => sum + character.codePointAt(0)!,
    0,
  );

  return total % 5;
}

export function normalizePhoneForTel(phone: string): string {
  return phone.replace(/[^\d+]/g, "");
}

export function normalizePhoneForWhatsApp(phone: string): string {
  let digits = phone.replace(/\D/g, "");

  if (digits.startsWith("00")) {
    digits = digits.slice(2);
  }

  if (digits.startsWith("0")) {
    digits = `212${digits.slice(1)}`;
  }

  return digits;
}

export function balanceKind(
  balance: number,
): "debt" | "settled" | "credit" {
  if (balance > 0) {
    return "debt";
  }

  if (balance < 0) {
    return "credit";
  }

  return "settled";
}

export function balanceLabel(client: Pick<Client, "current_balance">): string {
  if (client.current_balance > 0) {
    return "عليه كريدي";
  }

  if (client.current_balance < 0) {
    return "رصيد لصالحه";
  }

  return "الحساب خالص";
}

export function paidRatio(totalDebt: number, totalPaid: number): number {
  if (totalDebt <= 0) {
    return 0;
  }

  return Math.min(100, Math.max(0, Math.round((totalPaid / totalDebt) * 100)));
}

export function clientMatchesSearch(client: Client, query: string): boolean {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return true;
  }

  return [client.name, client.phone ?? "", client.address ?? ""].some((value) =>
    value.toLowerCase().includes(normalized),
  );
}
