import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { BrandMark } from "@/components/ui/brand-mark";
import { colors, spacing } from "@/constants/theme";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  eyebrow?: string;
}

export function PageHeader({
  title,
  subtitle,
  action,
  eyebrow = "دفتر الديون",
}: PageHeaderProps) {
  return (
    <View style={styles.header}>
      <View style={styles.topRow}>
        <View style={styles.brandRow}>
          <BrandMark />
          <View>
            <AppText style={styles.brandName} variant="bodyStrong">
              Credet
            </AppText>
            <AppText tone="dim" variant="caption">
              {eyebrow}
            </AppText>
          </View>
        </View>
        {action}
      </View>
      <AppText style={styles.title} variant="display">
        {title}
      </AppText>
      {subtitle ? (
        <AppText style={styles.subtitle} tone="muted" variant="body">
          {subtitle}
        </AppText>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    marginBottom: spacing.xl,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  brandRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  brandName: {
    color: colors.text,
    letterSpacing: 0.3,
  },
  title: {
    marginTop: spacing.lg,
  },
  subtitle: {
    marginTop: spacing.xs,
    maxWidth: 520,
  },
});
