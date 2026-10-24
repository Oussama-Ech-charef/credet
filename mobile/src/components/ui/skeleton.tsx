import { StyleSheet, View, type DimensionValue, type StyleProp, type ViewStyle } from "react-native";

import { colors, radius, spacing } from "@/constants/theme";

interface SkeletonProps {
  height?: number;
  width?: DimensionValue;
  borderRadius?: number;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  height = 14,
  width = "100%",
  borderRadius = radius.sm,
  style,
}: SkeletonProps) {
  return (
    <View
      style={[
        styles.block,
        { height, width, borderRadius },
        style,
      ]}
    />
  );
}

export function SkeletonCard({ rows = 3 }: { rows?: number }) {
  return (
    <View style={styles.card}>
      <View style={styles.row}>
        <Skeleton height={44} width={44} borderRadius={22} />
        <View style={styles.copy}>
          <Skeleton height={14} width="58%" />
          <Skeleton height={10} width="38%" style={styles.small} />
        </View>
        <Skeleton height={24} width={82} borderRadius={radius.pill} />
      </View>
      {Array.from({ length: Math.max(0, rows - 1) }).map((_, index) => (
        <Skeleton
          key={index}
          height={11}
          width={index % 2 === 0 ? "78%" : "54%"}
          style={styles.line}
        />
      ))}
    </View>
  );
}

export function SkeletonList({ count = 4 }: { count?: number }) {
  return (
    <View style={styles.list}>
      {Array.from({ length: count }).map((_, index) => (
        <SkeletonCard key={index} rows={index === 0 ? 3 : 2} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  block: {
    backgroundColor: colors.surface2,
    opacity: 0.8,
  },
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  copy: {
    flex: 1,
    gap: spacing.xs,
  },
  small: {
    marginTop: 2,
  },
  line: {
    marginTop: spacing.md,
  },
  list: {
    gap: spacing.md,
  },
});
