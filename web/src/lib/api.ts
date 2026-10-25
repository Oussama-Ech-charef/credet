import { firestoreService } from "@/services/firestoreService";
import { isErrorLogged, logError } from "@/lib/logger";
import type {
  ApiErrorBody,
  Client,
  ClientDetailResponse,
  ClientInput,
  ClientStatus,
  Entry,
  EntryDeleteResponse,
  EntryInput,
  EntryMutationResponse,
  ShopSettings,
  StatsOverview,
} from "./types";

const DEFAULT_API_URL = "http://localhost:4000/api";

// Only the optional PDF statement still uses the legacy Express backend.
// Every other operation reads and writes Firestore directly.
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL
).replace(/\/+$/, "");

export class ApiError extends Error {
  status: number;
  details?: unknown;

  constructor(message: string, status = 0, details?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return (
        error.message ||
        "تعذر الاتصال بـ Firebase. تحقق من اتصال الإنترنت ثم أعد المحاولة."
      );
    }

    if (error.status === 404) {
      return "لم يتم العثور على السجل المطلوب. ربما تم حذفه.";
    }

    if (error.status === 400) {
      return error.message || "البيانات المدخلة غير صحيحة.";
    }

    if (error.status >= 500) {
      return "حدث خطأ أثناء حفظ البيانات. أعد المحاولة بعد لحظات.";
    }

    return error.message || "تعذر إتمام الطلب.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "حدث خطأ غير متوقع.";
}

function firebaseErrorCode(error: unknown): string | null {
  if (typeof error !== "object" || error === null || !("code" in error)) {
    return null;
  }

  const code = (error as { code?: unknown }).code;
  return typeof code === "string" ? code : null;
}

function arabicErrorMessage(error: unknown): string | null {
  if (error instanceof Error && /[\u0600-\u06FF]/.test(error.message)) {
    return error.message;
  }

  return null;
}

function toApiError(error: unknown): ApiError {
  if (error instanceof ApiError) {
    return error;
  }

  switch (firebaseErrorCode(error)) {
    case "permission-denied":
      return new ApiError(
        "ليس لديك صلاحية الوصول إلى بيانات Firebase.",
        403,
        error,
      );
    case "unauthenticated":
      return new ApiError(
        "انتهت صلاحية الوصول إلى Firebase. أعد المحاولة.",
        401,
        error,
      );
    case "unavailable":
    case "deadline-exceeded":
    case "network-request-failed":
    case "cancelled":
      return new ApiError(
        "تعذر الاتصال بـ Firebase. تحقق من اتصال الإنترنت ثم أعد المحاولة.",
        0,
        error,
      );
    case "not-found":
      return new ApiError(
        "لم يتم العثور على السجل المطلوب. ربما تم حذفه.",
        404,
        error,
      );
    case "failed-precondition":
      return new ApiError(
        "تعذر تنفيذ العملية. تحقق من إعداد Firestore ثم أعد المحاولة.",
        500,
        error,
      );
    case "resource-exhausted":
      return new ApiError(
        "تم تجاوز حد العمليات مؤقتًا. أعد المحاولة بعد قليل.",
        429,
        error,
      );
    default:
      break;
  }

  const message = arabicErrorMessage(error);
  if (message) {
    return new ApiError(message, 400, error);
  }

  return new ApiError(
    "تعذر إتمام الطلب عبر Firebase. أعد المحاولة.",
    0,
    error,
  );
}

async function firestoreCall<T>(
  operation: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) {
    throw new ApiError("تم إلغاء الطلب.", 0);
  }

  try {
    const result = await operation();

    if (signal?.aborted) {
      throw new ApiError("تم إلغاء الطلب.", 0);
    }

    return result;
  } catch (error) {
    const apiError = toApiError(error);

    if (
      !signal?.aborted &&
      !isErrorLogged(error) &&
      apiError.status !== 400 &&
      apiError.status !== 404
    ) {
      logError("Api", error);
    }

    throw apiError;
  }
}

function numericId(value: number | string, message: string): number {
  const id = Number(value);
  if (!Number.isSafeInteger(id) || id <= 0) {
    throw new ApiError(message, 400);
  }

  return id;
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

function filenameFromDisposition(value: string | null, fallback: string): string {
  if (!value) {
    return fallback;
  }

  const utf8Match = value.match(/filename\*=UTF-8''([^;]+)/i);

  if (utf8Match?.[1]) {
    try {
      return decodeURIComponent(utf8Match[1].trim());
    } catch {
      return fallback;
    }
  }

  const match = value.match(/filename="?([^";]+)"?/i);
  return match?.[1]?.trim() || fallback;
}

async function requestFile(
  path: string,
  { timeoutMs = 60_000, signal, headers, ...init }: RequestOptions = {},
  fallbackFilename: string,
): Promise<{ blob: Blob; filename: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const abortFromCaller = () => controller.abort();
  signal?.addEventListener("abort", abortFromCaller, { once: true });

  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
      headers: {
        Accept: "application/octet-stream",
        ...headers,
      },
    });

    if (!response.ok) {
      let body: ApiErrorBody | null = null;

      try {
        body = (await response.json()) as ApiErrorBody;
      } catch {
        body = null;
      }

      throw new ApiError(
        body?.error || `Request failed with status ${response.status}`,
        response.status,
      );
    }

    return {
      blob: await response.blob(),
      filename: filenameFromDisposition(
        response.headers.get("Content-Disposition"),
        fallbackFilename,
      ),
    };
  } catch (error) {
    if (error instanceof ApiError) {
      if (!signal?.aborted) {
        logError("Api", error);
      }
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      if (!signal?.aborted) {
        logError("Api", error);
      }
      throw new ApiError("انتهت مهلة تجهيز الملف. أعد المحاولة.", 0);
    }

    logError("Api", error);
    throw new ApiError("تعذر الاتصال بالخادم.", 0);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
}

export function saveBlob(blob: Blob, filename: string): void {
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
}

export const api = {
  getStats(signal?: AbortSignal): Promise<StatsOverview> {
    return firestoreCall(() => firestoreService.getStats(), signal);
  },

  listClients(
    { search = "", status = "all" as ClientStatus } = {},
    signal?: AbortSignal,
  ): Promise<Client[]> {
    return firestoreCall(
      () => firestoreService.listClients({ search, status }),
      signal,
    );
  },

  getClient(
    id: number | string,
    signal?: AbortSignal,
  ): Promise<ClientDetailResponse> {
    return firestoreCall(
      () =>
        firestoreService.getClient(
          numericId(id, "رقم العميل غير صالح."),
        ),
      signal,
    );
  },

  createClient(input: ClientInput): Promise<Client> {
    return firestoreCall(() => firestoreService.createClient(input));
  },

  listEntries(
    clientId: number | string,
    signal?: AbortSignal,
  ): Promise<Entry[]> {
    return firestoreCall(
      () =>
        firestoreService.listEntries(
          numericId(clientId, "رقم العميل غير صالح."),
        ),
      signal,
    );
  },

  createEntry(
    clientId: number | string,
    input: EntryInput,
  ): Promise<EntryMutationResponse> {
    return firestoreCall(() =>
      firestoreService.createEntry(
        numericId(clientId, "رقم العميل غير صالح."),
        input,
      ),
    );
  },

  updateEntry(
    entryId: number | string,
    input: Partial<EntryInput>,
  ): Promise<EntryMutationResponse> {
    return firestoreCall(() =>
      firestoreService.updateEntry(
        numericId(entryId, "رقم الحركة غير صالح."),
        input,
      ),
    );
  },

  deleteEntry(entryId: number | string): Promise<EntryDeleteResponse> {
    return firestoreCall(() =>
      firestoreService.deleteEntry(
        numericId(entryId, "رقم الحركة غير صالح."),
      ),
    );
  },

  getSettings(signal?: AbortSignal): Promise<ShopSettings> {
    return firestoreCall(() => firestoreService.getSettings(), signal);
  },

  updateSettings(
    input: Pick<ShopSettings, "shop_name" | "shop_phone" | "currency">,
  ): Promise<{ success: boolean; settings: ShopSettings }> {
    return firestoreCall(async () => ({
      success: true,
      settings: await firestoreService.updateSettings(input),
    }));
  },

  async downloadClientStatement(
    clientId: number | string,
  ): Promise<{ blob: Blob; filename: string }> {
    const id = numericId(clientId, "رقم العميل غير صالح.");

    try {
      return await requestFile(
        `/reports/client/${id}/pdf`,
        { timeoutMs: 15_000 },
        `credet-client-${id}.pdf`,
      );
    } catch (error) {
      if (error instanceof ApiError && error.status === 0) {
        throw new ApiError(
          "تصدير PDF عبر الويب يتطلب تشغيل الخادم أو استخدام تطبيق الهاتف المحمول",
          0,
          error,
        );
      }

      throw error;
    }
  },

  downloadDatabase(): Promise<{ blob: Blob; filename: string }> {
    return firestoreCall(() => firestoreService.exportJson());
  },

  async exportJson(): Promise<{ blob: Blob; filename: string }> {
    const file = await firestoreCall(() => firestoreService.exportJson());
    return {
      blob: file.blob,
      filename: "credet-backup.json",
    };
  },
};
