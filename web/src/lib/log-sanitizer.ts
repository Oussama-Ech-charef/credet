const MAX_CONTEXT_LENGTH = 60;
const MAX_MESSAGE_LENGTH = 2_000;
const MAX_STACK_LENGTH = 8_000;

const REDACTION_RULES: readonly (readonly [RegExp, string])[] = [
  [/\bBearer\s+[A-Za-z0-9._~+/=-]+/gi, "Bearer [REDACTED]"],
  [
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/g,
    "[REDACTED_JWT]",
  ],
  [/\bAIza[0-9A-Za-z_-]{20,}\b/g, "[REDACTED_FIREBASE_KEY]"],
  [
    /(\b(?:password|passwd|pwd|secret|token|api[_-]?key|authorization|credential|cookie|session)\b\s*[:=]\s*)("[^"]*"|'[^']*'|[^\s,;]+)/gi,
    "$1[REDACTED]",
  ],
  [/\b(?:https?|ftp):\/\/[^\s/@:]+:[^\s/@]+@/gi, "https://[REDACTED]@"],
  [/\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/gi, "[REDACTED_EMAIL]"],
  [/\b(?:\+?\d{1,3}[\s-]?)?\d(?:[\s-]?\d){8,18}\b/g, "[REDACTED_NUMBER]"],
];

export function redactSensitiveText(value: string): string {
  return REDACTION_RULES.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  );
}

function removeControlCharacters(value: string): string {
  return value.replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g,
    "",
  );
}

export function sanitizeContext(value: unknown): string {
  if (typeof value !== "string") {
    return "App";
  }

  const cleaned = redactSensitiveText(value)
    .replace(/[^A-Za-z0-9._:-]/g, "")
    .slice(0, MAX_CONTEXT_LENGTH);

  return cleaned || "App";
}

export function sanitizeLogMessage(value: string): string {
  const flattened = removeControlCharacters(value).replace(
    /\s*\r?\n\s*/g,
    " ",
  );
  const redacted = redactSensitiveText(flattened);

  return redacted.length > MAX_MESSAGE_LENGTH
    ? `${redacted.slice(0, MAX_MESSAGE_LENGTH)}...`
    : redacted;
}

export function sanitizeLogStack(value: string): string {
  const flattened = removeControlCharacters(value).replace(
    /\r?\n/g,
    "\\n",
  );
  const redacted = redactSensitiveText(flattened);

  return redacted.length > MAX_STACK_LENGTH
    ? `${redacted.slice(0, MAX_STACK_LENGTH)}...`
    : redacted;
}
