import { useQuery } from "@tanstack/react-query";

import { useServerConfig } from "@/providers/server-config-provider";

export function useStats() {
  const { api, baseUrl, ready } = useServerConfig();

  return useQuery({
    queryKey: ["stats", baseUrl],
    queryFn: ({ signal }) => api.getStats(signal),
    enabled: ready,
  });
}

export function useClients() {
  const { api, baseUrl, ready } = useServerConfig();

  return useQuery({
    queryKey: ["clients", baseUrl],
    queryFn: ({ signal }) => api.listClients(signal),
    enabled: ready,
  });
}

export function useClientDetail(clientId: number | null) {
  const { api, baseUrl, ready } = useServerConfig();
  const enabled =
    ready && clientId !== null && Number.isSafeInteger(clientId) && clientId > 0;

  return useQuery({
    queryKey: ["client", baseUrl, clientId],
    queryFn: ({ signal }) => api.getClient(clientId as number, signal),
    enabled,
  });
}

export function useClientEntries(clientId: number | null) {
  const { api, baseUrl, ready } = useServerConfig();
  const enabled =
    ready && clientId !== null && Number.isSafeInteger(clientId) && clientId > 0;

  return useQuery({
    queryKey: ["entries", baseUrl, clientId],
    queryFn: ({ signal }) => api.listEntries(clientId as number, signal),
    enabled,
  });
}

export function useShopSettings() {
  const { api, baseUrl, ready } = useServerConfig();

  return useQuery({
    queryKey: ["settings", baseUrl],
    queryFn: ({ signal }) => api.getSettings(signal),
    enabled: ready,
  });
}
