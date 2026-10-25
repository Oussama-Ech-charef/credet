"use client";

import { useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchField } from "@/components/ui/search-field";
import { clientMatchesSearch, formatAmount } from "@/lib/format";
import type { Client } from "@/lib/types";

interface ClientPickerProps {
  clients: Client[];
  selectedId: number | null;
  onSelect: (client: Client) => void;
  currency?: string;
}

export function ClientPicker({
  clients,
  selectedId,
  onSelect,
  currency = "DH",
}: ClientPickerProps) {
  const [query, setQuery] = useState("");
  const filtered = useMemo(
    () => clients.filter((client) => clientMatchesSearch(client, query)),
    [clients, query],
  );

  return (
    <div className="client-picker">
      <SearchField
        autoFocus
        label="ابحث عن العميل"
        onChange={setQuery}
        placeholder="ابحث بالاسم أو الهاتف..."
        value={query}
      />
      <div
        aria-label="قائمة العملاء"
        className="client-picker__list"
        role="group"
      >
        {filtered.length === 0 ? (
          <EmptyState
            compact
            description="جرّب اسمًا أو رقم هاتف آخر."
            icon="search"
            title="لا توجد نتيجة"
          />
        ) : (
          filtered.map((client) => {
            const balanceText =
              client.current_balance < 0
                ? `له: ${formatAmount(Math.abs(client.current_balance), currency)}`
                : client.current_balance > 0
                  ? formatAmount(client.current_balance, currency)
                  : "مسدد";

            return (
              <button
                className={
                  selectedId === client.id
                    ? "client-picker__option is-selected"
                    : "client-picker__option"
                }
                key={client.id}
                onClick={() => onSelect(client)}
                type="button"
              >
                <Avatar name={client.name} size="sm" />
                <span className="client-picker__identity">
                  <strong>{client.name}</strong>
                  <span>{client.phone || client.address || "بدون بيانات اتصال"}</span>
                </span>
                <span
                  className={
                    client.current_balance > 0
                      ? "client-picker__balance client-picker__balance--debt"
                      : client.current_balance < 0
                        ? "client-picker__balance client-picker__balance--payment"
                        : "client-picker__balance"
                  }
                >
                  {balanceText}
                </span>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
