# Credet Documentation (Digital Credit Ledger)

This directory contains the detailed engineering documentation and phase breakdown for the **Credet** application.

> **Note on Language:**
> - All documentation, architecture, database schemas, code, and APIs are in **English**.
> - The end-user application interface (Web & Mobile UI) is localized in **Arabic (RTL)** for Moroccan/Arab shopkeepers and merchants.

---

## 🗂️ Development Phases

| Phase | File | Scope & Objectives |
|---|---|---|
| **Phase 1** | [`phase-1-backend-sqlite.md`](phases/phase-1-backend-sqlite.md) | SQLite database setup (credet.db) with ACID transactions & WAL mode, REST API for Clients, Credit Entries (Debts/Payments), real-time balance calculations, and backup endpoints. |
| **Phase 2** | [`phase-2-pdf-reports.md`](phases/phase-2-pdf-reports.md) | PDF export engine with Arabic RTL typography support. Generates printable account statements and transaction receipts ready to share via WhatsApp. |
| **Phase 3** | [`phase-3-web-app.md`](phases/phase-3-web-app.md) | Next.js 14 web application (Arabic RTL UI, quiet dark ledger design, dashboard, debounced client search, client ledger with fast entry CRUD, PDF statements, shop settings, and database/JSON backups). |
| **Phase 4** | [`phase-4-mobile-app.md`](phases/phase-4-mobile-app.md) | React Native / Expo mobile app with Arabic RTL UI, TanStack Query, quick entry, client ledger CRUD, WhatsApp/phone sharing, and Firebase Firestore as the cloud database (offline-first). |
| **Phase 5** | [`phase-5-client-management-mobile.md`](phases/phase-5-client-management-mobile.md) | Add Create / Edit / Delete client screens to the mobile app. New client form, edit form pre-filled from Firestore, archive confirmation dialog. |
| **Phase 6** | [`phase-6-web-firebase.md`](phases/phase-6-web-firebase.md) | Migrate the Next.js web app from the Express/SQLite HTTP backend to Firebase Cloud Firestore — same database as the mobile app, no local server required. |
| **Phase 7** | [`phase-7-apk-eas-build.md`](phases/phase-7-apk-eas-build.md) | Build a standalone Android APK using EAS Build. Install Credet on any Android phone without Expo Go or a QR code. |

---

## 🎯 Architecture (Current — post Phase 4)

```
📱 Mobile App (Expo / React Native)          💻 Web App (Next.js 14)
           │                                           │
           │  Firebase SDK                  Firebase SDK (Phase 6)
           │                                           │
           ▼                                           ▼
    ☁️ Cloud Firestore (credet-5da9c)  ◄──────────────┘
       collections: clients, credit_entries, settings, metadata
           │
           │ Offline-first local cache (automatic)
           ▼
    📱 Phone local cache — works without internet
```

> **Phase 1–3 backend** (`backend/` — Node.js + Express + SQLite) is kept for
> reference but is no longer required to run the mobile app. It will be
> superseded for the web app in Phase 6.

---

## ✅ Implementation Status

| Phase | Status | Notes |
|---|---|---|
| **Phase 1** | ✅ Complete | Express API, SQLite schema, clients, entries, balances, settings, backup. |
| **Phase 2** | ✅ Complete | Arabic RTL PDF statement engine with Puppeteer and Cairo typography. |
| **Phase 3** | ✅ Complete | Next.js Arabic RTL web client in `web/`. |
| **Phase 4** | ✅ Complete | Expo mobile client in `mobile/` — Firebase Firestore, offline cache, RTL, PDF (expo-print), WhatsApp sharing. |
| **Phase 5** | 🔲 Pending | Client CRUD screens on mobile. |
| **Phase 6** | 🔲 Pending | Web app → Firebase migration. |
| **Phase 7** | 🔲 Pending | EAS Build → standalone Android APK. |

---

## 🚀 Quick Start (Mobile — Current)

```powershell
cd mobile
npm install
# Copy .env.example to .env if you need to override any public vars
npx expo start
```

Scan the QR code with **Expo Go** on your phone, or press `a` to open on an Android emulator.

The app connects directly to **Firebase Cloud Firestore** — no backend server needed.

---

## 📁 Repository Layout

```
credet/
├── backend/          # Node.js + Express + SQLite (Phase 1–2, optional)
├── web/              # Next.js 14 web app (Phase 3, Firebase migration in Phase 6)
├── mobile/           # Expo React Native app (Phase 4 — primary active app)
│   ├── src/
│   │   ├── app/      # Expo Router screens
│   │   ├── components/
│   │   ├── hooks/    # TanStack Query hooks → firestoreService
│   │   ├── lib/      # firebase.ts, types.ts, format.ts …
│   │   ├── providers/
│   │   └── services/ # firestoreService.ts, mobilePdfService.ts
│   └── eas.json      # EAS Build config (Phase 7)
└── docs/
    ├── README.md     # this file
    └── phases/       # one detailed spec per phase
```
