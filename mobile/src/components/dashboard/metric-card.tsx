import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, radius, spacing } from "@/constants/theme";

type IconName = keyof typeof Ionicons.glyphMap;

interface MetricCardProps {
  label: string;
  value: string;
  hint?: string;
  icon: IconName;
  tone?: "action" | "debt" | "payment" | "warning";
  style?: StyleProp<ViewStyle>;
}

const tones = {
  action: { background: colors.actionSoft, color: colors.actionText },
  debt: { background: colors.debtSoft, color: colors.debtText },
  payment: { background: colors.paymentSoft, color: colors.paymentText },
  warning: { background: colors.warningSoft, color: colors.warningText },
} as const;

export function MetricCard({
  label,
  value,
  hint,
  icon,
  tone = "action",
  style,
}: MetricCardProps) {
  const palette = tones[tone];

  return (
    <View style={[styles.card, style]}>
      <View style={styles.topRow}>
        <View style={[styles.icon, { backgroundColor: palette.background }]}>
          <Ionicons color={palette.color} name={icon} size={17} />
        </View>
        <AppText numberOfLines={1} style={styles.label} tone="muted" variant="label">
          {label}
        </AppText>
      </View>
      <AppText
        adjustsFontSizeToFit
        numberOfLines={1}
        style={styles.value}
        variant="amount"
      >
        {value}
      </AppText>
      {hint ? (
        <AppText numberOfLines={1} tone="dim" variant="caption">
          {hint}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    minHeight: 118,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  icon: {
    width: 30,
    height: 30,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    flex: 1,
  },
  value: {
    marginTop: spacing.xs,
  },
});
