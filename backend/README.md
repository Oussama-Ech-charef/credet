# Credet Backend — Phases 1 & 2

Node.js/Express API backed by an embedded SQLite database (`credet.db`) and an A4 PDF report engine for Arabic RTL client statements, transaction receipts, and store-wide debt reports.

Phase 1 provides clients, credit entries (debts and payments), dynamic balances, dashboard statistics, and database backups. Phase 2 adds the PDF engine and report endpoints. The Phase 3 web client consumes this API. The Expo mobile app, authentication, and restore workflow are intentionally not part of these phases.

## Requirements

- Node.js **22 or newer** (`better-sqlite3` 13 requires Node >= 22).
- npm.
- Chromium/Chrome for Puppeteer. `npm install` downloads Chrome for Testing automatically. To use a system browser instead, set `PUPPETEER_EXECUTABLE_PATH` or `CHROME_PATH`.
- No database server, container, external font service, or internet connection is required at render time. The Cairo font is bundled locally.
- No external service is used by the PDF templates.

On Linux, Chromium may require the usual headless runtime libraries (for example `libnss3`, `libatk`, `libgbm`, and font packages). If the browser cannot launch, run Puppeteer's dependency check for your distribution or point `PUPPETEER_EXECUTABLE_PATH` at a working Chrome/Chromium binary.

## Quick start

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm start
```

On macOS/Linux use `cp .env.example .env` instead of `Copy-Item`.

`npm install` may take longer than a normal Node install because Puppeteer downloads Chrome for Testing. The first startup creates `backend/data/credet.db` automatically, applies the schema, enables WAL mode, and warms the PDF browser in the background. The API listens on `http://localhost:4000` by default.

Optional sample data:

```powershell
npm run seed
```

The seed is safe to rerun: it skips the database if any client already exists.

Generate PDFs with the running API:

```powershell
Invoke-WebRequest "http://localhost:4000/api/reports/client/1/pdf" -OutFile statement.pdf
Invoke-WebRequest "http://localhost:4000/api/reports/general/pdf" -OutFile general-report.pdf
Invoke-WebRequest "http://localhost:4000/api/reports/entry/1/receipt/pdf" -OutFile receipt.pdf
```

The endpoints use `Content-Disposition: inline`, so opening a URL in a browser displays the PDF; the commands above save the response bytes to disk.

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Start the API server with the configured database. |
| `npm run dev` | Start the server with Node's `--watch` mode. |
| `npm run seed` | Insert Arabic sample clients and entries, but only into an empty database. |
| `npm run verify` | Run the full integration verification against a temporary database, including PDF checks. |
| `npm test` | Alias for `npm run verify`. |

`npm run verify` never touches `data/credet.db`; it creates and removes its own temporary database and backup files. It launches the PDF browser and closes it before exiting.

## Configuration

Environment variables are read from `backend/.env` when present. Process-level environment variables take precedence.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | HTTP port (1–65535). |
| `DB_PATH` | `data/credet.db` | SQLite file path. Relative paths resolve from `backend/`. |
| `CORS_ORIGIN` | `*` | `*` or a comma-separated list of allowed browser origins. |
| `NODE_ENV` | `development` | Controls internal error logging detail. |
| `PUPPETEER_EXECUTABLE_PATH` | unset | Absolute path to a Chrome/Chromium executable. Takes precedence over `CHROME_PATH`. |
| `CHROME_PATH` | unset | Fallback path to a Chrome/Chromium executable. |
| `PDF_NO_SANDBOX` | `0` | Set to `1` to launch Chromium with `--no-sandbox --disable-setuid-sandbox`. Only use this in trusted containers where the Chromium sandbox is unavailable. |

Install-time note: if you set `PUPPETEER_SKIP_DOWNLOAD=1` before `npm install`, Puppeteer will not download Chrome for Testing. In that case you must provide `PUPPETEER_EXECUTABLE_PATH` or `CHROME_PATH` before starting the server.

## Database

The database is initialized in `src/db/database.js` from `src/db/schema.sql`.

Connection pragmas:

- `journal_mode = WAL` — write-ahead logging for crash safety.
- `foreign_keys = ON` — cascades and referential integrity are enforced.
- `synchronous = NORMAL` — the Phase 1 durability/latency balance.
- `busy_timeout = 5000` — wait for short-lived write locks instead of failing immediately.

Durability note: WAL keeps the database consistent if the process or machine is interrupted. The Phase 1 specification sets `synchronous=NORMAL`, which protects against corruption and application crashes, but does not guarantee that the last committed transaction survives an OS-level power loss. If that stronger guarantee is required, `synchronous=FULL` must be evaluated and verified as a deliberate configuration change.

Schema:

- `clients` — active client records, archive flag, timestamps.
- `credit_entries` — `DEBT` / `PAYMENT` entries with positive amounts, operation dates, notes, and a cascading foreign key to `clients`.
- `app_settings` — one row (`id = 1`) with shop name, phone, currency, and optional PIN storage.

Indexes:

- `idx_clients_name`, `idx_clients_phone`
- `idx_entries_client_id`, `idx_entries_operation_date`

PDFs are generated on demand from the current database state. No PDF files are stored in SQLite.

### Balance calculation

Balances are never stored on the client row. They are calculated from the ledger every time:

```text
current_balance = SUM(DEBT amounts) - SUM(PAYMENT amounts)
```

- Positive: the client owes money.
- Zero: the account is settled.
- Negative: the client has an advance/credit surplus.

All multi-step writes (create, update, delete entry; delete client) run inside `better-sqlite3` transactions.

### Money and decimals

- Input amounts are accepted as JSON numbers or numeric strings.
- Amounts are parsed with decimal string arithmetic and rounded half-up to exactly two decimal places.
- `0.10 + 0.20` returns `0.3`, not `0.30000000000000004`.
- Amounts below `0.01` after rounding are rejected.
- Database totals are rounded to two decimals before being returned.
- The schema uses `REAL` as specified by the Phase 1 documentation.

### Dates

- `operation_date` uses `YYYY-MM-DD`.
- If omitted when creating an entry, SQLite's `DATE('now')` default is used.
- "Collected today" uses the same `DATE('now')` (UTC) definition, so the ledger default and dashboard statistic stay consistent.
- PDF timestamps use the `Africa/Casablanca` time zone so printed documents follow the target market's local time.

## API

Base URL: `http://localhost:4000`

All request bodies are JSON. Successful writes return JSON. Errors use:

```json
{ "error": "Human-readable message" }
```

Common status codes: `200`, `201`, `400`, `404`, `413`, `500`.

### Clients

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/clients?search=&status=all` (or `debt` / `settled`) | List active clients with totals. |
| `GET` | `/api/clients/:id` | Client details plus balance summary. |
| `POST` | `/api/clients` | Create a client. |
| `PUT` | `/api/clients/:id` | Update one or more client fields. |
| `DELETE` | `/api/clients/:id` | Delete a client and all entries (cascade). |

List items contain the client fields plus:

```json
{
  "total_debt": 100.1,
  "total_paid": 75.1,
  "current_balance": 25,
  "entries_count": 3,
  "last_operation_date": "2026-01-20"
}
```

`search` is case-insensitive for ASCII and matches name, phone, or address. `%`, `_`, and `\` are treated as literal characters, not wildcards. `status=settled` means `current_balance <= 0` (settled or advance).

Client detail response:

```json
{
  "client": { "id": 1, "name": "Alice Martin", "phone": "...", "address": "...", "notes": "...", "is_archived": false, "created_at": "...", "updated_at": "...", "entries_count": 3, "last_operation_date": "2026-01-20" },
  "total_debt": 100.1,
  "total_paid": 75.1,
  "current_balance": 25
}
```

Create response: the created client object with status `201`.

Update response:

```json
{ "success": true, "client": { "id": 1, "name": "Alice Martin" } }
```

Delete response:

```json
{ "success": true, "id": 1, "deleted_entries": 3 }
```

### Credit entries

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/clients/:clientId/entries?from=YYYY-MM-DD&to=YYYY-MM-DD` | Full ledger, chronological, inclusive date filter. |
| `POST` | `/api/clients/:clientId/entries` | Add a debt or payment. |
| `PUT` | `/api/entries/:id` | Edit an existing entry. |
| `DELETE` | `/api/entries/:id` | Delete an entry. |

Create body:

```json
{
  "operation_type": "DEBT",
  "amount": 1250.5,
  "description": "Groceries",
  "operation_date": "2026-10-24",
  "note": "Optional note"
}
```

`operation_type` is `DEBT` or `PAYMENT` (case-insensitive input, normalized to upper case). `amount` must be positive. `description` is required. `operation_date` and `note` are optional on create.

Create response (status `201`): the entry fields plus the updated balance:

```json
{
  "id": 10,
  "client_id": 1,
  "operation_type": "DEBT",
  "amount": 1250.5,
  "description": "Groceries",
  "operation_date": "2026-10-24",
  "note": null,
  "created_at": "...",
  "updated_at": "...",
  "total_debt": 1250.5,
  "total_paid": 0,
  "current_balance": 1250.5
}
```

Update accepts any subset of `operation_type`, `amount`, `description`, `operation_date`, and `note`, and returns the same entry/balance shape with `success: true`.

Delete response:

```json
{
  "success": true,
  "client_id": 1,
  "total_debt": 1250.5,
  "total_paid": 0,
  "current_balance": 1250.5
}
```

### Statistics

`GET /api/stats/overview`

```json
{
  "total_debtors": 4,
  "total_receivable_amount": 170.84,
  "total_collected_today": 50,
  "recent_activity": [
    {
      "id": 20,
      "client_id": 6,
      "client_name": "Stats Client",
      "operation_type": "PAYMENT",
      "amount": 40,
      "description": "Stats payment",
      "operation_date": "2026-10-24",
      "created_at": "..."
    }
  ]
}
```

- `total_debtors`: active clients with `current_balance > 0`.
- `total_receivable_amount`: sum of only the positive client balances (advances do not reduce store receivables).
- `total_collected_today`: payments dated today.
- `recent_activity`: the 10 most recently created entries across active clients.

### Settings

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/settings` | Read the shop name, phone, currency, and last update timestamp. |
| `PUT` | `/api/settings` | Update one or more settings fields. |

Settings response:

```json
{
  "shop_name": "Credet Shop",
  "shop_phone": "",
  "currency": "DH",
  "updated_at": "2026-10-24 12:00:00"
}
```

`shop_name` is required when present and limited to 120 characters. `shop_phone` is optional and limited to 40 characters. `currency` is required when present and limited to 10 characters. The PDF templates read the same row, so a saved shop name and phone appear on the next generated statement or receipt.

### Backups

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/backup/download` | Download a consistent SQLite snapshot named `credet.db`. |
| `POST` | `/api/backup/export-json` | Export `{ clients, entries }` as a JSON attachment. |

The `.db` download uses SQLite's online backup API, so committed WAL data is included even while the server is running. `app_settings` is included in the `.db` backup; the JSON export deliberately matches the Phase 1 contract and contains only `clients` and `entries`.

### PDF reports

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/reports/client/:id/pdf?from=YYYY-MM-DD&to=YYYY-MM-DD` | A4 client account statement. |
| `GET` | `/api/reports/general/pdf?filter=all` (or `debt_only`) | A4 store-wide balances report. |
| `GET` | `/api/reports/entry/:id/receipt/pdf` | A4 receipt for one debt or payment entry. |

`from` and `to` are optional and inclusive. If both are present, `from` must be before or equal to `to`. Invalid dates, invalid IDs, missing clients/entries, and reversed ranges return the normal JSON error shape with `400` or `404`.

`filter` defaults to `all`, which includes every active client, including settled accounts and advances. `filter=debt_only` includes only clients with `current_balance > 0`.

PDF response headers:

```text
Content-Type: application/pdf
Content-Disposition: inline; filename="credet-client-<id>.pdf"
Content-Length: <bytes>
Cache-Control: no-store
X-Content-Type-Options: nosniff
Access-Control-Expose-Headers: Content-Disposition
```

Filename patterns:

- `credet-client-<clientId>.pdf`
- `credet-general-report-<YYYYMMDD>.pdf`
- `credet-receipt-<entryId>.pdf`

`Access-Control-Expose-Headers` is set by the CORS middleware so browser and mobile clients can read the filename. The documents are generated on demand; the API does not keep a PDF history.

#### Client statement

The statement contains:

- Shop name, contact phone, generated date/time, and statement number (`CS-<clientId>-<YYYYMMDD>`).
- Client name, phone, address, notes, and file number.
- Three summary cards: total debts, total payments, and the net outstanding balance. The net card is highlighted in red when the client owes money and green when the client has an advance; settled accounts use the neutral style.
- A chronological transaction table with date, type (`كريدي` / `دفعة`), description and optional note, and amount in the configured currency.
- A printable footer with the thank-you note and signature lines.

The summary cards always show all-time account totals. When `from`/`to` are supplied, only the transaction table is filtered; the PDF prints a note explaining that the summary covers the full account. An account with no entries renders a clear empty state instead of an empty table.

#### General report

The general report contains:

- Shop header, generated date/time, report number (`GR-<YYYYMMDD>`), and a note describing the selected filter.
- Four summary cards: client count (with debtor/settled breakdown), total debts, total payments, and total receivable.
- A table of clients with last operation date, total debts, total payments, current balance, and a status badge (`مدين`, `رصيد لصالحه`, or `خالص`).
- A totals bar and a footer with signature lines and the thank-you note.

Balances are sorted from highest amount owed to lowest. `debt_only` excludes settled and advance accounts from both the table and the totals.

#### Receipt

The receipt contains the receipt number (`RC-<entryId>-<YYYYMMDD>`), client details, transaction type and amount, operation date, description, optional note, and the client balance after that transaction. It uses the same footer and signature treatment as the statement.

#### Rendering engine

- Puppeteer 25 with the Chrome for Testing browser downloaded by `npm install`.
- HTML/CSS templates use native `dir="rtl"`, so Chromium performs Arabic shaping, ligatures, and bidi layout natively.
- The Cairo Variable font is embedded in the HTML as a base64 `@font-face` from `assets/fonts/Cairo-Variable.ttf`. No Google Fonts or other network requests are made during rendering.
- A singleton browser is reused. At most four PDF renders run concurrently; additional requests wait in a queue.
- The browser is warmed during server startup. Warm renders complete in roughly 0.35–0.4 seconds on the development machine; the verification suite enforces a limit below 1.5 seconds per PDF. Browser launch itself takes about half a second, so the startup warm-up keeps the first request responsive.
- Rendering has a 20-second timeout and uses `@page` A4 print rules, repeated table headers, and `break-inside: avoid` for table rows.
- Page JavaScript is disabled. Templates use a strict Content Security Policy (`default-src 'none'`, `script-src 'none'`, local `data:` fonts), and every dynamic value is HTML-escaped before insertion.
- SIGINT/SIGTERM close the HTTP server and the PDF browser cleanly.

#### PDF limitations

- A Chrome/Chromium executable must be available. The default Puppeteer download covers most local setups; locked-down or offline environments need an explicit executable path.
- Each PDF embeds a subset of Cairo and is typically about 400–700 KB.
- The footer appears at the end of the document, not on every page. Table headers repeat on multi-page tables, but page numbers are not printed.
- Date filters change the transaction table only; the summary cards remain all-time totals by design.
- PDF endpoints are unauthenticated in these phases and expose client data. Do not expose them publicly.
- There is a global concurrency limit of four renders, but no per-IP rate limiting yet.

## Validation limits

These are boundary safeguards, not business rules:

| Field | Limit |
|---|---|
| Client `name` | 150 characters |
| Client `phone` | 40 characters |
| Client `address` | 300 characters |
| Client `notes` | 2,000 characters |
| Entry `description` | 500 characters |
| Entry `note` | 2,000 characters |
| Search text | 100 characters |
| JSON request body | 100 KB |

Whitespace-only required fields are rejected. Optional text fields are trimmed; empty optional text is stored as `NULL`.

## Verification

Run:

```powershell
npm run verify
```

The script starts the Express app on an ephemeral loopback port with a temporary SQLite file and exercises the API over HTTP. It covers:

- WAL mode, foreign keys, `synchronous=NORMAL`, schema, indexes, default settings row.
- Empty states, JSON errors, request size limits, CORS/preflight, exposed `Content-Disposition`.
- Client CRUD, Unicode text, search by name/phone/address, literal `%`/`_` escaping, status filters.
- Entry validation, date validation, date-range filters, editing, deletion.
- `0.10 + 0.20 = 0.3` decimal behavior, half-up rounding, negative (advance) balances.
- Concurrent writes and balance recalculation after every change.
- Cascading client deletion and database-level constraint checks.
- Stats consistency, recent activity, SQLite snapshot backup, JSON export.
- Settings read/update, validation limits, and PDF branding consistency.
- PDF response headers, `%PDF-`/`%%EOF` markers, A4 geometry, page counts, Arabic text, and embedded Cairo font.
- Warm PDF generation below 1.5 seconds, including a second render.
- Statement date filters and invalid/reversed date handling.
- General report `all` and `debt_only` filters, plus invalid filter rejection.
- Receipt generation and missing-entry errors.
- Empty client statements.
- HTML escaping of malicious client/entry text, CSP presence, and absence of external URLs in templates.
- Multi-page statement and multi-page general report generation.

A successful run ends with:

```text
All 33 checks passed.
```

The automated PDF checks verify structure, headers, page geometry, text presence, embedded font, timing, and escaping. They do not perform glyph-level visual comparison. Manual visual QA was also performed by opening generated sample PDFs in Chrome's PDF viewer and checking Arabic shaping, RTL table alignment, card colors, footer placement, and page breaks.

## Security and deployment notes

Phases 1 and 2 follow the documented single-administrator model and do not implement authentication or PIN enforcement.

- The default `CORS_ORIGIN=*` is convenient for local web/mobile development; set an explicit origin allow-list before exposing the API.
- The server listens on all network interfaces by default so a phone on the same LAN can connect. Restrict access with a firewall or reverse proxy in any environment beyond a trusted local network, and terminate HTTPS at the reverse proxy if the API leaves localhost.
- Backup endpoints and PDF endpoints contain all client data and are unauthenticated in these phases. Do not expose them publicly.
- `pin_code` is only a storage column in these phases; it is not an authentication mechanism.
- Error responses do not expose stack traces or SQL details. Server-side 500 logs are written to the process console.
- PDF templates are treated as trusted code; only dynamic data is escaped. Do not add user-controlled template files without a separate review.
- PDF rendering disables page JavaScript and uses a strict CSP. The templates contain no external URLs and load only the locally embedded Cairo font.
- `PUPPETEER_EXECUTABLE_PATH`/`CHROME_PATH` must point to a trusted browser binary. `PDF_NO_SANDBOX=1` weakens Chromium isolation and should only be used in trusted containers where the sandbox cannot run.
- The PDF browser is a local child process. It is reused and closed on shutdown; no client data is sent to an external rendering service.

## Deferred to later phases

- React Native/Expo mobile client (Phase 4).
- Authentication/PIN enforcement.
- Database restore.
- Pagination for very large client lists (not required by the Phase 1 API contract).
- Per-IP rate limiting for expensive PDF endpoints.

## Project structure

```text
backend/
├── assets/
│   └── fonts/
│       ├── Cairo-Variable.ttf  # Embedded Arabic font (SIL OFL)
│       └── OFL.txt             # Cairo font license
├── scripts/
│   └── verify-api.js           # HTTP integration and PDF verification
├── src/
│   ├── controllers/            # Request validation and HTTP responses
│   ├── db/
│   │   ├── database.js         # Connection, pragmas, schema initialization
│   │   ├── schema.sql          # Phase 1 DDL and indexes
│   │   └── seed.js             # Optional sample data (empty DB only)
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── routes/                 # Client, entry, stats, backup, report routes
│   ├── services/
│   │   ├── clientService.js
│   │   ├── entryService.js
│   │   ├── statsService.js
│   │   ├── backupService.js
│   │   ├── settingsService.js  # Shop identity shared by API and PDFs
│   │   ├── reportService.js    # Statement/report/receipt data assembly
│   │   ├── templateService.js  # Escaping, formatting, HTML rendering
│   │   └── pdfService.js       # Puppeteer lifecycle and PDF generation
│   ├── templates/
│   │   ├── base.css            # Shared A4 print styles and page-break rules
│   │   ├── statement.html      # Client account statement
│   │   ├── general-report.html # Store-wide balances report
│   │   └── receipt.html        # Single-transaction receipt
│   ├── utils/
│   ├── app.js                  # Express application
│   ├── config.js
│   └── server.js               # Process entry point, PDF warm-up, graceful shutdown
├── .env.example
├── package.json
└── README.md
```

Cairo is licensed under the SIL Open Font License; see `assets/fonts/OFL.txt`. Puppeteer and pdfjs-dist are used under their respective licenses.
