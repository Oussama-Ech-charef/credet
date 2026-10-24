# Credet Mobile

The Phase 4 native client for Credet. It is a React Native app built with the Expo managed workflow, Expo Router, and TypeScript. It connects to the existing Express/SQLite backend in `../backend` and is designed for touch-first, Arabic RTL use in a shop.

## Stack

- Expo SDK 58 / React Native 0.88 / React 19
- Expo Router with file-based routes under `src/app`
- TanStack Query for caching, cache invalidation, and background refetching
- AsyncStorage for the persisted API base URL
- Cairo font via `@expo-google-fonts/cairo`
- `expo-haptics`, `expo-sharing`, `expo-file-system`, and native Linking for device integrations

## Requirements

- Node.js 22 or newer
- The Credet API running on port `4000` (or a configured LAN/HTTPS URL)
- Expo Go for quick JS-level testing, or a development build for the native networking and sharing configuration

## Setup

```powershell
cd mobile
npm install
Copy-Item .env.example .env   # optional; edit EXPO_PUBLIC_API_URL for a LAN server
npm start
```

The backend must be running separately:

```powershell
cd backend
npm start
```

Use `npm run web` to open the app in a browser for layout QA, or scan the Expo QR code with Expo Go / a development build.

## API URL

The app resolves the API address in this order:

1. `EXPO_PUBLIC_API_URL`, when set.
2. The Expo development host's LAN IP, with port `4000`.
3. `10.0.2.2:4000` on an Android emulator, or `localhost:4000` elsewhere.

`EXPO_PUBLIC_API_URL` is inlined by Expo at bundle time. Restart Expo with `npm run start:clear` after changing it.

The address can also be changed at runtime in **الإعدادات → اتصال الخادم**. It is normalized to remove a trailing slash and to add `/api` when no path is supplied, then persisted in AsyncStorage. The reset button restores the build-time/default address.

Examples:

```dotenv
EXPO_PUBLIC_API_URL=http://192.168.1.20:4000/api
```

- From a physical device, use the computer's LAN IP, not `localhost`.
- The phone and computer must be on the same network, and the computer firewall must allow port `4000`.
- Android cleartext HTTP and iOS local-network ATS allowances are enabled for local development in `app.json`. Use HTTPS for a production deployment.

## Scripts

| Command | Purpose |
|---|---|
| `npm start` | Start the Expo development server. |
| `npm run start:clear` | Start Expo with a cleared Metro cache. |
| `npm run android` | Start Expo and open the Android target. |
| `npm run ios` | Start Expo and open the iOS target. |
| `npm run web` | Start the web target for browser QA. |
| `npm run typecheck` | Run TypeScript without emitting files. |
| `npm run lint` | Run ESLint with the Expo flat config. |
| `npm run lint:fix` | Apply ESLint fixes. |
| `npm run export:web` | Export the web bundle. |

Use `npm run lint` rather than `npx expo lint`; the local Expo CLI version check can reject the installed ESLint 9 version even though the flat config runs correctly.

## Screens

| Route | Screen |
|---|---|
| `/` | **الرئيسية**: total receivables, active debtors, today's collections, quick actions, recent activity, and top balances. |
| `/clients` | **الكليان**: debounced name/phone search, `الكل` / `عليهم كريدي` / `خالصين` filters, balance badges, call, and WhatsApp actions. |
| `/quick-entry` | **تسجيل سريع**: focused decimal amount field, client picker, optional description, and immediate save. |
| `/clients/[id]` | Client ledger: balance banner, statement sharing, transaction timeline, debt/payment entry, edit/delete confirmation, WhatsApp, and phone call. |
| `/settings` | **الإعدادات**: shop profile, server URL test/save/reset, database backup, and JSON export. |

Adding clients and restoring backups remain web-only workflows, matching the Phase 4 scope.

## Architecture

```text
mobile/
├── src/
│   ├── app/                    # Expo Router routes, tabs, ledger, +html
│   ├── components/
│   │   ├── clients/            # Client card and searchable client picker
│   │   ├── dashboard/          # Metrics, quick actions, activity, top debtors
│   │   ├── ledger/             # Balance banner, entry rows, entry form, sharing
│   │   └── ui/                 # Buttons, fields, modals, badges, skeleton, etc.
│   ├── constants/              # Palette, spacing, radii, Cairo font names
│   ├── hooks/                  # TanStack Query queries/mutations, debounce
│   ├── lib/                    # API client, types, format, validation, links, files
│   └── providers/              # Query, server config, and toast providers
├── assets/images/              # Icon, adaptive icon, splash, favicon
├── app.json                    # Expo, RTL, networking, splash, icons, typed routes
└── ...
```

- `src/lib/api.ts` is the only place that talks to the backend. It handles URL normalization, JSON errors, abort signals, timeouts, and file downloads.
- `src/providers/server-config-provider.tsx` persists the selected server URL and clears the query cache when it changes.
- Query keys include the active base URL, so switching servers cannot mix cached data.
- Ledger mutations update the visible balance and entry cache from the mutation response, then invalidate related queries.
- The Cairo font is loaded before the navigator renders; the splash screen stays visible until fonts and the persisted server configuration are ready.
- RTL is enforced with `I18nManager.allowRTL(true)` / `forceRTL(true)`, the `expo-localization` config plugin, and `document.documentElement.dir = "rtl"` for the web target. The first native launch after changing RTL settings may require a reload.
- Amount fields use `inputMode="decimal"` and `keyboardType="decimal-pad"`, select existing text on focus, and parse Arabic/Persian digits plus comma decimal separators.
- WhatsApp statements use `whatsapp://send?phone=...&text=...` on native, with `https://wa.me/...` as the web/fallback URL. Phone calls use `tel:`.
- PDF statements and database/JSON backups use the native share sheet on iOS/Android and a direct browser download on web.
- Haptics are best-effort: transaction additions/deletions never fail because a device lacks a vibration motor.

## Backend Contract

The mobile client consumes:

- `GET /api/stats/overview`
- `GET /api/clients?status=all`
- `GET /api/clients/:id`
- `GET/POST /api/clients/:id/entries`
- `PUT/DELETE /api/entries/:id`
- `GET /api/settings`
- `GET /api/reports/client/:id/pdf`
- `GET /api/backup/download`
- `POST /api/backup/export-json`

## Verification

The following checks are run from `mobile/`:

```powershell
npx tsc --noEmit
npx eslint . --max-warnings=0
npx expo config --type public
npx expo export --platform web
npx expo export --platform android
```

`npx expo start` starts the development server without configuration errors. Haptics, the native share sheet, and `whatsapp://` / `tel:` handoff require a physical device or an emulator with the relevant apps installed.
