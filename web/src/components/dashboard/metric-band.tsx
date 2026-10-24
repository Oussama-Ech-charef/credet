import { StatCard } from "@/components/ui/stat-card";
import { formatAmount, formatCount } from "@/lib/format";
import type { StatsOverview } from "@/lib/types";

interface MetricBandProps {
  stats: StatsOverview;
  currency: string;
}

export function MetricBand({ stats, currency }: MetricBandProps) {
  return (
    <section aria-labelledby="ledger-summary-title" className="stat-band">
      <div className="stat-band__head">
        <div>
          <h2 className="stat-band__title" id="ledger-summary-title">
            ملخص الدفتر
          </h2>
          <p className="stat-band__note">
            الأرقام محدثة من قاعدة البيانات، وكل مبلغ مرتبط بحركة مسجلة.
          </p>
        </div>
      </div>

      <div className="stat-band__grid">
        <StatCard
          className="stat--lead"
          label="إجمالي الديون القائمة"
          meta="مجموع الأرصدة الموجبة فقط"
          tone="debt"
          value={formatAmount(stats.total_receivable_amount, currency)}
        />
        <StatCard
          label="عدد الكليان المدينين"
          meta="حساب واحد على الأقل عليه رصيد"
          tone="neutral"
          value={formatCount(stats.total_debtors)}
        />
        <StatCard
          label="المداخيل المسترجعة اليوم"
          meta="مجموع الدفعات المسجلة اليوم"
          tone="payment"
          value={formatAmount(stats.total_collected_today, currency)}
        />
      </div>
    </section>
  );
}
