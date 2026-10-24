import { Ionicons } from "@expo/vector-icons";
import { useMemo, useRef, useState } from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  TextInput,
  View,
  useWindowDimensions,
  type TextInputInstance,
} from "react-native";

import { Avatar } from "@/components/ui/avatar";
import { AppText } from "@/components/ui/app-text";
import { AppModal } from "@/components/ui/modal";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { clientMatchesSearch, formatAmount } from "@/lib/format";
import type { Client } from "@/lib/types";

interface ClientPickerModalProps {
  visible: boolean;
  clients: Client[];
  selectedId?: number | null;
  currency: string;
  onClose: () => void;
  onSelect: (client: Client) => void;
}

export function ClientPickerModal({
  visible,
  clients,
  selectedId,
  currency,
  onClose,
  onSelect,
}: ClientPickerModalProps) {
  const { height } = useWindowDimensions();
  const searchRef = useRef<TextInputInstance>(null);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebouncedValue(search, 180);

  const handleClose = () => {
    setSearch("");
    onClose();
  };

  const handleShow = () => {
    setSearch("");
    setTimeout(() => searchRef.current?.focus(), 120);
  };

  const filtered = useMemo(
    () => clients.filter((client) => clientMatchesSearch(client, debouncedSearch)),
    [clients, debouncedSearch],
  );

  return (
    <AppModal
      description="ابحث بالاسم أو رقم الهاتف، ثم اختر الكليان."
      onClose={handleClose}
      onShow={handleShow}
      scrollable={false}
      title="اختر كليان"
      visible={visible}
    >
      <View style={styles.body}>
        <View style={styles.searchBox}>
          <Ionicons color={colors.dim} name="search-outline" size={18} />
          <TextInput
            ref={searchRef}
            accessibilityLabel="البحث عن كليان"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearch}
            placeholder="ابحث بالاسم أو الهاتف"
            placeholderTextColor={colors.dim}
            returnKeyType="search"
            selectionColor={colors.actionStrong}
            style={styles.searchInput}
            value={search}
          />
          {search ? (
            <Pressable
              accessibilityLabel="مسح البحث"
              accessibilityRole="button"
              hitSlop={8}
              onPress={() => setSearch("")}
            >
              <Ionicons color={colors.dim} name="close-circle" size={18} />
            </Pressable>
          ) : null}
        </View>

        <FlatList
          contentContainerStyle={styles.listContent}
          data={filtered}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          keyboardShouldPersistTaps="handled"
          keyExtractor={(item) => String(item.id)}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Ionicons color={colors.dim} name="people-outline" size={28} />
              <AppText style={styles.emptyText} tone="muted" variant="body">
                {clients.length === 0
                  ? "لا يوجد كليان بعد. أضف الكليان من نسخة الويب ثم أعد المحاولة."
                  : "لا توجد نتائج مطابقة لبحثك."}
              </AppText>
            </View>
          }
          renderItem={({ item }) => {
            const selected = item.id === selectedId;
            const balanceColor =
              item.current_balance > 0
                ? colors.debtText
                : item.current_balance < 0
                  ? colors.paymentText
                  : colors.dim;

            return (
              <Pressable
                accessibilityLabel={`اختيار ${item.name}`}
                accessibilityRole="button"
                onPress={() => {
                  onSelect(item);
                  handleClose();
                }}
                style={({ pressed }) => [
                  styles.clientRow,
                  selected && styles.clientRowSelected,
                  pressed && styles.pressed,
                ]}
              >
                <Avatar name={item.name} size={40} />
                <View style={styles.clientCopy}>
                  <AppText numberOfLines={1} variant="bodyStrong">
                    {item.name}
                  </AppText>
                  <AppText numberOfLines={1} tone="dim" variant="caption">
                    {item.phone || "بدون رقم هاتف"}
                  </AppText>
                </View>
                <View style={styles.balance}>
                  <AppText
                    numberOfLines={1}
                    style={[styles.balanceAmount, { color: balanceColor }]}
                    variant="caption"
                  >
                    {formatAmount(item.current_balance, currency)}
                  </AppText>
                  {selected ? (
                    <Ionicons
                      color={colors.actionText}
                      name="checkmark-circle"
                      size={19}
                    />
                  ) : null}
                </View>
              </Pressable>
            );
          }}
          showsVerticalScrollIndicator={false}
          style={[styles.list, { maxHeight: Math.max(220, height * 0.48) }]}
        />
      </View>
    </AppModal>
  );
}

const styles = StyleSheet.create({
  body: {
    gap: spacing.md,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 48,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface3,
  },
  searchInput: {
    flex: 1,
    minHeight: 46,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlign: "right",
    writingDirection: "rtl",
  },
  list: {
    flexGrow: 0,
  },
  listContent: {
    paddingBottom: spacing.sm,
  },
  separator: {
    height: spacing.sm,
  },
  clientRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface3,
  },
  clientRowSelected: {
    borderColor: colors.action,
    backgroundColor: colors.actionSoft,
  },
  pressed: {
    opacity: 0.82,
  },
  clientCopy: {
    flex: 1,
    gap: 1,
  },
  balance: {
    alignItems: "flex-end",
    gap: 2,
    maxWidth: 118,
  },
  balanceAmount: {
    fontVariant: ["tabular-nums"],
    textAlign: "left",
    writingDirection: "ltr",
  },
  empty: {
    alignItems: "center",
    paddingVertical: spacing.xxl,
    gap: spacing.sm,
  },
  emptyText: {
    textAlign: "center",
    maxWidth: 300,
  },
});
