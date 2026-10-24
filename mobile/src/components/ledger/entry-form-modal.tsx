import { Ionicons } from "@expo/vector-icons";
import { useEffect, useRef, useState } from "react";
import { StyleSheet, View, type TextInputInstance } from "react-native";

import { AmountInput } from "@/components/ui/amount-input";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { TextField } from "@/components/ui/field";
import { AppModal } from "@/components/ui/modal";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { colors, radius, spacing } from "@/constants/theme";
import { useCreateEntryMutation, useUpdateEntryMutation } from "@/hooks/use-entry-mutations";
import { apiErrorMessage } from "@/lib/api";
import { formatAmountInput, formatDate } from "@/lib/format";
import { hapticSuccess } from "@/lib/haptics";
import type { Entry, EntryMutationResponse, OperationType } from "@/lib/types";
import {
  parseAmountInput,
  validateOptionalText,
  validateRequiredText,
} from "@/lib/validation";

export type EntryFormMode = "debt" | "payment" | "edit";

interface EntryFormModalProps {
  visible: boolean;
  onClose: () => void;
  clientId: number;
  clientName: string;
  currency: string;
  mode: EntryFormMode;
  entry?: Entry | null;
  onSaved: (result: EntryMutationResponse) => void;
}

interface FormErrors {
  amount?: string;
  description?: string;
  note?: string;
}

export function EntryFormModal(props: EntryFormModalProps) {
  if (!props.visible) {
    return null;
  }

  return (
    <EntryFormModalContent
      key={`${props.mode}-${props.entry?.id ?? "new"}`}
      {...props}
    />
  );
}

function EntryFormModalContent({
  visible,
  onClose,
  clientId,
  clientName,
  currency,
  mode,
  entry,
  onSaved,
}: EntryFormModalProps) {
  const amountRef = useRef<TextInputInstance>(null);
  const descriptionRef = useRef<TextInputInstance>(null);
  const noteRef = useRef<TextInputInstance>(null);
  const createMutation = useCreateEntryMutation();
  const updateMutation = useUpdateEntryMutation();
  const [operationType, setOperationType] = useState<OperationType>(() =>
    mode === "edit" && entry
      ? entry.operation_type
      : mode === "payment"
        ? "PAYMENT"
        : "DEBT",
  );
  const [amount, setAmount] = useState(() =>
    mode === "edit" && entry ? formatAmountInput(entry.amount) : "",
  );
  const [description, setDescription] = useState(() =>
    mode === "edit" && entry ? entry.description : "",
  );
  const [note, setNote] = useState(() =>
    mode === "edit" && entry ? entry.note ?? "" : "",
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [formError, setFormError] = useState("");
  const saving = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    const timer = setTimeout(() => amountRef.current?.focus(), 300);
    return () => clearTimeout(timer);
  }, []);

  const title =
    mode === "edit"
      ? "تعديل الحركة"
      : operationType === "DEBT"
        ? "تسجيل كريدي"
        : "تسجيل دفعة";
  const descriptionLabel = operationType === "DEBT" ? "الوصف / السلعة" : "وصف الدفعة";
  const descriptionPlaceholder =
    operationType === "DEBT" ? "مثال: مواد غذائية" : "مثال: سداد جزئي";
  const submitLabel =
    mode === "edit"
      ? "حفظ التعديل"
      : operationType === "DEBT"
        ? "تسجيل الكريدي"
        : "تسجيل الدفعة";

  const resetError = (field: keyof FormErrors) => {
    setErrors((current) => ({ ...current, [field]: undefined }));
    setFormError("");
  };

  const handleSubmit = async () => {
    const amountResult = parseAmountInput(amount);
    const nextErrors: FormErrors = {};

    if (!amountResult.value) {
      nextErrors.amount = amountResult.error;
    }

    if (mode === "edit") {
      nextErrors.description = validateRequiredText(description, "الوصف", 500);
    } else {
      nextErrors.description = validateOptionalText(description, "الوصف", 500);
    }

    nextErrors.note = validateOptionalText(note, "الملاحظة", 2000);
    setErrors(nextErrors);
    setFormError("");

    if (Object.values(nextErrors).some(Boolean) || !amountResult.value) {
      return;
    }

    const finalDescription =
      description.trim() || (operationType === "DEBT" ? "كريدي" : "دفعة");
    const finalNote = note.trim() || null;

    try {
      const result =
        mode === "edit" && entry
          ? await updateMutation.mutateAsync({
              clientId,
              entryId: entry.id,
              input: {
                operation_type: operationType,
                amount: amountResult.value,
                description: finalDescription,
                note: finalNote,
              },
            })
          : await createMutation.mutateAsync({
              clientId,
              input: {
                operation_type: operationType,
                amount: amountResult.value,
                description: finalDescription,
                note: finalNote,
              },
            });

      await hapticSuccess();
      onSaved(result);
      onClose();
    } catch (error) {
      setFormError(apiErrorMessage(error));
    }
  };

  return (
    <AppModal
      closeOnBackdrop={false}
      description={
        mode === "edit"
          ? `تعديل حركة على حساب ${clientName}.`
          : `أضف حركة جديدة على حساب ${clientName}.`
      }
      footer={
        <>
          <Button
            disabled={saving}
            fullWidth
            label="إلغاء"
            onPress={onClose}
            style={styles.footerButton}
            variant="secondary"
          />
          <Button
            fullWidth
            icon={operationType === "DEBT" ? "add" : "remove"}
            label={submitLabel}
            loading={saving}
            onPress={() => void handleSubmit()}
            style={styles.footerButton}
            variant={operationType === "DEBT" ? "danger" : "success"}
          />
        </>
      }
      onClose={saving ? () => undefined : onClose}
      title={title}
      visible={visible}
    >
      <View style={styles.body}>
        <SegmentedControl
          accessibilityLabel="نوع الحركة"
          onChange={(value) => {
            setOperationType(value);
            setFormError("");
          }}
          options={[
            {
              value: "DEBT",
              label: "كريدي",
              activeColor: colors.debtText,
              activeBackground: colors.debtSoft,
            },
            {
              value: "PAYMENT",
              label: "دفعة",
              activeColor: colors.paymentText,
              activeBackground: colors.paymentSoft,
            },
          ]}
          value={operationType}
        />

        <AmountInput
          autoFocus
          currency={currency}
          error={errors.amount}
          inputRef={amountRef}
          onChangeText={(value) => {
            setAmount(value);
            resetError("amount");
          }}
          onSubmitEditing={() => descriptionRef.current?.focus()}
          value={amount}
        />

        <TextField
          error={errors.description}
          inputRef={descriptionRef}
          label={descriptionLabel}
          maxLength={500}
          onChangeText={(value) => {
            setDescription(value);
            resetError("description");
          }}
          onSubmitEditing={() => noteRef.current?.focus()}
          placeholder={descriptionPlaceholder}
          returnKeyType="next"
          value={description}
        />

        <TextField
          containerStyle={styles.noteField}
          error={errors.note}
          inputRef={noteRef}
          inputStyle={styles.noteInput}
          label="ملاحظة"
          maxLength={2000}
          multiline
          onChangeText={(value) => {
            setNote(value);
            resetError("note");
          }}
          optional
          placeholder="تفاصيل إضافية اختيارية"
          value={note}
        />

        {mode === "edit" && entry ? (
          <View style={styles.dateHint}>
            <Ionicons color={colors.dim} name="calendar-outline" size={14} />
            <AppText tone="dim" variant="caption">
              تاريخ الحركة محفوظ كما هو: {formatDate(entry.operation_date)}
            </AppText>
          </View>
        ) : null}

        {formError ? (
          <View style={styles.formError}>
            <Ionicons color={colors.debtText} name="alert-circle-outline" size={18} />
            <AppText style={styles.formErrorText} tone="debt" variant="body">
              {formError}
            </AppText>
          </View>
        ) : null}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.lg,
  },
  footerButton: {
    flex: 1,
  },
  noteField: {
    marginTop: spacing.xs,
  },
  noteInput: {
    minHeight: 84,
  },
  dateHint: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  formError: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(239, 68, 68, 0.26)",
    borderRadius: radius.md,
    backgroundColor: colors.debtSoft,
  },
  formErrorText: {
    flex: 1,
  },
});
