-- Credet Phase 1 schema.
-- The database connection enables WAL, foreign keys, and synchronous=NORMAL.

-- 1. Clients table.
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

-- 2. Credit entries table (debts and payments).
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

-- 3. Shop and application settings.
CREATE TABLE IF NOT EXISTS app_settings (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    shop_name TEXT NOT NULL DEFAULT 'Credet Shop',
    shop_phone TEXT DEFAULT '',
    currency TEXT NOT NULL DEFAULT 'DH',
    pin_code TEXT DEFAULT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
