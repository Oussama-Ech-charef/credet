import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { Icon } from "@/components/ui/icon";
import { formatAmount } from "@/lib/format";
import type { Client } from "@/lib/types";

interface TopDebtorsProps {
  clients: Client[];
  currency: string;
}

export function TopDebtors({ clients, currency }: TopDebtorsProps) {
  return (
    <section aria-labelledby="top-debtors-title" className="panel">
      <header className="panel__header">
        <div>
          <h2 className="panel__title" id="top-debtors-title">
            أكثر العملاء مديونية
          </h2>
          <p className="panel__subtitle">مرتبون حسب الرصيد المستحق</p>
        </div>
        <Link className="panel__link" href="/clients?filter=debt">
          عرض الكل
          <Icon name="chevron-left" size={14} />
        </Link>
      </header>

      <div className="panel__body">
        {clients.length === 0 ? (
          <EmptyState
            compact
            description="لا توجد أرصدة مستحقة حاليًا. كل الحسابات مسددة."
            icon="check"
            title="لا يوجد مدينون"
          />
        ) : (
          <ol className="debtor-list">
            {clients.map((client) => (
              <li className="debtor-list__item" key={client.id}>
                <Avatar name={client.name} size="sm" />
                <Link className="debtor-list__main" href={`/clients/${client.id}`}>
                  <span className="debtor-list__name">{client.name}</span>
                  <span className="debtor-list__meta">
                    {client.phone || "بدون رقم هاتف"}
                  </span>
                </Link>
                <span className="debtor-list__amount">
                  {formatAmount(client.current_balance, currency)}
                </span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
