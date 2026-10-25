import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { AppShell } from "@/components/app-shell";
import { GlobalErrorLogger } from "@/components/global-error-logger";
import { SettingsProvider } from "@/hooks/use-settings";
import { ToastProvider } from "@/hooks/use-toast";
import "./globals.css";

const cairo = localFont({
  src: "./fonts/Cairo-Variable.ttf",
  display: "swap",
  preload: true,
  variable: "--font-cairo",
  weight: "200 1000",
});

export const metadata: Metadata = {
  title: {
    default: "Credet — دفتر الكريدي",
    template: "%s · Credet",
  },
  description:
    "دفتر كريدي عربي سريع وواضح: الكليان، الديون، الدفعات، وكشوف الحساب.",
  applicationName: "Credet",
};

export const viewport: Viewport = {
  colorScheme: "dark",
  initialScale: 1,
  themeColor: "#0B0F19",
  width: "device-width",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={cairo.variable} dir="rtl" lang="ar">
      <body>
        <GlobalErrorLogger />
        <ToastProvider>
          <SettingsProvider>
            <AppShell>{children}</AppShell>
          </SettingsProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
