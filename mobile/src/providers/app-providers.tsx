import {
  QueryClient,
  QueryClientProvider,
  focusManager,
} from "@tanstack/react-query";
import { useEffect, type ReactNode } from "react";
import { AppState, Platform } from "react-native";

import { ServerConfigProvider } from "@/providers/server-config-provider";
import { ToastProvider } from "@/providers/toast-provider";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 15_000,
      gcTime: 5 * 60_000,
      retry: 1,
      refetchOnWindowFocus: false,
      refetchOnReconnect: true,
    },
    mutations: {
      retry: 0,
    },
  },
});

export function AppProviders({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (Platform.OS === "web") {
      return;
    }

    const subscription = AppState.addEventListener("change", (state) => {
      focusManager.setFocused(state === "active");
    });

    return () => subscription.remove();
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ServerConfigProvider>
        <ToastProvider>{children}</ToastProvider>
      </ServerConfigProvider>
    </QueryClientProvider>
  );
}
