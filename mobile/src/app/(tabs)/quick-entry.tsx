import { Ionicons } from "@expo/vector-icons";
import { useFocusEffect, useLocalSearchParams } from "expo-router";
import { useCallback, useMemo, useRef, useState } from "react";
import {
  Pressable,
  StyleSheet,
  View,
  type TextInputInstance,
} from "react-native";

import { ClientPickerModal } from "@/components/clients/client-picker-modal";
import { AmountInput } from "@/components/ui/amount-input";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { TextField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { Skeleton, SkeletonList } from "@/components/ui/skeleton";
import { colors, radius, spacing } from "@/constants/theme";
import { useClients, useShopSettings } from "@/hooks/use-credet-queries";
import { useCreateEntryMutation } from "@/hooks/use-entry-mutations";
import { apiErrorMessage } from "@/lib/api";
import { balanceLabel, formatAmount } from "@/lib/format";
import { hapticSuccess } from "@/lib/haptics";
import type { Client, OperationType } from "@/lib/types";
import { parseAmountInput } from "@/lib/validation";
import { useToast } from "@/providers/toast-provider";

export default function QuickEntryScreen() {
  const params = useLocalSearchParams<{ type?: string; stamp?: string }>();
  const { showToast } = useToast();
  const clientsQuery = useClients();
  const settingsQuery = useShopSettings();
  const createMutation = useCreateEntryMutation();
  const amountRef = useRef<TextInputInstance>(null);
  const descriptionRef = useRef<TextInputInstance>(null);
  const lastRequestRef = useRef<string | undefined>(undefined);
  const [operationType, setOperationType] = useState<OperationType>("DEBT");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [selectedClientId, setSelectedClientId] = useState<number | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [amountError, setAmountError] = useState<string>();
  const [formError, setFormError] = useState("");
  const clients = useMemo(() => clientsQuery.data ?? [], [clientsQuery.data]);
  const currency = settingsQuery.data?.currency ?? "DH";
  const saving = createMutation.isPending;

  const selectedClient = useMemo(
    () => clients.find((client) => client.id === selectedClientId) ?? null,
    [clients, selectedClientId],
  );

  useFocusEffect(
    useCallback(() => {
      if (params.stamp && params.stamp !== lastRequestRef.current) {
        lastRequestRef.current = params.stamp;
        setOperationType(params.type === "payment" ? "PAYMENT" : "DEBT");
      }

      const timer = setTimeout(() => amountRef.current?.focus(), 320);
      return () => clearTimeout(timer);
    }, [params.stamp, params.type]),
  );

  const focusAmount = () => {
    setTimeout(() => amountRef.current?.focus(), 260);
  };

  const handleSelectClient = (client: Client) => {
    setSelectedClientId(client.id);
    setFormError("");
    focusAmount();
  };

  const handleSave = async () => {
    if (!selectedClient) {
      showToast("اختر عميلًا أولًا قبل الحفظ.", "error");
      return;
    }

    const amountResult = parseAmountInput(amount);

    if (!amountResult.value) {
      setAmountError(amountResult.error);
      amountRef.current?.focus();
      return;
    }

    setAmountError(undefined);
    setFormError("");
    const finalDescription =
      description.trim() || (operationType === "DEBT" ? "دين" : "دفعة");

    try {
      await createMutation.mutateAsync({
        clientId: selectedClient.id,
        input: {
          operation_type: operationType,
          amount: amountResult.value,
          description: finalDescription,
          note: null,
        },
      });

      await hapticSuccess();
      showToast(
        `تم تسجيل ${operationType === "DEBT" ? "دين" : "دفعة"} بقيمة ${formatAmount(
          Number(amountResult.value),
          currency,
        )} على ${selectedClient.name}.`,
      );
      setAmount("");
      setDescription("");
      setAmountError(undefined);
      focusAmount();
    } catch (error) {
      setFormError(apiErrorMessage(error));
    }
  };

  const saveLabel = !selectedClient
    ? "اختر عميلًا أولًا"
    : !amount.trim()
      ? "أدخل المبلغ أولًا"
      : operationType === "DEBT"
        ? "تسجيل الدين"
        : "تسجيل الدفعة";

  const footer = (
    <>
      <Button
        disabled={!selectedClient || !amount.trim() || saving}
        fullWidth
        icon={operationType === "DEBT" ? "add" : "remove"}
        label={saveLabel}
        loading={saving}
        onPress={() => void handleSave()}
        variant={operationType === "DEBT" ? "danger" : "success"}
      />
      <AppText style={styles.footerHint} tone="dim" variant="caption">
        يُحفظ على الخادم مباشرة دون خطوة إضافية.
      </AppText>
    </>
  );

  return (
    <Screen footer={clients.length > 0 && !clientsQuery.isError ? footer : undefined}>
      <PageHeader
        subtitle="المبلغ أولًا، ثم اختر العميل. الحفظ فوري."
        title="تسجيل سريع"
      />

      <View style={styles.todayStrip}>
        <Ionicons color={colors.actionText} name="calendar-outline" size={15} />
        <AppText style={styles.todayText} tone="muted" variant="caption">
          تُسجل الحركة بتاريخ اليوم تلقائيًا.
        </AppText>
      </View>

      {clientsQuery.isPending ? (
        <View style={styles.loading}>
          <Skeleton height={48} />
          <Skeleton height={82} />
          <Skeleton height={68} />
          <SkeletonList count={2} />
        </View>
      ) : clientsQuery.isError ? (
        <ErrorState
          message={apiErrorMessage(clientsQuery.error)}
          onRetry={() => void clientsQuery.refetch()}
        />
      ) : clients.length === 0 ? (
        <EmptyState
          description="أضف أول عميل من نسخة الويب، ثم ارجع إلى هنا لتسجيل الحركات بسرعة."
          icon="people-outline"
          title="لا يوجد عميل بعد"
        />
      ) : (
        <View style={styles.form}>
          <SegmentedControl
            accessibilityLabel="نوع الحركة"
            onChange={(value) => {
              setOperationType(value);
              setFormError("");
            }}
            options={[
              {
                value: "DEBT",
                label: "دين",
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
            error={amountError}
            inputRef={amountRef}
            onChangeText={(value) => {
              setAmount(value);
              setAmountError(undefined);
              setFormError("");
            }}
            onSubmitEditing={() => descriptionRef.current?.focus()}
            value={amount}
          />

          <View style={styles.fieldGroup}>
            <View style={styles.fieldLabelRow}>
              <AppText variant="label">العميل</AppText>
              <AppText tone="dim" variant="caption">
                مطلوب
              </AppText>
            </View>
            <Pressable
              accessibilityLabel={
                selectedClient
                  ? `تغيير العميل. المحدد ${selectedClient.name}`
                  : "اختيار عميل"
              }
              accessibilityRole="button"
              onPress={() => setPickerOpen(true)}
              style={({ pressed }) => [
                styles.clientSelector,
                selectedClient && styles.clientSelectorSelected,
                pressed && styles.pressed,
              ]}
            >
              {selectedClient ? (
                <Avatar name={selectedClient.name} size={42} />
              ) : (
                <View style={styles.plusIcon}>
                  <Ionicons color={colors.actionText} name="add" size={21} />
                </View>
              )}
              <View style={styles.clientCopy}>
                <AppText numberOfLines={1} variant="bodyStrong">
                  {selectedClient?.name ?? "اختر العميل"}
                </AppText>
                <AppText numberOfLines={1} tone="dim" variant="caption">
                  {selectedClient
                    ? selectedClient.phone || "بدون رقم هاتف"
                    : "ابحث بالاسم أو رقم الهاتف"}
                </AppText>
              </View>
              {selectedClient ? (
                <View style={styles.clientBalance}>
                  <AppText tone="dim" variant="caption">
                    {balanceLabel(selectedClient.current_balance)}
                  </AppText>
                  <AppText
                    numberOfLines={1}
                    style={[
                      styles.clientBalanceAmount,
                      {
                        color:
                          selectedClient.current_balance > 0
                            ? colors.debtText
                            : colors.paymentText,
                      },
                    ]}
                    variant="caption"
                  >
                    {formatAmount(
                      Math.abs(selectedClient.current_balance),
                      currency,
                    )}
                  </AppText>
                </View>
              ) : (
                <Ionicons color={colors.dim} name="chevron-back" size={16} />
              )}
            </Pressable>
          </View>

          <TextField
            inputRef={descriptionRef}
            label="الوصف"
            maxLength={500}
            onChangeText={(value) => {
              setDescription(value);
              setFormError("");
            }}
            optional
            placeholder={operationType === "DEBT" ? "مثال: مواد غذائية" : "مثال: سداد جزئي"}
            returnKeyType="done"
            value={description}
          />

          {formError ? (
            <View style={styles.formError}>
              <Ionicons color={colors.debtText} name="alert-circle-outline" size={18} />
              <AppText style={styles.formErrorText} tone="debt" variant="body">
                {formError}
              </AppText>
            </View>
          ) : null}
        </View>
      )}

      <ClientPickerModal
        clients={clients}
        currency={currency}
        onClose={() => setPickerOpen(false)}
        onSelect={handleSelectClient}
        selectedId={selectedClientId}
        visible={pickerOpen}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  todayStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface3,
    marginBottom: spacing.lg,
  },
  todayText: {
    flex: 1,
  },
  loading: {
    gap: spacing.md,
  },
  form: {
    gap: spacing.lg,
  },
  fieldGroup: {
    gap: spacing.xs,
  },
  fieldLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  clientSelector: {
    minHeight: 68,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface3,
  },
  clientSelectorSelected: {
    borderColor: colors.action,
    backgroundColor: colors.actionSoft,
  },
  pressed: {
    opacity: 0.82,
  },
  plusIcon: {
    width: 42,
    height: 42,
    borderRadius: radius.pill,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.actionSoft,
    borderWidth: 1,
    borderColor: "rgba(99, 102, 241, 0.28)",
  },
  clientCopy: {
    flex: 1,
    gap: 1,
  },
  clientBalance: {
    alignItems: "flex-end",
    gap: 1,
    maxWidth: 106,
  },
  clientBalanceAmount: {
    fontVariant: ["tabular-nums"],
    textAlign: "left",
    writingDirection: "ltr",
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
  footerHint: {
    marginTop: spacing.xs,
    textAlign: "center",
  },
});
