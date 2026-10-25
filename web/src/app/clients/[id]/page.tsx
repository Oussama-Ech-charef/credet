"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import { BalancePanel } from "@/components/ledger/balance-panel";
import {
  EntryFormModal,
  type EntryFormMode,
} from "@/components/ledger/entry-form-modal";
import { EntryTable } from "@/components/ledger/entry-table";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/hooks/use-settings";
import { useToast } from "@/hooks/use-toast";
import { api, apiErrorMessage, saveBlob } from "@/lib/api";
import {
  formatAmount,
  formatDate,
  formatMovementCount,
  normalizePhoneForTel,
  normalizePhoneForWhatsApp,
  statementMessage,
} from "@/lib/format";
import type {
  ClientDetailResponse,
  Entry,
  EntryDeleteResponse,
  EntryMutationResponse,
} from "@/lib/types";

interface EntryModalState {
  mode: EntryFormMode;
  entry?: Entry | null;
}

function sortEntries(entries: Entry[]): Entry[] {
  return [...entries].sort((left, right) => {
    if (left.operation_date !== right.operation_date) {
      return left.operation_date < right.operation_date ? 1 : -1;
    }

    return right.id - left.id;
  });
}

export default function ClientLedgerPage() {
  const params = useParams();
  const rawId = Array.isArray(params.id) ? params.id[0] : params.id;
  const clientId = Number(rawId);
  const { currency, settings } = useSettings();
  const { toast } = useToast();
  const [clientData, setClientData] = useState<ClientDetailResponse | null>(null);
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [entryModal, setEntryModal] = useState<EntryModalState | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Entry | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  const load = useCallback(
    async (signal?: AbortSignal) => {
      if (!Number.isSafeInteger(clientId) || clientId <= 0) {
        setError("رقم العميل غير صالح.");
        setLoading(false);
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [clientResult, entryResult] = await Promise.all([
          api.getClient(clientId, signal),
          api.listEntries(clientId, signal),
        ]);

        if (signal?.aborted) {
          return;
        }

        setClientData(clientResult);
        setEntries(sortEntries(entryResult));
      } catch (requestError) {
        if (!signal?.aborted) {
          setError(apiErrorMessage(requestError));
        }
      } finally {
        if (!signal?.aborted) {
          setLoading(false);
        }
      }
    },
    [clientId],
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  useEffect(() => {
    if (clientData?.client.name) {
      document.title = `${clientData.client.name} · Credet`;
    }
  }, [clientData?.client.name]);

  useEffect(() => {
    setClientData((current) => {
      if (!current) {
        return current;
      }

      const lastOperationDate =
        entries.length > 0 ? entries[0].operation_date : null;

      if (
        current.client.entries_count === entries.length &&
        current.client.last_operation_date === lastOperationDate
      ) {
        return current;
      }

      return {
        ...current,
        client: {
          ...current.client,
          entries_count: entries.length,
          last_operation_date: lastOperationDate,
        },
      };
    });
  }, [entries]);

  function applyBalance(
    balance: Pick<
      ClientDetailResponse,
      "total_debt" | "total_paid" | "current_balance"
    >,
  ) {
    setClientData((current) => {
      if (!current) {
        return current;
      }

      if (
        current.total_debt === balance.total_debt &&
        current.total_paid === balance.total_paid &&
        current.current_balance === balance.current_balance
      ) {
        return current;
      }

      return {
        ...current,
        total_debt: balance.total_debt,
        total_paid: balance.total_paid,
        current_balance: balance.current_balance,
      };
    });
  }

  function handleSaved(result: EntryMutationResponse, mode: EntryFormMode) {
    const savedEntry: Entry = {
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

    if (mode === "edit") {
      setEntries((current) =>
        sortEntries(
          current.map((entry) =>
            entry.id === savedEntry.id ? savedEntry : entry,
          ),
        ),
      );
      applyBalance(result);
    } else {
      setEntries((current) => sortEntries([savedEntry, ...current]));
      applyBalance(result);
    }
  }

  async function handleDelete() {
    if (!deleteTarget) {
      return;
    }

    setDeleting(true);
    setDeleteError("");

    try {
      const result: EntryDeleteResponse = await api.deleteEntry(deleteTarget.id);
      setEntries((current) =>
        current.filter((entry) => entry.id !== deleteTarget.id),
      );
      applyBalance(result);
      setDeleteTarget(null);
      setDeleteError("");
      toast("تم حذف الحركة وتحديث الرصيد.");
    } catch (requestError) {
      setDeleteError(apiErrorMessage(requestError));
    } finally {
      setDeleting(false);
    }
  }

  async function handleDownloadPdf() {
    if (!clientData) {
      return;
    }

    setPdfLoading(true);

    try {
      const file = await api.downloadClientStatement(clientId);
      saveBlob(file.blob, file.filename);
      toast("تم تجهيز كشف الحساب وتنزيله.");
    } catch (requestError) {
      toast(apiErrorMessage(requestError), "error");
    } finally {
      setPdfLoading(false);
    }
  }

  const client = clientData?.client;
  const phone = client?.phone?.trim();
  const whatsapp = phone ? normalizePhoneForWhatsApp(phone) : "";
  const whatsappStatementHref =
    whatsapp && client && clientData
      ? `https://wa.me/${whatsapp}?text=${encodeURIComponent(
          statementMessage({
            clientName: client.name,
            shopName: settings?.shop_name || "دفتر الديون",
            totalDebt: clientData.total_debt,
            totalPaid: clientData.total_paid,
            currentBalance: clientData.current_balance,
            currency,
          }),
        )}`
      : "";
  const deleteDescription = useMemo(() => {
    if (!deleteTarget || !client) {
      return "";
    }

    return `سيتم حذف حركة «${deleteTarget.description}» بقيمة ${formatAmount(
      deleteTarget.amount,
      currency,
    )} من حساب ${client.name} نهائيًا. لا يمكن التراجع عن هذا الإجراء.`;
  }, [client, currency, deleteTarget]);

  if (loading) {
    return (
      <div className="page">
        <div className="skeleton-stack" style={{ marginBottom: 22 }}>
          <Skeleton height={18} width={90} />
          <Skeleton height={38} width="42%" />
          <Skeleton height={14} width="58%" />
        </div>
        <section className="balance-panel">
          <div className="balance-panel__main">
            <Skeleton height={14} width={190} />
            <Skeleton height={50} style={{ marginTop: 14 }} width={240} />
            <Skeleton height={12} style={{ marginTop: 12 }} width={280} />
          </div>
          <div className="balance-panel__side">
            <Skeleton height={20} />
            <Skeleton height={20} />
            <Skeleton height={20} />
          </div>
        </section>
        <div className="table-wrap">
          <div className="skeleton-stack" style={{ padding: 18 }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton height={44} key={index} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error || !clientData || !client) {
    return (
      <div className="page">
        <Link className="back-link" href="/clients">
          <Icon name="chevron-right" size={16} />
          <span>العملاء</span>
        </Link>
        <div className="error-state" role="alert">
          <Icon name="alert" size={20} />
          <div>
            <strong>تعذر فتح ملف العميل.</strong>
            <p style={{ margin: "4px 0 10px" }}>
              {error || "لم يتم العثور على هذا العميل."}
            </p>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
              <Button onClick={() => void load()} size="sm" variant="secondary">
                إعادة المحاولة
              </Button>
              <Link className="btn btn--ghost btn--sm" href="/clients">
                العودة إلى العملاء
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <Link className="back-link" href="/clients">
        <Icon name="chevron-right" size={16} />
        <span>العملاء</span>
      </Link>

      <header className="ledger-header">
        <div className="ledger-header__identity">
          <Avatar name={client.name} size="lg" />
          <div>
            <h1 className="ledger-header__name">{client.name}</h1>
            <div className="ledger-header__meta">
              {phone ? (
                <>
                  <a className="contact-link" href={`tel:${normalizePhoneForTel(phone)}`}>
                    <Icon name="phone" size={13} />
                    <span dir="ltr">{phone}</span>
                  </a>
                  {whatsapp ? (
                    <a
                      className="contact-link contact-link--whatsapp"
                      href={`https://wa.me/${whatsapp}`}
                      rel="noreferrer"
                      target="_blank"
                    >
                      <Icon name="message" size={13} />
                      واتساب
                    </a>
                  ) : null}
                </>
              ) : (
                <span className="text-dim">لا يوجد رقم هاتف</span>
              )}
              {client.address ? (
                <span>
                  <Icon name="map-pin" size={13} />
                  {client.address}
                </span>
              ) : null}
              {client.last_operation_date ? (
                <span>
                  <Icon name="calendar" size={13} />
                  آخر حركة: {formatDate(client.last_operation_date)}
                </span>
              ) : null}
            </div>
            {client.notes ? (
              <p className="ledger-header__notes">{client.notes}</p>
            ) : null}
          </div>
        </div>

        <div className="ledger-actions">
          <Button
            icon="plus"
            onClick={() => setEntryModal({ mode: "debt" })}
            variant="danger"
          >
            تسجيل دين
          </Button>
          <Button
            icon="minus"
            onClick={() => setEntryModal({ mode: "payment" })}
            variant="success"
          >
            تسجيل دفعة
          </Button>
          <Button
            icon="download"
            loading={pdfLoading}
            onClick={() => void handleDownloadPdf()}
            variant="outline"
          >
            كشف PDF
          </Button>
          {whatsappStatementHref ? (
            <a
              aria-label={`إرسال كشف حساب ${client.name} عبر واتساب`}
              className="btn btn--outline"
              href={whatsappStatementHref}
              rel="noreferrer"
              target="_blank"
            >
              <Icon name="message" size={18} />
              <span className="btn__label">كشف واتساب</span>
            </a>
          ) : null}
        </div>
      </header>

      <BalancePanel
        currency={currency}
        currentBalance={clientData.current_balance}
        totalDebt={clientData.total_debt}
        totalPaid={clientData.total_paid}
      />

      <div className="ledger-toolbar">
        <div>
          <h2 className="ledger-toolbar__title">حركة الحساب</h2>
          <span className="ledger-toolbar__meta">
            {formatMovementCount(entries.length)} · الترتيب من الأحدث إلى الأقدم
          </span>
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyState
          action={
            <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
              <Button
                icon="plus"
                onClick={() => setEntryModal({ mode: "debt" })}
                variant="danger"
              >
                تسجيل أول دين
              </Button>
              <Button
                icon="minus"
                onClick={() => setEntryModal({ mode: "payment" })}
                variant="success"
              >
                تسجيل دفعة
              </Button>
            </div>
          }
          description="ابدأ بتسجيل أول دين أو دفعة. سيظهر كل سطر هنا مع تاريخه وتفاصيله."
          icon="receipt"
          title="لا توجد حركات بعد"
        />
      ) : (
        <EntryTable
          currency={currency}
          entries={entries}
          onDelete={(entry) => {
            setDeleteError("");
            setDeleteTarget(entry);
          }}
          onEdit={(entry) => setEntryModal({ mode: "edit", entry })}
        />
      )}

      <EntryFormModal
        clientId={clientId}
        currency={currency}
        currentBalance={clientData.current_balance}
        entry={entryModal?.entry}
        mode={entryModal?.mode || "debt"}
        onClose={() => setEntryModal(null)}
        onSaved={handleSaved}
        open={Boolean(entryModal)}
      />

      <ConfirmDialog
        description={deleteDescription}
        error={deleteError}
        loading={deleting}
        onClose={() => {
          if (!deleting) {
            setDeleteTarget(null);
            setDeleteError("");
          }
        }}
        onConfirm={() => void handleDelete()}
        open={Boolean(deleteTarget)}
        title="حذف الحركة؟"
      />
    </div>
  );
}
