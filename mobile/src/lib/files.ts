import { File, Paths } from "expo-file-system";
import * as Sharing from "expo-sharing";
import { Platform } from "react-native";

import type { DownloadedFile } from "@/lib/types";

function safeFilename(filename: string, fallback: string): string {
  const cleaned = filename
    .replace(/[\\/:*?"<>|]/g, "-")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || fallback;
}

function downloadInBrowser(
  bytes: Uint8Array,
  filename: string,
  mimeType: string,
): void {
  const blob = new Blob([bytes.buffer as ArrayBuffer], { type: mimeType });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = filename;
  anchor.rel = "noopener";
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(objectUrl), 2_000);
}

export interface ShareFileOptions {
  mimeType: string;
  dialogTitle: string;
  uti?: string;
  fallbackFilename: string;
}

export async function shareDownloadedFile(
  download: DownloadedFile,
  options: ShareFileOptions,
): Promise<void> {
  const filename = safeFilename(download.filename, options.fallbackFilename);

  if (Platform.OS === "web") {
    downloadInBrowser(download.bytes, filename, options.mimeType);
    return;
  }

  const file = new File(Paths.cache, filename);

  if (file.exists) {
    file.delete();
  }

  await file.write(download.bytes);

  const available = await Sharing.isAvailableAsync();

  if (!available) {
    throw new Error("مشاركة الملفات غير متاحة على هذا الجهاز.");
  }

  await Sharing.shareAsync(file.uri, {
    dialogTitle: options.dialogTitle,
    mimeType: options.mimeType,
    UTI: options.uti,
  });
}
