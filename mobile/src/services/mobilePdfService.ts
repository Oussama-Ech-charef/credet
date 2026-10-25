import * as Print from "expo-print";
import { File } from "expo-file-system";
import type { ClientDetailResponse, DownloadedFile, Entry, ShopSettings } from "@/lib/types";

function escapeHtml(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatMoney(amount: number): string {
  return (Number.isFinite(amount) ? amount : 0).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatDate(dateStr: string): string {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.slice(0, 10).split("-");
  return `${day}/${month}/${year}`;
}

export function generateClientStatementHtml(
  data: ClientDetailResponse,
  entries: Entry[],
  shop: ShopSettings,
): string {
  const balance = data.current_balance;
  const netClass = balance > 0 ? "net-debt" : balance < 0 ? "net-credit" : "net-settled";
  const netLabel = balance > 0 ? "الرصيد الصافي المستحق" : balance < 0 ? "رصيد لصالح العميل (باقي)" : "الحساب مسدد";
  const netHint = balance > 0 ? "مبلغ مستحق على العميل، يرجى سداده." : balance < 0 ? "رصيد إضافي لصالح العميل." : "لا يوجد مبلغ مستحق على العميل.";

  const now = new Date();
  const dateFormatted = `${String(now.getDate()).padStart(2, "0")}/${String(now.getMonth() + 1).padStart(2, "0")}/${now.getFullYear()} - ${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;

  const rowsHtml = entries.length === 0
    ? `<tr><td colspan="4" style="text-align:center; padding: 24px; color: #64748B;">لا توجد معاملات مسجلة ضمن هذه الفترة.</td></tr>`
    : entries.map((entry) => {
        const isDebt = entry.operation_type === "DEBT";
        const badgeColor = isDebt ? "#FEE2E2" : "#DCFCE7";
        const badgeTextColor = isDebt ? "#991B1B" : "#166534";
        const amountColor = isDebt ? "#DC2626" : "#16A34A";
        const sign = isDebt ? "+" : "−";

        return `
          <tr style="border-bottom: 1px solid #E2E8F0;">
            <td style="padding: 10px; text-align: center; font-family: monospace;">${formatDate(entry.operation_date)}</td>
            <td style="padding: 10px; text-align: center;">
              <span style="background: ${badgeColor}; color: ${badgeTextColor}; padding: 3px 8px; border-radius: 999px; font-size: 11px; font-weight: 600;">
                ${isDebt ? "دين" : "دفعة"}
              </span>
            </td>
            <td style="padding: 10px; text-align: right;">
              <div style="font-weight: 500;">${escapeHtml(entry.description)}</div>
              ${entry.note ? `<div style="font-size: 11px; color: #64748B; margin-top: 2px;">${escapeHtml(entry.note)}</div>` : ""}
            </td>
            <td style="padding: 10px; text-align: left; font-family: monospace; font-weight: 600; color: ${amountColor};" dir="ltr">
              ${sign}${formatMoney(entry.amount)}
            </td>
          </tr>
        `;
      }).join("");

  return `
    <!DOCTYPE html>
    <html dir="rtl" lang="ar">
    <head>
      <meta charset="UTF-8">
      <title>كشف حساب - ${escapeHtml(data.client.name)}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap" rel="stylesheet">
      <style>
        body {
          font-family: 'Cairo', sans-serif;
          margin: 0;
          padding: 24px;
          color: #0F172A;
          background: #FFFFFF;
          font-size: 13px;
          line-height: 1.5;
        }
        .header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          border-bottom: 2px solid #E2E8F0;
          padding-bottom: 16px;
          margin-bottom: 20px;
        }
        .shop-title {
          font-size: 20px;
          font-weight: 700;
          color: #1E293B;
        }
        .shop-sub {
          font-size: 12px;
          color: #64748B;
        }
        .doc-meta {
          text-align: left;
        }
        .client-box {
          background: #F8FAFC;
          border: 1px solid #E2E8F0;
          border-radius: 8px;
          padding: 14px;
          margin-bottom: 20px;
          display: flex;
          justify-content: space-between;
        }
        .summary-cards {
          display: flex;
          gap: 12px;
          margin-bottom: 24px;
        }
        .card {
          flex: 1;
          padding: 12px;
          border-radius: 8px;
          border: 1px solid #E2E8F0;
          background: #F8FAFC;
          text-align: center;
        }
        .card-label {
          font-size: 11px;
          color: #64748B;
          margin-bottom: 4px;
        }
        .card-val {
          font-size: 18px;
          font-weight: 700;
          font-family: monospace;
        }
        .net-debt {
          background: #FEF2F2;
          border-color: #FECACA;
          color: #991B1B;
        }
        .net-credit {
          background: #ECFDF5;
          border-color: #A7F3D0;
          color: #047857;
        }
        .net-settled {
          background: #F0FDF4;
          border-color: #BBF7D0;
          color: #166534;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 10px;
        }
        th {
          background: #F1F5F9;
          padding: 10px;
          font-weight: 600;
          border-bottom: 2px solid #CBD5E1;
        }
        .footer {
          margin-top: 40px;
          padding-top: 16px;
          border-top: 1px solid #E2E8F0;
          display: flex;
          justify-content: space-between;
          font-size: 11px;
          color: #64748B;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <div>
          <div class="shop-title">${escapeHtml(shop.shop_name)}</div>
          <div class="shop-sub">سجل الديون والحسابات · الهاتف: ${escapeHtml(shop.shop_phone || "—")}</div>
        </div>
        <div class="doc-meta">
          <div style="font-weight: 700; font-size: 14px;">كشف حساب عميل</div>
          <div style="font-size: 11px; color: #64748B;">تاريخ الإصدار: ${dateFormatted}</div>
        </div>
      </div>

      <div class="client-box">
        <div>
          <div style="font-size: 11px; color: #64748B;">بيانات العميل</div>
          <div style="font-size: 16px; font-weight: 700; color: #0F172A; margin: 2px 0;">${escapeHtml(data.client.name)}</div>
          <div style="font-size: 12px; color: #475569;">
            الهاتف: ${escapeHtml(data.client.phone || "—")} | العنوان: ${escapeHtml(data.client.address || "—")}
          </div>
        </div>
        <div style="text-align: left;">
          <div style="font-size: 11px; color: #64748B;">رقم الملف</div>
          <div style="font-size: 16px; font-weight: 700;">#${data.client.id}</div>
        </div>
      </div>

      <div class="summary-cards">
        <div class="card">
          <div class="card-label">مجموع ما أخذ</div>
          <div class="card-val" style="color: #DC2626;" dir="ltr">${formatMoney(data.total_debt)} ${escapeHtml(shop.currency)}</div>
        </div>
        <div class="card">
          <div class="card-label">مجموع ما دفع</div>
          <div class="card-val" style="color: #16A34A;" dir="ltr">${formatMoney(data.total_paid)} ${escapeHtml(shop.currency)}</div>
        </div>
        <div class="card ${netClass}">
          <div class="card-label">${netLabel}</div>
          <div class="card-val" dir="ltr">${formatMoney(Math.abs(data.current_balance))} ${escapeHtml(shop.currency)}</div>
          <div style="font-size: 10px; margin-top: 2px;">${netHint}</div>
        </div>
      </div>

      <div style="font-weight: 700; font-size: 14px; margin-bottom: 6px;">جدول الحركات المالية (${entries.length})</div>
      <table>
        <thead>
          <tr>
            <th style="width: 18%; text-align: center;">التاريخ</th>
            <th style="width: 14%; text-align: center;">النوع</th>
            <th style="width: 48%; text-align: right;">البيان / السلعة</th>
            <th style="width: 20%; text-align: left;">المبلغ (${escapeHtml(shop.currency)})</th>
          </tr>
        </thead>
        <tbody>
          ${rowsHtml}
        </tbody>
      </table>

      <div class="footer">
        <div>شكرًا لتعاملكم مع ${escapeHtml(shop.shop_name)}</div>
        <div>تم الإنشاء بواسطة Credet</div>
      </div>
    </body>
    </html>
  `;
}

export async function createStatementPdfFile(
  data: ClientDetailResponse,
  entries: Entry[],
  shop: ShopSettings,
): Promise<DownloadedFile> {
  const html = generateClientStatementHtml(data, entries, shop);
  const { uri } = await Print.printToFileAsync({ html });
  const file = new File(uri);
  const bytes = await file.bytes();

  return {
    bytes,
    filename: `credet-client-${data.client.id}.pdf`,
    contentType: "application/pdf",
  };
}
