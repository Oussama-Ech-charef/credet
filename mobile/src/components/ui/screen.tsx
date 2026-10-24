import type { ReactNode } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  View,
  type StyleProp,
  type ViewStyle,
} from "react-native";
import { SafeAreaView, type Edge } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar";

import { colors, spacing } from "@/constants/theme";

interface ScreenProps {
  children: ReactNode;
  scroll?: boolean;
  edges?: Edge[];
  contentContainerStyle?: StyleProp<ViewStyle>;
  refreshing?: boolean;
  onRefresh?: () => void;
  keyboardAvoiding?: boolean;
  style?: StyleProp<ViewStyle>;
  footer?: ReactNode;
  footerStyle?: StyleProp<ViewStyle>;
}

const defaultEdges: Edge[] = ["top", "left", "right"];

export function Screen({
  children,
  scroll = true,
  edges = defaultEdges,
  contentContainerStyle,
  refreshing = false,
  onRefresh,
  keyboardAvoiding = true,
  style,
  footer,
  footerStyle,
}: ScreenProps) {
  const scrollView = (
    <ScrollView
      contentContainerStyle={[styles.scrollContent, contentContainerStyle]}
      keyboardShouldPersistTaps="handled"
      style={styles.flex}
      refreshControl={
        onRefresh ? (
          <RefreshControl
            colors={[colors.actionStrong]}
            onRefresh={onRefresh}
            progressBackgroundColor={colors.surface2}
            refreshing={refreshing}
            tintColor={colors.actionStrong}
          />
        ) : undefined
      }
      showsVerticalScrollIndicator={false}
    >
      {children}
    </ScrollView>
  );

  const content = scroll ? (
    <KeyboardAvoidingView
      behavior={Platform.OS === "ios" ? "padding" : undefined}
      enabled={keyboardAvoiding}
      style={styles.flex}
    >
      {scrollView}
      {footer ? (
        <View style={[styles.footer, footerStyle]}>{footer}</View>
      ) : null}
    </KeyboardAvoidingView>
  ) : (
    <View style={[styles.flex, contentContainerStyle]}>
      {children}
      {footer ? (
        <View style={[styles.footer, footerStyle]}>{footer}</View>
      ) : null}
    </View>
  );

  return (
    <SafeAreaView edges={edges} style={[styles.safe, style]}>
      <StatusBar style="light" />
      {content}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  flex: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.bg,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
  },
});
