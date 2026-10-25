# Phase 8: Overpayment Handling & Smart Change Calculator (Zero Negative Balance Display)

## 🎯 Phase Goal

In retail ledger bookkeeping (e.g., grocery stores / "حانوت"), when a customer owes **50 DH** and pays **60 DH** or **100 DH**, the current balance becomes mathematically negative (`-10.00 DH`). 

Displaying negative amounts like `-10.00 DH` confuses merchants and customers, especially on WhatsApp statements, PDF receipts, and client badges. Furthermore, the merchant often needs to know the exact change to return, or needs an explicit choice to record the difference as an advance credit (عربون / باقي).

After this phase:
1. **Zero Negative Display**: The negative sign (`-`) is completely eliminated from all client balances, badges, cards, WhatsApp messages, and PDF statements across both Web and Mobile apps.
2. **Clear Arabic Credit Terminology**:
   - Debt (`balance > 0`): `عليه دين: 50.00 DH` (Red / Debt tone)
   - Settled (`balance == 0`): `الحساب مسدد: 0.00 DH` (Green / Settled tone)
   - Overpaid / Credit (`balance < 0`): `رصيد لصالحه (باقي): 10.00 DH` or `له: 10.00 DH` (Emerald / Credit tone, always formatted with `Math.abs(balance)`).
3. **Smart Change Calculator in Payment Modals**:
   - In both Web (`entry-form-modal.tsx`) and Mobile (`entry-form-modal.tsx`), when recording a payment where `amount > currentDebt` (and `currentDebt > 0`):
     - An interactive change calculation box appears in real time.
     - Displays:
       - Current debt: `الدين المستحق: 50.00 DH`
       - Change to return: `الصرف المتبقي للعميل: 10.00 DH`
     - Two quick one-click actions:
       - **Action 1 [إرجاع الصرف للعميل]**: Automatically resets the payment input to `50.00 DH` so the customer's balance becomes cleanly `0.00 DH` (because change was handed back in cash).
       - **Action 2 [الاحتفاظ بالباقي كعربون / رصيد]**: Keeps the full `60.00 DH` payment and automatically appends a note: `سداد كامل الدين مع رصيد متبقٍ 10.00 DH للعميل`.

---

## 🗂️ Target Files & Modifications

### 1. Web Application (`web/`)

| File | Changes Required |
|---|---|
| `web/src/lib/format.ts` | Update `formatAmount`, `balanceLabel`, `balanceKind`, and `statementMessage` to format negative balances as positive absolute values with clear credit wording (`رصيد لصالحه / باقي للعميل`). |
| `web/src/components/ledger/balance-panel.tsx` | Ensure `currentBalance` display uses `Math.abs()` when in credit state; show `"الرصيد لصالح العميل"` instead of `"الرصيد الصافي المستحق"` when `balance < 0`. |
| `web/src/components/ledger/entry-form-modal.tsx` | Pass `currentBalance` into modal. If `operationType === 'PAYMENT'` and entered amount exceeds debt, render the Smart Change Calculator with the two quick action buttons. |
| `web/src/components/clients/client-card.tsx` | Verify badge displays `له: 10.00 DH` (already using `Math.abs()`, ensure tone and styling are consistent). |
| `web/src/components/dashboard/quick-entry-modal.tsx` | Add change calculation hint when a client is selected and payment exceeds current debt. |

### 2. Mobile Application (`mobile/`)

| File | Changes Required |
|---|---|
| `mobile/src/lib/format.ts` | Update `statementMessage` to format credit balance as `رصيد لصالحه (باقي): X DH` without negative signs. |
| `mobile/src/components/ledger/balance-banner.tsx` | Ensure `formatAmount(Math.abs(currentBalance))` is consistently used with emerald badge `"رصيد لصالحه"`. |
| `mobile/src/components/ledger/entry-form-modal.tsx` | Add real-time change calculation when recording a payment exceeding debt, with quick buttons to either adjust payment to debt or keep change as credit. |
| `mobile/src/components/clients/client-picker-modal.tsx` | Replace any raw balance display with `Math.abs()` and badge `له: X DH`. |
| `mobile/src/services/mobilePdfService.ts` | Ensure PDF generation displays `formatMoney(Math.abs(data.current_balance))` with label `"رصيد لصالح العميل"`. |

---

## 💡 Implementation Details & Logic Snippets

### A. Formatting Helper Logic (`format.ts`)

```typescript
export function statementMessage({
  clientName,
  shopName,
  totalDebt,
  totalPaid,
  currentBalance,
  currency = "DH",
}: {
  clientName: string;
  shopName: string;
  totalDebt: number;
  totalPaid: number;
  currentBalance: number;
  currency?: string;
}): string {
  const isCredit = currentBalance < 0;
  const isSettled = currentBalance === 0;

  const balanceLine = isSettled
    ? `- حالة الحساب: الحساب مسدد بالكامل (0.00 ${currency})`
    : isCredit
      ? `- رصيد لصالح العميل (باقي): ${formatAmount(Math.abs(currentBalance), currency)}`
      : `- الرصيد المستحق (دين): ${formatAmount(currentBalance, currency)}`;

  return [
    `السلام عليكم، ${clientName}:`,
    `هذا كشف حسابك من ${shopName}:`,
    `- إجمالي الديون: ${formatAmount(totalDebt, currency)}`,
    `- إجمالي المدفوع: ${formatAmount(totalPaid, currency)}`,
    balanceLine,
    "شكرًا لتعاملكم معنا.",
  ].join("\n");
}
```

### B. Smart Change Calculator (Modal Logic)

```typescript
// Inside Entry Form Modal when operationType === "PAYMENT"
const currentDebt = Math.max(0, clientCurrentBalance); // e.g. 50
const numericAmount = parseFloat(amount) || 0;         // e.g. 60
const hasOverpayment = currentDebt > 0 && numericAmount > currentDebt;
const changeDue = hasOverpayment ? numericAmount - currentDebt : 0; // 10

// Quick Actions:
const handleReturnChange = () => {
  setAmount(currentDebt.toFixed(2)); // Sets input to 50.00
};

const handleKeepAdvance = () => {
  setNote(`سداد كامل الدين مع رصيد متبقٍ قدره ${changeDue.toFixed(2)} DH لصالح العميل.`);
};
```

---

## 🧪 Verification & Acceptance Criteria

1. **Negative Sign Elimination**:
   - In a test client with debt = 50 DH, record a payment of 60 DH.
   - Client detail page must display `10.00 DH` with label `"رصيد لصالح العميل"` or `"رصيد لصالحه (باقي)"`.
   - No negative signs (`-`) appear on cards, lists, or headers.
2. **Smart Change Calculator**:
   - In payment modal, entering `60` when debt is `50` displays:
     - `الصرف المتبقي: 10.00 DH`
     - Clicking `[إرجاع الصرف]` resets amount to `50.00`.
     - Clicking `[الاحتفاظ كعربون]` keeps `60.00` and adds the ledger note.
3. **Sharing Verification**:
   - WhatsApp statement text includes `- رصيد لصالح العميل (باقي): 10.00 DH`.
   - Exported PDF statement displays `10.00 DH` under `"رصيد لصالح العميل"`.
4. **Subsequent Debt Deduction**:
   - When the client later buys items worth 30 DH, recording a 30 DH debt automatically brings the balance to `20.00 DH` debt (`(50 + 30) - 60 = 20 DH`).
5. **Static Typecheck**:
   - `npm run typecheck` passes with 0 errors in `web/`.
   - `npx tsc --noEmit` passes with 0 errors in `mobile/`.
