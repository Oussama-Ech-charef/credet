"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, apiErrorMessage } from "@/lib/api";
import type { ShopSettings } from "@/lib/types";

interface SettingsContextValue {
  settings: ShopSettings | null;
  currency: string;
  loading: boolean;
  error: string;
  refresh: () => Promise<void>;
  saveSettings: (
    input: Pick<ShopSettings, "shop_name" | "shop_phone" | "currency">,
  ) => Promise<ShopSettings>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<ShopSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const data = await api.getSettings();
      setSettings(data);
    } catch (requestError) {
      setError(apiErrorMessage(requestError));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveSettings = useCallback(
    async (
      input: Pick<ShopSettings, "shop_name" | "shop_phone" | "currency">,
    ) => {
      const result = await api.updateSettings(input);
      setSettings(result.settings);
      setError("");
      return result.settings;
    },
    [],
  );

  const currency = settings?.currency || "DH";

  const value = useMemo(
    () => ({
      settings,
      currency,
      loading,
      error,
      refresh,
      saveSettings,
    }),
    [currency, error, loading, refresh, saveSettings, settings],
  );

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error("useSettings must be used inside SettingsProvider");
  }

  return context;
}
