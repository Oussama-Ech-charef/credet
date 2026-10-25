import { Ionicons } from "@expo/vector-icons";
import { StyleSheet, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/button";
import { colors, radius, spacing } from "@/constants/theme";
import { formatDate, formatSignedAmount } from "@/lib/format";
import type { Entry } from "@/lib/types";

interface EntryRowProps {
  entry: Entry;
  currency: string;
  onEdit: () => void;
  onDelete: () => void;
}

export function EntryRow({ entry, currency, onEdit, onDelete }: EntryRowProps) {
  const isDebt = entry.operation_type === "DEBT";
  const color = isDebt ? colors.debtText : colors.paymentText;

  return (
    <View style={styles.card}>
      <View
        style={[
          styles.accent,
          { backgroundColor: isDebt ? colors.debt : colors.payment },
        ]}
      />
      <View style={styles.topRow}>
        <Badge dot tone={isDebt ? "debt" : "payment"}>
          {isDebt ? "دين" : "دفعة"}
        </Badge>
        <AppText tone="dim" variant="caption">
          {formatDate(entry.operation_date)}
        </AppText>
        <AppText
          adjustsFontSizeToFit
          numberOfLines={1}
          style={[styles.amount, { color }]}
          variant="bodyStrong"
        >
          {formatSignedAmount(entry.amount, entry.operation_type, currency)}
        </AppText>
      </View>

      <AppText variant="bodyStrong">{entry.description}</AppText>
      {entry.note ? (
        <View style={styles.noteRow}>
          <Ionicons color={colors.dim} name="document-text-outline" size={13} />
          <AppText style={styles.note} tone="dim" variant="caption">
            {entry.note}
          </AppText>
        </View>
      ) : null}

      <View style={styles.actions}>
        <IconButton
          accessibilityLabel={`تعديل ${entry.description}`}
          backgroundColor={colors.surface2}
          color={colors.muted}
          icon="create-outline"
          onPress={onEdit}
          size={38}
        />
        <IconButton
          accessibilityLabel={`حذف ${entry.description}`}
          backgroundColor={colors.debtSoft}
          borderColor="rgba(239, 68, 68, 0.26)"
          color={colors.debtText}
          icon="trash-outline"
          onPress={onDelete}
          size={38}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    position: "relative",
    overflow: "hidden",
    padding: spacing.md,
    paddingRight: spacing.lg,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    gap: spacing.xs,
  },
  accent: {
    position: "absolute",
    top: 0,
    bottom: 0,
    right: 0,
    width: 3,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  amount: {
    flex: 1,
    textAlign: "left",
    fontVariant: ["tabular-nums"],
    writingDirection: "ltr",
  },
  noteRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  note: {
    flex: 1,
  },
  actions: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-end",
    gap: spacing.xs,
    marginTop: spacing.xs,
  },
});
