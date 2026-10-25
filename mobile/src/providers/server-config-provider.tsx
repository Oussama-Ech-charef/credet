/**
 * FirebaseConfigProvider
 *
 * Replaces the old HTTP-based ServerConfigProvider.
 * The app now reads and writes data directly through Firebase Firestore —
 * no local backend server is needed. This provider simply boots the Firebase
 * connection and signals when the app is ready to render.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { getFirestoreDb } from "@/lib/firebase";
import { firestoreService } from "@/services/firestoreService";

interface FirebaseConfigContextValue {
  /** True once Firebase has been initialised and the app may render. */
  ready: boolean;
  /** Whether the initial seed check completed (not necessarily seeded). */
  seeded: boolean;
}

const FirebaseConfigContext = createContext<FirebaseConfigContextValue | null>(null);

export function ServerConfigProvider({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    let active = true;

    // Eagerly initialise the Firestore connection so the local cache warms up
    // before any screen tries to read data. Then seed demo data if the database
    // is completely empty (first launch only).
    const init = async () => {
      try {
        // Trigger initialisation — getFirestoreDb is idempotent.
        getFirestoreDb();

        // Seed on first launch only; returns false if data already exists.
        const wasSeeded = await firestoreService.seedInitialDataIfNeeded();

        if (active) {
          setSeeded(wasSeeded);
        }
      } catch {
        // Firebase initialisation failures are non-fatal.
        // The app will still render; individual queries will surface errors.
      } finally {
        if (active) {
          setReady(true);
        }
      }
    };

    void init();

    return () => {
      active = false;
    };
  }, []);

  const value = useMemo<FirebaseConfigContextValue>(
    () => ({ ready, seeded }),
    [ready, seeded],
  );

  return (
    <FirebaseConfigContext.Provider value={value}>
      {children}
    </FirebaseConfigContext.Provider>
  );
}

// ──────────────────────────────────────────────────────────────────────────────
// Hook
// ──────────────────────────────────────────────────────────────────────────────

export function useServerConfig(): FirebaseConfigContextValue {
  const value = useContext(FirebaseConfigContext);

  if (!value) {
    throw new Error("useServerConfig must be used inside ServerConfigProvider");
  }

  return value;
}
