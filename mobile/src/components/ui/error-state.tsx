import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { colors, radius, spacing } from "@/constants/theme";

interface ErrorStateProps {
  title?: string;
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({
  title = "تعذر تحميل البيانات",
  message,
  onRetry,
  compact = false,
}: ErrorStateProps) {
  return (
    <View style={[styles.container, compact && styles.compact]}>
      <View style={styles.icon}>
        <Ionicons color={colors.debtText} name="cloud-offline-outline" size={24} />
      </View>
      <AppText style={styles.title} variant="heading">
        {title}
      </AppText>
      <AppText style={styles.message} tone="muted" variant="body">
        {message}
      </AppText>
      {onRetry ? (
        <Button
          icon="refresh-outline"
          label="إعادة المحاولة"
          onPress={onRetry}
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
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxxl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface3,
  },
  compact: {
    paddingVertical: spacing.xl,
  },
  icon: {
    width: 54,
    height: 54,
    borderRadius: radius.lg,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.debtSoft,
    marginBottom: spacing.md,
  },
  title: {
    textAlign: "center",
  },
  message: {
    textAlign: "center",
    marginTop: spacing.xs,
    maxWidth: 360,
  },
  action: {
    marginTop: spacing.lg,
  },
});
