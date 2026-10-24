# Credet Web

The Phase 3 Arabic RTL web client for Credet. It is a Next.js 14 App Router application in TypeScript, connected to the Express/SQLite backend in `../backend`.

## Requirements

- Node.js 20 or newer
- The Credet API running on `http://localhost:4000` (or a URL set through `NEXT_PUBLIC_API_URL`)

## Setup

```powershell
npm install
Copy-Item .env.example .env.local
npm run dev
```

The app runs on `http://localhost:3000`. The API URL defaults to `http://localhost:4000/api`; `.env.local` can override it:

```dotenv
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

`NEXT_PUBLIC_API_URL` is read at build time. Rebuild after changing it for a production deployment.

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
| `/settings` | Shop identity, SQLite backup download, and JSON export. |

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
│   └── lib/                    # API client, types, formatting, validation
└── ...
```

- `src/lib/api.ts` is the only place that talks to the backend. It handles JSON errors, timeouts, abort signals, and file downloads.
- `src/hooks/use-settings.tsx` loads `GET /api/settings` once for the whole shell and exposes the active currency.
- Client search is filtered locally over the API-loaded list with a 180 ms debounce, so typing does not trigger a network request per keystroke.
- Ledger mutations update the visible balance and entry list from the mutation response. They do not reload the page.
- Amount fields use `inputMode="decimal"` and focus on open. `Enter` submits the modal form.
- The PDF button downloads `/api/reports/client/:id/pdf` and uses the filename from `Content-Disposition`.
- The database button downloads `/api/backup/download`; the JSON button calls `/api/backup/export-json`.
- Restore is intentionally not implemented because the backend has no restore endpoint in this phase.

## Backend Contract

The web client consumes:

- `GET /api/stats/overview`
- `GET/POST /api/clients`
- `GET /api/clients/:id`
- `GET/POST /api/clients/:id/entries`
- `PUT/DELETE /api/entries/:id`
- `GET/PUT /api/settings`
- `GET /api/reports/client/:id/pdf`
- `GET /api/backup/download`
- `POST /api/backup/export-json`

## Design

The interface follows the pinned dark palette (`#0B0F19` background, `#161F30` cards, `#1E293B` borders, `#EF4444` debt, `#10B981` payment, `#6366F1` actions, `#F59E0B` warning) and the "quiet, precise ledger" direction. Cairo is bundled locally from `../backend/assets/fonts/Cairo-Variable.ttf` through `next/font/local`, with tabular numerals on amounts.

## Verification

```powershell
npm run typecheck
npm run lint
npm run build
```

The production build should list `/`, `/clients`, `/clients/[id]`, and `/settings` without errors. Run the backend verification separately with `npm run verify` in `../backend`.

## Notes

- The app is designed for a local, single-shop deployment. It has no authentication.
- Next.js is pinned to 14.2.35 for the Phase 3 contract. `npm audit` may report advisories that require a later Next.js major upgrade.
- The settings screen edits `shop_name`, `shop_phone`, and `currency`. The PDF engine reads the same settings row.
