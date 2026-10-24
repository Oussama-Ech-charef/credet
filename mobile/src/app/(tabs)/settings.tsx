import { Ionicons } from "@expo/vector-icons";
import Constants from "expo-constants";
import { useState } from "react";
import { Platform, StyleSheet, View } from "react-native";

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
import { apiErrorMessage } from "@/lib/api";
import { shareDownloadedFile } from "@/lib/files";
import { formatDate } from "@/lib/format";
import { useServerConfig } from "@/providers/server-config-provider";
import { useToast } from "@/providers/toast-provider";

type Notice = { tone: "success" | "error"; message: string };
type BackupKind = "database" | "json";

export default function SettingsScreen() {
  const { showToast } = useToast();
  const {
    baseUrl,
    defaultBaseUrl,
    api,
    saveBaseUrl,
    resetBaseUrl,
    testConnection,
  } = useServerConfig();
  const settingsQuery = useShopSettings();
  const [url, setUrl] = useState(baseUrl);
  const [urlError, setUrlError] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [savingUrl, setSavingUrl] = useState(false);
  const [testing, setTesting] = useState(false);
  const [backupBusy, setBackupBusy] = useState<BackupKind | null>(null);

  const settings = settingsQuery.data;
  const currency = settings?.currency ?? "DH";
  const connectionTone = settingsQuery.isPending
    ? "warning"
    : settingsQuery.isError
      ? "debt"
      : "payment";
  const connectionLabel = settingsQuery.isPending
    ? "جارٍ الفحص"
    : settingsQuery.isError
      ? "غير متصل"
      : "متصل";

  const clearFeedback = () => {
    setUrlError("");
    setNotice(null);
  };

  const handleTest = async () => {
    setTesting(true);
    setUrlError("");
    setNotice(null);

    try {
      const result = await testConnection(url);
      setNotice({
        tone: "success",
        message: `تم الاتصال بنجاح بـ ${result.shop_name}.`,
      });
      showToast("الاتصال بالخادم يعمل.", "success");
    } catch (error) {
      const message = apiErrorMessage(error);
      setNotice({ tone: "error", message });
      showToast(message, "error");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async () => {
    setSavingUrl(true);
    setUrlError("");
    setNotice(null);

    try {
      const saved = await saveBaseUrl(url);
      setUrl(saved);
      setNotice({
        tone: "success",
        message: "تم حفظ عنوان الخادم. ستُستخدم هذه النسخة في كل الطلبات.",
      });
      showToast("تم تحديث عنوان الخادم.", "success");
    } catch (error) {
      const message = error instanceof Error ? error.message : "تعذر حفظ عنوان الخادم.";
      setUrlError(message);
    } finally {
      setSavingUrl(false);
    }
  };

  const handleReset = async () => {
    setSavingUrl(true);
    setUrlError("");
    setNotice(null);

    try {
      const restored = await resetBaseUrl();
      setUrl(restored);
      showToast("تمت استعادة العنوان الافتراضي.", "success");
    } catch {
      setUrlError("تعذرت استعادة العنوان الافتراضي.");
    } finally {
      setSavingUrl(false);
    }
  };

  const handleBackup = async (kind: BackupKind) => {
    setBackupBusy(kind);

    try {
      if (kind === "database") {
        const download = await api.downloadDatabase();
        await shareDownloadedFile(download, {
          mimeType: "application/octet-stream",
          dialogTitle: "مشاركة قاعدة البيانات",
          fallbackFilename: "credet.db",
        });
      } else {
        const download = await api.exportJson();
        await shareDownloadedFile(download, {
          mimeType: "application/json",
          dialogTitle: "مشاركة نسخة JSON",
          fallbackFilename: "credet-backup.json",
          uti: "public.json",
        });
      }

      showToast(
        Platform.OS === "web"
          ? "تم تنزيل النسخة الاحتياطية."
          : "تم تجهيز الملف للمشاركة.",
        "success",
      );
    } catch (error) {
      showToast(apiErrorMessage(error), "error");
    } finally {
      setBackupBusy(null);
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
        subtitle="بيانات المحل، اتصال الخادم، والنسخ الاحتياطي."
        title="الإعدادات"
      />

      <SectionHeading meta="للقراءة فقط" title="بيانات المحل" />
      {settingsQuery.isPending ? (
        <SkeletonCard rows={4} />
      ) : settingsQuery.isError ? (
        <ErrorState
          compact
          message={apiErrorMessage(settingsQuery.error)}
          onRetry={() => void settingsQuery.refetch()}
          title="تعذر تحميل بيانات المحل"
        />
      ) : (
        <Card>
          <View style={styles.shopHeader}>
            <BrandMark size={46} />
            <View style={styles.shopCopy}>
              <AppText variant="heading">{settings?.shop_name || "دفتر الكريدي"}</AppText>
              <AppText tone="dim" variant="caption">
                ملف المحل المرتبط بهذا الخادم
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

      <View style={styles.section}>
        <SectionHeading
          action={<Badge dot tone={connectionTone}>{connectionLabel}</Badge>}
          meta="شبكة Wi-Fi المحلية أو خادم HTTPS"
          title="اتصال الخادم"
        />
        <Card>
          <TextField
            autoCapitalize="none"
            autoCorrect={false}
            error={urlError}
            hint={`الافتراضي: ${defaultBaseUrl}`}
            inputStyle={styles.urlInput}
            keyboardType="url"
            label="عنوان الخادم (API Base URL)"
            onChangeText={(value) => {
              setUrl(value);
              clearFeedback();
            }}
            placeholder="http://192.168.1.20:4000/api"
            returnKeyType="done"
            value={url}
          />

          <View style={styles.urlActions}>
            <Button
              disabled={savingUrl}
              fullWidth
              icon="pulse-outline"
              label="اختبار"
              loading={testing}
              onPress={() => void handleTest()}
              style={styles.urlAction}
              variant="secondary"
            />
            <Button
              disabled={testing}
              fullWidth
              icon="save-outline"
              label="حفظ"
              loading={savingUrl}
              onPress={() => void handleSave()}
              style={styles.urlAction}
              variant="primary"
            />
          </View>

          <Button
            disabled={savingUrl || testing}
            icon="refresh-outline"
            label="استعادة العنوان الافتراضي"
            onPress={() => void handleReset()}
            size="sm"
            style={styles.resetButton}
            variant="ghost"
          />

          {notice ? (
            <View
              style={[
                styles.notice,
                notice.tone === "success" ? styles.noticeSuccess : styles.noticeError,
              ]}
            >
              <Ionicons
                color={notice.tone === "success" ? colors.paymentText : colors.debtText}
                name={notice.tone === "success" ? "checkmark-circle-outline" : "alert-circle-outline"}
                size={18}
              />
              <AppText
                style={styles.noticeText}
                tone={notice.tone === "success" ? "payment" : "debt"}
                variant="caption"
              >
                {notice.message}
              </AppText>
            </View>
          ) : null}

          <View style={styles.helpBox}>
            <Ionicons color={colors.warningText} name="wifi-outline" size={17} />
            <AppText style={styles.helpText} tone="muted" variant="caption">
              على الهاتف استخدم عنوان IP للحاسوب على نفس الشبكة، مثل
              {" "}
              <AppText style={styles.inlineCode} tone="action" variant="caption">
                192.168.1.20
              </AppText>
              . لا تستخدم localhost من جهاز آخر.
            </AppText>
          </View>
        </Card>
      </View>

      <View style={styles.section}>
        <SectionHeading meta="ملفات قابلة للتنزيل أو المشاركة" title="النسخ الاحتياطي" />
        <Card>
          <AppText tone="muted" variant="body">
            نزّل نسخة من قاعدة البيانات أو صدّر كل السجلات بصيغة JSON. تُحفظ
            الملفات عبر مشاركة النظام على الهاتف، وتُنزّل مباشرة على الويب.
          </AppText>
          <View style={styles.backupActions}>
            <Button
              disabled={backupBusy !== null}
              fullWidth
              icon="server-outline"
              label="قاعدة البيانات"
              loading={backupBusy === "database"}
              onPress={() => void handleBackup("database")}
              style={styles.backupAction}
              variant="secondary"
            />
            <Button
              disabled={backupBusy !== null}
              fullWidth
              icon="code-slash-outline"
              label="JSON"
              loading={backupBusy === "json"}
              onPress={() => void handleBackup("json")}
              style={styles.backupAction}
              variant="secondary"
            />
          </View>
          <AppText style={styles.backupNote} tone="dim" variant="caption">
            الاستعادة غير متاحة من التطبيق حاليًا؛ استخدم نسخة الويب لإدارة
            النسخ الاحتياطي.
          </AppText>
        </Card>
      </View>

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
  urlInput: {
    textAlign: "left",
    writingDirection: "ltr",
  },
  urlActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  urlAction: {
    flex: 1,
  },
  resetButton: {
    marginTop: spacing.xs,
    alignSelf: "flex-start",
  },
  notice: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  noticeSuccess: {
    backgroundColor: colors.paymentSoft,
    borderColor: "rgba(16, 185, 129, 0.26)",
  },
  noticeError: {
    backgroundColor: colors.debtSoft,
    borderColor: "rgba(239, 68, 68, 0.26)",
  },
  noticeText: {
    flex: 1,
  },
  helpBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    marginTop: spacing.md,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.24)",
  },
  helpText: {
    flex: 1,
  },
  inlineCode: {
    fontFamily: "Cairo_600SemiBold",
  },
  backupActions: {
    flexDirection: "row",
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  backupAction: {
    flex: 1,
  },
  backupNote: {
    marginTop: spacing.sm,
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
