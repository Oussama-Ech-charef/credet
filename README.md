<div align="center">

# 📒 Credet
### Modern, Real-Time Digital Credit Ledger for Local Merchants

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![Expo SDK 58](https://img.shields.io/badge/Expo-SDK_58-000020?logo=expo)](https://expo.dev/)
[![Firebase Firestore](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Web_%7C_Android_APK-4E73DF)](#)
[![Interface](https://img.shields.io/badge/UI-Arabic_RTL_First-22c55e)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

<p align="center">
  <b>Credet</b> is an Arabic-first, real-time credit ledger application designed for neighborhood merchants, grocers, and small businesses. It replaces traditional paper debt notebooks with an ultra-fast, offline-resilient multi-platform system across <b>Web</b> and <b>Mobile (Android APK)</b> backed by <b>Google Cloud Firestore</b>.
</p>

[Key Features](#-key-features) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture) • [Project Structure](#-project-structure) • [Getting Started](#-getting-started) • [Android APK Build](#-android-apk-build) • [Design System](#-design-system--palette) • [License](#-license)

---

</div>

## 🌟 Key Features

- **🌐 Arabic-First & Native RTL Experience**: Designed from the ground up for Arabic reading order, typography (powered by the *Cairo* typeface), and culturally tailored financial accounting.
- **⚡ Real-Time Cloud Synchronization (Web & Mobile)**: Any transaction recorded on the mobile phone instantly updates on the web ledger and vice versa via Google Cloud Firestore.
- **📴 Offline-First Mobile Resilience**: Record debts and settlements even without an internet connection. Changes are queued locally and automatically synchronized upon reconnecting.
- **🔍 Smart Search & Text Normalization**: Arabic-aware search algorithm that normalizes diacritics and character variations (`أ/إ/آ`, `ة/ه`, `ى/ي`) to find customers by name, phone number, or address in milliseconds.
- **📄 Account Statements & Quick Actions**: Generate printable customer account statements and share transaction summaries directly through **WhatsApp** or phone calls.
- **📦 Standalone Android APK**: Pre-configured EAS build profiles to produce native `.apk` packages directly in the cloud without requiring local Android Studio or SDK installations.
- **🛡️ Privacy-Preserving Observability**: Built-in file-based logging (`logs/error.log`) with strict sanitization that automatically redacts credentials, access tokens, phone numbers, and customer names before persisting.

---

## 🏗️ Tech Stack

| Domain | Technologies |
|---|---|
| **Mobile App (`mobile/`)** | React Native, **Expo SDK 58** (Expo Router, New Architecture / React Compiler), TanStack Query, Expo FileSystem |
| **Web App (`web/`)** | **Next.js 14** (App Router, React 18, Server Components & Dynamic API Routes), Vanilla CSS Design System |
| **Database & Cloud** | **Google Cloud Firestore** (ACID Transactions, Atomic Counters, Multi-client synchronization) |
| **Typography & Theme** | *Cairo* Google Font, Pinned High-Contrast Dark Palette (`#0B0F19`, `#161F30`, `#1E293B`, `#EF4444`, `#10B981`) |
| **Build & Tooling** | **EAS Build** (Cloud Android APK & App Bundle), TypeScript 5.8 |

---

## 🏛️ Architecture

Credet connects both the Web application and Native Mobile application directly to a centralized Cloud Firestore instance without requiring local Node.js servers:

```
                      ┌─────────────────────────────────┐
                      │   Firebase Cloud Firestore      │
                      │        (credet-5da9c)           │
                      └──────────────┬──────────────────┘
                                     │
                 ┌───────────────────┴───────────────────┐
                 │ (Atomic Transactions & Realtime Sync) │
                 ▼                                       ▼
       ┌───────────────────┐                   ┌───────────────────┐
       │     Web App       │                   │    Mobile App     │
       │   Next.js 14      │                   │   Expo SDK 58     │
       │  (Browser / PC)   │                   │  (Android APK)    │
       └───────────────────┘                   └───────────────────┘
```

---

## 📂 Project Structure

```
credet/
├── mobile/                  # Native mobile app (Expo SDK 58 & Expo Router)
│   ├── src/app/             # File-based navigation routes & tabs
│   ├── src/components/      # Reusable Arabic UI primitives & feature components
│   ├── src/services/        # Firestore service, PDF exporter, and file logger
│   ├── eas.json             # EAS cloud build profiles (preview APK & production)
│   └── app.json             # Android package & native configuration
│
├── web/                     # Web ledger application (Next.js 14 App Router)
│   ├── src/app/             # Next.js pages (/clients, /clients/[id], /settings, /api/logs)
│   ├── src/components/      # Web components & ledger table panels
│   ├── src/services/        # Firestore web service integration
│   └── src/lib/             # Formatters, log sanitizers, and API wrappers
│
├── backend/                 # Legacy Express & SQLite engine (kept for reference)
│
├── docs/                    # In-depth architectural & phase documentation
│   ├── README.md            # Documentation directory index
│   └── phases/              # Complete phase specs (Phase 1 through 7)
│
├── PRODUCT.md               # Product principles, target users, and design constraints
└── .gitignore               # Multi-tier gitignore protecting binaries, keys & logs
```

---

## 🚀 Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) (version `>= 20.x` or `>= 22.x`)
- [npm](https://www.npmjs.com/) or [pnpm](https://pnpm.io/)
- An [Expo Account](https://expo.dev/) (optional, required only for building APKs)

---

### 1. Running the Web Application

```bash
# Navigate to web directory
cd web

# Install dependencies
npm install

# Start development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser. The web app connects directly to Firestore.

---

### 2. Running the Mobile Application

```bash
# Navigate to mobile directory
cd mobile

# Install dependencies
npm install

# Start Metro bundler
npx expo start
```

- Press `w` to run on web.
- Scan the terminal QR code with **Expo Go** on Android/iOS to preview live on your device.

---

## 📱 Android APK Build

Credet is configured to build standalone Android APK files in the cloud via **EAS Build** (no Android SDK or Android Studio installation required on your computer):

```bash
cd mobile

# 1. Install EAS CLI globally (one time)
npm install -g eas-cli

# 2. Login to your free Expo account
eas login

# 3. Trigger cloud APK build
eas build -p android --profile preview
```

When the build finishes (~10-15 minutes), EAS outputs a direct download link and QR code to install `Credet.apk` on any Android device.

---

## 🎨 Design System & Palette

Credet features a calm, distraction-free dark interface specifically designed to reduce glare and improve contrast at store counters:

| Token | Hex Code | Purpose |
|---|---|---|
| **Background** | `#0B0F19` | Deep primary canvas |
| **Card / Surface** | `#161F30` | Elevated container surface |
| **Border** | `#1E293B` | Structural boundary lines |
| **Debt (Debit)** | `#EF4444` | Credit amounts and negative balance |
| **Payment (Credit)** | `#10B981` | Settlements and positive balance |
| **Action** | `#6366F1` | Primary CTA, links, and buttons |

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
