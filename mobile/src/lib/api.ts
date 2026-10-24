import Constants from "expo-constants";
import { Platform } from "react-native";

import type {
  ApiErrorBody,
  Client,
  ClientDetailResponse,
  DownloadedFile,
  Entry,
  EntryDeleteResponse,
  EntryInput,
  EntryMutationResponse,
  ShopSettings,
  StatsOverview,
} from "./types";

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

function translateBadRequest(message: string): string {
  const normalized = message.toLowerCase();

  if (normalized.includes("amount")) {
    return "المبلغ غير صالح. أدخل مبلغًا أكبر من صفر.";
  }

  if (normalized.includes("description")) {
    return "وصف الحركة مطلوب.";
  }

  if (normalized.includes("operation_type")) {
    return "نوع الحركة غير صالح.";
  }

  if (normalized.includes("name")) {
    return "اسم الكليان غير صالح.";
  }

  return "البيانات المدخلة غير صحيحة.";
}

export function apiErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    if (error.status === 0) {
      return "تعذر الاتصال بالخادم. تحقق من عنوان الخادم في الإعدادات ومن أن الهاتف على نفس الشبكة.";
    }

    if (error.status === 404) {
      return "لم يتم العثور على السجل المطلوب. ربما تم حذفه.";
    }

    if (error.status === 400) {
      return translateBadRequest(error.message);
    }

    if (error.status === 401 || error.status === 403) {
      return "غير مصرح لك بهذا الإجراء.";
    }

    if (error.status >= 500) {
      return "حدث خطأ في الخادم. أعد المحاولة بعد لحظات.";
    }

    return "تعذر إتمام الطلب. أعد المحاولة.";
  }

  if (error instanceof Error && error.message) {
    return error.message;
  }

  return "حدث خطأ غير متوقع.";
}

function getExpoHost(): string | null {
  const hostUri = Constants.expoConfig?.hostUri;

  if (!hostUri) {
    return null;
  }

  try {
    const parsed = new URL(hostUri.includes("://") ? hostUri : `http://${hostUri}`);
    const host = parsed.hostname.replace(/^\[|\]$/g, "");

    if (
      !host ||
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "::1" ||
      host === "0.0.0.0"
    ) {
      return null;
    }

    return host;
  } catch {
    return null;
  }
}

export function defaultApiBaseUrl(): string {
  const configured = process.env.EXPO_PUBLIC_API_URL?.trim();

  if (configured) {
    const normalized = normalizeBaseUrl(configured);

    if (normalized.url) {
      return normalized.url;
    }
  }

  const expoHost = getExpoHost();

  if (expoHost) {
    return `http://${expoHost}:4000/api`;
  }

  if (Platform.OS === "android") {
    return "http://10.0.2.2:4000/api";
  }

  return "http://localhost:4000/api";
}

export interface NormalizedBaseUrl {
  url?: string;
  error?: string;
}

export function normalizeBaseUrl(value: string): NormalizedBaseUrl {
  const trimmed = value.trim();

  if (!trimmed) {
    return { error: "أدخل عنوان الخادم أولًا." };
  }

  const hasScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(trimmed);

  if (hasScheme && !/^https?:\/\//i.test(trimmed)) {
    return { error: "يجب أن يبدأ عنوان الخادم بـ http أو https." };
  }

  const candidate = /^https?:\/\//i.test(trimmed)
    ? trimmed
    : `http://${trimmed}`;

  let parsed: URL;

  try {
    parsed = new URL(candidate);
  } catch {
    return { error: "عنوان الخادم غير صالح. مثال: http://192.168.1.20:4000/api" };
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { error: "يجب أن يبدأ عنوان الخادم بـ http أو https." };
  }

  if (!parsed.hostname) {
    return { error: "عنوان الخادم لا يحتوي على اسم مضيف صالح." };
  }

  if (parsed.username || parsed.password) {
    return { error: "لا تضع اسم مستخدم أو كلمة مرور في العنوان." };
  }

  if (parsed.search || parsed.hash) {
    return { error: "أزل معاملات الاستعلام من عنوان الخادم." };
  }

  let path = parsed.pathname.replace(/\/+$/, "");

  if (!path) {
    path = "/api";
  }

  parsed.pathname = path;

  return { url: parsed.toString().replace(/\/+$/, "") };
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

async function readErrorBody(response: Response): Promise<ApiErrorBody | null> {
  try {
    const text = await response.text();

    if (!text) {
      return null;
    }

    return JSON.parse(text) as ApiErrorBody;
  } catch {
    return null;
  }
}

export class CredetApi {
  readonly baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl.replace(/\/+$/, "");
  }

  fileUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }

  private async request<T>(
    path: string,
    { timeoutMs = 20_000, signal, headers, ...init }: RequestOptions = {},
  ): Promise<T> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    const abortFromCaller = () => controller.abort();
    signal?.addEventListener("abort", abortFromCaller, { once: true });

    try {
      const response = await fetch(this.fileUrl(path), {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
          ...(init.body ? { "Content-Type": "application/json" } : {}),
          ...headers,
        },
      });

      if (!response.ok) {
        const body = await readErrorBody(response);

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

      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError("انتهت مهلة الطلب. أعد المحاولة.", 0);
      }

      throw new ApiError("تعذر الاتصال بالخادم.", 0);
    } finally {
      clearTimeout(timeout);
      signal?.removeEventListener("abort", abortFromCaller);
    }
  }

  private async requestFile(
    path: string,
    init: RequestOptions,
    fallbackFilename: string,
    fallbackContentType: string,
  ): Promise<DownloadedFile> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 60_000);
    const abortFromCaller = () => controller.abort();
    init.signal?.addEventListener("abort", abortFromCaller, { once: true });

    try {
      const response = await fetch(this.fileUrl(path), {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: fallbackContentType,
          ...init.headers,
        },
      });

      if (!response.ok) {
        const body = await readErrorBody(response);

        throw new ApiError(
          body?.error || `Request failed with status ${response.status}`,
          response.status,
          body?.details,
        );
      }

      return {
        bytes: new Uint8Array(await response.arrayBuffer()),
        filename: filenameFromDisposition(
          response.headers.get("Content-Disposition"),
          fallbackFilename,
        ),
        contentType:
          response.headers.get("Content-Type")?.split(";")[0]?.trim() ||
          fallbackContentType,
      };
    } catch (error) {
      if (error instanceof ApiError) {
        throw error;
      }

      if (error instanceof Error && error.name === "AbortError") {
        throw new ApiError("انتهت مهلة تجهيز الملف. أعد المحاولة.", 0);
      }

      throw new ApiError("تعذر الاتصال بالخادم.", 0);
    } finally {
      clearTimeout(timeout);
      init.signal?.removeEventListener("abort", abortFromCaller);
    }
  }

  getStats(signal?: AbortSignal): Promise<StatsOverview> {
    return this.request<StatsOverview>("/stats/overview", { signal });
  }

  listClients(signal?: AbortSignal): Promise<Client[]> {
    return this.request<Client[]>("/clients?status=all", { signal });
  }

  getClient(id: number | string, signal?: AbortSignal): Promise<ClientDetailResponse> {
    return this.request<ClientDetailResponse>(`/clients/${id}`, { signal });
  }

  listEntries(clientId: number | string, signal?: AbortSignal): Promise<Entry[]> {
    return this.request<Entry[]>(`/clients/${clientId}/entries`, { signal });
  }

  createEntry(
    clientId: number | string,
    input: EntryInput,
  ): Promise<EntryMutationResponse> {
    return this.request<EntryMutationResponse>(`/clients/${clientId}/entries`, {
      method: "POST",
      body: JSON.stringify(input),
    });
  }

  updateEntry(
    entryId: number | string,
    input: Partial<EntryInput>,
  ): Promise<EntryMutationResponse> {
    return this.request<EntryMutationResponse>(`/entries/${entryId}`, {
      method: "PUT",
      body: JSON.stringify(input),
    });
  }

  deleteEntry(entryId: number | string): Promise<EntryDeleteResponse> {
    return this.request<EntryDeleteResponse>(`/entries/${entryId}`, {
      method: "DELETE",
    });
  }

  getSettings(signal?: AbortSignal): Promise<ShopSettings> {
    return this.request<ShopSettings>("/settings", { signal });
  }

  downloadClientStatement(clientId: number | string): Promise<DownloadedFile> {
    return this.requestFile(
      `/reports/client/${clientId}/pdf`,
      {},
      `credet-client-${clientId}.pdf`,
      "application/pdf",
    );
  }

  downloadDatabase(): Promise<DownloadedFile> {
    return this.requestFile(
      "/backup/download",
      {},
      "credet.db",
      "application/octet-stream",
    );
  }

  exportJson(): Promise<DownloadedFile> {
    return this.requestFile(
      "/backup/export-json",
      { method: "POST" },
      "credet-backup.json",
      "application/json",
    );
  }
}
