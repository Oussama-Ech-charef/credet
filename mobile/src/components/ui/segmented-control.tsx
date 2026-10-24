import { Pressable, StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, fonts, radius, spacing } from "@/constants/theme";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  activeColor?: string;
  activeBackground?: string;
}

interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  accessibilityLabel?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  return (
    <View accessibilityLabel={accessibilityLabel} style={styles.container}>
      {options.map((option) => {
        const selected = option.value === value;
        const activeColor = option.activeColor ?? colors.actionText;
        const activeBackground = option.activeBackground ?? colors.actionSoft;

        return (
          <Pressable
            accessibilityRole="tab"
            accessibilityState={{ selected }}
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => [
              styles.segment,
              selected && {
                backgroundColor: activeBackground,
                borderColor: activeColor,
              },
              pressed && styles.pressed,
            ]}
          >
            <AppText
              numberOfLines={1}
              style={[
                styles.label,
                selected ? { color: activeColor } : { color: colors.muted },
              ]}
              variant="label"
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface3,
  },
  segment: {
    flex: 1,
    minHeight: 40,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.transparent,
  },
  pressed: {
    opacity: 0.8,
  },
  label: {
    fontFamily: fonts.semibold,
    textAlign: "center",
  },
});
