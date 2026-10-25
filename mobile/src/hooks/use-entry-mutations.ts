import { useMutation, useQueryClient } from "@tanstack/react-query";

import { firestoreService } from "@/services/firestoreService";
import type {
  Client,
  ClientDetailResponse,
  ClientInput,
  Entry,
  EntryDeleteResponse,
  EntryInput,
  EntryMutationResponse,
} from "@/lib/types";

// ──────────────────────────────────────────────
// Variables types
// ──────────────────────────────────────────────

interface CreateEntryVariables {
  clientId: number;
  input: EntryInput;
}

interface UpdateEntryVariables {
  clientId: number;
  entryId: number;
  input: Partial<EntryInput>;
}

interface DeleteEntryVariables {
  clientId: number;
  entryId: number;
}

// ──────────────────────────────────────────────
// Query key helpers — no baseUrl needed anymore
// ──────────────────────────────────────────────

function entriesKey(clientId: number) {
  return ["entries", clientId] as const;
}

function clientKey(clientId: number) {
  return ["client", clientId] as const;
}

function clientsKey() {
  return ["clients"] as const;
}

function statsKey() {
  return ["stats"] as const;
}

// ──────────────────────────────────────────────
// Sorting helpers
// ──────────────────────────────────────────────

function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((left, right) => {
    if (left.operation_date !== right.operation_date) {
      return left.operation_date < right.operation_date ? 1 : -1;
    }
    return right.id - left.id;
  });
}

function entryFromMutation(result: EntryMutationResponse): Entry {
  return {
    id: result.id,
    client_id: result.client_id,
    operation_type: result.operation_type,
    amount: result.amount,
    description: result.description,
    operation_date: result.operation_date,
    note: result.note,
    created_at: result.created_at,
    updated_at: result.updated_at,
  };
}

// ──────────────────────────────────────────────
// Client mutations
// ──────────────────────────────────────────────

export function useCreateClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: ClientInput) => firestoreService.createClient(input),
    onSuccess: (newClient) => {
      queryClient.setQueryData<Client[]>(clientsKey(), (current) =>
        current ? [...current, newClient] : [newClient],
      );
      void queryClient.invalidateQueries({ queryKey: statsKey() });
    },
  });
}

export function useUpdateClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, input }: { id: number; input: Partial<ClientInput> }) =>
      firestoreService.updateClient(id, input),
    onSuccess: (updated) => {
      queryClient.setQueryData<Client[]>(clientsKey(), (current) =>
        current
          ? current.map((c) => (c.id === updated.id ? updated : c))
          : [updated],
      );
      queryClient.setQueryData<ClientDetailResponse>(
        clientKey(updated.id),
        (current) =>
          current ? { ...current, client: updated } : undefined,
      );
    },
  });
}

export function useDeleteClientMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: number) => firestoreService.deleteClient(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<Client[]>(clientsKey(), (current) =>
        current ? current.filter((c) => c.id !== id) : [],
      );
      void queryClient.invalidateQueries({ queryKey: statsKey() });
    },
  });
}

// ──────────────────────────────────────────────
// Entry mutations
// ──────────────────────────────────────────────

export function useCreateEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ clientId, input }: CreateEntryVariables) =>
      firestoreService.createEntry(clientId, input),
    onSuccess: (result, variables) => {
      const key = entriesKey(variables.clientId);
      const current = queryClient.getQueryData<Entry[]>(key);

      if (current) {
        const entry = entryFromMutation(result);
        queryClient.setQueryData<Entry[]>(
          key,
          sortEntries([...current.filter((item) => item.id !== entry.id), entry]),
        );
      }

      updateCachedBalance(queryClient, variables.clientId, result);
      invalidateRelatedQueries(queryClient, variables.clientId);
    },
  });
}

export function useUpdateEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId, input }: UpdateEntryVariables) =>
      firestoreService.updateEntry(entryId, input),
    onSuccess: (result, variables) => {
      const key = entriesKey(variables.clientId);
      const current = queryClient.getQueryData<Entry[]>(key);

      if (current) {
        const entry = entryFromMutation(result);
        queryClient.setQueryData<Entry[]>(
          key,
          sortEntries(current.map((item) => (item.id === entry.id ? entry : item))),
        );
      }

      updateCachedBalance(queryClient, variables.clientId, result);
      invalidateRelatedQueries(queryClient, variables.clientId);
    },
  });
}

export function useDeleteEntryMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ entryId }: DeleteEntryVariables) =>
      firestoreService.deleteEntry(entryId),
    onSuccess: (result: EntryDeleteResponse, variables) => {
      const key = entriesKey(variables.clientId);
      const current = queryClient.getQueryData<Entry[]>(key);

      if (current) {
        queryClient.setQueryData<Entry[]>(
          key,
          current.filter((item) => item.id !== variables.entryId),
        );
      }

      updateCachedBalance(queryClient, variables.clientId, result);
      invalidateRelatedQueries(queryClient, variables.clientId);
    },
  });
}

// ──────────────────────────────────────────────
// Settings mutation
// ──────────────────────────────────────────────

export function useUpdateSettingsMutation() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (input: Parameters<typeof firestoreService.updateSettings>[0]) =>
      firestoreService.updateSettings(input),
    onSuccess: (updated) => {
      queryClient.setQueryData(["settings"], updated);
    },
  });
}

// ──────────────────────────────────────────────
// Cache helpers
// ──────────────────────────────────────────────

function updateCachedBalance(
  queryClient: ReturnType<typeof useQueryClient>,
  clientId: number,
  balance: Pick<
    EntryMutationResponse,
    "total_debt" | "total_paid" | "current_balance"
  >,
) {
  const entries = queryClient.getQueryData<Entry[]>(entriesKey(clientId));
  const sortedEntries = entries ? sortEntries(entries) : null;
  const lastOperationDate = sortedEntries?.[0]?.operation_date ?? null;

  queryClient.setQueryData<ClientDetailResponse>(
    clientKey(clientId),
    (current) => {
      if (!current) {
        return current;
      }
      return {
        ...current,
        total_debt: balance.total_debt,
        total_paid: balance.total_paid,
        current_balance: balance.current_balance,
        client: {
          ...current.client,
          ...(sortedEntries
            ? {
                entries_count: sortedEntries.length,
                last_operation_date: lastOperationDate,
              }
            : {}),
        },
      };
    },
  );

  queryClient.setQueryData<Client[]>(clientsKey(), (current) => {
    if (!current) {
      return current;
    }
    return current.map((client) =>
      client.id === clientId
        ? {
            ...client,
            total_debt: balance.total_debt,
            total_paid: balance.total_paid,
            current_balance: balance.current_balance,
            ...(sortedEntries
              ? {
                  entries_count: sortedEntries.length,
                  last_operation_date: lastOperationDate,
                }
              : {}),
          }
        : client,
    );
  });
}

function invalidateRelatedQueries(
  queryClient: ReturnType<typeof useQueryClient>,
  clientId: number,
) {
  void queryClient.invalidateQueries({ queryKey: statsKey() });
  void queryClient.invalidateQueries({ queryKey: clientsKey() });
  void queryClient.invalidateQueries({ queryKey: clientKey(clientId) });
  void queryClient.invalidateQueries({ queryKey: entriesKey(clientId) });
}
