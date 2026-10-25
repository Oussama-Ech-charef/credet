"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ClientPicker } from "@/components/clients/client-picker";
import { ChangeCalculator } from "@/components/ledger/change-calculator";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { api, apiErrorMessage } from "@/lib/api";
import {
  balanceLabel,
  formatAmount,
  roundAmount,
  todayInputValue,
} from "@/lib/format";
import {
  isValidDateInput,
  normalizeDigits,
  parseAmountInput,
  validateOptionalText,
  validateRequiredText,
} from "@/lib/validation";
import type {
  Client,
  EntryMutationResponse,
  OperationType,
} from "@/lib/types";

interface QuickEntryModalProps {
  open: boolean;
  onClose: () => void;
  onSaved: (result: EntryMutationResponse) => void;
  currency?: string;
}

interface FormErrors {
  client?: string;
  amount?: string;
  description?: string;
  operation_date?: string;
  note?: string;
}

export function QuickEntryModal({
  open,
  onClose,
  onSaved,
  currency = "DH",
}: QuickEntryModalProps) {
  const formId = useId();
  const amountRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [clients, setClients] = useState<Client[]>([]);
  const [loadingClients, setLoadingClients] = useState(false);
  const [clientsError, setClientsError] = useState("");
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [operationType, setOperationType] = useState<OperationType>("DEBT");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [operationDate, setOperationDate] = useState(todayInputValue());
  const [note, setNote] = useState("");
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setSelectedClient(null);
    setOperationType("DEBT");
    setAmount("");
    setDescription("");
    setOperationDate(todayInputValue());
    setNote("");
    setErrors({});
    setFormError("");
    setSubmitting(false);
    setClientsError("");

    let active = true;
    setLoadingClients(true);

    api
      .listClients({ status: "all" })
      .then((data) => {
        if (active) {
          setClients(data);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setClientsError(apiErrorMessage(error));
        }
      })
      .finally(() => {
        if (active) {
          setLoadingClients(false);
        }
      });

    return () => {
      active = false;
    };
  }, [open]);

  const isDebt = operationType === "DEBT";
  const currentDebt = Math.max(
    0,
    roundAmount(selectedClient?.current_balance ?? 0),
  );
  const enteredAmount = parseAmountInput(amount).value ?? 0;
  const changeDue = roundAmount(enteredAmount - currentDebt);

  function handleReturnChange() {
    setAmount(currentDebt.toFixed(2));
    setErrors((current) => ({ ...current, amount: undefined }));
    setFormError("");

    window.requestAnimationFrame(() => {
      amountRef.current?.focus();
      amountRef.current?.select();
    });
  }

  function handleKeepAdvance() {
    const advanceNote = `سداد كامل الدين مع رصيد متبقٍ قدره ${changeDue.toFixed(
      2,
    )} ${currency} لصالح العميل.`;

    setNote((current) => {
      const trimmed = current.trim();

      if (!trimmed) {
        return advanceNote;
      }

      if (trimmed.includes(advanceNote)) {
        return current;
      }

      return `${trimmed} — ${advanceNote}`.slice(0, 2000);
    });
    setErrors((current) => ({ ...current, note: undefined }));
    setFormError("");
  }

  function chooseClient(client: Client) {
    setSelectedClient(client);
    setErrors((current) => ({ ...current, client: undefined }));
    window.requestAnimationFrame(() => amountRef.current?.focus());
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};

    if (!selectedClient) {
      nextErrors.client = "اختر العميل أولًا.";
    }

    const amountResult = parseAmountInput(amount);

    if (amountResult.error) {
      nextErrors.amount = amountResult.error;
    }

    const descriptionError = validateRequiredText(description, "الوصف", 500);
    const noteError = validateOptionalText(note, "الملاحظة", 2000);

    if (descriptionError) nextErrors.description = descriptionError;
    if (noteError) nextErrors.note = noteError;

    if (!isValidDateInput(operationDate)) {
      nextErrors.operation_date = "اختر تاريخًا صحيحًا.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!validate() || !selectedClient) {
      return;
    }

    const amountResult = parseAmountInput(amount);

    if (!amountResult.value) {
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const result = await api.createEntry(selectedClient.id, {
        operation_type: operationType,
        amount: amountResult.value,
        description: description.trim(),
        operation_date: operationDate,
        note: note.trim() || null,
      });

      toast(
        isDebt
          ? `تم تسجيل دين لصالح ${selectedClient.name}.`
          : `تم تسجيل دفعة من ${selectedClient.name}.`,
      );
      onSaved(result);
      onClose();
    } catch (error) {
      setFormError(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      closeOnBackdrop={false}
      footer={
        <>
          <Button disabled={submitting} onClick={onClose} variant="secondary">
            إلغاء
          </Button>
          <Button
            disabled={!selectedClient}
            form={formId}
            icon={isDebt ? "plus" : "minus"}
            loading={submitting}
            type="submit"
            variant={isDebt ? "danger" : "success"}
          >
            {isDebt ? "تسجيل الدين" : "تسجيل الدفعة"}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      size="lg"
      title="تسجيل حركة سريعة"
      description="اختر العميل، ثم أدخل المبلغ. تبقى كل الحركات في سجل الحساب."
    >
      {loadingClients ? (
        <div className="skeleton-stack" aria-label="جاري تحميل العملاء">
          <span className="skeleton" style={{ height: 44 }} />
          <span className="skeleton" style={{ height: 150 }} />
        </div>
      ) : clientsError ? (
        <div className="error-state" role="alert">
          <Icon name="alert" size={18} />
          <span>{clientsError}</span>
        </div>
      ) : clients.length === 0 ? (
        <EmptyState
          compact
          description="أضف عميلًا أولًا من زر «إضافة عميل» في لوحة التحكم."
          icon="users"
          title="لا يوجد عميل بعد"
        />
      ) : (
        <form className="form-stack" id={formId} onSubmit={handleSubmit}>
          <div className="quick-entry__client">
            {selectedClient ? (
              <div className="quick-entry__selected">
                <div>
                  <span className="quick-entry__selected-label">العميل المختار</span>
                  <strong>{selectedClient.name}</strong>
                  <span>{selectedClient.phone || "بدون رقم هاتف"}</span>
                </div>
                <div className="quick-entry__selected-side">
                  <span>{balanceLabel(selectedClient)}</span>
                  <strong
                    className={
                      selectedClient.current_balance > 0
                        ? "is-debt"
                        : selectedClient.current_balance < 0
                          ? "is-payment"
                          : "is-settled"
                    }
                  >
                    {formatAmount(
                      Math.abs(selectedClient.current_balance),
                      currency,
                    )}
                  </strong>
                  <button
                    className="text-link"
                    onClick={() => setSelectedClient(null)}
                    type="button"
                  >
                    تغيير
                  </button>
                </div>
              </div>
            ) : (
              <ClientPicker
                clients={clients}
                currency={currency}
                onSelect={chooseClient}
                selectedId={null}
              />
            )}
            {errors.client ? (
              <p className="field__error" role="alert">
                {errors.client}
              </p>
            ) : null}
          </div>

          <div className="type-toggle" role="group" aria-label="نوع الحركة">
            <button
              aria-pressed={isDebt}
              className={
                isDebt
                  ? "type-toggle__btn type-toggle__btn--debt is-active"
                  : "type-toggle__btn type-toggle__btn--debt"
              }
              onClick={() => setOperationType("DEBT")}
              type="button"
            >
              <Icon name="plus" size={15} />
              دين
            </button>
            <button
              aria-pressed={!isDebt}
              className={
                !isDebt
                  ? "type-toggle__btn type-toggle__btn--payment is-active"
                  : "type-toggle__btn type-toggle__btn--payment"
              }
              onClick={() => setOperationType("PAYMENT")}
              type="button"
            >
              <Icon name="minus" size={15} />
              دفعة
            </button>
          </div>

          <Field error={errors.amount} htmlFor="quick-amount" label="المبلغ">
            <div className="amount-input">
              <Input
                autoComplete="off"
                dir="ltr"
                disabled={!selectedClient}
                id="quick-amount"
                inputMode="decimal"
                onChange={(event) => setAmount(normalizeDigits(event.target.value))}
                placeholder="0.00"
                ref={amountRef}
                value={amount}
              />
              <span className="amount-input__suffix">{currency}</span>
            </div>
          </Field>

          {selectedClient && operationType === "PAYMENT" ? (
            <ChangeCalculator
              compact
              currency={currency}
              currentDebt={currentDebt}
              enteredAmount={enteredAmount}
              onKeepAdvance={handleKeepAdvance}
              onReturnChange={handleReturnChange}
            />
          ) : null}

          <Field
            error={errors.description}
            htmlFor="quick-description"
            label="الوصف / السلعة"
          >
            <Input
              id="quick-description"
              onChange={(event) => setDescription(event.target.value)}
              placeholder="مثال: مواد غذائية"
              value={description}
            />
          </Field>

          <div className="form-grid">
            <Field
              error={errors.operation_date}
              htmlFor="quick-date"
              label="تاريخ الحركة"
            >
              <Input
                id="quick-date"
                onChange={(event) => setOperationDate(event.target.value)}
                type="date"
                value={operationDate}
              />
            </Field>
            <Field error={errors.note} htmlFor="quick-note" label="ملاحظة" optional>
              <Input
                id="quick-note"
                onChange={(event) => setNote(event.target.value)}
                placeholder="تفصيل إضافي..."
                value={note}
              />
            </Field>
          </div>

          {formError ? (
            <p className="error-state" role="alert">
              {formError}
            </p>
          ) : null}
        </form>
      )}
    </Modal>
  );
}
