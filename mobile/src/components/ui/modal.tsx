import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Modal as RNModal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { IconButton } from "@/components/ui/button";
import { colors, radius, spacing } from "@/constants/theme";

interface AppModalProps {
  visible: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  position?: "bottom" | "center";
  closeOnBackdrop?: boolean;
  scrollable?: boolean;
  onShow?: () => void;
}

export function AppModal({
  visible,
  onClose,
  title,
  description,
  children,
  footer,
  position = "bottom",
  closeOnBackdrop = true,
  scrollable = true,
  onShow,
}: AppModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <RNModal
      animationType="fade"
      onRequestClose={onClose}
      onShow={onShow}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.overlay}>
        <Pressable
          accessibilityLabel="إغلاق النافذة"
          accessibilityRole="button"
          accessible={closeOnBackdrop}
          disabled={!closeOnBackdrop}
          onPress={closeOnBackdrop ? onClose : undefined}
          style={StyleSheet.absoluteFill}
        />
        <KeyboardAvoidingView
          behavior={Platform.OS === "ios" ? "padding" : "height"}
          pointerEvents="box-none"
          style={[
            styles.sheetWrap,
            position === "center" ? styles.centerWrap : styles.bottomWrap,
          ]}
        >
          <View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              position === "center" ? styles.centerSheet : styles.bottomSheet,
            ]}
          >
            <View style={styles.header}>
              <View style={styles.headerCopy}>
                <AppText variant="heading">{title}</AppText>
                {description ? (
                  <AppText style={styles.description} tone="muted" variant="body">
                    {description}
                  </AppText>
                ) : null}
              </View>
              <IconButton
                accessibilityLabel="إغلاق"
                icon="close"
                onPress={onClose}
                size={40}
              />
            </View>

            {scrollable ? (
              <ScrollView
                contentContainerStyle={styles.bodyContent}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
                style={styles.bodyScroll}
              >
                {children}
              </ScrollView>
            ) : (
              <View style={styles.body}>{children}</View>
            )}

            {footer ? (
              <View
                style={[
                  styles.footer,
                  { paddingBottom: Math.max(insets.bottom, spacing.md) },
                ]}
              >
                {footer}
              </View>
            ) : null}
          </View>
        </KeyboardAvoidingView>
      </View>
    </RNModal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: colors.overlay,
  },
  sheetWrap: {
    flex: 1,
  },
  bottomWrap: {
    justifyContent: "flex-end",
  },
  centerWrap: {
    justifyContent: "center",
  },
  sheet: {
    backgroundColor: colors.surface,
    overflow: "hidden",
    maxHeight: "92%",
    borderColor: colors.border,
    borderWidth: 1,
  },
  bottomSheet: {
    width: "100%",
    borderBottomWidth: 0,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
  },
  centerSheet: {
    marginHorizontal: spacing.lg,
    borderRadius: radius.xl,
    maxHeight: "88%",
  },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xl,
    paddingBottom: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  headerCopy: {
    flex: 1,
    gap: spacing.xs,
  },
  description: {
    marginTop: 2,
  },
  bodyScroll: {
    flexShrink: 1,
  },
  bodyContent: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  body: {
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  footer: {
    flexDirection: "row",
    gap: spacing.md,
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
  },
});
