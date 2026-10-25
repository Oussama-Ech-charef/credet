# Phase 7: Build Standalone APK with EAS (No QR Code Required)

## 🎯 Phase Goal

Package the Credet mobile app as a **self-contained Android APK** that can be
installed on any Android phone like a normal app — no Expo Go, no QR code scan,
no computer running in the background.

After this phase:
- A file `Credet.apk` (or `.aab`) is available to install directly.
- The app launches from the home screen with the Credet icon.
- All features work: Firebase sync, offline mode, PDF generation, WhatsApp sharing.

---

## 📐 Pre-requisites (verify before starting)

| Item | Check |
|---|---|
| `mobile/src/lib/firebase.ts` has real credentials | ✅ already done |
| Firebase project `credet-5da9c` has Firestore enabled | verify in console |
| `app.json` has `android.package = "com.credet.app"` | ✅ already set |
| Node.js ≥ 22 installed | required |
| EAS CLI installed (`npm install -g eas-cli`) | install if missing |
| Expo account exists (free) at expo.dev | required for cloud build |

---

## 🗂️ Files to Create / Modify

| File | Action |
|---|---|
| `mobile/eas.json` | **Create** — EAS build profiles |
| `mobile/app.json` | **No change needed** — already has `android.package` |

---

## 📄 `mobile/eas.json` Content

Create this file exactly:

```json
{
  "cli": {
    "version": ">= 12.0.0",
    "appVersionSource": "local"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      }
    },
    "preview": {
      "distribution": "internal",
      "android": {
        "buildType": "apk"
      },
      "env": {
        "EXPO_PUBLIC_ENV": "preview"
      }
    },
    "production": {
      "android": {
        "buildType": "app-bundle"
      }
    }
  },
  "submit": {
    "production": {}
  }
}
```

---

## 🚀 Build Commands

### Option A — Cloud Build (recommended, no Android SDK needed)

```powershell
cd mobile

# Login to Expo account (one time)
npx eas-cli login

# Link the project (one time)
npx eas-cli init --id <your-expo-project-id>

# Build APK in the cloud (free tier: ~15 min)
npx eas-cli build -p android --profile preview
```

After the build:
1. EAS prints a download URL.
2. Open the URL on your phone → tap **Install**.
3. Allow "Install from unknown sources" if prompted.

### Option B — Local Build (requires Android SDK + Java 17)

```powershell
cd mobile
npx eas-cli build -p android --profile preview --local
```

The output `.apk` file will be in the `mobile/` directory.

---

## 🔐 Keystore (Signing)

- For the **preview** profile, EAS auto-generates a keystore on first build.
- Accept the prompt: `Generate new Android Keystore? › Yes`
- EAS stores the keystore securely — do not lose access to your Expo account.
- For production Play Store release, use the same keystore consistently.

---

## 📱 Install on Phone

```
1. Enable "Install unknown apps" in phone settings
   (Settings → Security → Install unknown apps → Files → Allow)

2. Download Credet.apk to the phone

3. Open the APK file → Install → Open
```

Or use ADB (if phone connected via USB):
```powershell
adb install Credet.apk
```

---

## 🔧 Environment Variables in the Build

The APK will bake in `EXPO_PUBLIC_*` variables at build time.
Since we use Firebase (no runtime server URL), **no env vars are needed** —
Firebase credentials are already hardcoded in `mobile/src/lib/firebase.ts`.

If you want to move credentials to env vars in the future:
```json
// eas.json preview.env
{
  "EXPO_PUBLIC_FIREBASE_API_KEY": "AIzaSy...",
  "EXPO_PUBLIC_FIREBASE_PROJECT_ID": "credet-5da9c"
}
```

---

## ✅ Acceptance Criteria

1. `eas.json` exists in `mobile/` with `preview` profile set to `apk`.
2. `npx eas-cli build -p android --profile preview` completes without error.
3. The downloaded APK installs on an Android device.
4. The app launches, shows the Credet splash screen, then the home dashboard.
5. Adding a credit entry on the phone is reflected in Firebase console within 5 seconds.
6. The app works in **Airplane Mode** (offline): entries are queued and synced when reconnected.
7. PDF generation and WhatsApp sharing work from the installed APK.

---

## 📝 Notes

- **iOS**: Building an `.ipa` requires an Apple Developer account ($99/year) and a Mac.
  Defer iOS distribution to a future phase.
- **Expo Go is still usable** for development — the APK is only for production installs.
- If the build fails with a dependency error, run `npx expo-doctor` first.
- Minimum Android version supported: Android 8.0 (API 26) — covers 99% of Moroccan devices.
