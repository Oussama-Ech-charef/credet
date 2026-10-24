import AsyncStorage from "@react-native-async-storage/async-storage";
import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import {
  CredetApi,
  defaultApiBaseUrl,
  normalizeBaseUrl,
} from "@/lib/api";
import type { ShopSettings } from "@/lib/types";

const STORAGE_KEY = "@credet/api-base-url";

interface ServerConfigContextValue {
  baseUrl: string;
  defaultBaseUrl: string;
  api: CredetApi;
  ready: boolean;
  saveBaseUrl: (value: string) => Promise<string>;
  resetBaseUrl: () => Promise<string>;
  testConnection: (value: string) => Promise<ShopSettings>;
}

const ServerConfigContext = createContext<ServerConfigContextValue | null>(null);

export function ServerConfigProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();
  const fallbackBaseUrl = useMemo(() => defaultApiBaseUrl(), []);
  const [baseUrl, setBaseUrl] = useState(fallbackBaseUrl);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;

    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (!active || !stored) {
          return;
        }

        const normalized = normalizeBaseUrl(stored);

        if (normalized.url) {
          setBaseUrl(normalized.url);
        } else {
          void AsyncStorage.removeItem(STORAGE_KEY);
        }
      })
      .catch(() => {
        // The default address remains usable if local storage is unavailable.
      })
      .finally(() => {
        if (active) {
          setReady(true);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const saveBaseUrl = useCallback(
    async (value: string) => {
      const normalized = normalizeBaseUrl(value);

      if (!normalized.url) {
        throw new Error(normalized.error || "عنوان الخادم غير صالح.");
      }

      await AsyncStorage.setItem(STORAGE_KEY, normalized.url);
      setBaseUrl(normalized.url);
      queryClient.clear();
      return normalized.url;
    },
    [queryClient],
  );

  const resetBaseUrl = useCallback(async () => {
    await AsyncStorage.removeItem(STORAGE_KEY);
    setBaseUrl(fallbackBaseUrl);
    queryClient.clear();
    return fallbackBaseUrl;
  }, [fallbackBaseUrl, queryClient]);

  const testConnection = useCallback(async (value: string) => {
    const normalized = normalizeBaseUrl(value);

    if (!normalized.url) {
      throw new Error(normalized.error || "عنوان الخادم غير صالح.");
    }

    return new CredetApi(normalized.url).getSettings();
  }, []);

  const api = useMemo(() => new CredetApi(baseUrl), [baseUrl]);

  const contextValue = useMemo<ServerConfigContextValue>(
    () => ({
      baseUrl,
      defaultBaseUrl: fallbackBaseUrl,
      api,
      ready,
      saveBaseUrl,
      resetBaseUrl,
      testConnection,
    }),
    [api, baseUrl, fallbackBaseUrl, ready, resetBaseUrl, saveBaseUrl, testConnection],
  );

  return (
    <ServerConfigContext.Provider value={contextValue}>
      {children}
    </ServerConfigContext.Provider>
  );
}

export function useServerConfig(): ServerConfigContextValue {
  const value = useContext(ServerConfigContext);

  if (!value) {
    throw new Error("useServerConfig must be used inside ServerConfigProvider");
  }

  return value;
}
