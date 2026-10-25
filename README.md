<div align="center">

# 📒 Credet · دفتر الديون
### Modern, Real-Time Arabic Digital Credit Ledger

[![Next.js 14](https://img.shields.io/badge/Next.js-14.2-black?logo=next.js)](https://nextjs.org/)
[![Expo SDK 58](https://img.shields.io/badge/Expo-SDK_58-000020?logo=expo)](https://expo.dev/)
[![Firebase Firestore](https://img.shields.io/badge/Firebase-Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.8-blue?logo=typescript)](https://www.typescriptlang.org/)
[![Platform](https://img.shields.io/badge/Platform-Web_%7C_Android_APK-4E73DF)](#)
[![RTL First](https://img.shields.io/badge/Language-Arabic_%D8%A7%D9%84%D8%B9%D8%B1%D8%A8%D9%8A%D8%A9-22c55e)](#)
[![License: MIT](https://img.shields.io/badge/License-MIT-purple.svg)](LICENSE)

<p align="center">
  <b>Credet (دفتر الديون)</b> is an Arabic-first, real-time credit ledger application designed for local merchants, grocers, and shopkeepers. It replaces traditional paper debt notebooks with an ultra-fast, reliable multi-platform system across <b>Web</b> and <b>Mobile (Android APK)</b> backed by <b>Firebase Cloud Firestore</b>.
</p>

[العربية](#نظرة-عامة-بالعربية) • [Key Features](#-key-features) • [Tech Stack](#-tech-stack) • [Architecture](#-architecture) • [Getting Started](#-getting-started) • [APK Build](#-android-apk-build) • [Documentation](#-documentation)

---

</div>

## 🌟 Key Features

- **🌐 Pure Modern Standard Arabic (فصحى) & Native RTL**: Built from the ground up for Arabic reading order, typography (using the *Cairo* typeface), and culturally tailored financial accounting.
- **⚡ Dual-Platform Synchronicity (Web & Mobile)**: Any transaction recorded on the phone is instantly reflected on the web ledger and vice-versa via Google Cloud Firestore.
- **📴 Offline-First Mobile Resilience**: Record debts and settlements even without an internet connection. The app queues changes locally and auto-synchronizes upon reconnection.
- **🔍 Smart Arabic Search & Filtering**: Arabic-aware text normalization (handles `أ/إ/آ`, `ة/ه`, `ى/ي`) to search customers by name, phone number, or address in milliseconds.
- **📄 Statements & Direct Sharing**: Generate printable, professional account statements and share transaction summaries directly through **WhatsApp** or phone calls.
- **📦 Standalone Android APK**: Pre-configured EAS build profiles to produce a native `.apk` with zero local Android Studio dependencies.
- **🛡️ Privacy-Safe Observability**: Integrated file-based logging (`logs/error.log`) with strict sanitization that automatically redacts credentials, tokens, phone numbers, and customer names before persisting.

---

## 🏗️ Tech Stack

| Domain | Technologies |
|---|---|
| **Mobile App (`mobile/`)** | React Native, **Expo SDK 58** (Expo Router, New Architecture / React Compiler), TanStack Query, Expo FileSystem |
| **Web App (`web/`)** | **Next.js 14** (App Router, React 18, Server Components & Dynamic API Routes), Vanilla CSS Design System |
| **Database & Cloud** | **Google Cloud Firestore** (Transactions, Atomic Counters, Multi-client synchronization) |
| **Typography & Theme** | *Cairo* Google Font, Pinned High-Contrast Dark Palette (`#0B0F19`, `#161F30`, `#1E293B`, `#EF4444`, `#10B981`) |
| **Build & Tooling** | **EAS Build** (Cloud Android APK & App Bundle), TypeScript 5.8 |

---

## 🏛️ Architecture

Credet connects both the Web application and Native Mobile application directly to a centralized Cloud Firestore instance without requiring local Node.js servers.

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
       │   Web App         │                   │   Mobile App      │
       │   Next.js 14      │                   │   Expo SDK 58     │
       │   (Browser / PC)  │                   │   (Android APK)   │
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
| **Debt (مدين)** | `#EF4444` | Credit amounts and negative balance |
| **Payment (دفع)** | `#10B981` | Settlements and positive balance |
| **Action** | `#6366F1` | Primary CTA, links, and buttons |

---

## 📖 نظرة عامة بالعربية

**تطبيق Credet (دفتر الديون)** هو حل تقني رقمي متكامل يهدف إلى تحديث وتسهيل إدارة الديون والتعاملات المالية الآجلة للمتاجر، البقالات، والمشاريع الصغيرة.

### أبرز مميزات التطبيق:
* **واجهة عربية فصحى 100%**: تصميم يعتمد اتجاه القراءة من اليمين إلى اليسار (RTL) مع خط *Cairo* لتوفير تجربة بصرية واضحة ومريحة.
* **مزامنة فورية وسحابية**: تطبيق الويب وتطبيق الهاتف يعملان معاً بشكل متزامن عبر سحابة **Google Cloud Firestore**.
* **العمل دون اتصال بالإنترنت (Offline Mode)**: إمكانية تسجيل الديون والتحصيلات في الهاتف حتى في حال انقطاع الشبكة، مع مزامنة تلقائية عند عودة الاتصال.
* **كشوف حسابات ومشاركة سريعة**: إمكانية تصدير وطباعة كشف الحساب ومشاركته مباشرة عبر تطبيق **واتساب**.
* **ملف أندرويد مستقل (APK)**: جاهز للتثبيت المباشر على الهاتف دون الحاجة لأي برامج وسيطة.

---

## 📄 License

This project is licensed under the MIT License — see the [LICENSE](LICENSE) file for details.
