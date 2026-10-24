"use client";

import { BackupPanel } from "@/components/settings/backup-panel";
import { ShopProfileForm } from "@/components/settings/shop-profile-form";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { PageHeader } from "@/components/ui/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { useSettings } from "@/hooks/use-settings";

export default function SettingsPage() {
  const { settings, loading, error, refresh } = useSettings();

  return (
    <div className="page">
      <PageHeader
        actions={
          <Button
            icon="refresh"
            loading={loading}
            onClick={() => void refresh()}
            variant="outline"
          >
            تحديث البيانات
          </Button>
        }
        description="اضبط هوية المتجر التي تظهر في الكشوف، واحتفظ بنسخة من الدفتر في أي وقت."
        title="الإعدادات"
      />

      {loading ? (
        <div className="settings-grid">
          <div className="settings-card">
            <div className="skeleton-stack">
              <Skeleton height={22} width="45%" />
              <Skeleton height={12} width="80%" />
              <Skeleton height={44} style={{ marginTop: 14 }} />
              <Skeleton height={44} />
              <Skeleton height={44} />
            </div>
          </div>
          <div className="settings-card">
            <div className="skeleton-stack">
              <Skeleton height={22} width="45%" />
              <Skeleton height={12} width="80%" />
              <Skeleton height={86} style={{ marginTop: 14 }} />
              <Skeleton height={86} />
            </div>
          </div>
        </div>
      ) : error && !settings ? (
        <div className="error-state" role="alert">
          <Icon name="alert" size={20} />
          <div>
            <strong>تعذر تحميل الإعدادات.</strong>
            <p style={{ margin: "4px 0 10px" }}>{error}</p>
            <Button onClick={() => void refresh()} size="sm" variant="secondary">
              إعادة المحاولة
            </Button>
          </div>
        </div>
      ) : settings ? (
        <>
          {error ? (
            <div
              className="error-state"
              role="alert"
              style={{ marginBottom: 16 }}
            >
              <Icon name="alert" size={18} />
              <span>{error}</span>
            </div>
          ) : null}
          <div className="settings-grid">
            <ShopProfileForm settings={settings} />
            <BackupPanel />
          </div>
        </>
      ) : null}
    </div>
  );
}
