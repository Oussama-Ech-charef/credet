"use client";

import { useEffect } from "react";

import { logError } from "@/lib/logger";

export function GlobalErrorLogger() {
  useEffect(() => {
    const handleError = (event: ErrorEvent) => {
      logError(
        "WindowError",
        event.error ?? event.message ?? "Unknown window error",
      );
    };

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      logError(
        "UnhandledRejection",
        event.reason ?? "Unknown promise rejection",
      );
    };

    window.addEventListener("error", handleError);
    window.addEventListener("unhandledrejection", handleUnhandledRejection);

    return () => {
      window.removeEventListener("error", handleError);
      window.removeEventListener(
        "unhandledrejection",
        handleUnhandledRejection,
      );
    };
  }, []);

  return null;
}
