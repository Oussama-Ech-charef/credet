"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { ClientCard } from "@/components/clients/client-card";
import { ClientFormModal } from "@/components/clients/client-form-modal";
import { Button, IconButton } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedTabs } from "@/components/ui/segmented-tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { clientMatchesSearch, formatClientCount } from "@/lib/format";
import type { Client, ClientStatus } from "@/lib/types";

function statusMatches(client: Client, status: ClientStatus): boolean {
  if (status === "debt") {
    return client.current_balance > 0;
  }

  if (status === "settled") {
    return client.current_balance <= 0;
  }

  return true;
}

export default function ClientsPage() {
  const { currency } = useSettings();
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [status, setStatus] = useState<ClientStatus>("all");
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 180);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [modalOpen, setModalOpen] = useState(false);

  const load = useCallback(async (signal?: AbortSignal, isRefresh = false) => {
    if (isRefresh) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    setError("");

    try {
      const data = await api.listClients({ status: "all" }, signal);

      if (!signal?.aborted) {
        setClients(data);
      }
    } catch (requestError) {
      if (!signal?.aborted) {
        setError(apiErrorMessage(requestError));
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    const filter = new URLSearchParams(window.location.search).get("filter");

    if (filter === "debt" || filter === "settled") {
      setStatus(filter);
    }
  }, []);

  const counts = useMemo(
    () => ({
      all: clients.length,
      debt: clients.filter((client) => client.current_balance > 0).length,
      settled: clients.filter((client) => client.current_balance <= 0).length,
    }),
    [clients],
  );

  const filtered = useMemo(
    () =>
      clients.filter(
        (client) =>
          statusMatches(client, status) &&
          clientMatchesSearch(client, debouncedSearch),
      ),
    [clients, debouncedSearch, status],
  );

  function handleCreated(client: Client) {
    const createdClient: Client = {
      ...client,
      total_debt: client.total_debt ?? 0,
      total_paid: client.total_paid ?? 0,
      current_balance: client.current_balance ?? 0,
      entries_count: client.entries_count ?? 0,
      last_operation_date: client.last_operation_date ?? null,
    };

    setClients((current) =>
      [...current, createdClient].sort((left, right) =>
        left.name.localeCompare(right.name, "ar"),
      ),
    );
    setStatus("all");
    setSearch("");
  }

  function handleRefresh() {
    void load(undefined, true);
  }

  const hasQuery = debouncedSearch.trim().length > 0 || status !== "all";

  return (
    <div className="page">
      <PageHeader
        actions={
          <>
            <IconButton
              icon="refresh"
              label="تحديث قائمة العملاء"
              loading={refreshing}
              onClick={handleRefresh}
              variant="outline"
            />
            <Button
              icon="plus"
              onClick={() => setModalOpen(true)}
              variant="primary"
            >
              إضافة عميل
            </Button>
          </>
        }
        description="ابحث في سجل العملاء، تابع الأرصدة، وافتح ملف أي حساب بضغطة واحدة."
        title="العملاء"
      />

      <div className="clients-toolbar">
        <SearchField onChange={setSearch} value={search} />
        <SegmentedTabs
          label="تصفية العملاء حسب الرصيد"
          onChange={setStatus}
          options={[
            { value: "all", label: "الكل", count: counts.all },
            { value: "debt", label: "عليهم ديون", count: counts.debt },
            { value: "settled", label: "مسددون", count: counts.settled },
          ]}
          value={status}
        />
      </div>

      {!loading && !error ? (
        <p aria-live="polite" className="clients-result-note">
          {hasQuery
            ? `النتائج: ${formatClientCount(filtered.length)} من ${formatClientCount(clients.length)}`
            : `${formatClientCount(clients.length)} في السجل`}
        </p>
      ) : null}

      {loading ? (
        <div aria-label="جاري تحميل العملاء" className="skeleton-grid">
          {Array.from({ length: 6 }).map((_, index) => (
            <div className="skeleton-card" key={index}>
              <div className="skeleton-stack">
                <Skeleton height={18} width="62%" />
                <Skeleton height={12} width="40%" />
                <Skeleton height={30} style={{ marginTop: 18 }} width="55%" />
                <Skeleton height={30} style={{ marginTop: 18 }} />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <div className="error-state" role="alert">
          <Icon name="alert" size={20} />
          <div>
            <strong>تعذر تحميل قائمة العملاء.</strong>
            <p style={{ margin: "4px 0 10px" }}>{error}</p>
            <Button onClick={handleRefresh} size="sm" variant="secondary">
              إعادة المحاولة
            </Button>
          </div>
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          action={
            <Button icon="plus" onClick={() => setModalOpen(true)}>
              إضافة أول عميل
            </Button>
          }
          description="ابدأ بإضافة اسم العميل ورقم هاتفه، ثم سجّل أول دين أو دفعة."
          icon="users"
          title="السجل فارغ"
        />
      ) : filtered.length === 0 ? (
        <EmptyState
          action={
            <Button
              onClick={() => {
                setSearch("");
                setStatus("all");
              }}
              variant="secondary"
            >
              مسح البحث والتصفية
            </Button>
          }
          description="جرّب اسمًا آخر، رقم هاتف، أو غيّر تبويب التصفية."
          icon="search"
          title="لا توجد نتائج مطابقة"
        />
      ) : (
        <div className="client-grid">
          {filtered.map((client) => (
            <ClientCard client={client} currency={currency} key={client.id} />
          ))}
        </div>
      )}

      <ClientFormModal
        onClose={() => setModalOpen(false)}
        onCreated={handleCreated}
        open={modalOpen}
      />
    </div>
  );
}
