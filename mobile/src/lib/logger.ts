import * as FileSystem from "expo-file-system/legacy";
import { Platform } from "react-native";

const LOG_DIRECTORY_URI = FileSystem.documentDirectory
  ? `${FileSystem.documentDirectory}logs`
  : null;

const LOG_FILE_URI = LOG_DIRECTORY_URI
  ? `${LOG_DIRECTORY_URI}/error.log`
  : null;

const WEB_STORAGE_KEY = "credet:error-log";
const MAX_LOG_BYTES = 1024 * 1024;
const MAX_RETAINED_LINES = 500;
const MAX_CONTEXT_LENGTH = 60;
const MAX_MESSAGE_LENGTH = 1_200;
const MAX_DETAILS_LENGTH = 1_000;
const MAX_STACK_LENGTH = 4_000;

type LogLevel = "ERROR" | "WARN";

interface WebStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

interface WebWindowLike {
  addEventListener(
    type: "error",
    listener: (event: { error?: unknown; message?: unknown }) => void,
  ): void;
  addEventListener(
    type: "unhandledrejection",
    listener: (event: { reason?: unknown }) => void,
  ): void;
}

interface ErrorUtilsLike {
  getGlobalHandler?: () => (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler?: (
    handler: (error: unknown, isFatal?: boolean) => void,
  ) => void;
}

const SENSITIVE_KEY_PATTERN =
  /^(password|passwd|pwd|secret|token|accesstoken|refreshtoken|apikey|authorization|auth|cookie|session|credential|phone|phonenumber|telephone|mobile|email|emailaddress|address|notes?|name|fullname|clientname|customername|iban|bankaccount|accountnumber|cardnumber|creditcard)$/;

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

let writeQueue: Promise<void> = Promise.resolve();
let handlersInstalled = false;

function getWebStorage(): WebStorage | null {
  const storage = (globalThis as { localStorage?: WebStorage }).localStorage;

  return storage ?? null;
}

function normalizeKey(key: string): string {
  return key.toLowerCase().replace(/[\s_-]/g, "");
}

export function redactSensitiveText(value: string): string {
  return REDACTION_RULES.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    value,
  );
}

function sanitizeText(
  value: string,
  maxLength: number,
  preserveLineBreaks = false,
): string {
  const withoutControls = value.replace(
    /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F\u202A-\u202E\u2066-\u2069]/g,
    "",
  );
  const flattened = preserveLineBreaks
    ? withoutControls.replace(/\r?\n/g, "\\n")
    : withoutControls.replace(/\s*\r?\n\s*/g, " ");
  const redacted = redactSensitiveText(flattened);

  return redacted.length > maxLength
    ? `${redacted.slice(0, maxLength)}...`
    : redacted;
}

function sanitizeContext(context: string): string {
  const cleaned = redactSensitiveText(context)
    .replace(/[^A-Za-z0-9._:-]/g, "")
    .slice(0, MAX_CONTEXT_LENGTH);

  return cleaned || "App";
}

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

  const code = typeof error === "object" && error !== null && "code" in error
    ? (error as { code?: unknown }).code
    : null;

  if (typeof code === "string" && code) {
    return `Firebase error (${code})`;
  }

  return "Unknown error";
}

function errorName(error: unknown): string {
  const name = valueOf(error, "name");
  return name && name !== "Error" ? name : "";
}

function errorStack(error: unknown): string {
  return valueOf(error, "stack");
}

function sanitizeMetadata(metadata?: Record<string, unknown>): string {
  if (!metadata) {
    return "";
  }

  const seen = new WeakSet<object>();

  try {
    const serialized = JSON.stringify(metadata, (key, value) => {
      if (key && SENSITIVE_KEY_PATTERN.test(normalizeKey(key))) {
        return "[REDACTED]";
      }

      if (typeof value === "string") {
        return redactSensitiveText(value);
      }

      if (typeof value === "bigint") {
        return value.toString();
      }

      if (value instanceof Error) {
        return redactSensitiveText(errorMessage(value));
      }

      if (typeof value === "object" && value !== null) {
        if (seen.has(value)) {
          return "[Circular]";
        }

        seen.add(value);
      }

      return value;
    });

    return serialized ? sanitizeText(serialized, MAX_DETAILS_LENGTH) : "";
  } catch {
    return "[Unserializable metadata]";
  }
}

function formatEntry(
  level: LogLevel,
  context: string,
  message: string,
  details: string,
  stack: string,
): string {
  const timestamp = new Date().toISOString();
  const safeMessage = sanitizeText(message, MAX_MESSAGE_LENGTH);
  const safeDetails = details
    ? sanitizeText(details, MAX_DETAILS_LENGTH)
    : "-";
  const safeStack = stack ? sanitizeText(stack, MAX_STACK_LENGTH, true) : "-";

  return `[${timestamp}] [${level}] [${sanitizeContext(context)}] ${safeMessage} | ${safeDetails} | ${safeStack}\n`;
}

function utf8ByteLength(value: string): number {
  let bytes = 0;

  for (let index = 0; index < value.length; index += 1) {
    const code = value.charCodeAt(index);

    if (code < 0x80) {
      bytes += 1;
    } else if (code < 0x800) {
      bytes += 2;
    } else if (code >= 0xd800 && code <= 0xdbff) {
      bytes += 4;
      index += 1;
    } else {
      bytes += 3;
    }
  }

  return bytes;
}

function trimToLimit(existing: string, entry: string): string {
  const lines = existing
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);

  const kept: string[] = [];
  let bytes = utf8ByteLength(entry);

  for (
    let index = lines.length - 1;
    index >= 0 && kept.length < MAX_RETAINED_LINES - 1;
    index -= 1
  ) {
    const line = lines[index];
    const lineBytes = utf8ByteLength(line) + 1;

    if (bytes + lineBytes > MAX_LOG_BYTES) {
      break;
    }

    kept.unshift(line);
    bytes += lineBytes;
  }

  return `${[...kept, entry.trimEnd()].join("\n")}\n`;
}

function combine(existing: string, entry: string): string {
  const separator = existing.length > 0 && !existing.endsWith("\n") ? "\n" : "";
  const combined = `${existing}${separator}${entry}`;

  if (utf8ByteLength(combined) <= MAX_LOG_BYTES) {
    return combined;
  }

  return trimToLimit(existing, entry);
}

async function ensureLogDirectory(): Promise<void> {
  if (!LOG_DIRECTORY_URI) {
    return;
  }

  const info = await FileSystem.getInfoAsync(LOG_DIRECTORY_URI);

  if (info.exists) {
    return;
  }

  try {
    await FileSystem.makeDirectoryAsync(LOG_DIRECTORY_URI, {
      intermediates: true,
    });
  } catch (error) {
    const afterFailure = await FileSystem.getInfoAsync(LOG_DIRECTORY_URI);

    if (!afterFailure.exists) {
      throw error;
    }
  }
}

async function readLogFile(): Promise<string> {
  if (!LOG_FILE_URI) {
    return "";
  }

  const info = await FileSystem.getInfoAsync(LOG_FILE_URI);

  if (!info.exists) {
    return "";
  }

  return FileSystem.readAsStringAsync(LOG_FILE_URI);
}

function readWebLog(): string {
  try {
    return getWebStorage()?.getItem(WEB_STORAGE_KEY) ?? "";
  } catch {
    return "";
  }
}

function persistWeb(entry: string): void {
  const storage = getWebStorage();

  if (!storage) {
    console.error(entry.trimEnd());
    return;
  }

  try {
    const existing = storage.getItem(WEB_STORAGE_KEY) ?? "";
    storage.setItem(WEB_STORAGE_KEY, combine(existing, entry));
  } catch (error) {
    console.error("[logger] Failed to persist web log entry", error);
  }
}

async function persist(entry: string): Promise<void> {
  if (Platform.OS === "web") {
    persistWeb(entry);
    return;
  }

  if (!LOG_FILE_URI) {
    console.error(entry.trimEnd());
    return;
  }

  const task = writeQueue.then(async () => {
    await ensureLogDirectory();
    const existing = await readLogFile();
    await FileSystem.writeAsStringAsync(
      LOG_FILE_URI,
      combine(existing, entry),
    );
  });

  writeQueue = task.catch(() => undefined);
  await task;
}

export async function logError(
  context: string,
  error: unknown,
  metadata?: Record<string, unknown>,
): Promise<void> {
  const details = [
    errorName(error),
    sanitizeMetadata(metadata),
  ].filter(Boolean).join(" | ");

  const entry = formatEntry(
    "ERROR",
    context,
    errorMessage(error),
    details || "-",
    errorStack(error),
  );

  try {
    await persist(entry);
  } catch (persistError) {
    console.error("[logger] Failed to persist error log", persistError);
  }
}

export async function logWarn(
  context: string,
  message: string,
): Promise<void> {
  const entry = formatEntry("WARN", context, message, "-", "-");

  try {
    await persist(entry);
  } catch (persistError) {
    console.error("[logger] Failed to persist warning log", persistError);
  }
}

export async function getLogContent(): Promise<string> {
  if (Platform.OS === "web") {
    return readWebLog();
  }

  await writeQueue.catch(() => undefined);

  try {
    return await readLogFile();
  } catch (error) {
    console.error("[logger] Failed to read error log", error);
    return "";
  }
}

export async function clearLogs(): Promise<void> {
  if (Platform.OS === "web") {
    getWebStorage()?.removeItem(WEB_STORAGE_KEY);
    return;
  }

  if (!LOG_FILE_URI) {
    return;
  }

  const task = writeQueue.then(async () => {
    await ensureLogDirectory();
    const info = await FileSystem.getInfoAsync(LOG_FILE_URI);

    if (info.exists) {
      await FileSystem.deleteAsync(LOG_FILE_URI, { idempotent: true });
    }

    // Recreate the file so it can be shared even before the next error.
    await FileSystem.writeAsStringAsync(LOG_FILE_URI, "");
  });

  writeQueue = task.catch(() => undefined);
  await task;
}

export function getLogFileUri(): string | null {
  return LOG_FILE_URI;
}

export function installGlobalErrorHandlers(): void {
  if (handlersInstalled) {
    return;
  }

  handlersInstalled = true;

  const errorUtils = (globalThis as { ErrorUtils?: ErrorUtilsLike }).ErrorUtils;

  if (errorUtils?.setGlobalHandler) {
    const previousHandler = errorUtils.getGlobalHandler?.();

    errorUtils.setGlobalHandler((error, isFatal) => {
      void logError("GlobalError", error, {
        fatal: Boolean(isFatal),
      }).finally(() => {
        previousHandler?.(error, isFatal);
      });
    });
  }

  const webWindow = (globalThis as { window?: WebWindowLike }).window;

  if (Platform.OS === "web" && webWindow) {
    webWindow.addEventListener("error", (event) => {
      void logError(
        "WindowError",
        event.error ?? event.message ?? "Unknown window error",
      );
    });

    webWindow.addEventListener("unhandledrejection", (event) => {
      void logError(
        "UnhandledRejection",
        event.reason ?? "Unknown promise rejection",
      );
    });
  }
}
