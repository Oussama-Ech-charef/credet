# Credet Web

The Phase 6 Arabic RTL web client for Credet. It is a Next.js 14 App Router
application in TypeScript, connected directly to Firebase Cloud Firestore
(`credet-5da9c`), the same database used by the Expo mobile app. The
Express/SQLite backend in `../backend` is optional and only needed for the
legacy PDF statement button.

## Requirements

- Node.js 20 or newer
- Access to the `credet-5da9c` Firebase project

## Setup

```powershell
npm install
npm run dev
```

The app runs on `http://localhost:3000` and reads Firebase configuration from
`src/lib/firebase.ts`; no local API server or environment variables are
required for normal use.

If you want to generate PDF statements through the legacy backend, start it and
optionally point the web app at it:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

`NEXT_PUBLIC_API_URL` is read at build time. Rebuild after changing it for a
production deployment. Without a running backend, the PDF button shows an
Arabic message asking you to start the server or use the mobile app.

## Scripts

| Command | Purpose |
|---|---|
| `npm run dev` | Start the development server. |
| `npm run build` | Create an optimized production build. |
| `npm start` | Serve the production build. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm run lint` | Run Next.js ESLint checks. |

## Routes

| Route | Screen |
|---|---|
| `/` | Dashboard: receivables, active debtors, today's collections, quick actions, recent activity, top debtors. |
| `/clients` | Clients directory with local debounced search, status filters, WhatsApp/tel links, and add-client modal. |
| `/clients/[id]` | Client ledger with balance summary, entry create/edit/delete, confirmation dialog, and PDF statement download. |
| `/settings` | Shop identity, full Firestore JSON backup, and JSON export. |

## Architecture

```text
web/
├── src/
│   ├── app/                    # App Router pages, layout, global CSS
│   ├── components/
│   │   ├── clients/            # Client cards, client form, client picker
│   │   ├── dashboard/          # Metrics, activity, top debtors, quick entry
│   │   ├── ledger/             # Balance panel, entry table, entry form
│   │   ├── settings/           # Shop profile and backup panels
│   │   └── ui/                 # Buttons, fields, modal, badges, icons
│   ├── hooks/                  # Settings, toast, debounce
│   ├── lib/                    # Firebase init, API facade, types, formatting
│   └── services/               # Firestore reads, writes, and transactions
└── ...
```

- `src/lib/firebase.ts` initializes the Firebase app and the shared Firestore instance.
- `src/services/firestoreService.ts` owns all Firestore reads, writes, ID counters, and atomic entry/balance transactions.
- `src/lib/api.ts` preserves the existing `api.*` surface used by every page and maps Firestore errors to Arabic messages. Pages do not need to know about Firestore.
- `src/hooks/use-settings.tsx` loads the `settings/general` document once for the whole shell and exposes the active currency.
- Client search is filtered locally over the Firestore-loaded list with a 180 ms debounce, so typing does not trigger a network request per keystroke.
- Ledger mutations update the visible balance and entry list from the mutation response. They do not reload the page.
- Amount fields use `inputMode="decimal"` and focus on open. `Enter` submits the modal form.
- The PDF button calls the optional Express endpoint `/api/reports/client/:id/pdf`; if it is unavailable, an Arabic message suggests starting the server or using the mobile app.
- Both settings backup buttons export Firestore data as JSON. The database button downloads `credet-firestore-backup.json`; the JSON button downloads `credet-backup.json`.
- Restore is intentionally not implemented in this phase.

## Firestore Data Model

The web app and mobile app share these collections:

- `clients/{id}` — numeric client `id`, profile fields, `is_archived`, and cached balance aggregates.
- `credit_entries/{id}` — numeric entry `id`, `client_id`, operation type, amount, description, dates, and note.
- `settings/general` — `shop_name`, `shop_phone`, `currency`, and `updated_at`.
- `metadata/counters` — shared `client_id` and `entry_id` sequences used by both apps.

Archived clients are excluded with a single equality filter. Status filtering, Arabic-aware search, and sorting happen in memory to avoid composite Firestore indexes. Creating, editing, and deleting entries run in transactions that update the entry and the client balance together.

## Design

The interface follows the pinned dark palette (`#0B0F19` background, `#161F30` cards, `#1E293B` borders, `#EF4444` debt, `#10B981` payment, `#6366F1` actions, `#F59E0B` warning) and the "quiet, precise ledger" direction. Cairo is bundled locally from `src/app/fonts/Cairo-Variable.ttf` through `next/font/local`, with tabular numerals on amounts.

## Verification

```powershell
npm run typecheck
npm run lint
npm run build
```

The production build should list `/`, `/clients`, `/clients/[id]`, and `/settings` without errors. The Express backend is not required.

## Notes

- The app is designed for a local, single-shop deployment and currently has no authentication. Firestore security rules are the access-control boundary; do not rely on hidden UI controls.
- The Firebase web API key is a public project identifier, not an authorization secret.
- Next.js is pinned to 14.2.35. `npm audit` may report advisories that require a later Next.js major upgrade.
- The settings screen edits `shop_name`, `shop_phone`, and `currency` in Firestore. The optional PDF engine reads the legacy backend's own SQLite settings, so PDF statements are not guaranteed to reflect Firestore data. Use the mobile app for current statements.
