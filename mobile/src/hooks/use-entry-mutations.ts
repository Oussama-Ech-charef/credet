import { useMutation, useQueryClient } from "@tanstack/react-query";

import { useServerConfig } from "@/providers/server-config-provider";
import type {
  Client,
  ClientDetailResponse,
  Entry,
  EntryDeleteResponse,
  EntryInput,
  EntryMutationResponse,
} from "@/lib/types";

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

function entriesKey(baseUrl: string, clientId: number) {
  return ["entries", baseUrl, clientId] as const;
}

function clientKey(baseUrl: string, clientId: number) {
  return ["client", baseUrl, clientId] as const;
}

function clientsKey(baseUrl: string) {
  return ["clients", baseUrl] as const;
}

function statsKey(baseUrl: string) {
  return ["stats", baseUrl] as const;
}

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

export function useCreateEntryMutation() {
  const queryClient = useQueryClient();
  const { api, baseUrl } = useServerConfig();

  return useMutation({
    mutationFn: ({ clientId, input }: CreateEntryVariables) =>
      api.createEntry(clientId, input),
    onSuccess: (result, variables) => {
      const key = entriesKey(baseUrl, variables.clientId);
      const current = queryClient.getQueryData<Entry[]>(key);

      if (current) {
        const entry = entryFromMutation(result);
        queryClient.setQueryData<Entry[]>(
          key,
          sortEntries([...current.filter((item) => item.id !== entry.id), entry]),
        );
      }

      updateCachedBalance(queryClient, baseUrl, variables.clientId, result);
      invalidateRelatedQueries(queryClient, baseUrl, variables.clientId);
    },
  });
}

export function useUpdateEntryMutation() {
  const queryClient = useQueryClient();
  const { api, baseUrl } = useServerConfig();

  return useMutation({
    mutationFn: ({ entryId, input }: UpdateEntryVariables) =>
      api.updateEntry(entryId, input),
    onSuccess: (result, variables) => {
      const key = entriesKey(baseUrl, variables.clientId);
      const current = queryClient.getQueryData<Entry[]>(key);

      if (current) {
        const entry = entryFromMutation(result);
        queryClient.setQueryData<Entry[]>(
          key,
          sortEntries(
            current.map((item) => (item.id === entry.id ? entry : item)),
          ),
        );
      }

      updateCachedBalance(queryClient, baseUrl, variables.clientId, result);
      invalidateRelatedQueries(queryClient, baseUrl, variables.clientId);
    },
  });
}

export function useDeleteEntryMutation() {
  const queryClient = useQueryClient();
  const { api, baseUrl } = useServerConfig();

  return useMutation({
    mutationFn: ({ entryId }: DeleteEntryVariables) => api.deleteEntry(entryId),
    onSuccess: (result: EntryDeleteResponse, variables) => {
      const key = entriesKey(baseUrl, variables.clientId);
      const current = queryClient.getQueryData<Entry[]>(key);

      if (current) {
        queryClient.setQueryData<Entry[]>(
          key,
          current.filter((item) => item.id !== variables.entryId),
        );
      }

      updateCachedBalance(queryClient, baseUrl, variables.clientId, result);
      invalidateRelatedQueries(queryClient, baseUrl, variables.clientId);
    },
  });
}

function updateCachedBalance(
  queryClient: ReturnType<typeof useQueryClient>,
  baseUrl: string,
  clientId: number,
  balance: Pick<
    EntryMutationResponse,
    "total_debt" | "total_paid" | "current_balance"
  >,
) {
  const entries = queryClient.getQueryData<Entry[]>(entriesKey(baseUrl, clientId));
  const sortedEntries = entries ? sortEntries(entries) : null;
  const lastOperationDate = sortedEntries?.[0]?.operation_date ?? null;

  queryClient.setQueryData<ClientDetailResponse>(
    clientKey(baseUrl, clientId),
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

  queryClient.setQueryData<Client[]>(clientsKey(baseUrl), (current) => {
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
  baseUrl: string,
  clientId: number,
) {
  void queryClient.invalidateQueries({ queryKey: statsKey(baseUrl) });
  void queryClient.invalidateQueries({ queryKey: clientsKey(baseUrl) });
  void queryClient.invalidateQueries({ queryKey: clientKey(baseUrl, clientId) });
  void queryClient.invalidateQueries({ queryKey: entriesKey(baseUrl, clientId) });
}
