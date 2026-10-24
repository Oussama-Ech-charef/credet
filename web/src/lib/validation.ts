const arabicDigits = "٠١٢٣٤٥٦٧٨٩";
const persianDigits = "۰۱۲۳۴۵۶۷۸۹";

export function normalizeDigits(value: string): string {
  return Array.from(value)
    .map((character) => {
      const arabicIndex = arabicDigits.indexOf(character);

      if (arabicIndex >= 0) {
        return String(arabicIndex);
      }

      const persianIndex = persianDigits.indexOf(character);

      if (persianIndex >= 0) {
        return String(persianIndex);
      }

      return character;
    })
    .join("");
}

export function parseAmountInput(value: string): {
  value: number | null;
  error?: string;
} {
  const normalized = normalizeDigits(value)
    .trim()
    .replace(/[,\s٬]/g, "")
    .replace(/٫/g, ".");

  if (!normalized) {
    return { value: null, error: "أدخل المبلغ." };
  }

  if (!/^\d+(?:\.\d{1,2})?$/.test(normalized)) {
    return {
      value: null,
      error: "أدخل مبلغًا صحيحًا بحد أقصى منزلتين عشريتين.",
    };
  }

  const amount = Number(normalized);

  if (!Number.isFinite(amount) || amount <= 0) {
    return { value: null, error: "يجب أن يكون المبلغ أكبر من صفر." };
  }

  return { value: amount };
}

export function validateRequiredText(
  value: string,
  label: string,
  maxLength: number,
): string | null {
  const normalized = value.trim();

  if (!normalized) {
    return `${label} مطلوب.`;
  }

  if (normalized.length > maxLength) {
    return `${label} يجب ألا يتجاوز ${maxLength} حرفًا.`;
  }

  return null;
}

export function validateOptionalText(
  value: string,
  label: string,
  maxLength: number,
): string | null {
  if (value.trim().length > maxLength) {
    return `${label} يجب ألا يتجاوز ${maxLength} حرفًا.`;
  }

  return null;
}

export function isValidDateInput(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day, 12, 0, 0);

  return (
    date.getFullYear() === year &&
    date.getMonth() === month - 1 &&
    date.getDate() === day
  );
}
