import { Ionicons } from "@expo/vector-icons";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  View,
  type PressableProps,
  type StyleProp,
  type ViewStyle,
} from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, fonts, layout, radius, spacing } from "@/constants/theme";

export type ButtonVariant =
  | "primary"
  | "danger"
  | "success"
  | "secondary"
  | "outline"
  | "ghost";

type ButtonSize = "sm" | "md" | "lg";
type IconName = keyof typeof Ionicons.glyphMap;

interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  icon?: IconName;
  loading?: boolean;
  fullWidth?: boolean;
  style?: StyleProp<ViewStyle>;
}

interface PaletteEntry {
  background: string;
  border: string;
  text: string;
}

const palettes: Record<ButtonVariant, PaletteEntry> = {
  primary: {
    background: colors.action,
    border: colors.action,
    text: colors.white,
  },
  danger: {
    background: colors.debt,
    border: colors.debt,
    text: colors.white,
  },
  success: {
    background: colors.payment,
    border: colors.payment,
    text: colors.white,
  },
  secondary: {
    background: colors.surface2,
    border: colors.border,
    text: colors.text,
  },
  outline: {
    background: colors.transparent,
    border: colors.borderStrong,
    text: colors.text,
  },
  ghost: {
    background: colors.transparent,
    border: colors.transparent,
    text: colors.muted,
  },
};

const sizeStyles = {
  sm: {
    height: 40,
    paddingHorizontal: spacing.md,
    gap: spacing.xs,
    radius: radius.sm,
    icon: 16,
  },
  md: {
    height: 48,
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
    radius: radius.md,
    icon: 18,
  },
  lg: {
    height: 54,
    paddingHorizontal: spacing.xl,
    gap: spacing.sm,
    radius: radius.md,
    icon: 20,
  },
} as const;

export function Button({
  label,
  variant = "primary",
  size = "md",
  icon,
  loading = false,
  fullWidth = false,
  disabled,
  style,
  ...rest
}: ButtonProps) {
  const palette = palettes[variant];
  const sizing = sizeStyles[size];
  const isDisabled = Boolean(disabled || loading);

  return (
    <Pressable
      {...rest}
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: palette.background,
          borderColor: palette.border,
          borderRadius: sizing.radius,
          height: sizing.height,
          paddingHorizontal: sizing.paddingHorizontal,
          gap: sizing.gap,
        },
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={palette.text} size="small" />
      ) : icon ? (
        <Ionicons color={palette.text} name={icon} size={sizing.icon} />
      ) : null}
      <AppText
        numberOfLines={1}
        style={[styles.label, { color: palette.text }]}
        variant="button"
      >
        {label}
      </AppText>
    </Pressable>
  );
}

interface IconButtonProps extends Omit<PressableProps, "style" | "children"> {
  icon: IconName;
  accessibilityLabel: string;
  color?: string;
  backgroundColor?: string;
  borderColor?: string;
  size?: number;
  style?: StyleProp<ViewStyle>;
}

export function IconButton({
  icon,
  accessibilityLabel,
  color = colors.muted,
  backgroundColor = colors.surface2,
  borderColor = colors.border,
  size = layout.minTouchTarget,
  style,
  disabled,
  ...rest
}: IconButtonProps) {
  return (
    <Pressable
      {...rest}
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled) }}
      disabled={disabled}
      hitSlop={6}
      style={({ pressed }) => [
        styles.iconButton,
        {
          width: size,
          height: size,
          borderRadius: radius.md,
          backgroundColor,
          borderColor,
        },
        pressed && !disabled && styles.pressed,
        disabled && styles.disabled,
        style,
      ]}
    >
      <View pointerEvents="none">
        <Ionicons color={color} name={icon} size={20} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    alignSelf: "flex-start",
  },
  fullWidth: {
    alignSelf: "stretch",
  },
  pressed: {
    opacity: 0.82,
    transform: [{ scale: 0.995 }],
  },
  disabled: {
    opacity: 0.45,
  },
  label: {
    fontFamily: fonts.bold,
    textAlign: "center",
  },
  iconButton: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
});
