import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, radius, spacing } from "@/constants/theme";

interface QuickActionsProps {
  onDebt: () => void;
  onPayment: () => void;
}

interface ActionTileProps {
  title: string;
  hint: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  background: string;
  onPress: () => void;
}

function ActionTile({
  title,
  hint,
  icon,
  color,
  background,
  onPress,
}: ActionTileProps) {
  return (
    <Pressable
      accessibilityLabel={`${title}. ${hint}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.tile, pressed && styles.pressed]}
    >
      <View style={styles.topRow}>
        <View style={[styles.icon, { backgroundColor: background }]}>
          <Ionicons color={color} name={icon} size={22} />
        </View>
        <Ionicons color={colors.dim} name="chevron-back" size={16} />
      </View>
      <View style={styles.copy}>
        <AppText variant="bodyStrong">{title}</AppText>
        <AppText tone="dim" variant="caption">
          {hint}
        </AppText>
      </View>
    </Pressable>
  );
}

export function QuickActions({ onDebt, onPayment }: QuickActionsProps) {
  return (
    <View style={styles.row}>
      <ActionTile
        background={colors.debtSoft}
        color={colors.debtText}
        hint="أضف دينًا إلى الحساب"
        icon="arrow-up-outline"
        onPress={onDebt}
        title="تسجيل دين"
      />
      <ActionTile
        background={colors.paymentSoft}
        color={colors.paymentText}
        hint="سجّل ما دفعه العميل"
        icon="arrow-down-outline"
        onPress={onPayment}
        title="تسجيل دفعة"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: spacing.md,
  },
  tile: {
    flex: 1,
    minHeight: 124,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.995 }],
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  icon: {
    width: 38,
    height: 38,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  copy: {
    gap: 1,
  },
});
