import { useQuery } from "@tanstack/react-query";

import { firestoreService } from "@/services/firestoreService";

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: () => firestoreService.getStats(),
    staleTime: 30_000,
  });
}

export function useClients() {
  return useQuery({
    queryKey: ["clients"],
    queryFn: () => firestoreService.listClients(),
    staleTime: 30_000,
  });
}

export function useClientDetail(clientId: number | null) {
  const enabled =
    clientId !== null && Number.isSafeInteger(clientId) && clientId > 0;

  return useQuery({
    queryKey: ["client", clientId],
    queryFn: () => firestoreService.getClient(clientId as number),
    enabled,
    staleTime: 30_000,
  });
}

export function useClientEntries(clientId: number | null) {
  const enabled =
    clientId !== null && Number.isSafeInteger(clientId) && clientId > 0;

  return useQuery({
    queryKey: ["entries", clientId],
    queryFn: () => firestoreService.listEntries(clientId as number),
    enabled,
    staleTime: 30_000,
  });
}

export function useShopSettings() {
  return useQuery({
    queryKey: ["settings"],
    queryFn: () => firestoreService.getSettings(),
    staleTime: 60_000,
  });
}
