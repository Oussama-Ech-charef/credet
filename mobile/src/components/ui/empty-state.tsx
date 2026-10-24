import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { colors, radius, spacing } from "@/constants/theme";

type IconName = keyof typeof Ionicons.glyphMap;

interface EmptyStateProps {
  icon?: IconName;
  title: string;
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  tone?: "action" | "debt" | "payment" | "warning";
}

const toneColors = {
  action: { background: colors.actionSoft, text: colors.actionText },
  debt: { background: colors.debtSoft, text: colors.debtText },
  payment: { background: colors.paymentSoft, text: colors.paymentText },
  warning: { background: colors.warningSoft, text: colors.warningText },
} as const;

export function EmptyState({
  icon = "book-outline",
  title,
  description,
  actionLabel,
  onAction,
  tone = "action",
}: EmptyStateProps) {
  const palette = toneColors[tone];

  return (
    <View style={styles.container}>
      <View style={[styles.icon, { backgroundColor: palette.background }]}>
        <Ionicons color={palette.text} name={icon} size={24} />
      </View>
      <AppText style={styles.title} variant="heading">
        {title}
      </AppText>
      <AppText style={styles.description} tone="muted" variant="body">
        {description}
      </AppText>
      {actionLabel && onAction ? (
        <Button
          icon="arrow-back-outline"
          label={actionLabel}
          onPress={onAction}
          size="sm"
          style={styles.action}
          variant="secondary"
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface3,
  },
  icon: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.md,
  },
  title: {
    textAlign: "center",
  },
  description: {
    textAlign: "center",
    marginTop: spacing.xs,
    maxWidth: 340,
  },
  action: {
    marginTop: spacing.lg,
  },
});
