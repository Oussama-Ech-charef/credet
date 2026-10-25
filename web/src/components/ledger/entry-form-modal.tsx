"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type FormEvent,
} from "react";
import { ChangeCalculator } from "@/components/ledger/change-calculator";
import { Button } from "@/components/ui/button";
import { Field, Input } from "@/components/ui/field";
import { Icon } from "@/components/ui/icon";
import { Modal } from "@/components/ui/modal";
import { useToast } from "@/hooks/use-toast";
import { api, apiErrorMessage } from "@/lib/api";
import { roundAmount, todayInputValue } from "@/lib/format";
import {
  isValidDateInput,
  normalizeDigits,
  parseAmountInput,
  validateOptionalText,
  validateRequiredText,
} from "@/lib/validation";
import type {
  Entry,
  EntryMutationResponse,
  OperationType,
} from "@/lib/types";

export type EntryFormMode = "debt" | "payment" | "edit";

interface EntryFormModalProps {
  open: boolean;
  onClose: () => void;
  clientId: number;
  currentBalance: number;
  currency: string;
  mode: EntryFormMode;
  entry?: Entry | null;
  onSaved: (result: EntryMutationResponse, mode: EntryFormMode) => void;
}

interface FormErrors {
  amount?: string;
  description?: string;
  operation_date?: string;
  note?: string;
}

function initialType(mode: EntryFormMode, entry?: Entry | null): OperationType {
  if (mode === "edit" && entry) {
    return entry.operation_type;
  }

  return mode === "payment" ? "PAYMENT" : "DEBT";
}

export function EntryFormModal({
  open,
  onClose,
  clientId,
  currentBalance,
  currency,
  mode,
  entry,
  onSaved,
}: EntryFormModalProps) {
  const formId = useId();
  const amountRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();
  const [operationType, setOperationType] = useState<OperationType>(
    initialType(mode, entry),
  );
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

    setOperationType(initialType(mode, entry));
    setAmount(entry ? entry.amount.toFixed(2) : "");
    setDescription(entry?.description || "");
    setOperationDate(entry?.operation_date || todayInputValue());
    setNote(entry?.note || "");
    setErrors({});
    setFormError("");
    setSubmitting(false);

    const frame = window.requestAnimationFrame(() => {
      amountRef.current?.focus();
      amountRef.current?.select();
    });

    return () => window.cancelAnimationFrame(frame);
  }, [entry, mode, open]);

  const isEditing = mode === "edit";
  const isDebt = operationType === "DEBT";
  const title = isEditing
    ? "تعديل الحركة"
    : isDebt
      ? "تسجيل دين"
      : "تسجيل دفعة";
  const submitLabel = isEditing
    ? "حفظ التعديل"
    : isDebt
      ? "تسجيل الدين"
      : "تسجيل الدفعة";

  const currentDebt = Math.max(0, roundAmount(currentBalance));
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

  function validate(): boolean {
    const nextErrors: FormErrors = {};
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

    if (!validate()) {
      return;
    }

    const amountResult = parseAmountInput(amount);

    if (!amountResult.value) {
      return;
    }

    setSubmitting(true);
    setFormError("");

    try {
      const payload = {
        operation_type: operationType,
        amount: amountResult.value,
        description: description.trim(),
        operation_date: operationDate,
        note: note.trim() || null,
      };

      const result =
        isEditing && entry
          ? await api.updateEntry(entry.id, payload)
          : await api.createEntry(clientId, payload);

      toast(isEditing ? "تم تحديث الحركة." : "تمت إضافة الحركة إلى الحساب.");
      onSaved(result, mode);
      onClose();
    } catch (error) {
      setFormError(apiErrorMessage(error));
    } finally {
      setSubmitting(false);
    }
  }

  function handleAmountChange(value: string) {
    setAmount(normalizeDigits(value));
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
            form={formId}
            icon={isDebt ? "plus" : "minus"}
            loading={submitting}
            type="submit"
            variant={isDebt ? "danger" : "success"}
          >
            {submitLabel}
          </Button>
        </>
      }
      onClose={onClose}
      open={open}
      title={title}
      description={
        isEditing
          ? "عدّل نوع الحركة أو المبلغ أو التفاصيل، وسيتحدث الرصيد فورًا."
          : "أدخل المبلغ أولًا، ثم أضف وصفًا واضحًا للحركة."
      }
    >
      <form className="form-stack" id={formId} onSubmit={handleSubmit}>
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

        <Field error={errors.amount} htmlFor="entry-amount" label="المبلغ">
          <div className="amount-input">
            <Input
              aria-describedby={errors.amount ? "entry-amount-error" : undefined}
              aria-invalid={Boolean(errors.amount)}
              autoComplete="off"
              dir="ltr"
              id="entry-amount"
              inputMode="decimal"
              onChange={(event) => handleAmountChange(event.target.value)}
              placeholder="0.00"
              ref={amountRef}
              value={amount}
            />
            <span className="amount-input__suffix">{currency}</span>
          </div>
        </Field>

        {!isEditing && operationType === "PAYMENT" ? (
          <ChangeCalculator
            currency={currency}
            currentDebt={currentDebt}
            enteredAmount={enteredAmount}
            onKeepAdvance={handleKeepAdvance}
            onReturnChange={handleReturnChange}
          />
        ) : null}

        <Field
          error={errors.description}
          htmlFor="entry-description"
          label="الوصف / السلعة"
        >
          <Input
            autoComplete="off"
            id="entry-description"
            onChange={(event) => setDescription(event.target.value)}
            placeholder="مثال: كيس أرز وزيت"
            value={description}
          />
        </Field>

        <div className="form-grid">
          <Field
            error={errors.operation_date}
            htmlFor="entry-date"
            label="تاريخ الحركة"
          >
            <Input
              id="entry-date"
              onChange={(event) => setOperationDate(event.target.value)}
              type="date"
              value={operationDate}
            />
          </Field>
          <Field error={errors.note} htmlFor="entry-note" label="ملاحظة" optional>
            <Input
              id="entry-note"
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
    </Modal>
  );
}
