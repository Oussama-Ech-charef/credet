import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import { balanceKind, formatAmount, paidRatio } from "@/lib/format";

interface BalancePanelProps {
  totalDebt: number;
  totalPaid: number;
  currentBalance: number;
  currency: string;
}

export function BalancePanel({
  totalDebt,
  totalPaid,
  currentBalance,
  currency,
}: BalancePanelProps) {
  const kind = balanceKind(currentBalance);
  const ratio = paidRatio(totalDebt, totalPaid);
  const amountClass =
    kind === "debt"
      ? "balance-panel__amount balance-panel__amount--debt"
      : kind === "credit"
        ? "balance-panel__amount balance-panel__amount--payment"
        : "balance-panel__amount";
  const badge =
    kind === "debt" ? (
      <Badge dot tone="debt">
        عليه كريدي
      </Badge>
    ) : kind === "credit" ? (
      <Badge dot tone="payment">
        رصيد لصالحه
      </Badge>
    ) : (
      <Badge dot tone="payment">
        الحساب خالص
      </Badge>
    );

  return (
    <section aria-labelledby="balance-title" className="balance-panel">
      <div className="balance-panel__main">
        <div className="balance-panel__label" id="balance-title">
          <Icon name="wallet" size={16} />
          الباقي الصافي الواجب أداؤه
          {badge}
        </div>
        <strong className={amountClass}>
          {formatAmount(currentBalance, currency)}
        </strong>
        <p className="balance-panel__hint">
          {kind === "debt"
            ? "هذا هو المبلغ المتبقي على الكليان بعد كل الدفعات."
            : kind === "credit"
              ? "الرصيد لصالح الكليان، أي أنه دفع أكثر مما أخذ."
              : "لا يوجد رصيد متبقٍ على هذا الحساب."}
        </p>
      </div>

      <div className="balance-panel__side">
        <div className="balance-metric">
          <span className="balance-metric__label">مجموع ما أخذ</span>
          <span className="balance-metric__value balance-metric__value--debt">
            {formatAmount(totalDebt, currency)}
          </span>
        </div>
        <div className="balance-metric">
          <span className="balance-metric__label">مجموع ما دفع</span>
          <span className="balance-metric__value balance-metric__value--payment">
            {formatAmount(totalPaid, currency)}
          </span>
        </div>
        <div className="paid-progress">
          <div className="paid-progress__head">
            <span>نسبة التسديد من مجموع الكريدي</span>
            <strong>{ratio}%</strong>
          </div>
          <div
            aria-label={`نسبة التسديد ${ratio}%`}
            aria-valuemax={100}
            aria-valuemin={0}
            aria-valuenow={ratio}
            className="paid-bar"
            role="progressbar"
          >
            <div
              className="paid-bar__fill"
              style={{ transform: `scaleX(${ratio / 100})` }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}
