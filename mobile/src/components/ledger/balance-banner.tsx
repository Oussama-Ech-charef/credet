import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { colors, radius, spacing } from "@/constants/theme";
import { formatAmount, paidRatio } from "@/lib/format";

interface BalanceBannerProps {
  totalDebt: number;
  totalPaid: number;
  currentBalance: number;
  currency: string;
}

export function BalanceBanner({
  totalDebt,
  totalPaid,
  currentBalance,
  currency,
}: BalanceBannerProps) {
  const isDebt = currentBalance > 0;
  const isCredit = currentBalance < 0;
  const kindColor = isDebt ? colors.debtText : colors.paymentText;
  const kindLabel = isDebt
    ? "عليه دين"
    : isCredit
      ? "رصيد لصالحه (باقي)"
      : "الحساب مسدد";
  const kindTone = isDebt ? "debt" : "payment";
  const ratio = paidRatio(totalDebt, totalPaid);
  const displayAmount = Math.abs(currentBalance);
  const hint = isDebt
    ? "هذا هو المبلغ المتبقي بعد كل الدفعات."
    : isCredit
      ? "دفع أكثر مما أخذ، والرصيد لصالحه."
      : "لا يوجد مبلغ متبقٍ على هذا الحساب.";

  return (
    <View style={styles.card}>
      <View style={[styles.accent, { backgroundColor: kindColor }]} />
      <View style={styles.topRow}>
        <View style={styles.labelRow}>
          <Ionicons color={colors.muted} name="wallet-outline" size={16} />
          <AppText tone="muted" variant="label">
            {isCredit ? "الرصيد لصالح العميل" : "الرصيد الصافي المستحق"}
          </AppText>
        </View>
        <Badge dot tone={kindTone}>
          {kindLabel}
        </Badge>
      </View>

      <AppText
        adjustsFontSizeToFit
        numberOfLines={1}
        style={[styles.amount, { color: kindColor }]}
        variant="amountLarge"
      >
        {formatAmount(displayAmount, currency)}
      </AppText>
      <AppText style={styles.hint} tone="muted" variant="caption">
        {hint}
      </AppText>

      <View style={styles.metrics}>
        <View style={styles.metric}>
          <AppText tone="dim" variant="caption">
            مجموع ما أخذ
          </AppText>
          <AppText
            adjustsFontSizeToFit
            numberOfLines={1}
            style={styles.metricAmount}
            tone="debt"
            variant="bodyStrong"
          >
            {formatAmount(totalDebt, currency)}
          </AppText>
        </View>
        <View style={styles.metricDivider} />
        <View style={styles.metric}>
          <AppText tone="dim" variant="caption">
            مجموع ما دفع
          </AppText>
          <AppText
            adjustsFontSizeToFit
            numberOfLines={1}
            style={styles.metricAmount}
            tone="payment"
            variant="bodyStrong"
          >
            {formatAmount(totalPaid, currency)}
          </AppText>
        </View>
      </View>

      <View style={styles.progressHeader}>
        <AppText tone="dim" variant="caption">
          نسبة السداد
        </AppText>
        <AppText tone="muted" variant="caption">
          {ratio}%
        </AppText>
      </View>
      <View style={styles.track}>
        <View style={[styles.fill, { width: `${ratio}%` }]} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  accent: {
    position: "absolute",
    top: 0,
    right: 0,
    width: 64,
    height: 3,
    borderBottomLeftRadius: radius.pill,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  labelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
  },
  amount: {
    marginTop: spacing.md,
    textAlign: "right",
  },
  hint: {
    marginTop: spacing.xs,
  },
  metrics: {
    flexDirection: "row",
    alignItems: "stretch",
    gap: spacing.md,
    marginTop: spacing.lg,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  metric: {
    flex: 1,
    gap: 2,
  },
  metricDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  metricAmount: {
    fontVariant: ["tabular-nums"],
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: spacing.lg,
    marginBottom: spacing.xs,
  },
  track: {
    height: 6,
    borderRadius: radius.pill,
    backgroundColor: colors.surface3,
    overflow: "hidden",
  },
  fill: {
    height: "100%",
    borderRadius: radius.pill,
    backgroundColor: colors.payment,
  },
});
