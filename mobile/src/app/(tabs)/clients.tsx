import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo, useState } from "react";
import {
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  TextInput,
  View,
} from "react-native";

import { ClientCard } from "@/components/clients/client-card";
import { AppText } from "@/components/ui/app-text";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { IconButton } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { SkeletonList } from "@/components/ui/skeleton";
import { colors, fonts, radius, spacing } from "@/constants/theme";
import { useClients, useShopSettings } from "@/hooks/use-credet-queries";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { apiErrorMessage } from "@/lib/api";
import { clientMatchesSearch, formatCount } from "@/lib/format";
import { callPhone, openWhatsAppChat } from "@/lib/links";
import type { Client, ClientFilter } from "@/lib/types";
import { useToast } from "@/providers/toast-provider";

function statusMatches(client: Client, filter: ClientFilter): boolean {
  if (filter === "debt") {
    return client.current_balance > 0;
  }

  if (filter === "settled") {
    return client.current_balance <= 0;
  }

  return true;
}

export default function ClientsScreen() {
  const router = useRouter();
  const { showToast } = useToast();
  const clientsQuery = useClients();
  const settingsQuery = useShopSettings();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<ClientFilter>("all");
  const debouncedSearch = useDebouncedValue(search, 180);
  const clients = useMemo(() => clientsQuery.data ?? [], [clientsQuery.data]);
  const currency = settingsQuery.data?.currency ?? "DH";

  const filtered = useMemo(
    () =>
      clients.filter(
        (client) =>
          statusMatches(client, filter) &&
          clientMatchesSearch(client, debouncedSearch),
      ),
    [clients, debouncedSearch, filter],
  );

  const hasQuery = debouncedSearch.trim().length > 0 || filter !== "all";
  const error = clientsQuery.isError ? apiErrorMessage(clientsQuery.error) : "";

  const refresh = () => {
    void clientsQuery.refetch();
    void settingsQuery.refetch();
  };

  const openClient = (client: Client) => {
    router.push({
      pathname: "/clients/[id]",
      params: { id: String(client.id) },
    });
  };

  const handleCall = async (client: Client) => {
    if (!client.phone) {
      showToast("لا يوجد رقم هاتف مسجل لهذا الكليان.", "error");
      return;
    }

    try {
      await callPhone(client.phone);
    } catch (callError) {
      showToast(
        callError instanceof Error ? callError.message : "تعذر فتح تطبيق الهاتف.",
        "error",
      );
    }
  };

  const handleWhatsApp = async (client: Client) => {
    try {
      await openWhatsAppChat(client.phone);
    } catch {
      showToast("تعذر فتح واتساب على هذا الجهاز.", "error");
    }
  };

  const resetFilters = () => {
    setSearch("");
    setFilter("all");
  };

  const listHeader = (
    <>
      <PageHeader
        action={
          <View style={styles.headerActions}>
            <IconButton
              accessibilityLabel="إضافة كليان جديد"
              backgroundColor={colors.actionSoft}
              borderColor="rgba(99, 102, 241, 0.28)"
              color={colors.actionText}
              icon="person-add-outline"
              onPress={() => router.push("/clients/new")}
            />
            <IconButton
              accessibilityLabel="تحديث قائمة الكليان"
              disabled={clientsQuery.isFetching}
              icon="refresh-outline"
              onPress={refresh}
            />
          </View>
        }
        subtitle="ابحث، تابع الأرصدة، وافتح حساب أي كليان."
        title="الكليان"
      />

      <View style={styles.toolbar}>
        <View style={styles.searchBox}>
          <Ionicons color={colors.dim} name="search-outline" size={18} />
          <TextInput
            accessibilityLabel="البحث عن كليان"
            autoCapitalize="none"
            autoCorrect={false}
            onChangeText={setSearch}
            placeholder="ابحث بالاسم أو رقم الهاتف"
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

        <SegmentedControl
          accessibilityLabel="تصفية الكليان"
          onChange={setFilter}
          options={[
            { value: "all", label: "الكل", activeColor: colors.actionText, activeBackground: colors.actionSoft },
            { value: "debt", label: "عليهم كريدي", activeColor: colors.debtText, activeBackground: colors.debtSoft },
            { value: "settled", label: "خالصين", activeColor: colors.paymentText, activeBackground: colors.paymentSoft },
          ]}
          value={filter}
        />

        {!clientsQuery.isPending && !error ? (
          <AppText accessibilityLiveRegion="polite" tone="dim" variant="caption">
            {hasQuery
              ? `${formatCount(filtered.length)} نتيجة من ${formatCount(clients.length)} كليان`
              : `${formatCount(clients.length)} كليان في الدفتر`}
          </AppText>
        ) : null}
      </View>
    </>
  );

  return (
    <Screen scroll={false}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={clientsQuery.isPending || error ? [] : filtered}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardDismissMode="on-drag"
        keyboardShouldPersistTaps="handled"
        keyExtractor={(item) => String(item.id)}
        ListEmptyComponent={
          clientsQuery.isPending ? (
            <SkeletonList count={5} />
          ) : error ? (
            <ErrorState message={error} onRetry={refresh} />
          ) : clients.length === 0 ? (
            <EmptyState
              description="أضف أول كليان من زر الإضافة بالأعلى، ثم ابدأ تسجيل الحركات."
              icon="people-outline"
              title="لا يوجد كليان بعد"
            />
          ) : (
            <EmptyState
              actionLabel="إعادة ضبط البحث"
              description="جرّب اسمًا أو رقم هاتف آخر، أو أعد ضبط الفلاتر."
              icon="search-outline"
              onAction={resetFilters}
              title="لا توجد نتائج مطابقة"
            />
          )
        }
        ListHeaderComponent={listHeader}
        refreshControl={
          <RefreshControl
            colors={[colors.actionStrong]}
            onRefresh={refresh}
            progressBackgroundColor={colors.surface2}
            refreshing={clientsQuery.isRefetching && !clientsQuery.isPending}
            tintColor={colors.actionStrong}
          />
        }
        renderItem={({ item }) => (
          <ClientCard
            client={item}
            currency={currency}
            onCall={() => void handleCall(item)}
            onOpen={() => openClient(item)}
            onWhatsApp={() => void handleWhatsApp(item)}
          />
        )}
        showsVerticalScrollIndicator={false}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  listContent: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.sm,
    paddingBottom: spacing.xxxl,
    flexGrow: 1,
  },
  toolbar: {
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  searchBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    minHeight: 50,
    paddingHorizontal: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surface3,
  },
  searchInput: {
    flex: 1,
    minHeight: 48,
    color: colors.text,
    fontFamily: fonts.regular,
    fontSize: 15,
    textAlign: "right",
    writingDirection: "rtl",
  },
  separator: {
    height: spacing.md,
  },
});
