import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useState } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { BrandMark } from "@/components/ui/brand-mark";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { ErrorState } from "@/components/ui/error-state";
import { TextField } from "@/components/ui/field";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SectionHeading } from "@/components/ui/section-heading";
import { SkeletonCard } from "@/components/ui/skeleton";
import { colors, radius, spacing } from "@/constants/theme";
import { useShopSettings } from "@/hooks/use-credet-queries";
import { useUpdateSettingsMutation } from "@/hooks/use-entry-mutations";
import { apiErrorMessage } from "@/lib/api";
import { formatDate } from "@/lib/format";
import { useToast } from "@/providers/toast-provider";

export default function SettingsScreen() {
  const { showToast } = useToast();
  const settingsQuery = useShopSettings();
  const updateSettingsMutation = useUpdateSettingsMutation();

  const settings = settingsQuery.data;
  const currency = settings?.currency ?? "DH";

  // Local form state — initialised from query data when it arrives
  const [shopName, setShopName] = useState("");
  const [shopPhone, setShopPhone] = useState("");
  const [shopCurrency, setShopCurrency] = useState("");
  const [editing, setEditing] = useState(false);

  // When settings load, fill the form once (only if not already editing)
  if (settings && !editing && !shopName && !shopPhone && !shopCurrency) {
    setShopName(settings.shop_name);
    setShopPhone(settings.shop_phone ?? "");
    setShopCurrency(settings.currency);
  }

  const handleEdit = () => {
    if (settings) {
      setShopName(settings.shop_name);
      setShopPhone(settings.shop_phone ?? "");
      setShopCurrency(settings.currency);
    }
    setEditing(true);
  };

  const handleCancel = () => {
    setEditing(false);
  };

  const handleSave = async () => {
    const name = shopName.trim();
    const phone = shopPhone.trim();
    const curr = shopCurrency.trim();

    if (!name) {
      showToast("اسم المحل مطلوب.", "error");
      return;
    }
    if (!curr) {
      showToast("رمز العملة مطلوب.", "error");
      return;
    }

    try {
      await updateSettingsMutation.mutateAsync({
        shop_name: name,
        shop_phone: phone || undefined,
        currency: curr,
      });
      setEditing(false);
      showToast("تم حفظ بيانات المحل.", "success");
    } catch (error) {
      showToast(apiErrorMessage(error), "error");
    }
  };

  return (
    <Screen>
      <PageHeader
        action={
          <IconButton
            accessibilityLabel="تحديث بيانات المحل"
            disabled={settingsQuery.isFetching}
            icon="refresh-outline"
            onPress={() => void settingsQuery.refetch()}
          />
        }
        subtitle="بيانات المحل وإعدادات التطبيق."
        title="الإعدادات"
      />

      {/* ── بيانات المحل ── */}
      <SectionHeading
        action={
          !editing ? (
            <Button
              icon="pencil-outline"
              label="تعديل"
              onPress={handleEdit}
              size="sm"
              variant="ghost"
            />
          ) : null
        }
        title="بيانات المحل"
      />
      {settingsQuery.isPending ? (
        <SkeletonCard rows={4} />
      ) : settingsQuery.isError ? (
        <ErrorState
          compact
          message={apiErrorMessage(settingsQuery.error)}
          onRetry={() => void settingsQuery.refetch()}
          title="تعذر تحميل بيانات المحل"
        />
      ) : editing ? (
        <Card>
          <TextField
            label="اسم المحل"
            onChangeText={setShopName}
            placeholder="مثال: محل البركة"
            returnKeyType="next"
            value={shopName}
          />
          <View style={styles.fieldGap}>
            <TextField
              keyboardType="phone-pad"
              label="هاتف المحل"
              onChangeText={setShopPhone}
              placeholder="0600000000"
              returnKeyType="next"
              value={shopPhone}
            />
          </View>
          <View style={styles.fieldGap}>
            <TextField
              autoCapitalize="characters"
              label="رمز العملة"
              maxLength={5}
              onChangeText={setShopCurrency}
              placeholder="DH"
              returnKeyType="done"
              value={shopCurrency}
            />
          </View>
          <View style={styles.editActions}>
            <Button
              fullWidth
              label="إلغاء"
              onPress={handleCancel}
              style={styles.editAction}
              variant="secondary"
            />
            <Button
              disabled={updateSettingsMutation.isPending}
              fullWidth
              icon="save-outline"
              label="حفظ"
              loading={updateSettingsMutation.isPending}
              onPress={() => void handleSave()}
              style={styles.editAction}
              variant="primary"
            />
          </View>
        </Card>
      ) : (
        <Card>
          <View style={styles.shopHeader}>
            <BrandMark size={46} />
            <View style={styles.shopCopy}>
              <AppText variant="heading">{settings?.shop_name || "دفتر الكريدي"}</AppText>
              <AppText tone="dim" variant="caption">
                مرتبط بـ Firebase Cloud
              </AppText>
            </View>
            <Badge tone="action" dot>
              {currency}
            </Badge>
          </View>
          <View style={styles.infoRows}>
            <InfoRow
              icon="call-outline"
              label="هاتف المحل"
              value={settings?.shop_phone || "غير مسجل"}
            />
            <InfoRow icon="cash-outline" label="عملة الحساب" value={currency} />
            <InfoRow
              icon="time-outline"
              label="آخر تحديث"
              value={settings?.updated_at ? formatDate(settings.updated_at) : "غير متوفر"}
            />
          </View>
        </Card>
      )}

      {/* ── حالة Firebase ── */}
      <View style={styles.section}>
        <SectionHeading meta="قاعدة البيانات السحابية" title="اتصال Firebase" />
        <Card>
          <View style={styles.firebaseRow}>
            <View style={styles.firebaseDot} />
            <View style={styles.firebaseCopy}>
              <AppText variant="bodyStrong">Cloud Firestore</AppText>
              <AppText tone="muted" variant="caption">
                يعمل التطبيق مباشرة على Firebase بدون خادم محلي. البيانات محفوظة
                في السحاب وتُزامن تلقائياً مع الهاتف حتى في غياب الإنترنت.
              </AppText>
            </View>
            <Badge dot tone="payment">
              متصل
            </Badge>
          </View>
          <View style={styles.firebaseHint}>
            <Ionicons color={colors.paymentText} name="cloud-outline" size={17} />
            <AppText style={styles.hintText} tone="muted" variant="caption">
              Project ID: <AppText tone="action" variant="caption">credet-5da9c</AppText>
              {"\n"}البيانات محمية ومشفرة — تعمل حتى دون اتصال بالإنترنت.
            </AppText>
          </View>
        </Card>
      </View>

      {/* ── عن التطبيق ── */}
      <View style={styles.section}>
        <SectionHeading title="عن التطبيق" />
        <Card>
          <View style={styles.aboutRow}>
            <BrandMark size={38} />
            <View style={styles.aboutCopy}>
              <AppText variant="bodyStrong">Credet · دفتر الكريدي</AppText>
              <AppText tone="dim" variant="caption">
                الإصدار {Constants.expoConfig?.version ?? "1.0.0"} · واجهة عربية RTL
              </AppText>
            </View>
          </View>
        </Card>
      </View>
    </Screen>
  );
}

function InfoRow({
  icon,
  label,
  value,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.infoRow}>
      <Ionicons color={colors.dim} name={icon} size={16} />
      <AppText style={styles.infoLabel} tone="muted" variant="caption">
        {label}
      </AppText>
      <AppText numberOfLines={1} style={styles.infoValue} variant="caption">
        {value}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  shopHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  shopCopy: {
    flex: 1,
    gap: 1,
  },
  infoRows: {
    gap: spacing.sm,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 26,
  },
  infoLabel: {
    width: 92,
  },
  infoValue: {
    flex: 1,
    textAlign: "left",
  },
  section: {
    marginTop: spacing.xxl,
  },
  fieldGap: {
    marginTop: spacing.md,
  },
  editActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.lg,
  },
  editAction: {
    flex: 1,
  },
  firebaseRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  firebaseDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.paymentText,
    marginTop: 5,
  },
  firebaseCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  firebaseHint: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.paymentSoft,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.26)",
  },
  hintText: {
    flex: 1,
  },
  aboutRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  aboutCopy: {
    flex: 1,
    gap: 1,
  },
});
