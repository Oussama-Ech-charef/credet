# Phase 6: Web App — Connect Next.js to Firebase

## 🎯 Phase Goal

Migrate the existing **Next.js web application** (`web/`) from its current
HTTP-based backend (`/api` Express server) to **Firebase Cloud Firestore**,
so that both the web app and the mobile app read from the same cloud database
without running any local Node.js server.

After this phase:
- The web app works entirely from a browser with no local backend running.
- Any change made on mobile is instantly visible on the web app (and vice versa).
- The Express backend in `backend/` becomes optional (kept for reference only).

---

## 📐 Current State (before this phase)

| Item | Current |
|---|---|
| Data source | `http://localhost:4000/api` (Express + SQLite) |
| Web lib | `web/src/lib/api.ts` — HTTP fetch client |
| Firebase | ✅ already configured in **mobile** at `mobile/src/lib/firebase.ts` |
| Firebase credentials | `apiKey`, `projectId` etc. are in `mobile/src/lib/firebase.ts` — reuse them |

---

## 🗂️ Files to Create / Modify

### New files

| File | Purpose |
|---|---|
| `web/src/lib/firebase.ts` | Firebase app + Firestore initialisation (same config as mobile) |
| `web/src/services/firestoreService.ts` | All data functions (same logic as mobile version) |

### Modified files

| File | Change |
|---|---|
| `web/src/lib/api.ts` | Replace HTTP fetch calls with `firestoreService` calls |
| `web/package.json` | Add `firebase` dependency |
| `web/.env.example` | Replace `NEXT_PUBLIC_API_URL` with Firebase env vars (or hardcode config) |
| `web/README.md` | Update runbook — remove "start backend first" step |

---

## 🔥 Firebase Config to Copy

Copy **exactly** from `mobile/src/lib/firebase.ts`:

```ts
export const firebaseConfig = {
  apiKey: "AIzaSyDJYCvXhZJ6j3wXARMEQXCXJvAlbNQeAuM",
  authDomain: "credet-5da9c.firebaseapp.com",
  projectId: "credet-5da9c",
  storageBucket: "credet-5da9c.firebasestorage.app",
  messagingSenderId: "43571241704",
  appId: "1:43571241704:web:06e7608582674cc5d71f5d",
};
```

> **Important:** Web Firebase does **not** support `persistentMultipleTabManager` —
> use `persistentLocalCache()` only (single tab), or omit the cache option entirely
> since Next.js pages have React Query caching already.

---

## 🗄️ Firestore Service for Web

Create `web/src/services/firestoreService.ts` by copying
`mobile/src/services/firestoreService.ts` verbatim.

The only differences:
1. Change the import path: `from "@/lib/firebase"` → `from "@/lib/firebase"` (same, if `@` alias is configured in `tsconfig.json`)
2. Remove the `seedInitialDataIfNeeded` method — seeding is mobile-only.
3. The `File` import from `expo-file-system` is not present in the web version (PDF is handled differently on web).

---

## 📄 PDF on Web

On the web, PDF generation still uses the **Express backend Puppeteer engine**
(`GET /api/reports/client/:id/pdf`) — keep the existing `downloadClientStatement`
HTTP call for the web-only PDF button.

Alternatively, defer PDF on web to a future phase and show a "PDF unavailable on web" notice.
Choose the simpler option: **show a toast "تصدير PDF غير متاح على الويب حالياً"** and hide the PDF button when `typeof window !== "undefined" && !navigator.userAgent.includes("Mobile")` is false. Actually — just keep the button disabled with a tooltip for now.

---

## 🗺️ Data Flow After Migration

```
Browser (Next.js)
      │
      ▼
Firebase SDK (JS)
      │
      ▼
Cloud Firestore ◄──► Mobile App (Expo)
   credet-5da9c
```

---

## 🛠️ Installation

```bash
cd web
npm install firebase
```

---

## ✅ Acceptance Criteria

1. `npm run dev` in `web/` starts with no errors and no backend required.
2. Dashboard shows correct totals pulled from Firestore (matching mobile).
3. Creating a client or entry on the web is immediately visible on mobile (and vice versa).
4. Deleting / archiving a client on the web removes it from both apps.
5. Shop settings edited via the web Settings page persist to Firestore.
6. `tsc --noEmit` in `web/` exits 0.
7. The Express backend in `backend/` is **not** deleted — it is simply no longer required to run.
