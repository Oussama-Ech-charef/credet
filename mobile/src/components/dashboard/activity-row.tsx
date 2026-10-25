import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, radius, spacing } from "@/constants/theme";
import {
  formatSignedAmount,
  relativeDayLabel,
} from "@/lib/format";
import type { ActivityItem } from "@/lib/types";

interface ActivityRowProps {
  activity: ActivityItem;
  currency: string;
  onPress: () => void;
  showDivider?: boolean;
}

export function ActivityRow({
  activity,
  currency,
  onPress,
  showDivider = true,
}: ActivityRowProps) {
  const isDebt = activity.operation_type === "DEBT";
  const color = isDebt ? colors.debtText : colors.paymentText;
  const background = isDebt ? colors.debtSoft : colors.paymentSoft;

  return (
    <Pressable
      accessibilityLabel={`${activity.client_name}، ${
        isDebt ? "دين" : "دفعة"
      }، ${formatSignedAmount(activity.amount, activity.operation_type, currency)}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={[styles.icon, { backgroundColor: background }]}>
        <Ionicons
          color={color}
          name={isDebt ? "arrow-up-outline" : "arrow-down-outline"}
          size={18}
        />
      </View>
      <View style={styles.copy}>
        <AppText numberOfLines={1} variant="bodyStrong">
          {activity.client_name}
        </AppText>
        <AppText numberOfLines={1} tone="muted" variant="caption">
          {activity.description}
        </AppText>
        <AppText tone="dim" variant="caption">
          {relativeDayLabel(activity.operation_date)}
        </AppText>
      </View>
      <View style={styles.trailing}>
        <AppText
          numberOfLines={1}
          style={[styles.amount, { color }]}
          variant="bodyStrong"
        >
          {formatSignedAmount(activity.amount, activity.operation_type, currency)}
        </AppText>
        <Ionicons color={colors.dim} name="chevron-back" size={14} />
      </View>
      {showDivider ? <View style={styles.divider} /> : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.surface,
  },
  pressed: {
    backgroundColor: colors.surface2,
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  trailing: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 0,
  },
  amount: {
    fontVariant: ["tabular-nums"],
  },
  divider: {
    position: "absolute",
    bottom: 0,
    right: 66,
    left: spacing.lg,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
