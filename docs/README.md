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
| **Phase 3** | [`phase-3-web-app.md`](file:///c:/Users/ULTRA%20PC/Desktop/home/credet/docs/phases/phase-3-web-app.md) | Modern Next.js 14 Web Application (Arabic RTL UI, dark modern design, dashboard, quick search, client ledger view, fast CRUD modal for entries). |
| **Phase 4** | [`phase-4-mobile-app.md`](file:///c:/Users/ULTRA%20PC/Desktop/home/credet/docs/phases/phase-4-mobile-app.md) | Mobile application (React Native / Expo) optimized for handheld usage, quick numeric entry, touch-first ledger navigation, and direct WhatsApp sharing. |

---

## 🎯 Architecture Summary

- **Database**: SQLite 3 (`credet.db`) — zero external server dependencies, embedded, crash-proof with WAL journaling.
- **Backend**: Node.js & Express REST API.
- **Web Client**: Next.js 14 App Router, Vanilla CSS / Tailwind (if needed), Arabic RTL layout (`dir="rtl"`).
- **Mobile Client**: React Native + Expo.
- **Admin**: Single administrator mode (no multi-tenant auth required, optional PIN protection).
