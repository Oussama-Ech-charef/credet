import type { ReactNode } from "react";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { spacing } from "@/constants/theme";

interface SectionHeadingProps {
  title: string;
  meta?: string;
  action?: ReactNode;
}

export function SectionHeading({ title, meta, action }: SectionHeadingProps) {
  return (
    <View style={styles.row}>
      <View style={styles.copy}>
        <AppText variant="heading">{title}</AppText>
        {meta ? (
          <AppText style={styles.meta} tone="dim" variant="caption">
            {meta}
          </AppText>
        ) : null}
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.md,
    marginBottom: spacing.md,
  },
  copy: {
    flex: 1,
    alignItems: "flex-start",
  },
  meta: {
    marginTop: 1,
  },
});
