import type { Client, OperationType } from "./types";

const amountFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const countFormatter = new Intl.NumberFormat("en-US");

const arabicMonths = [
  "يناير",
  "فبراير",
  "مارس",
  "أبريل",
  "مايو",
  "يونيو",
  "يوليو",
  "أغسطس",
  "سبتمبر",
  "أكتوبر",
  "نوفمبر",
  "ديسمبر",
];

const arabicWeekdays = [
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
  "الجمعة",
  "السبت",
];

export function formatAmount(value: number, currency = "DH"): string {
  const safeValue = Number.isFinite(value) ? value : 0;
  return `${amountFormatter.format(safeValue)} ${currency}`;
}

export function formatSignedAmount(
  value: number,
  operationType: OperationType,
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

export function formatDate(value: string): string {
  const date = parseLocalDate(value);
  return `${date.getDate()} ${arabicMonths[date.getMonth()]} ${date.getFullYear()}`;
}

export function formatToday(): string {
  const now = new Date();
  return `${arabicWeekdays[now.getDay()]}، ${now.getDate()} ${
    arabicMonths[now.getMonth()]
  } ${now.getFullYear()}`;
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

export function formatAmountInput(value: number): string {
  return Number.isFinite(value) ? value.toFixed(2) : "";
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
    (sum, character) => sum + (character.codePointAt(0) ?? 0),
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

export function balanceKind(balance: number): "debt" | "settled" | "credit" {
  if (balance > 0) {
    return "debt";
  }

  if (balance < 0) {
    return "credit";
  }

  return "settled";
}

export function balanceLabel(balance: number): string {
  if (balance > 0) {
    return "عليه كريدي";
  }

  if (balance < 0) {
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

function normalizeSearchText(value: string): string {
  return value
    .toLowerCase()
    .replace(/[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed\u0640]/g, "")
    .replace(/[أإآٱ]/g, "ا")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/\s+/g, " ")
    .trim();
}

export function clientMatchesSearch(client: Client, query: string): boolean {
  const normalized = normalizeSearchText(query);

  if (!normalized) {
    return true;
  }

  if (normalizeSearchText(client.name).includes(normalized)) {
    return true;
  }

  const phoneQuery = normalized.replace(/\D/g, "");
  const phone = (client.phone ?? "").replace(/\D/g, "");

  return phoneQuery.length > 0 && phone.includes(phoneQuery);
}

export function statementMessage({
  clientName,
  shopName,
  totalDebt,
  totalPaid,
  currentBalance,
  currency = "DH",
}: {
  clientName: string;
  shopName: string;
  totalDebt: number;
  totalPaid: number;
  currentBalance: number;
  currency?: string;
}): string {
  return [
    `السلام عليكم سي ${clientName}،`,
    `هذا كشف حسابك من ${shopName}:`,
    `- مجموع الديون: ${formatAmount(totalDebt, currency)}`,
    `- مجموع المدفوع: ${formatAmount(totalPaid, currency)}`,
    `- الباقي الصافي: ${formatAmount(currentBalance, currency)}`,
    "شكراً لتعاملكم معنا.",
  ].join("\n");
}
