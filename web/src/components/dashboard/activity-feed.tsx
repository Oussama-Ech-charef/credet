import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import {
  formatAmount,
  formatSignedAmount,
  relativeDayLabel,
} from "@/lib/format";
import type { ActivityItem } from "@/lib/types";

interface ActivityFeedProps {
  items: ActivityItem[];
  currency: string;
  onQuickEntry: () => void;
}

export function ActivityFeed({
  items,
  currency,
  onQuickEntry,
}: ActivityFeedProps) {
  return (
    <section aria-labelledby="recent-activity-title" className="panel">
      <header className="panel__header">
        <div>
          <h2 className="panel__title" id="recent-activity-title">
            آخر الحركات
          </h2>
          <p className="panel__subtitle">آخر 10 حركات مسجلة في الدفتر</p>
        </div>
        <Link className="panel__link" href="/clients">
          كل الكليان
          <Icon name="chevron-left" size={14} />
        </Link>
      </header>

      <div className="panel__body">
        {items.length === 0 ? (
          <EmptyState
            compact
            action={
              <Button icon="plus" onClick={onQuickEntry} size="sm" variant="primary">
                تسجيل أول حركة
              </Button>
            }
            description="ستظهر هنا كل حركة كريدي أو دفعة بمجرد تسجيلها."
            icon="receipt"
            title="لا توجد حركات بعد"
          />
        ) : (
          <ol className="activity">
            {items.map((item) => {
              const isDebt = item.operation_type === "DEBT";

              return (
                <li className="activity__item" key={item.id}>
                  <span
                    aria-hidden="true"
                    className={`activity__marker ${
                      isDebt
                        ? "activity__marker--debt"
                        : "activity__marker--payment"
                    }`}
                  >
                    <Icon name={isDebt ? "plus" : "minus"} size={15} />
                  </span>

                  <div className="activity__content">
                    <div className="activity__top">
                      <Link
                        className="activity__client"
                        href={`/clients/${item.client_id}`}
                      >
                        {item.client_name}
                      </Link>
                      <span className="activity__description">
                        {item.description}
                      </span>
                    </div>
                    <div className="activity__meta">
                      <span>{relativeDayLabel(item.operation_date)}</span>
                      <span aria-hidden="true"> · </span>
                      <span>{isDebt ? "كريدي" : "دفعة"}</span>
                    </div>
                  </div>

                  <div
                    className={`activity__amount ${
                      isDebt
                        ? "activity__amount--debt"
                        : "activity__amount--payment"
                    }`}
                  >
                    {formatSignedAmount(item.amount, item.operation_type, currency)}
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </section>
  );
}
