import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { AppText } from "@/components/ui/app-text";
import { Card } from "@/components/ui/card";
import { SectionHeading } from "@/components/ui/section-heading";
import { colors, spacing } from "@/constants/theme";
import { formatAmount } from "@/lib/format";
import type { Client } from "@/lib/types";

interface TopDebtorsProps {
  clients: Client[];
  currency: string;
  onOpen: (client: Client) => void;
}

export function TopDebtors({ clients, currency, onOpen }: TopDebtorsProps) {
  if (clients.length === 0) {
    return null;
  }

  return (
    <View style={styles.section}>
      <SectionHeading meta="الأعلى أولًا" title="أعلى الأرصدة" />
      <Card padded={false}>
        {clients.map((client, index) => (
          <Pressable
            accessibilityLabel={`فتح حساب ${client.name}`}
            accessibilityRole="button"
            key={client.id}
            onPress={() => onOpen(client)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <Avatar name={client.name} size={38} />
            <View style={styles.copy}>
              <AppText numberOfLines={1} variant="bodyStrong">
                {client.name}
              </AppText>
              <AppText tone="dim" variant="caption">
                {client.entries_count} حركة
              </AppText>
            </View>
            <AppText style={styles.amount} tone="debt" variant="bodyStrong">
              {formatAmount(client.current_balance, currency)}
            </AppText>
            <Ionicons color={colors.dim} name="chevron-back" size={15} />
            {index < clients.length - 1 ? <View style={styles.divider} /> : null}
          </Pressable>
        ))}
      </Card>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: spacing.xxl,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
  },
  pressed: {
    backgroundColor: colors.surface2,
  },
  copy: {
    flex: 1,
    gap: 1,
  },
  amount: {
    fontVariant: ["tabular-nums"],
  },
  divider: {
    position: "absolute",
    bottom: 0,
    right: 64,
    left: spacing.lg,
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
  },
});
