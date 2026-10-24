import type { TextStyle, ViewStyle } from "react-native";

export const colors = {
  bg: "#0B0F19",
  bgDeep: "#080C14",
  surface: "#161F30",
  surface2: "#1A2437",
  surface3: "#0F1624",
  border: "#1E293B",
  borderStrong: "#2B3A50",
  text: "#F8FAFC",
  muted: "#A8B5C7",
  dim: "#718096",
  debt: "#EF4444",
  debtStrong: "#DC2626",
  debtSoft: "rgba(239, 68, 68, 0.12)",
  debtText: "#FCA5A5",
  payment: "#10B981",
  paymentStrong: "#059669",
  paymentSoft: "rgba(16, 185, 129, 0.12)",
  paymentText: "#6EE7B7",
  action: "#6366F1",
  actionStrong: "#818CF8",
  actionSoft: "rgba(99, 102, 241, 0.16)",
  actionText: "#C7D2FE",
  warning: "#F59E0B",
  warningSoft: "rgba(245, 158, 11, 0.14)",
  warningText: "#FCD34D",
  white: "#FFFFFF",
  overlay: "rgba(4, 8, 15, 0.76)",
  transparent: "transparent",
} as const;

export const spacing = {
  xxs: 2,
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
  huge: 40,
} as const;

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
} as const;

export const fonts = {
  regular: "Cairo_400Regular",
  medium: "Cairo_500Medium",
  semibold: "Cairo_600SemiBold",
  bold: "Cairo_700Bold",
  extrabold: "Cairo_800ExtraBold",
} as const;

export const layout = {
  maxContentWidth: 720,
  tabBarHeight: 62,
  minTouchTarget: 48,
} as const;

export const cardShadow: ViewStyle = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.18,
  shadowRadius: 18,
  elevation: 4,
};

export const amountText: TextStyle = {
  fontVariant: ["tabular-nums"],
};

export const theme = {
  colors,
  spacing,
  radius,
  fonts,
  layout,
  cardShadow,
  amountText,
} as const;

export type Theme = typeof theme;
