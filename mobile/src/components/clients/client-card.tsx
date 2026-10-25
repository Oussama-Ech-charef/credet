import { Ionicons } from "@expo/vector-icons";
import { Pressable, StyleSheet, View } from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/button";
import { colors, radius, spacing } from "@/constants/theme";
import { formatAmount, formatMovementCount, relativeDayLabel } from "@/lib/format";
import type { Client } from "@/lib/types";

interface ClientCardProps {
  client: Client;
  currency: string;
  onOpen: () => void;
  onCall: () => void;
  onWhatsApp: () => void;
}

function BalanceBadge({ client, currency }: { client: Client; currency: string }) {
  if (client.current_balance > 0) {
    return (
      <Badge dot tone="debt">
        {formatAmount(client.current_balance, currency)}
      </Badge>
    );
  }

  if (client.current_balance < 0) {
    return (
      <Badge dot tone="payment">
        له: {formatAmount(Math.abs(client.current_balance), currency)}
      </Badge>
    );
  }

  return (
    <Badge dot tone="payment">
      مسدد
    </Badge>
  );
}

export function ClientCard({
  client,
  currency,
  onOpen,
  onCall,
  onWhatsApp,
}: ClientCardProps) {
  const phone = client.phone?.trim();

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityLabel={`فتح حساب ${client.name}`}
        accessibilityRole="button"
        onPress={onOpen}
        style={({ pressed }) => pressed && styles.pressed}
      >
        <View style={styles.topRow}>
          <Avatar name={client.name} />
          <View style={styles.identity}>
            <AppText numberOfLines={1} variant="bodyStrong">
              {client.name}
            </AppText>
            {phone ? (
              <AppText numberOfLines={1} style={styles.phone} tone="muted" variant="caption">
                {phone}
              </AppText>
            ) : (
              <AppText tone="dim" variant="caption">
                بدون رقم هاتف
              </AppText>
            )}
            <AppText numberOfLines={1} tone="dim" variant="caption">
              {client.address || "بدون عنوان مسجل"}
            </AppText>
          </View>
          <BalanceBadge client={client} currency={currency} />
        </View>
      </Pressable>

      <View style={styles.bottomRow}>
        <View style={styles.meta}>
          <Ionicons color={colors.dim} name="time-outline" size={14} />
          <AppText tone="dim" variant="caption">
            {client.last_operation_date
              ? `آخر حركة ${relativeDayLabel(client.last_operation_date)}`
              : "لا توجد حركات"}
          </AppText>
          <AppText tone="dim" variant="caption">
            · {formatMovementCount(client.entries_count)}
          </AppText>
        </View>
        <View style={styles.actions}>
          {phone ? (
            <>
              <IconButton
                accessibilityLabel={`اتصال بـ ${client.name}`}
                backgroundColor={colors.actionSoft}
                borderColor="rgba(99, 102, 241, 0.28)"
                color={colors.actionText}
                icon="call-outline"
                onPress={onCall}
                size={38}
              />
              <IconButton
                accessibilityLabel={`محادثة واتساب مع ${client.name}`}
                backgroundColor={colors.paymentSoft}
                borderColor="rgba(16, 185, 129, 0.28)"
                color={colors.paymentText}
                icon="logo-whatsapp"
                onPress={onWhatsApp}
                size={38}
              />
            </>
          ) : null}
          <IconButton
            accessibilityLabel={`فتح حساب ${client.name}`}
            backgroundColor={colors.surface2}
            color={colors.muted}
            icon="chevron-back"
            onPress={onOpen}
            size={38}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing.md,
  },
  pressed: {
    opacity: 0.82,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  identity: {
    flex: 1,
    gap: 1,
  },
  phone: {
    textAlign: "right",
    writingDirection: "ltr",
  },
  bottomRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  meta: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    flexShrink: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
});
