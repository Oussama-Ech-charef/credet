import { Ionicons } from "@expo/vector-icons";
import { useCanGoBack, useLocalSearchParams, useRouter } from "expo-router";
import { useMemo, useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

import { BalanceBanner } from "@/components/ledger/balance-banner";
import { EntryFormModal, type EntryFormMode } from "@/components/ledger/entry-form-modal";
import { EntryRow } from "@/components/ledger/entry-row";
import { StatementActions } from "@/components/ledger/statement-actions";
import { AppText } from "@/components/ui/app-text";
import { Avatar } from "@/components/ui/avatar";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { Screen } from "@/components/ui/screen";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton, SkeletonList } from "@/components/ui/skeleton";
import { colors, spacing } from "@/constants/theme";
import { useClientDetail, useClientEntries, useShopSettings } from "@/hooks/use-credet-queries";
import { useDeleteEntryMutation } from "@/hooks/use-entry-mutations";
import { apiErrorMessage } from "@/lib/api";
import { shareDownloadedFile } from "@/lib/files";
import { formatAmount, formatSignedAmount, statementMessage } from "@/lib/format";
import { hapticDelete } from "@/lib/haptics";
import { callPhone, openWhatsAppChat, shareViaWhatsApp } from "@/lib/links";
import type { Entry, EntryMutationResponse } from "@/lib/types";
import { createStatementPdfFile } from "@/services/mobilePdfService";
import { useToast } from "@/providers/toast-provider";

export default function ClientLedgerScreen() {
  const router = useRouter();
  const canGoBack = useCanGoBack();
  const { showToast } = useToast();
  const params = useLocalSearchParams<{ id: string }>();
  const clientId = Number(params.id);
  const validId = Number.isSafeInteger(clientId) && clientId > 0;
  const detailQuery = useClientDetail(validId ? clientId : null);
  const entriesQuery = useClientEntries(validId ? clientId : null);
  const settingsQuery = useShopSettings();
  const deleteMutation = useDeleteEntryMutation();
  const [formMode, setFormMode] = useState<EntryFormMode | null>(null);
  const [editingEntry, setEditingEntry] = useState<Entry | null>(null);
  const [entryToDelete, setEntryToDelete] = useState<Entry | null>(null);
  const [deleteError, setDeleteError] = useState("");
  const [sharingText, setSharingText] = useState(false);
  const [sharingPdf, setSharingPdf] = useState(false);

  const detail = detailQuery.data;
  const client = detail?.client;
  const currency = settingsQuery.data?.currency ?? "DH";
  const shopName = settingsQuery.data?.shop_name ?? "دفتر الكريدي";
  const entries = useMemo(
    () =>
      [...(entriesQuery.data ?? [])].sort((left, right) => {
        if (left.operation_date !== right.operation_date) {
          return left.operation_date < right.operation_date ? 1 : -1;
        }
        return right.id - left.id;
      }),
    [entriesQuery.data],
  );
  const refreshing = detailQuery.isRefetching || entriesQuery.isRefetching;

  const goBack = () => {
    if (canGoBack) {
      router.back();
    } else {
      router.replace("/clients");
    }
  };

  const refresh = () => {
    void detailQuery.refetch();
    void entriesQuery.refetch();
    void settingsQuery.refetch();
  };

  const openForm = (mode: EntryFormMode, entry: Entry | null = null) => {
    setEditingEntry(entry);
    setFormMode(mode);
  };

  const closeForm = () => {
    setFormMode(null);
    setEditingEntry(null);
  };

  const handleSaved = (result: EntryMutationResponse) => {
    showToast(
      formMode === "edit"
        ? "تم تحديث الحركة."
        : `تم تسجيل ${result.operation_type === "DEBT" ? "كريدي" : "دفعة"} بقيمة ${formatAmount(
            result.amount,
            currency,
          )}.`,
      "success",
    );
  };

  const handleCall = async () => {
    if (!client?.phone) {
      showToast("لا يوجد رقم هاتف مسجل لهذا الكليان.", "error");
      return;
    }

    try {
      await callPhone(client.phone);
    } catch (error) {
      showToast(
        error instanceof Error ? error.message : "تعذر فتح تطبيق الهاتف.",
        "error",
      );
    }
  };

  const handleWhatsAppChat = async () => {
    try {
      await openWhatsAppChat(client?.phone);
    } catch {
      showToast("تعذر فتح واتساب على هذا الجهاز.", "error");
    }
  };

  const handleShareText = async () => {
    if (!detail || !client) {
      return;
    }

    setSharingText(true);

    try {
      await shareViaWhatsApp(
        client.phone,
        statementMessage({
          clientName: client.name,
          shopName,
          totalDebt: detail.total_debt,
          totalPaid: detail.total_paid,
          currentBalance: detail.current_balance,
          currency,
        }),
      );
    } catch {
      showToast("تعذر فتح واتساب لمشاركة كشف الحساب.", "error");
    } finally {
      setSharingText(false);
    }
  };

  const handleSharePdf = async () => {
    if (!client || !detail || !settingsQuery.data) {
      return;
    }

    setSharingPdf(true);

    try {
      const download = await createStatementPdfFile(
        detail,
        entries,
        settingsQuery.data,
      );
      await shareDownloadedFile(download, {
        mimeType: "application/pdf",
        dialogTitle: "مشاركة كشف الحساب",
        uti: "com.adobe.pdf",
        fallbackFilename: `credet-${client.name.replace(/\s+/g, "-")}.pdf`,
      });
      showToast(
        Platform.OS === "web" ? "تم تنزيل كشف PDF." : "تم تجهيز كشف PDF للمشاركة.",
        "success",
      );
    } catch (error) {
      showToast(apiErrorMessage(error), "error");
    } finally {
      setSharingPdf(false);
    }
  };

  const handleDelete = async () => {
    if (!entryToDelete) {
      return;
    }

    setDeleteError("");

    try {
      await deleteMutation.mutateAsync({
        clientId,
        entryId: entryToDelete.id,
      });
      await hapticDelete();
      showToast("تم حذف الحركة.", "success");
      setEntryToDelete(null);
    } catch (error) {
      setDeleteError(apiErrorMessage(error));
    }
  };

  const header = (
    <View style={styles.header}>
      <View style={styles.topBar}>
        <IconButton
          accessibilityLabel="رجوع إلى قائمة الكليان"
          icon="arrow-forward"
          onPress={goBack}
        />
        <AppText style={styles.topBarTitle} tone="dim" variant="caption">
          كشف الحساب
        </AppText>
        <View style={styles.headerActions}>
          <IconButton
            accessibilityLabel="تحديث كشف الحساب"
            disabled={refreshing}
            icon="refresh-outline"
            onPress={refresh}
            size={40}
          />
          {client?.phone ? (
            <>
              <IconButton
                accessibilityLabel={`اتصال بـ ${client.name}`}
                backgroundColor={colors.actionSoft}
                borderColor="rgba(99, 102, 241, 0.28)"
                color={colors.actionText}
                icon="call-outline"
                onPress={() => void handleCall()}
                size={40}
              />
              <IconButton
                accessibilityLabel={`محادثة واتساب مع ${client.name}`}
                backgroundColor={colors.paymentSoft}
                borderColor="rgba(16, 185, 129, 0.28)"
                color={colors.paymentText}
                icon="logo-whatsapp"
                onPress={() => void handleWhatsAppChat()}
                size={40}
              />
            </>
          ) : null}
        </View>
      </View>

      {client ? (
        <View style={styles.identity}>
          <Avatar name={client.name} size={56} />
          <View style={styles.identityCopy}>
            <AppText numberOfLines={1} variant="title">
              {client.name}
            </AppText>
            <AppText numberOfLines={1} tone="muted" variant="caption">
              {client.phone || "بدون رقم هاتف"}
            </AppText>
            {client.address ? (
              <View style={styles.addressRow}>
                <Ionicons color={colors.dim} name="location-outline" size={13} />
                <AppText numberOfLines={1} style={styles.address} tone="dim" variant="caption">
                  {client.address}
                </AppText>
              </View>
            ) : null}
          </View>
        </View>
      ) : null}
    </View>
  );

  if (!validId) {
    return (
      <Screen edges={["top", "left", "right", "bottom"]}>
        {header}
        <ErrorState
          message="معرّف الكليان في الرابط غير صالح. ارجع إلى قائمة الكليان واختر حسابًا."
          onRetry={goBack}
          title="رابط غير صالح"
        />
      </Screen>
    );
  }

  const footer = detail ? (
    <View style={styles.footerButtons}>
      <Button
        fullWidth
        icon="add"
        label="تسجيل كريدي"
        onPress={() => openForm("debt")}
        style={styles.footerButton}
        variant="danger"
      />
      <Button
        fullWidth
        icon="remove"
        label="تسجيل دفعة"
        onPress={() => openForm("payment")}
        style={styles.footerButton}
        variant="success"
      />
    </View>
  ) : undefined;

  return (
    <Screen
      edges={["top", "left", "right", "bottom"]}
      footer={footer}
      onRefresh={refresh}
      refreshing={refreshing}
    >
      {header}

      {detailQuery.isPending ? (
        <View style={styles.loading}>
          <Skeleton height={210} borderRadius={18} />
          <Skeleton height={130} borderRadius={18} />
          <SkeletonList count={3} />
        </View>
      ) : detailQuery.isError ? (
        <ErrorState
          message={apiErrorMessage(detailQuery.error)}
          onRetry={refresh}
          title="تعذر تحميل حساب الكليان"
        />
      ) : detail ? (
        <>
          <BalanceBanner
            currency={currency}
            currentBalance={detail.current_balance}
            totalDebt={detail.total_debt}
            totalPaid={detail.total_paid}
          />

          <View style={styles.section}>
            <StatementActions
              hasPhone={Boolean(client?.phone)}
              onSharePdf={() => void handleSharePdf()}
              onShareText={() => void handleShareText()}
              sharingPdf={sharingPdf}
              sharingText={sharingText}
            />
          </View>

          {client?.notes ? (
            <View style={styles.section}>
              <Card>
                <View style={styles.notesTitleRow}>
                  <Ionicons color={colors.warningText} name="document-text-outline" size={17} />
                  <AppText variant="bodyStrong">ملاحظات الكليان</AppText>
                </View>
                <AppText style={styles.notes} tone="muted" variant="body">
                  {client.notes}
                </AppText>
              </Card>
            </View>
          ) : null}

          <View style={styles.section}>
            <SectionHeading
              meta={entriesQuery.isPending ? "جارٍ التحميل" : `${entries.length} حركة`}
              title="سجل الحركات"
            />

            {entriesQuery.isPending ? (
              <SkeletonList count={4} />
            ) : entriesQuery.isError ? (
              <ErrorState
                compact
                message={apiErrorMessage(entriesQuery.error)}
                onRetry={() => void entriesQuery.refetch()}
                title="تعذر تحميل الحركات"
              />
            ) : entries.length === 0 ? (
              <EmptyState
                actionLabel="تسجيل أول كريدي"
                description="لا توجد حركات على هذا الحساب بعد. سجّل أول كريدي أو دفعة من الأزرار بالأسفل."
                icon="receipt-outline"
                onAction={() => openForm("debt")}
                title="السجل فارغ"
              />
            ) : (
              <View style={styles.timeline}>
                {entries.map((entry) => (
                  <EntryRow
                    currency={currency}
                    entry={entry}
                    key={entry.id}
                    onDelete={() => {
                      setDeleteError("");
                      setEntryToDelete(entry);
                    }}
                    onEdit={() => openForm("edit", entry)}
                  />
                ))}
              </View>
            )}
          </View>

          <EntryFormModal
            clientId={clientId}
            clientName={client?.name ?? ""}
            currency={currency}
            entry={editingEntry}
            mode={formMode ?? "debt"}
            onClose={closeForm}
            onSaved={handleSaved}
            visible={formMode !== null}
          />

          <ConfirmDialog
            confirmLabel="حذف الحركة"
            description={
              entryToDelete
                ? `سيتم حذف "${entryToDelete.description}" بقيمة ${formatSignedAmount(
                    entryToDelete.amount,
                    entryToDelete.operation_type,
                    currency,
                  )} نهائيًا. لا يمكن التراجع عن هذا الإجراء.`
                : ""
            }
            error={deleteError}
            loading={deleteMutation.isPending}
            onCancel={() => {
              if (!deleteMutation.isPending) {
                setEntryToDelete(null);
                setDeleteError("");
              }
            }}
            onConfirm={() => void handleDelete()}
            title="حذف الحركة؟"
            visible={Boolean(entryToDelete)}
          />
        </>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.lg,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  topBarTitle: {
    flex: 1,
    textAlign: "center",
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    marginTop: spacing.lg,
  },
  identityCopy: {
    flex: 1,
    gap: 1,
  },
  addressRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  address: {
    flex: 1,
  },
  loading: {
    gap: spacing.md,
  },
  section: {
    marginTop: spacing.xxl,
  },
  notesTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  notes: {
    marginTop: spacing.xs,
  },
  timeline: {
    gap: spacing.md,
  },
  footerButtons: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  footerButton: {
    flex: 1,
  },
});
