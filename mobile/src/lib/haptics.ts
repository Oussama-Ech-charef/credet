import * as Haptics from "expo-haptics";
import { Platform } from "react-native";

async function safely(run: () => Promise<void>): Promise<void> {
  if (Platform.OS === "web") {
    return;
  }

  try {
    await run();
  } catch {
    // Haptics are a progressive enhancement; a device without a vibration
    // motor must not interrupt a successful ledger operation.
  }
}

export function hapticSuccess(): Promise<void> {
  return safely(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  });
}

export function hapticDelete(): Promise<void> {
  return safely(async () => {
    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
  });
}

export function hapticLight(): Promise<void> {
  return safely(async () => {
    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  });
}
