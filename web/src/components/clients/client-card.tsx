import Link from "next/link";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Icon } from "@/components/ui/icon";
import {
  formatAmount,
  formatDate,
  normalizePhoneForTel,
  normalizePhoneForWhatsApp,
} from "@/lib/format";
import type { Client } from "@/lib/types";

interface ClientCardProps {
  client: Client;
  currency: string;
}

function balanceBadge(client: Client, currency: string) {
  if (client.current_balance > 0) {
    return (
      <Badge dot tone="debt">
        {formatAmount(client.current_balance, currency)}
      </Badge>
    );
  }

  if (client.current_balance < 0) {
    return (
      <Badge dot tone="payment">
        له: {formatAmount(Math.abs(client.current_balance), currency)}
      </Badge>
    );
  }

  return (
    <Badge dot tone="payment">
      الحساب مسدد
    </Badge>
  );
}

export function ClientCard({ client, currency }: ClientCardProps) {
  const phone = client.phone?.trim();
  const whatsapp = phone ? normalizePhoneForWhatsApp(phone) : "";

  return (
    <article className="client-card">
      <Link
        aria-label={`فتح ملف ${client.name}`}
        className="client-card__overlay"
        href={`/clients/${client.id}`}
      />

      <div className="client-card__content">
        <div className="client-card__top">
          <Avatar name={client.name} />
          <div className="client-card__identity">
            <span className="client-card__name">{client.name}</span>
            <span className="client-card__meta">
              {client.address || "بدون عنوان مسجل"}
            </span>
          </div>
          <div className="client-card__balance">{balanceBadge(client, currency)}</div>
        </div>

        <div className="client-card__contacts">
          {phone ? (
            <>
              <a className="contact-link" href={`tel:${normalizePhoneForTel(phone)}`}>
                <Icon name="phone" size={13} />
                <span dir="ltr">{phone}</span>
              </a>
              {whatsapp ? (
                <a
                  className="contact-link contact-link--whatsapp"
                  href={`https://wa.me/${whatsapp}`}
                  rel="noreferrer"
                  target="_blank"
                >
                  <Icon name="message" size={13} />
                  واتساب
                </a>
              ) : null}
            </>
          ) : (
            <span className="client-card__no-phone">لا يوجد رقم هاتف</span>
          )}
        </div>

        <div className="client-card__footer">
          <span>
            {client.last_operation_date
              ? `آخر حركة: ${formatDate(client.last_operation_date)}`
              : "لا توجد حركات بعد"}
          </span>
          <Icon className="client-card__arrow" name="chevron-left" size={16} />
        </div>
      </div>
    </article>
  );
}
