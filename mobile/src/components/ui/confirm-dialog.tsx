import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { AppModal } from "@/components/ui/modal";
import { colors, radius, spacing } from "@/constants/theme";

interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  loading?: boolean;
  error?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  description,
  confirmLabel = "حذف",
  cancelLabel = "إلغاء",
  loading = false,
  error,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <AppModal
      closeOnBackdrop={false}
      footer={
        <>
          <Button
            disabled={loading}
            fullWidth
            label={cancelLabel}
            onPress={onCancel}
            style={styles.footerButton}
            variant="secondary"
          />
          <Button
            fullWidth
            label={confirmLabel}
            loading={loading}
            onPress={onConfirm}
            style={styles.footerButton}
            variant="danger"
          />
        </>
      }
      onClose={loading ? () => undefined : onCancel}
      position="center"
      scrollable={false}
      title={title}
      visible={visible}
    >
      <View style={styles.body}>
        <View style={styles.warning}>
          <Ionicons color={colors.warningText} name="warning-outline" size={20} />
          <AppText style={styles.warningText} tone="muted" variant="body">
            {description}
          </AppText>
        </View>
        {error ? (
          <AppText style={styles.error} tone="debt" variant="body">
            {error}
          </AppText>
        ) : null}
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
  },
  warning: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.sm,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.warningSoft,
    borderWidth: 1,
    borderColor: "rgba(245, 158, 11, 0.26)",
  },
  warningText: {
    flex: 1,
  },
  error: {
    textAlign: "right",
  },
  footerButton: {
    flex: 1,
  },
});
