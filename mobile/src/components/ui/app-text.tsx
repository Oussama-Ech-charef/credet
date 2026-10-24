import type { ReactNode } from "react";
import { StyleSheet, Text, type TextProps, type TextStyle } from "react-native";

import { colors, fonts } from "@/constants/theme";

export type TextVariant =
  | "display"
  | "title"
  | "heading"
  | "body"
  | "bodyStrong"
  | "label"
  | "caption"
  | "amount"
  | "amountLarge"
  | "button";

export type TextTone =
  | "default"
  | "muted"
  | "dim"
  | "debt"
  | "payment"
  | "action"
  | "warning"
  | "inverse";

export interface AppTextProps extends TextProps {
  variant?: TextVariant;
  tone?: TextTone;
  children?: ReactNode;
}

const toneColors: Record<TextTone, string> = {
  default: colors.text,
  muted: colors.muted,
  dim: colors.dim,
  debt: colors.debtText,
  payment: colors.paymentText,
  action: colors.actionText,
  warning: colors.warningText,
  inverse: colors.white,
};

const variantStyles: Record<TextVariant, TextStyle> = {
  display: {
    fontFamily: fonts.extrabold,
    fontSize: 32,
    lineHeight: 42,
  },
  title: {
    fontFamily: fonts.bold,
    fontSize: 26,
    lineHeight: 36,
  },
  heading: {
    fontFamily: fonts.semibold,
    fontSize: 18,
    lineHeight: 28,
  },
  body: {
    fontFamily: fonts.regular,
    fontSize: 15,
    lineHeight: 24,
  },
  bodyStrong: {
    fontFamily: fonts.semibold,
    fontSize: 15,
    lineHeight: 24,
  },
  label: {
    fontFamily: fonts.medium,
    fontSize: 13,
    lineHeight: 20,
  },
  caption: {
    fontFamily: fonts.regular,
    fontSize: 12,
    lineHeight: 18,
  },
  amount: {
    fontFamily: fonts.bold,
    fontSize: 20,
    lineHeight: 28,
    fontVariant: ["tabular-nums"],
  },
  amountLarge: {
    fontFamily: fonts.extrabold,
    fontSize: 34,
    lineHeight: 44,
    fontVariant: ["tabular-nums"],
  },
  button: {
    fontFamily: fonts.bold,
    fontSize: 15,
    lineHeight: 22,
  },
};

export function AppText({
  variant = "body",
  tone = "default",
  style,
  children,
  ...rest
}: AppTextProps) {
  return (
    <Text
      {...rest}
      style={[styles.base, variantStyles[variant], { color: toneColors[tone] }, style]}
    >
      {children}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    textAlign: "right",
    writingDirection: "rtl",
  },
});
