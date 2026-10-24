import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { avatarTone, initials } from "@/lib/format";
import { colors, fonts, radius } from "@/constants/theme";

interface AvatarProps {
  name: string;
  size?: number;
}

const tones = [
  { background: colors.actionSoft, text: colors.actionText },
  { background: colors.debtSoft, text: colors.debtText },
  { background: colors.paymentSoft, text: colors.paymentText },
  { background: colors.warningSoft, text: colors.warningText },
  { background: colors.surface2, text: colors.muted },
] as const;

export function Avatar({ name, size = 46 }: AvatarProps) {
  const tone = tones[avatarTone(name) % tones.length];

  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[
        styles.avatar,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: tone.background,
        },
      ]}
    >
      <AppText
        style={[
          styles.initials,
          {
            color: tone.text,
            fontSize: Math.max(12, Math.round(size * 0.32)),
            lineHeight: Math.round(size * 0.46),
          },
        ]}
        variant="bodyStrong"
      >
        {initials(name)}
      </AppText>
    </View>
  );
}

const styles = StyleSheet.create({
  avatar: {
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
  },
  initials: {
    fontFamily: fonts.bold,
    textAlign: "center",
    writingDirection: "rtl",
  },
});
