import { Badge } from "@/components/ui/badge";
import { IconButton } from "@/components/ui/button";
import {
  formatDate,
  formatSignedAmount,
} from "@/lib/format";
import type { Entry } from "@/lib/types";

interface EntryTableProps {
  entries: Entry[];
  currency: string;
  onEdit: (entry: Entry) => void;
  onDelete: (entry: Entry) => void;
}

function typeBadge(entry: Entry) {
  return entry.operation_type === "DEBT" ? (
    <Badge dot tone="debt">
      دين
    </Badge>
  ) : (
    <Badge dot tone="payment">
      دفعة
    </Badge>
  );
}

function amountClass(entry: Entry): string {
  return entry.operation_type === "DEBT"
    ? "ledger-table__amount ledger-table__amount--debt"
    : "ledger-table__amount ledger-table__amount--payment";
}

function mobileAmountClass(entry: Entry): string {
  return entry.operation_type === "DEBT"
    ? "entry-card__amount entry-card__amount--debt"
    : "entry-card__amount entry-card__amount--payment";
}

export function EntryTable({
  entries,
  currency,
  onEdit,
  onDelete,
}: EntryTableProps) {
  return (
    <>
      <div className="table-wrap">
        <table className="ledger-table">
          <caption className="sr-only">حركة حساب العميل</caption>
          <thead>
            <tr>
              <th scope="col">التاريخ</th>
              <th scope="col">النوع</th>
              <th scope="col">الوصف / السلعة</th>
              <th scope="col">المبلغ</th>
              <th scope="col">
                <span className="sr-only">إجراءات</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => (
              <tr key={entry.id}>
                <td>
                  <span className="ledger-table__date">
                    {formatDate(entry.operation_date)}
                  </span>
                </td>
                <td>{typeBadge(entry)}</td>
                <td className="ledger-table__description">
                  <strong>{entry.description}</strong>
                  {entry.note ? <span>{entry.note}</span> : null}
                </td>
                <td>
                  <span className={amountClass(entry)}>
                    {formatSignedAmount(
                      entry.amount,
                      entry.operation_type,
                      currency,
                    )}
                  </span>
                </td>
                <td>
                  <div className="row-actions">
                    <IconButton
                      icon="edit"
                      label={`تعديل: ${entry.description}`}
                      onClick={() => onEdit(entry)}
                      size="sm"
                    />
                    <IconButton
                      icon="trash"
                      label={`حذف: ${entry.description}`}
                      onClick={() => onDelete(entry)}
                      size="sm"
                      variant="ghost"
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="entry-list-mobile">
        {entries.map((entry) => (
          <article className="entry-card" key={entry.id}>
            <div className="entry-card__top">
              <div className="entry-card__description">
                <strong>{entry.description}</strong>
                <span>{entry.note || "بدون ملاحظة"}</span>
              </div>
              <span className={mobileAmountClass(entry)}>
                {formatSignedAmount(entry.amount, entry.operation_type, currency)}
              </span>
            </div>
            <div className="entry-card__footer">
              <div className="entry-card__meta">
                {typeBadge(entry)}
                <span>{formatDate(entry.operation_date)}</span>
              </div>
              <div className="row-actions">
                <IconButton
                  icon="edit"
                  label={`تعديل: ${entry.description}`}
                  onClick={() => onEdit(entry)}
                  size="sm"
                />
                <IconButton
                  icon="trash"
                  label={`حذف: ${entry.description}`}
                  onClick={() => onDelete(entry)}
                  size="sm"
                  variant="ghost"
                />
              </div>
            </div>
          </article>
        ))}
      </div>
    </>
  );
}
