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
      return "تعذر الاتصال بالخادم. تأكد من تشغيل الـ API ثم أعد المحاولة.";
    }

    if (error.status === 404) {
      return "لم يتم العثور على السجل المطلوب. ربما تم حذفه.";
    }

    if (error.status === 400) {
      return error.message || "البيانات المدخلة غير صحيحة.";
    }

    if (error.status >= 500) {
      return "حدث خطأ في الخادم. أعد المحاولة بعد لحظات.";
    }

    return error.message || "تعذر إتمام الطلب.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "حدث خطأ غير متوقع.";
}

interface RequestOptions extends RequestInit {
  timeoutMs?: number;
}

async function request<T>(
  path: string,
  { timeoutMs = 20_000, signal, headers, ...init }: RequestOptions = {},
): Promise<T> {
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
        Accept: "application/json",
        ...(init.body ? { "Content-Type": "application/json" } : {}),
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
        body?.details,
      );
    }

    if (response.status === 204) {
      return undefined as T;
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof ApiError) {
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("انتهت مهلة الطلب. أعد المحاولة.", 0);
    }

    throw new ApiError("تعذر الاتصال بالخادم.", 0);
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", abortFromCaller);
  }
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
      throw error;
    }

    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError("انتهت مهلة تجهيز الملف. أعد المحاولة.", 0);
    }

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

function buildQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, value);
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}

export const api = {
  getStats(signal?: AbortSignal): Promise<StatsOverview> {
    return request<StatsOverview>("/stats/overview", { signal });
  },

  listClients(
    { search = "", status = "all" as ClientStatus } = {},
    signal?: AbortSignal,
  ): Promise<Client[]> {
    return request<Client[]>(
      `/clients${buildQuery({ search, status })}`,
      { signal },
    );
  },

  getClient(id: number | string, signal?: AbortSignal): Promise<ClientDetailResponse> {
    return request<ClientDetailResponse>(`/clients/${id}`, { signal });
  },

  createClient(input: ClientInput): Promise<Client> {
    return request<Client>("/clients", {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  listEntries(clientId: number | string, signal?: AbortSignal): Promise<Entry[]> {
    return request<Entry[]>(`/clients/${clientId}/entries`, { signal });
  },

  createEntry(
    clientId: number | string,
    input: EntryInput,
  ): Promise<EntryMutationResponse> {
    return request<EntryMutationResponse>(`/clients/${clientId}/entries`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  },

  updateEntry(
    entryId: number | string,
    input: Partial<EntryInput>,
  ): Promise<EntryMutationResponse> {
    return request<EntryMutationResponse>(`/entries/${entryId}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  deleteEntry(entryId: number | string): Promise<EntryDeleteResponse> {
    return request<EntryDeleteResponse>(`/entries/${entryId}`, {
      method: "DELETE",
    });
  },

  getSettings(signal?: AbortSignal): Promise<ShopSettings> {
    return request<ShopSettings>("/settings", { signal });
  },

  updateSettings(
    input: Pick<ShopSettings, "shop_name" | "shop_phone" | "currency">,
  ): Promise<{ success: boolean; settings: ShopSettings }> {
    return request<{ success: boolean; settings: ShopSettings }>("/settings", {
      method: "PUT",
      body: JSON.stringify(input),
    });
  },

  downloadClientStatement(
    clientId: number | string,
  ): Promise<{ blob: Blob; filename: string }> {
    return requestFile(
      `/reports/client/${clientId}/pdf`,
      {},
      `credet-client-${clientId}.pdf`,
    );
  },

  downloadDatabase(): Promise<{ blob: Blob; filename: string }> {
    return requestFile("/backup/download", {}, "credet.db");
  },

  exportJson(): Promise<{ blob: Blob; filename: string }> {
    return requestFile(
      "/backup/export-json",
      { method: "POST" },
      "credet-backup.json",
    );
  },
};
