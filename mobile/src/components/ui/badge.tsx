import type { ReactNode } from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, radius, spacing } from "@/constants/theme";

export type BadgeTone = "debt" | "payment" | "action" | "warning" | "neutral";

interface BadgeProps {
  children: ReactNode;
  tone?: BadgeTone;
  dot?: boolean;
  style?: StyleProp<ViewStyle>;
}

const tonePalette: Record<
  BadgeTone,
  { background: string; border: string; text: string }
> = {
  debt: {
    background: colors.debtSoft,
    border: "rgba(239, 68, 68, 0.26)",
    text: colors.debtText,
  },
  payment: {
    background: colors.paymentSoft,
    border: "rgba(16, 185, 129, 0.26)",
    text: colors.paymentText,
  },
  action: {
    background: colors.actionSoft,
    border: "rgba(99, 102, 241, 0.3)",
    text: colors.actionText,
  },
  warning: {
    background: colors.warningSoft,
    border: "rgba(245, 158, 11, 0.3)",
    text: colors.warningText,
  },
  neutral: {
    background: colors.surface2,
    border: colors.border,
    text: colors.muted,
  },
};

export function Badge({ children, tone = "neutral", dot = false, style }: BadgeProps) {
  const palette = tonePalette[tone];

  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
        },
        style,
      ]}
    >
      {dot ? <View style={[styles.dot, { backgroundColor: palette.text }]} /> : null}
      <AppText style={{ color: palette.text }} variant="caption">
        {children}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm + 2,
    paddingVertical: 3,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
