import { StyleSheet, View } from "react-native";

import { colors, radius } from "@/constants/theme";

export function BrandMark({ size = 34 }: { size?: number }) {
  const barHeight = Math.max(2, Math.round(size * 0.08));

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.mark,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.3),
        },
      ]}
    >
      <View style={[styles.page, { width: size * 0.44 }]}>
        <View
          style={[
            styles.bar,
            { height: barHeight, backgroundColor: colors.debt, width: "100%" },
          ]}
        />
        <View
          style={[
            styles.bar,
            { height: barHeight, backgroundColor: colors.text, width: "78%" },
          ]}
        />
        <View
          style={[
            styles.bar,
            { height: barHeight, backgroundColor: colors.payment, width: "56%" },
          ]}
        />
      </View>
      <View style={[styles.binding, { height: size * 0.46 }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  mark: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.surface2,
    borderWidth: 1,
    borderColor: colors.borderStrong,
  },
  page: {
    gap: 3,
    alignItems: "flex-start",
    transform: [{ translateX: 2 }],
  },
  bar: {
    borderRadius: radius.pill,
  },
  binding: {
    position: "absolute",
    right: 6,
    width: 2,
    borderRadius: radius.pill,
    backgroundColor: colors.action,
  },
});
