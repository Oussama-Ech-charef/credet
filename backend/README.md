# Credet Backend — Phase 1

Node.js/Express API backed by an embedded SQLite database (`credet.db`). It is the single source of truth for clients, credit entries (debts and payments), dynamic balances, dashboard statistics, and database backups.

This directory contains the Phase 1 backend only. The web app, mobile app, PDF engine, authentication, and restore workflow are intentionally not part of this phase.

## Requirements

- Node.js **22 or newer** (`better-sqlite3` 13 requires Node >= 22).
- npm.
- No database server, container, or external service is required.

## Quick start

```powershell
cd backend
npm install
Copy-Item .env.example .env
npm start
```

On macOS/Linux use `cp .env.example .env` instead of `Copy-Item`.

The first startup creates `backend/data/credet.db` automatically, applies the schema, and enables WAL mode. The API listens on `http://localhost:4000` by default.

Optional sample data:

```powershell
npm run seed
```

The seed is safe to rerun: it skips the database if any client already exists.

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Start the API server with the configured database. |
| `npm run dev` | Start the server with Node's `--watch` mode. |
| `npm run seed` | Insert Arabic sample clients and entries, but only into an empty database. |
| `npm run verify` | Run the full integration verification against a temporary database. |
| `npm test` | Alias for `npm run verify`. |

`npm run verify` never touches `data/credet.db`; it creates and removes its own temporary database and backup files.

## Configuration

Environment variables are read from `backend/.env` when present. Process-level environment variables take precedence.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `4000` | HTTP port (1–65535). |
| `DB_PATH` | `data/credet.db` | SQLite file path. Relative paths resolve from `backend/`. |
| `CORS_ORIGIN` | `*` | `*` or a comma-separated list of allowed browser origins. |
| `NODE_ENV` | `development` | Controls internal error logging detail. |

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

### Backups

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/backup/download` | Download a consistent SQLite snapshot named `credet.db`. |
| `POST` | `/api/backup/export-json` | Export `{ clients, entries }` as a JSON attachment. |

The `.db` download uses SQLite's online backup API, so committed WAL data is included even while the server is running. `app_settings` is included in the `.db` backup; the JSON export deliberately matches the Phase 1 contract and contains only `clients` and `entries`.

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
- Empty states, JSON errors, request size limits, CORS/preflight.
- Client CRUD, Unicode text, search by name/phone/address, literal `%`/`_` escaping, status filters.
- Entry validation, date validation, date-range filters, editing, deletion.
- `0.10 + 0.20 = 0.3` decimal behavior, half-up rounding, negative (advance) balances.
- Concurrent writes and balance recalculation after every change.
- Cascading client deletion and database-level constraint checks.
- Stats consistency, recent activity, SQLite snapshot backup, JSON export.
- Seed script population, idempotent rerun, and seeded balances.

A successful run ends with `All 24 checks passed.`

## Security and deployment notes

Phase 1 follows the documented single-administrator model and does not implement authentication or PIN enforcement.

- The default `CORS_ORIGIN=*` is convenient for local web/mobile development; set an explicit origin allow-list before exposing the API.
- The server listens on all network interfaces by default so a phone on the same LAN can connect. Restrict access with a firewall or reverse proxy in any environment beyond a trusted local network, and terminate HTTPS at the reverse proxy if the API leaves localhost.
- Backup endpoints contain all client data and are unauthenticated in this phase. Do not expose them publicly.
- `pin_code` is only a storage column in Phase 1; it is not an authentication mechanism.
- Error responses do not expose stack traces or SQL details. Server-side 500 logs are written to the process console.

## Deferred to later phases

- Next.js web client (Phase 3).
- React Native/Expo mobile client (Phase 4).
- Arabic RTL PDF statements and reports (Phase 2).
- Authentication/PIN enforcement.
- Database restore and settings CRUD endpoints.
- Pagination for very large client lists (not required by the Phase 1 API contract).

## Project structure

```text
backend/
├── scripts/
│   └── verify-api.js          # HTTP integration verification
├── src/
│   ├── controllers/           # Request validation and HTTP responses
│   ├── db/
│   │   ├── database.js        # Connection, pragmas, schema initialization
│   │   ├── schema.sql         # Phase 1 DDL and indexes
│   │   └── seed.js            # Optional sample data (empty DB only)
│   ├── middleware/
│   │   └── errorHandler.js
│   ├── routes/
│   ├── services/              # SQL queries, transactions, balance logic
│   ├── utils/
│   ├── app.js                 # Express application
│   ├── config.js
│   └── server.js              # Process entry point and graceful shutdown
├── .env.example
├── package.json
└── README.md
```
