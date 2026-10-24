"use client";

import { useCallback, useEffect, useState } from "react";
import { ClientFormModal } from "@/components/clients/client-form-modal";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { MetricBand } from "@/components/dashboard/metric-band";
import { QuickEntryModal } from "@/components/dashboard/quick-entry-modal";
import { TopDebtors } from "@/components/dashboard/top-debtors";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/hooks/use-settings";
import { api, apiErrorMessage } from "@/lib/api";
import type {
  Client,
  EntryMutationResponse,
  StatsOverview,
} from "@/lib/types";

export default function DashboardPage() {
  const { currency } = useSettings();
  const [stats, setStats] = useState<StatsOverview | null>(null);
  const [topDebtors, setTopDebtors] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [clientModalOpen, setClientModalOpen] = useState(false);
  const [quickEntryOpen, setQuickEntryOpen] = useState(false);

  const load = useCallback(async (signal?: AbortSignal, isRefresh = false) => {
    if (!isRefresh) {
      setLoading(true);
    }

    setError("");

    try {
      const [statsData, debtorsData] = await Promise.all([
        api.getStats(signal),
        api.listClients({ status: "debt" }, signal),
      ]);

      if (signal?.aborted) {
        return;
      }

      setStats(statsData);
      setTopDebtors(
        [...debtorsData]
          .sort((left, right) => right.current_balance - left.current_balance)
          .slice(0, 5),
      );
    } catch (requestError) {
      if (!signal?.aborted) {
        setError(apiErrorMessage(requestError));
      }
    } finally {
      if (!signal?.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  function handleClientCreated() {
    void load(undefined, true);
  }

  function handleQuickSaved(_result: EntryMutationResponse) {
    void load(undefined, true);
  }

  return (
    <div className="page">
      <PageHeader
        description="نظرة سريعة على ما يدور في الدفتر: المستحقات، الحركة اليومية، والكليان الذين يحتاجون متابعة."
        title="دفتر اليوم"
      />

      {loading ? (
        <>
          <section className="stat-band">
            <Skeleton height={16} width={140} />
            <div className="stat-band__grid">
              <div className="stat">
                <Skeleton height={12} width={110} />
                <Skeleton height={38} style={{ marginTop: 10 }} width={190} />
              </div>
              <div className="stat">
                <Skeleton height={12} width={110} />
                <Skeleton height={34} style={{ marginTop: 10 }} width={80} />
              </div>
              <div className="stat">
                <Skeleton height={12} width={120} />
                <Skeleton height={34} style={{ marginTop: 10 }} width={130} />
              </div>
            </div>
          </section>
          <div className="quick-actions">
            <Skeleton height={72} />
            <Skeleton height={72} />
          </div>
          <div className="dashboard-grid">
            <div className="panel">
              <div className="panel__header">
                <Skeleton height={18} width={130} />
              </div>
              <div className="panel__body">
                <div className="skeleton-stack">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton height={54} key={index} />
                  ))}
                </div>
              </div>
            </div>
            <div className="panel">
              <div className="panel__header">
                <Skeleton height={18} width={150} />
              </div>
              <div className="panel__body">
                <div className="skeleton-stack">
                  {Array.from({ length: 4 }).map((_, index) => (
                    <Skeleton height={44} key={index} />
                  ))}
                </div>
              </div>
            </div>
          </div>
        </>
      ) : error ? (
        <div className="error-state" role="alert">
          <Icon name="alert" size={20} />
          <div>
            <strong>تعذر تحميل لوحة التحكم.</strong>
            <p style={{ margin: "4px 0 10px" }}>{error}</p>
            <Button onClick={() => void load()} size="sm" variant="secondary">
              إعادة المحاولة
            </Button>
          </div>
        </div>
      ) : stats ? (
        <>
          <MetricBand currency={currency} stats={stats} />

          <div className="quick-actions">
            <button
              className="action-tile"
              onClick={() => setClientModalOpen(true)}
              type="button"
            >
              <span aria-hidden="true" className="action-tile__icon">
                <Icon name="users" size={20} />
              </span>
              <span className="action-tile__copy">
                <strong>إضافة كليان جديد</strong>
                <span>افتح حسابًا جديدًا في الدفتر</span>
              </span>
            </button>
            <button
              className="action-tile action-tile--debt"
              onClick={() => setQuickEntryOpen(true)}
              type="button"
            >
              <span aria-hidden="true" className="action-tile__icon">
                <Icon name="plus" size={20} />
              </span>
              <span className="action-tile__copy">
                <strong>تسجيل كريدي سريع</strong>
                <span>اختر الكليان وأدخل المبلغ فورًا</span>
              </span>
            </button>
          </div>

          <div className="dashboard-grid">
            <ActivityFeed
              currency={currency}
              items={stats.recent_activity}
              onQuickEntry={() => setQuickEntryOpen(true)}
            />

            <div className="dashboard-side">
              <TopDebtors clients={topDebtors} currency={currency} />
              <aside className="tip-panel">
                <span aria-hidden="true" className="tip-panel__icon">
                  <Icon name="clock" size={18} />
                </span>
                <h2>إدخال أسرع</h2>
                <p>
                  عند تسجيل حركة، يبدأ المؤشر في خانة المبلغ مباشرة. اكتب المبلغ،
                  ثم الوصف، واضغط Enter لحفظ الحركة.
                </p>
              </aside>
            </div>
          </div>
        </>
      ) : null}

      <ClientFormModal
        onClose={() => setClientModalOpen(false)}
        onCreated={handleClientCreated}
        open={clientModalOpen}
      />
      <QuickEntryModal
        currency={currency}
        onClose={() => setQuickEntryOpen(false)}
        onSaved={handleQuickSaved}
        open={quickEntryOpen}
      />
    </div>
  );
}
