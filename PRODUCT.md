# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js 14 App Router with TypeScript, as specified for Phase 3. The web app consumes the existing Express/SQLite API.

## Users

A single shopkeeper or small lender working at a counter in Morocco. They use the app during and after sales to record who took credit, who paid, and how much remains. The primary device is a laptop or tablet at the shop; a phone is used for quick checks and entries. The interface must work in Arabic with native RTL reading order.

## Product Purpose

Credet is a local-first credit ledger. It replaces paper notebooks and ad-hoc messaging with a clear, fast record of client balances, payments, and printable statements. Success means a shopkeeper can record a debt or payment in seconds, find a client instantly, trust the remaining balance, and hand the client a professional Arabic statement.

## Positioning

The product combines a simple debt notebook with a complete client dossier: every balance is derived from the ledger, every client has a printable Arabic statement, and the whole record can be backed up locally. It is deliberately a single-shop tool, not a multi-tenant accounting suite.

## Operating Context

- Work happens in short bursts, often with a client waiting at the counter.
- Amounts are in Moroccan dirhams (`DH`) by default.
- Entries are dated; the default is today.
- Arabic names, phone numbers, neighborhoods, and descriptions are normal content.
- The shop name and phone appear on PDF statements and receipts.
- Database and JSON backups are downloaded for safekeeping.
- The backend is local at `http://localhost:4000/api` by default and can be configured with `NEXT_PUBLIC_API_URL`.

## Capabilities and Constraints

- Dashboard: total receivables, active debtor count, payments collected today, recent activity, and quick actions.
- Clients: search by name, phone, or address; filter by all, debtors, or settled; create clients; open a client dossier.
- Client ledger: add debt, record payment, edit an entry, delete an entry with confirmation, and download an Arabic PDF statement. Balances update without a full-page reload.
- Settings: edit shop name, phone, and currency; download a consistent SQLite snapshot; export clients and entries as JSON.
- The API is the source of truth for balances and totals. The UI must not persist a separate balance.
- Phase 3 does not include authentication, PIN enforcement, mobile/Expo code, or database restore. Restore is deferred.
- The existing backend contract is authoritative. A settings read/update API was explicitly approved as a supporting change for Phase 3.

## Brand Commitments

- Product name: Credet.
- Arabic-first, native RTL, with Cairo as the typeface.
- Dark interface with the pinned palette: background `#0B0F19`, elevated cards `#161F30`, borders `#1E293B`, debt red `#EF4444`, payment green `#10B981`, action violet `#6366F1`, warning amber `#F59E0B`.
- Amounts use tabular numerals and are displayed with the configured currency.
- The interface should feel like a quiet, precise ledger: calm, legible, fast, and trustworthy. It should not feel like a generic SaaS dashboard or a playful consumer app.

## Evidence on Hand

- Phase 1 backend and Phase 2 PDF engine are implemented and verified.
- Arabic sample data exists in `backend/src/db/seed.js` and may be used for local demonstrations.
- There is no production customer data, testimonial, benchmark, or real shop identity in the repository. Do not invent commercial claims.
- Cairo is available locally at `backend/assets/fonts/Cairo-Variable.ttf` under the SIL Open Font License.

## Product Principles

1. Speed at the counter beats decoration.
2. Every number must be traceable to a ledger entry.
3. Arabic reading order and keyboard entry are first-class, not adaptations.
4. Destructive actions require a clear confirmation and never hide the consequence.
5. The interface earns trust through calm consistency, not through visual noise.

## Accessibility & Inclusion

- Full keyboard operation for search, forms, modals, and destructive confirmations.
- Visible focus states and labelled controls.
- Amount inputs use a numeric keypad on touch devices and focus automatically when opened.
- Dialogs trap focus, close with Escape, and restore focus to the trigger.
- Text and essential controls meet WCAG AA contrast on the dark palette.
- Layout remains usable at phone, tablet, and desktop widths with no horizontal overflow.
