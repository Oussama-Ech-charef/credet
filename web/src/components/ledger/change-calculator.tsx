import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { cn } from "@/lib/cn";
import { formatAmount, roundAmount } from "@/lib/format";

interface ChangeCalculatorProps {
  currentDebt: number;
  enteredAmount: number;
  currency: string;
  onReturnChange: () => void;
  onKeepAdvance: () => void;
  compact?: boolean;
}

export function ChangeCalculator({
  currentDebt,
  enteredAmount,
  currency,
  onReturnChange,
  onKeepAdvance,
  compact = false,
}: ChangeCalculatorProps) {
  const changeDue = roundAmount(enteredAmount - currentDebt);

  if (currentDebt <= 0 || changeDue <= 0) {
    return null;
  }

  return (
    <section
      aria-label="حاسبة الصرف"
      aria-live="polite"
      className={cn(
        "change-calculator",
        compact && "change-calculator--compact",
      )}
    >
      <header className="change-calculator__head">
        <span aria-hidden="true" className="change-calculator__icon">
          <Icon name="wallet" size={17} />
        </span>
        <div className="change-calculator__copy">
          <strong>حاسبة الصرف</strong>
          <span>المبلغ المدخل أكبر من الدين المستحق.</span>
        </div>
        <Badge tone="warning">دفعة زائدة</Badge>
      </header>

      <dl className="change-calculator__rows">
        <div>
          <dt>الدين المستحق</dt>
          <dd>{formatAmount(currentDebt, currency)}</dd>
        </div>
        <div className="change-calculator__row--change">
          <dt>الصرف المتبقي للعميل</dt>
          <dd>{formatAmount(changeDue, currency)}</dd>
        </div>
      </dl>

      <div className="change-calculator__actions">
        <Button
          icon="refresh"
          onClick={onReturnChange}
          size="sm"
          variant="secondary"
        >
          إرجاع الصرف للعميل
        </Button>
        <Button
          icon="note"
          onClick={onKeepAdvance}
          size="sm"
          variant="success"
        >
          الاحتفاظ بالباقي كعربون
        </Button>
      </div>

      {!compact ? (
        <p className="change-calculator__hint">
          «إرجاع الصرف» يعدّل الدفعة إلى قيمة الدين فقط، أما «الاحتفاظ كعربون»
          فيبقي المبلغ كاملًا ويضيف ملاحظة بالرصيد المتبقي للعميل.
        </p>
      ) : null}
    </section>
  );
}
