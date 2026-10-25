'use strict';

const fs = require('node:fs');
const path = require('node:path');
const { roundMoney } = require('../utils/money');

const TEMPLATE_DIRECTORY = path.join(__dirname, '..', 'templates');
const FONT_PATH = path.join(
  __dirname,
  '..',
  '..',
  'assets',
  'fonts',
  'Cairo-Variable.ttf',
);

function readRequiredFile(filePath, label) {
  try {
    return fs.readFileSync(filePath, 'utf8');
  } catch (error) {
    throw new Error(`Unable to load ${label} at ${filePath}: ${error.message}`);
  }
}

const statementTemplate = readRequiredFile(
  path.join(TEMPLATE_DIRECTORY, 'statement.html'),
  'statement template',
);
const generalReportTemplate = readRequiredFile(
  path.join(TEMPLATE_DIRECTORY, 'general-report.html'),
  'general report template',
);
const receiptTemplate = readRequiredFile(
  path.join(TEMPLATE_DIRECTORY, 'receipt.html'),
  'receipt template',
);
const baseCss = readRequiredFile(
  path.join(TEMPLATE_DIRECTORY, 'base.css'),
  'base stylesheet',
);

let fontBase64;

try {
  fontBase64 = fs.readFileSync(FONT_PATH).toString('base64');
} catch (error) {
  throw new Error(`Unable to load the Cairo font at ${FONT_PATH}: ${error.message}`);
}

const FONT_CSS = `@font-face {
  font-family: 'Cairo';
  src: url(data:font/ttf;base64,${fontBase64}) format('truetype');
  font-weight: 200 1000;
  font-style: normal;
  font-display: block;
}`;

const HTML_ESCAPES = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#39;',
};

const TOKEN_PATTERN = /\{\{([A-Z0-9_]+)\}\}/g;
const MONEY_FORMATTER = new Intl.NumberFormat('en-US', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function escapeHtml(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (character) => HTML_ESCAPES[character],
  );
}

function escapeMultiline(value) {
  return escapeHtml(value).replace(/\r\n?|\n/g, '<br>');
}

function formatMoney(value) {
  return MONEY_FORMATTER.format(roundMoney(value));
}

function formatDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return '—';
  }

  const [year, month, day] = value.split('-');
  return `${day}/${month}/${year}`;
}

function formatInitial(name) {
  const firstCharacter = Array.from(String(name || '').trim())[0];
  return firstCharacter || 'ك';
}

function formatNetClass(balance) {
  if (balance > 0) {
    return 'net-debt';
  }

  if (balance < 0) {
    return 'net-credit';
  }

  return 'net-settled';
}

function formatNetLabel(balance) {
  if (balance > 0) {
    return 'الرصيد الصافي المستحق';
  }

  if (balance < 0) {
    return 'رصيد لصالح العميل';
  }

  return 'الحساب مسدد';
}

function formatNetHint(balance) {
  if (balance > 0) {
    return 'مبلغ مستحق على العميل، يرجى سداده.';
  }

  if (balance < 0) {
    return 'دفع العميل أكثر من المستحق، والرصيد لصالحه.';
  }

  return 'لا يوجد مبلغ مستحق على العميل.';
}

function formatBalanceClass(balance) {
  if (balance > 0) {
    return 'balance-positive';
  }

  if (balance < 0) {
    return 'balance-negative';
  }

  return 'balance-zero';
}

function formatBalanceLabel(balance) {
  if (balance > 0) {
    return 'مدين';
  }

  if (balance < 0) {
    return 'رصيد لصالحه';
  }

  return 'مسدد';
}

function formatBalanceBadgeClass(balance) {
  if (balance > 0) {
    return 'badge-debt';
  }

  return 'badge-settled';
}

function formatEntryType(operationType) {
  if (operationType === 'PAYMENT') {
    return {
      label: 'دفعة',
      panelClass: 'type-payment',
      badgeClass: 'badge-payment',
      amountClass: 'amount-payment',
      sign: '−',
      hint: 'خصم المبلغ من رصيد العميل',
      balanceLabel: 'الرصيد بعد تسجيل الدفعة',
    };
  }

  return {
    label: 'دين',
    panelClass: 'type-debt',
    badgeClass: 'badge-debt',
    amountClass: 'amount-debt',
    sign: '+',
    hint: 'أضيف المبلغ إلى رصيد العميل',
    balanceLabel: 'الرصيد بعد إضافة الدين',
  };
}

function formatPeriodLabel(range) {
  if (range?.from && range?.to) {
    return `من ${formatDate(range.from)} إلى ${formatDate(range.to)}`;
  }

  if (range?.from) {
    return `من ${formatDate(range.from)} حتى تاريخ الإصدار`;
  }

  if (range?.to) {
    return `حتى ${formatDate(range.to)}`;
  }

  return 'كافة المعاملات المسجلة';
}

function formatPeriodNote(range) {
  if (range?.from || range?.to) {
    return 'الجدول أدناه يعرض معاملات الفترة المحددة فقط، بينما يشمل الملخص المالي كامل الحساب.';
  }

  return '';
}

function formatClientPhone(phone) {
  if (!phone) {
    return '<span class="muted">—</span>';
  }

  return `<span dir="ltr">${escapeHtml(phone)}</span>`;
}

function formatClientAddress(address) {
  if (!address) {
    return '<span class="muted">—</span>';
  }

  return escapeMultiline(address);
}

function formatClientNotesBlock(notes) {
  if (!notes) {
    return '';
  }

  return `<div class="client-notes"><span class="label">ملاحظات</span><p>${escapeMultiline(notes)}</p></div>`;
}

function formatEmptyRow(colspan, title, copy) {
  return `<tr class="empty-row"><td colspan="${colspan}">
    <div class="empty-mark" aria-hidden="true">—</div>
    <div class="empty-title">${escapeHtml(title)}</div>
    <div class="empty-copy">${escapeHtml(copy)}</div>
  </td></tr>`;
}

function formatTransactionRows(entries) {
  if (entries.length === 0) {
    return formatEmptyRow(
      4,
      'لا توجد معاملات',
      'لم يتم تسجيل أي حركة مالية ضمن الفترة المحددة.',
    );
  }

  return entries.map((entry) => {
    const type = formatEntryType(entry.operation_type);
    const note = entry.note
      ? `<div class="entry-note">${escapeMultiline(entry.note)}</div>`
      : '';

    return `<tr>
      <td class="col-date"><span class="mono" dir="ltr">${formatDate(entry.operation_date)}</span></td>
      <td class="col-type"><span class="badge ${type.badgeClass}">${type.label}</span></td>
      <td class="col-desc">
        <div class="desc">${escapeMultiline(entry.description)}</div>
        ${note}
      </td>
      <td class="col-amount"><span class="amount ${type.amountClass}" dir="ltr">${type.sign}${formatMoney(entry.amount)}</span></td>
    </tr>`;
  }).join('');
}

function formatReportRows(clients) {
  if (clients.length === 0) {
    return formatEmptyRow(
      6,
      'لا توجد بيانات',
      'لم يتم العثور على عملاء مطابقين لهذا التقرير.',
    );
  }

  return clients.map((client) => {
    const balanceClass = formatBalanceClass(client.current_balance);
    const badgeClass = formatBalanceBadgeClass(client.current_balance);
    const statusLabel = formatBalanceLabel(client.current_balance);
    const phone = client.phone
      ? `<span dir="ltr">${escapeHtml(client.phone)}</span>`
      : '—';
    const lastOperation = client.last_operation_date
      ? `<span class="mono" dir="ltr">${formatDate(client.last_operation_date)}</span>`
      : '—';

    return `<tr>
      <td class="col-client">
        <div class="client-cell-name" dir="auto">${escapeHtml(client.name)}</div>
        <div class="client-cell-phone">${phone}</div>
      </td>
      <td class="col-last">${lastOperation}</td>
      <td class="col-total"><span class="amount" dir="ltr">${formatMoney(client.total_debt)}</span></td>
      <td class="col-total"><span class="amount amount-payment" dir="ltr">${formatMoney(client.total_paid)}</span></td>
      <td class="col-balance"><span class="amount ${balanceClass}" dir="ltr">${formatMoney(client.current_balance)}</span></td>
      <td class="col-status"><span class="badge ${badgeClass}">${statusLabel}</span></td>
    </tr>`;
  }).join('');
}

function renderTemplate(template, values, name) {
  const missing = new Set();

  const html = template.replace(TOKEN_PATTERN, (match, key) => {
    if (!Object.prototype.hasOwnProperty.call(values, key)) {
      missing.add(key);
      return '';
    }

    return values[key] === undefined || values[key] === null
      ? ''
      : String(values[key]);
  });

  if (missing.size > 0) {
    throw new Error(
      `Missing values for ${name}: ${Array.from(missing).sort().join(', ')}`,
    );
  }

  return html;
}

function renderClientStatement(data) {
  const balance = data.totals.current_balance;

  return renderTemplate(statementTemplate, {
    FONT_CSS,
    BASE_CSS: baseCss,
    DOCUMENT_TITLE: escapeHtml(`كشف حساب - ${data.client.name}`),
    SHOP_NAME: escapeHtml(data.shop.name),
    SHOP_PHONE: formatClientPhone(data.shop.phone),
    SHOP_INITIAL: escapeHtml(formatInitial(data.shop.name)),
    GENERATED_AT: escapeHtml(data.generated.display),
    STATEMENT_NUMBER: escapeHtml(data.statementNumber),
    PERIOD_LABEL: escapeHtml(formatPeriodLabel(data.range)),
    PERIOD_NOTE: escapeHtml(formatPeriodNote(data.range)),
    CLIENT_NAME: escapeHtml(data.client.name),
    CLIENT_INITIAL: escapeHtml(formatInitial(data.client.name)),
    CLIENT_ID: escapeHtml(data.client.id),
    CLIENT_PHONE: formatClientPhone(data.client.phone),
    CLIENT_ADDRESS: formatClientAddress(data.client.address),
    CLIENT_NOTES_BLOCK: formatClientNotesBlock(data.client.notes),
    TOTAL_DEBT: formatMoney(data.totals.total_debt),
    TOTAL_PAID: formatMoney(data.totals.total_paid),
    NET_BALANCE: formatMoney(balance),
    NET_CARD_CLASS: formatNetClass(balance),
    NET_STATUS_LABEL: escapeHtml(formatNetLabel(balance)),
    NET_HINT: escapeHtml(formatNetHint(balance)),
    ENTRY_COUNT: String(data.entries.length),
    CURRENCY: escapeHtml(data.shop.currency),
    TRANSACTION_ROWS: formatTransactionRows(data.entries),
  }, 'statement.html');
}

function renderGeneralReport(data) {
  return renderTemplate(generalReportTemplate, {
    FONT_CSS,
    BASE_CSS: baseCss,
    DOCUMENT_TITLE: escapeHtml(`تقرير الديون العام - ${data.shop.name}`),
    SHOP_NAME: escapeHtml(data.shop.name),
    SHOP_PHONE: formatClientPhone(data.shop.phone),
    SHOP_INITIAL: escapeHtml(formatInitial(data.shop.name)),
    GENERATED_AT: escapeHtml(data.generated.display),
    REPORT_NUMBER: escapeHtml(data.reportNumber),
    FILTER_LABEL: escapeHtml(data.filterLabel),
    FILTER_NOTE: escapeHtml(data.filterNote),
    CLIENT_COUNT: String(data.totals.client_count),
    DEBTOR_COUNT: String(data.totals.debtor_count),
    SETTLED_COUNT: String(data.totals.settled_count),
    TOTAL_DEBT: formatMoney(data.totals.total_debt),
    TOTAL_PAID: formatMoney(data.totals.total_paid),
    TOTAL_RECEIVABLE: formatMoney(data.totals.total_receivable),
    CURRENCY: escapeHtml(data.shop.currency),
    REPORT_ROWS: formatReportRows(data.clients),
  }, 'general-report.html');
}

function renderReceipt(data) {
  const type = formatEntryType(data.entry.operation_type);
  const note = data.entry.note
    ? escapeMultiline(data.entry.note)
    : 'لا توجد ملاحظات.';

  return renderTemplate(receiptTemplate, {
    FONT_CSS,
    BASE_CSS: baseCss,
    DOCUMENT_TITLE: escapeHtml(`إيصال معاملة - ${data.client.name}`),
    SHOP_NAME: escapeHtml(data.shop.name),
    SHOP_PHONE: formatClientPhone(data.shop.phone),
    SHOP_INITIAL: escapeHtml(formatInitial(data.shop.name)),
    GENERATED_AT: escapeHtml(data.generated.display),
    RECEIPT_NUMBER: escapeHtml(data.receiptNumber),
    CLIENT_NAME: escapeHtml(data.client.name),
    CLIENT_INITIAL: escapeHtml(formatInitial(data.client.name)),
    CLIENT_ID: escapeHtml(data.client.id),
    CLIENT_PHONE: formatClientPhone(data.client.phone),
    CLIENT_ADDRESS: formatClientAddress(data.client.address),
    ENTRY_TYPE_CLASS: type.panelClass,
    ENTRY_TYPE_LABEL: escapeHtml(type.label),
    ENTRY_TYPE_HINT: escapeHtml(type.hint),
    ENTRY_SIGN: type.sign,
    ENTRY_AMOUNT: formatMoney(data.entry.amount),
    ENTRY_DATE: formatDate(data.entry.operation_date),
    ENTRY_DESCRIPTION: escapeMultiline(data.entry.description),
    ENTRY_NOTE: note,
    BALANCE_AFTER: formatMoney(data.balance_after),
    BALANCE_AFTER_CLASS: formatBalanceClass(data.balance_after),
    BALANCE_AFTER_LABEL: escapeHtml(type.balanceLabel),
    CURRENCY: escapeHtml(data.shop.currency),
  }, 'receipt.html');
}

module.exports = {
  renderClientStatement,
  renderGeneralReport,
  renderReceipt,
};
