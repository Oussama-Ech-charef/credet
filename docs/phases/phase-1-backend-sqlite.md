# Phase 1: Backend API & SQLite Database

## 🎯 Phase Goal
Build a robust, lightweight, crash-safe Node.js/Express backend service backed by an embedded SQLite database (`credet.db`). This service acts as the single source of truth for both Web and Mobile clients, managing clients, credit entries (debts & payments), balance calculations, and database backups.

---

## 🗄️ Database Architecture (SQLite 3)

### Storage File: `credet.db`
- **WAL Mode Enabled**: `PRAGMA journal_mode = WAL;` (Write-Ahead Logging ensures zero corruption if power cuts during an insert/update).
- **Foreign Key Support**: `PRAGMA foreign_keys = ON;`
- **Synchronous Normal**: `PRAGMA synchronous = NORMAL;`

### Database Schema (DDL)

```sql
-- 1. Clients Table
CREATE TABLE IF NOT EXISTS clients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    notes TEXT,
    is_archived INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_clients_name ON clients(name);
CREATE INDEX IF NOT EXISTS idx_clients_phone ON clients(phone);

-- 2. Credit Entries Table (Debts & Payments)
CREATE TABLE IF NOT EXISTS credit_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    client_id INTEGER NOT NULL,
    operation_type TEXT CHECK(operation_type IN ('DEBT', 'PAYMENT')) NOT NULL,
    amount REAL NOT NULL CHECK(amount > 0),
    description TEXT NOT NULL,
    operation_date DATE DEFAULT (DATE('now')),
    note TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_entries_client_id ON credit_entries(client_id);
CREATE INDEX IF NOT EXISTS idx_entries_operation_date ON credit_entries(operation_date);

-- 3. Shop & App Settings Table
CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    shop_name TEXT NOT NULL DEFAULT 'Credet Shop',
    shop_phone TEXT DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'DH',
    pin_code TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

---

## 📐 Balance Calculation Logic

The client's balance is computed dynamically to avoid data desynchronization:

$$\text{Client Balance} = \sum (\text{DEBT}) - \sum (\text{PAYMENT})$$

- **Balance > 0**: Client owes money (Debt pending).
- **Balance = 0**: Client is fully settled.
- **Balance < 0**: Client has an advance / credit surplus.

### SQL Query for Real-Time Balance:
```sql
SELECT 
    c.*,
    COALESCE(SUM(CASE WHEN e.operation_type = 'DEBT' THEN e.amount ELSE 0 END), 0) AS total_debt,
    COALESCE(SUM(CASE WHEN e.operation_type = 'PAYMENT' THEN e.amount ELSE 0 END), 0) AS total_paid,
    COALESCE(SUM(CASE WHEN e.operation_type = 'DEBT' THEN e.amount ELSE -e.amount END), 0) AS current_balance
FROM clients c
LEFT JOIN credit_entries e ON c.id = e.client_id
WHERE c.is_archived = 0
GROUP BY c.id;
```

---

## 🔌 REST API Endpoints Specification

### 1. Clients Management (`/api/clients`)
| Method | Endpoint | Description | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/api/clients` | List all active clients with their current balances & search query | `?search=...&status=all\|debt\|settled` | `[{ id, name, phone, current_balance, ... }]` |
| `GET` | `/api/clients/:id` | Get client details + summary | None | `{ client, total_debt, total_paid, current_balance }` |
| `POST` | `/api/clients` | Create a new client | `{ name, phone, address, notes }` | `{ id, name, ... }` |
| `PUT` | `/api/clients/:id` | Update client details | `{ name, phone, address, notes }` | `{ success: true, client }` |
| `DELETE` | `/api/clients/:id` | Delete a client & all their entries | None | `{ success: true }` |

### 2. Credit Entries Management (`/api/entries` & `/api/clients/:clientId/entries`)
| Method | Endpoint | Description | Request Body | Response |
|---|---|---|---|---|
| `GET` | `/api/clients/:clientId/entries` | Get full timeline ledger for a specific client | `?from=...&to=...` | `[{ id, operation_type, amount, description, operation_date, ... }]` |
| `POST` | `/api/clients/:clientId/entries` | Add a new debt or payment entry | `{ operation_type, amount, description, operation_date, note }` | `{ id, ... }` + updated balance |
| `PUT` | `/api/entries/:id` | Edit/Update an existing entry | `{ operation_type, amount, description, operation_date, note }` | `{ success: true }` + updated balance |
| `DELETE` | `/api/entries/:id` | Delete an entry | None | `{ success: true }` + updated balance |

### 3. Statistics & Dashboard (`/api/stats`)
| Method | Endpoint | Description | Response |
|---|---|---|---|
| `GET` | `/api/stats/overview` | Overall carnet stats | `{ total_debtors, total_receivable_amount, total_collected_today, recent_activity }` |

### 4. Database Backup & Restore (`/api/backup`)
| Method | Endpoint | Description | Response |
|---|---|---|---|
| `GET` | `/api/backup/download` | Download full `credet.db` file directly | Raw SQLite binary file |
| `POST` | `/api/backup/export-json` | Export entire database as JSON backup | `{ clients: [...], entries: [...] }` |

---

## 📋 Task Checklist for Phase 1

- [ ] Initialize `backend/` directory with `package.json` and dependencies (`express`, `better-sqlite3`, `cors`, `dotenv`).
- [ ] Implement database initialization script (`src/db/database.js`) with tables, indices, and WAL configuration.
- [ ] Implement Client model and controller (`src/controllers/clientController.js`).
- [ ] Implement Credit Entry model and controller (`src/controllers/entryController.js`) with atomic operations.
- [ ] Implement Stats controller (`src/controllers/statsController.js`).
- [ ] Implement Backup & export controller (`src/controllers/backupController.js`).
- [ ] Write integration test script or seed script (`src/db/seed.js`) to verify CRUD, sums, and edge cases.
- [ ] Test all endpoints using HTTP client scripts.

---

## ✅ Acceptance Criteria
1. SQLite initializes automatically on startup without requiring any installed services.
2. Adding, editing, and deleting credit entries immediately updates the client's balance accurately.
3. Decimal precision is respected (rounded to 2 decimal places, no float rounding errors).
4. Deleting an entry or client cleanly re-evaluates all calculations without orphaned records.
5. Database backup can be downloaded via API call with a single click.
