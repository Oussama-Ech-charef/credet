import { Linking, Platform } from "react-native";

import {
  normalizePhoneForTel,
  normalizePhoneForWhatsApp,
} from "@/lib/format";

export async function callPhone(phone: string): Promise<void> {
  const number = normalizePhoneForTel(phone);

  if (!number) {
    throw new Error("لا يوجد رقم هاتف صالح لهذا الكليان.");
  }

  await Linking.openURL(`tel:${number}`);
}

export async function openWhatsAppChat(phone?: string | null): Promise<void> {
  const digits = phone ? normalizePhoneForWhatsApp(phone) : "";
  const webUrl = digits ? `https://wa.me/${digits}` : "https://wa.me/";
  const nativeUrl = digits
    ? `whatsapp://send?phone=${digits}`
    : "whatsapp://send";

  if (Platform.OS === "web") {
    await Linking.openURL(webUrl);
    return;
  }

  try {
    await Linking.openURL(nativeUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}

export async function shareViaWhatsApp(
  phone: string | null | undefined,
  message: string,
): Promise<void> {
  const digits = phone ? normalizePhoneForWhatsApp(phone) : "";
  const encoded = encodeURIComponent(message);
  const webUrl = digits
    ? `https://wa.me/${digits}?text=${encoded}`
    : `https://wa.me/?text=${encoded}`;
  const nativeUrl = digits
    ? `whatsapp://send?phone=${digits}&text=${encoded}`
    : `whatsapp://send?text=${encoded}`;

  if (Platform.OS === "web") {
    await Linking.openURL(webUrl);
    return;
  }

  try {
    await Linking.openURL(nativeUrl);
  } catch {
    await Linking.openURL(webUrl);
  }
}
