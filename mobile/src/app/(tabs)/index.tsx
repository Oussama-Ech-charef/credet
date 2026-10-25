import { Ionicons } from "@expo/vector-icons";
import { useRouter } from "expo-router";
import { useMemo } from "react";
import { StyleSheet, View } from "react-native";

import { ActivityRow } from "@/components/dashboard/activity-row";
import { MetricCard } from "@/components/dashboard/metric-card";
import { QuickActions } from "@/components/dashboard/quick-actions";
import { TopDebtors } from "@/components/dashboard/top-debtors";
import { AppText } from "@/components/ui/app-text";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { PageHeader } from "@/components/ui/page-header";
import { Screen } from "@/components/ui/screen";
import { SectionHeading } from "@/components/ui/section-heading";
import { Skeleton, SkeletonCard } from "@/components/ui/skeleton";
import { colors, radius, spacing } from "@/constants/theme";
import { useClients, useShopSettings, useStats } from "@/hooks/use-credet-queries";
import { apiErrorMessage } from "@/lib/api";
import { formatAmount, formatClientCount, formatCount, formatToday } from "@/lib/format";

export default function HomeScreen() {
  const router = useRouter();
  const statsQuery = useStats();
  const clientsQuery = useClients();
  const settingsQuery = useShopSettings();

  const currency = settingsQuery.data?.currency ?? "DH";
  const shopName = settingsQuery.data?.shop_name ?? "دفتر الديون";
  const stats = statsQuery.data;
  const error = statsQuery.isError ? apiErrorMessage(statsQuery.error) : "";
  const refreshing = statsQuery.isRefetching || clientsQuery.isRefetching;

  const topDebtors = useMemo(
    () =>
      [...(clientsQuery.data ?? [])]
        .filter((client) => client.current_balance > 0)
        .sort((left, right) => right.current_balance - left.current_balance)
        .slice(0, 3),
    [clientsQuery.data],
  );

  const recentActivity = stats?.recent_activity?.slice(0, 6) ?? [];
  const totalReceivable = stats?.total_receivable_amount ?? 0;
  const heroColor = totalReceivable > 0 ? colors.debtText : colors.paymentText;

  const refresh = () => {
    void statsQuery.refetch();
    void clientsQuery.refetch();
    void settingsQuery.refetch();
  };

  const openClient = (clientId: number) => {
    router.push({
      pathname: "/clients/[id]",
      params: { id: String(clientId) },
    });
  };

  return (
    <Screen onRefresh={refresh} refreshing={refreshing}>
      <PageHeader
        action={
          <IconButton
            accessibilityLabel="فتح الإعدادات"
            icon="settings-outline"
            onPress={() => router.navigate("/settings")}
          />
        }
        subtitle={`${shopName} · ${formatToday()}`}
        title="الرئيسية"
      />

      {statsQuery.isPending ? (
        <View style={styles.loading}>
          <SkeletonCard rows={4} />
          <View style={styles.metricSkeletonRow}>
            <Skeleton height={118} style={styles.metricSkeleton} />
            <Skeleton height={118} style={styles.metricSkeleton} />
          </View>
          <Skeleton height={124} />
          <Skeleton height={124} />
        </View>
      ) : statsQuery.isError ? (
        <ErrorState message={error} onRetry={refresh} />
      ) : (
        <>
          <Card elevated style={styles.hero}>
            <View style={styles.heroGlow} />
            <View style={styles.heroTopRow}>
              <View style={styles.heroLabelRow}>
                <Ionicons color={colors.muted} name="wallet-outline" size={17} />
                <AppText tone="muted" variant="label">
                  إجمالي المستحقات
                </AppText>
              </View>
              <Badge dot tone={totalReceivable > 0 ? "debt" : "payment"}>
                {totalReceivable > 0 ? "مستحق" : "مسدد"}
              </Badge>
            </View>
            <AppText
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[styles.heroAmount, { color: heroColor }]}
              variant="amountLarge"
            >
              {formatAmount(totalReceivable, currency)}
            </AppText>
            <AppText style={styles.heroHint} tone="muted" variant="caption">
              إجمالي المبالغ غير المسددة لدى جميع العملاء.
            </AppText>
          </Card>

          <View style={styles.metrics}>
            <MetricCard
              hint="عليهم ديون مستحقة"
              icon="people-outline"
              label="العملاء المدينون"
              tone="action"
              value={formatClientCount(stats?.total_debtors ?? 0)}
            />
            <MetricCard
              hint="دفعات مسجلة اليوم"
              icon="cash-outline"
              label="تحصيل اليوم"
              tone="payment"
              value={formatAmount(stats?.total_collected_today ?? 0, currency)}
            />
          </View>

          <View style={styles.section}>
            <SectionHeading meta="أضف حركة في ثوانٍ" title="إجراءات سريعة" />
            <QuickActions
              onDebt={() =>
                router.navigate({
                  pathname: "/quick-entry",
                  params: { type: "debt", stamp: String(Date.now()) },
                })
              }
              onPayment={() =>
                router.navigate({
                  pathname: "/quick-entry",
                  params: { type: "payment", stamp: String(Date.now()) },
                })
              }
            />
          </View>

          <View style={styles.section}>
            <SectionHeading
              action={
                <Button
                  label="عرض الكل"
                  onPress={() => router.navigate("/clients")}
                  size="sm"
                  variant="ghost"
                />
              }
              meta={`${formatCount(recentActivity.length)} من الحركات الأخيرة`}
              title="آخر الحركات"
            />
            {recentActivity.length > 0 ? (
              <Card padded={false}>
                {recentActivity.map((activity, index) => (
                  <ActivityRow
                    activity={activity}
                    currency={currency}
                    key={activity.id}
                    onPress={() => openClient(activity.client_id)}
                    showDivider={index < recentActivity.length - 1}
                  />
                ))}
              </Card>
            ) : (
              <EmptyState
                actionLabel="تسجيل أول حركة"
                description="ابدأ بتسجيل أول دين أو دفعة، وستظهر الحركات هنا مباشرة."
                icon="receipt-outline"
                onAction={() =>
                  router.navigate({
                    pathname: "/quick-entry",
                    params: { type: "debt", stamp: String(Date.now()) },
                  })
                }
                title="لا توجد حركات بعد"
              />
            )}
          </View>

          <TopDebtors clients={topDebtors} currency={currency} onOpen={(client) => openClient(client.id)} />
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  loading: {
    gap: spacing.md,
  },
  metricSkeletonRow: {
    flexDirection: "row",
    gap: spacing.md,
  },
  metricSkeleton: {
    flex: 1,
    borderRadius: radius.lg,
  },
  hero: {
    overflow: "hidden",
    position: "relative",
  },
  heroGlow: {
    position: "absolute",
    top: -72,
    left: 0,
    width: 190,
    height: 190,
    borderRadius: 95,
    backgroundColor: colors.debtSoft,
    opacity: 0.9,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  heroLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  heroAmount: {
    marginTop: spacing.md,
  },
  heroHint: {
    marginTop: spacing.xs,
  },
  metrics: {
    flexDirection: "row",
    gap: spacing.md,
    marginTop: spacing.md,
  },
  section: {
    marginTop: spacing.xxl,
  },
});
