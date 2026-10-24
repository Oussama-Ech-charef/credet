# Credet Documentation (Digital Credit Ledger)

This directory contains the detailed engineering documentation and phase breakdown for the **Credet** application.

> **Note on Language:**
> - All documentation, architecture, database schemas, code, and APIs are in **English**.
> - The end-user application interface (Web & Mobile UI) is localized in **Arabic (RTL)** for Moroccan/Arab shopkeepers and merchants.

---

## 🗂️ Development Phases

| Phase | File | Scope & Objectives |
|---|---|---|
| **Phase 1** | [`phase-1-backend-sqlite.md`](file:///c:/Users/ULTRA%20PC/Desktop/home/credet/docs/phases/phase-1-backend-sqlite.md) | SQLite database setup (credet.db) with ACID transactions & WAL mode, REST API for Clients, Credit Entries (Debts/Payments), real-time balance calculations, and backup endpoints. |
| **Phase 2** | [`phase-2-pdf-reports.md`](file:///c:/Users/ULTRA%20PC/Desktop/home/credet/docs/phases/phase-2-pdf-reports.md) | PDF export engine with Arabic RTL typography support. Generates printable account statements and transaction receipts ready to share via WhatsApp. |
| **Phase 3** | [`phase-3-web-app.md`](file:///c:/Users/ULTRA%20PC/Desktop/home/credet/docs/phases/phase-3-web-app.md) | Next.js 14 web application (Arabic RTL UI, quiet dark ledger design, dashboard, debounced client search, client ledger with fast entry CRUD, PDF statements, shop settings, and database/JSON backups). |
| **Phase 4** | [`phase-4-mobile-app.md`](file:///c:/Users/ULTRA%20PC/Desktop/home/credet/docs/phases/phase-4-mobile-app.md) | Mobile application (React Native / Expo) optimized for handheld usage, quick numeric entry, touch-first ledger navigation, and direct WhatsApp sharing. |

---

## 🎯 Architecture Summary

- **Database**: SQLite 3 (`credet.db`) — zero external server dependencies, embedded, crash-proof with WAL journaling.
- **Backend**: Node.js & Express REST API.
- **Web Client**: Next.js 14 App Router, TypeScript, vanilla CSS with design tokens, Arabic RTL layout (`dir="rtl"`). See [`web/README.md`](../web/README.md).
- **Mobile Client**: React Native 0.88 + Expo SDK 58 with Expo Router, TypeScript, TanStack Query, Cairo, and persisted LAN server configuration. See [`mobile/README.md`](../mobile/README.md).
- **Admin**: Single administrator mode (no multi-tenant auth required, optional PIN protection).

---

## ✅ Implementation Status

| Phase | Status | Notes |
|---|---|---|
| **Phase 1** | Complete | Express API, SQLite schema, clients, entries, balances, settings, and backup endpoints. |
| **Phase 2** | Complete | Arabic RTL PDF statement engine with Puppeteer and Cairo typography. |
| **Phase 3** | Complete | Next.js Arabic RTL web client in `web/`. |
| **Phase 4** | Complete | Expo mobile client in `mobile/` with four RTL tabs, client ledger CRUD, quick decimal entry, WhatsApp/phone actions, configurable API URL, PDF sharing, and backups. |

### Mobile Runbook

```powershell
cd backend
npm start

# In a second terminal:
cd mobile
npm install
Copy-Item .env.example .env   # optional; edit EXPO_PUBLIC_API_URL for a LAN server
npm start
```

The mobile app can also use the in-app **الإعدادات → اتصال الخادم** screen to test, save, and reset the API address at runtime. For a physical device, use the computer's LAN IP (for example `http://192.168.1.20:4000/api`), not `localhost`. See the full setup, architecture, verification commands, and native-device notes in [`mobile/README.md`](../mobile/README.md).
