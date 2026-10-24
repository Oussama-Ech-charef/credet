import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { colors, spacing } from "@/constants/theme";

interface StatementActionsProps {
  hasPhone: boolean;
  sharingText: boolean;
  sharingPdf: boolean;
  onShareText: () => void;
  onSharePdf: () => void;
}

export function StatementActions({
  hasPhone,
  sharingText,
  sharingPdf,
  onShareText,
  onSharePdf,
}: StatementActionsProps) {
  return (
    <Card style={styles.card}>
      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Ionicons color={colors.actionText} name="share-social-outline" size={18} />
          <AppText variant="bodyStrong">كشف الحساب</AppText>
        </View>
        <AppText tone="muted" variant="caption">
          {hasPhone
            ? "أرسل ملخصًا جاهزًا عبر واتساب، أو شارك كشف PDF منسقًا."
            : "لا يوجد رقم هاتف مسجل؛ سيُفتح واتساب لتختار جهة الاتصال بنفسك."}
        </AppText>
      </View>
      <View style={styles.actions}>
        <Button
          fullWidth
          icon="logo-whatsapp"
          label="واتساب"
          loading={sharingText}
          onPress={onShareText}
          style={styles.action}
          variant="success"
        />
        <Button
          fullWidth
          icon="document-text-outline"
          label="مشاركة PDF"
          loading={sharingPdf}
          onPress={onSharePdf}
          style={styles.action}
          variant="secondary"
        />
      </View>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
  },
  copy: {
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  actions: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  action: {
    flex: 1,
  },
});
