import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { colors, radius, spacing } from "@/constants/theme";
import { formatAmount, roundAmount } from "@/lib/format";

interface ChangeCalculatorProps {
  currentDebt: number;
  enteredAmount: number;
  currency: string;
  onReturnChange: () => void;
  onKeepAdvance: () => void;
  compact?: boolean;
}

export function ChangeCalculator({
  currentDebt,
  enteredAmount,
  currency,
  onReturnChange,
  onKeepAdvance,
  compact = false,
}: ChangeCalculatorProps) {
  const changeDue = roundAmount(enteredAmount - currentDebt);

  if (currentDebt <= 0 || changeDue <= 0) {
    return null;
  }

  return (
    <View accessibilityLiveRegion="polite" style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons color={colors.warningText} name="wallet-outline" size={17} />
        </View>
        <View style={styles.copy}>
          <AppText variant="bodyStrong">حاسبة الصرف</AppText>
          <AppText tone="dim" variant="caption">
            المبلغ المدخل أكبر من الدين المستحق.
          </AppText>
        </View>
        <Badge tone="warning">دفعة زائدة</Badge>
      </View>

      <View style={styles.rows}>
        <View style={styles.row}>
          <AppText tone="dim" variant="caption">
            الدين المستحق
          </AppText>
          <AppText style={styles.rowAmount} variant="bodyStrong">
            {formatAmount(currentDebt, currency)}
          </AppText>
        </View>
        <View style={[styles.row, styles.changeRow]}>
          <AppText tone="dim" variant="caption">
            الصرف المتبقي للعميل
          </AppText>
          <AppText style={styles.rowAmount} tone="payment" variant="bodyStrong">
            {formatAmount(changeDue, currency)}
          </AppText>
        </View>
      </View>

      <View style={styles.actions}>
        <Button
          fullWidth
          icon="return-down-back-outline"
          label="إرجاع الصرف للعميل"
          onPress={onReturnChange}
          size="sm"
          variant="secondary"
        />
        <Button
          fullWidth
          icon="bookmark-outline"
          label="الاحتفاظ بالباقي كعربون"
          onPress={onKeepAdvance}
          size="sm"
          variant="success"
        />
      </View>

      {!compact ? (
        <AppText tone="dim" variant="caption">
          «إرجاع الصرف» يعدّل الدفعة إلى قيمة الدين فقط، أما «الاحتفاظ كعربون»
          فيبقي المبلغ كاملًا ويضيف ملاحظة بالرصيد المتبقي.
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.3)",
    borderRadius: radius.md,
    backgroundColor: colors.surface3,
  },
  head: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  icon: {
    width: 34,
    height: 34,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.28)",
    borderRadius: radius.sm,
    backgroundColor: colors.warningSoft,
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  rows: {
    gap: spacing.sm,
  },
  row: {
    gap: 2,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    backgroundColor: "rgba(15, 22, 36, 0.55)",
  },
  changeRow: {
    borderColor: "rgba(16, 185, 129, 0.3)",
    backgroundColor: colors.paymentSoft,
  },
  rowAmount: {
    fontVariant: ["tabular-nums"],
  },
  actions: {
    gap: spacing.sm,
  },
});
