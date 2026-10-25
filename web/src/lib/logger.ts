import {
  sanitizeContext,
  sanitizeLogMessage,
  sanitizeLogStack,
} from "@/lib/log-sanitizer";

type LogLevel = "error" | "warn";

const loggedErrors = new WeakSet<object>();

function valueOf(error: unknown, key: "message" | "name" | "stack"): string {
  if (typeof error !== "object" || error === null || !(key in error)) {
    return "";
  }

  const value = (error as Record<string, unknown>)[key];
  return typeof value === "string" ? value : "";
}

function errorMessage(error: unknown): string {
  if (typeof error === "string") {
    return error;
  }

  if (typeof error === "number" || typeof error === "boolean") {
    return String(error);
  }

  const message = valueOf(error, "message");

  if (message) {
    return message;
  }

  const code =
    typeof error === "object" && error !== null && "code" in error
      ? (error as { code?: unknown }).code
      : null;

  if (typeof code === "string" && code) {
    return `Firebase error (${code})`;
  }

  return "Unknown error";
}

function formatErrorMessage(error: unknown): string {
  const name = valueOf(error, "name");
  const message = errorMessage(error);

  return name && name !== "Error" ? `${name}: ${message}` : message;
}

function errorStack(error: unknown): string {
  return valueOf(error, "stack");
}

function sendLog(
  level: LogLevel,
  context: string,
  message: string,
  stack?: string,
): void {
  if (typeof window === "undefined") {
    return;
  }

  const payload = {
    level,
    context: sanitizeContext(context),
    message: sanitizeLogMessage(message),
    stack: stack ? sanitizeLogStack(stack) : undefined,
    timestamp: new Date().toISOString(),
  };

  void fetch("/api/logs", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    cache: "no-store",
    keepalive: true,
  }).catch(() => {
    // Logging must never create a second unhandled failure.
  });
}

export function logError(context: string, error: unknown): void {
  const message = formatErrorMessage(error);
  const stack = errorStack(error);
  const safeMessage = sanitizeLogMessage(message);

  console.error(
    `[${sanitizeContext(context)}] ${safeMessage}`,
    stack ? sanitizeLogStack(stack) : "",
  );

  sendLog("error", context, message, stack);
}

export function logWarn(context: string, message: string): void {
  const safeMessage = sanitizeLogMessage(message);

  console.warn(`[${sanitizeContext(context)}] ${safeMessage}`);
  sendLog("warn", context, message);
}

/**
 * Prevents the same failure from being written twice when it is logged at the
 * Firestore boundary and again at the API boundary.
 */
export function markErrorLogged(error: unknown): void {
  if (
    (typeof error === "object" && error !== null) ||
    typeof error === "function"
  ) {
    loggedErrors.add(error as object);
  }
}

export function isErrorLogged(error: unknown): boolean {
  return (
    ((typeof error === "object" && error !== null) ||
      typeof error === "function") &&
    loggedErrors.has(error as object)
  );
}
