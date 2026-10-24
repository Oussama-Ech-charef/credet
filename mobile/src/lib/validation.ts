export interface AmountParseResult {
  value?: string;
  error?: string;
}

export function normalizeDigits(value: string): string {
  return value
    .replace(/[٠-٩]/g, (digit) => String("٠١٢٣٤٥٦٧٨٩".indexOf(digit)))
    .replace(/[۰-۹]/g, (digit) => String("۰۱۲۳۴۵۶۷۸۹".indexOf(digit)))
    .replace(/٫/g, ".");
}

function normalizeAmountSeparators(value: string): string {
  const compact = normalizeDigits(value)
    .replace(/[\s\u200e\u200f\u061c\u202a-\u202e]/g, "")
    .replace(/٬/g, "");

  if (!compact.includes(",")) {
    return compact;
  }

  if (compact.includes(".")) {
    return compact.replace(/,/g, "");
  }

  const parts = compact.split(",");

  if (parts.length === 2 && /^\d{1,2}$/.test(parts[1])) {
    return `${parts[0]}.${parts[1]}`;
  }

  return compact.replace(/,/g, "");
}

export function parseAmountInput(rawValue: string): AmountParseResult {
  const normalized = normalizeAmountSeparators(rawValue);

  if (!normalized) {
    return { error: "أدخل مبلغًا أولًا." };
  }

  if (!/^\d+(?:\.\d{0,2})?$/.test(normalized)) {
    return { error: "أدخل مبلغًا صحيحًا بفاصلتين عشريتين كحد أقصى." };
  }

  const value = Number(normalized);

  if (!Number.isFinite(value) || value <= 0) {
    return { error: "يجب أن يكون المبلغ أكبر من صفر." };
  }

  if (value > 9_999_999_999.99) {
    return { error: "المبلغ أكبر من الحد المسموح." };
  }

  return { value: normalized };
}

export function validateRequiredText(
  value: string,
  label: string,
  maxLength: number,
): string | undefined {
  const normalized = value.trim();

  if (!normalized) {
    return `${label} مطلوب.`;
  }

  if (normalized.length > maxLength) {
    return `${label} يجب ألا يتجاوز ${maxLength} حرفًا.`;
  }

  return undefined;
}

export function validateOptionalText(
  value: string,
  label: string,
  maxLength: number,
): string | undefined {
  if (value.trim().length > maxLength) {
    return `${label} يجب ألا يتجاوز ${maxLength} حرفًا.`;
  }

  return undefined;
}
