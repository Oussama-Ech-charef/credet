import {
  Cairo_400Regular,
  Cairo_500Medium,
  Cairo_600SemiBold,
  Cairo_700Bold,
  Cairo_800ExtraBold,
  useFonts,
} from "@expo-google-fonts/cairo";
import { Stack } from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { I18nManager, Platform } from "react-native";

import { colors } from "@/constants/theme";
import { AppProviders } from "@/providers/app-providers";
import { useServerConfig } from "@/providers/server-config-provider";

SplashScreen.preventAutoHideAsync().catch(() => {
  // Splash prevention is best effort; the app can still render if it fails.
});

if (Platform.OS !== "web") {
  I18nManager.allowRTL(true);
  I18nManager.forceRTL(true);
} else if (typeof document !== "undefined") {
  // Set the document direction before the first React render. Changing it
  // afterwards can leave the web scroll container at a mirrored offset.
  document.documentElement.lang = "ar";
  document.documentElement.dir = "rtl";
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    Cairo_400Regular,
    Cairo_500Medium,
    Cairo_600SemiBold,
    Cairo_700Bold,
    Cairo_800ExtraBold,
  });

  useEffect(() => {
    if (Platform.OS !== "web") {
      void SystemUI.setBackgroundColorAsync(colors.bg).catch(() => {
        // The theme remains correct even if the native root color is unavailable.
      });
    }
  }, []);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

function RootNavigator() {
  const { ready } = useServerConfig();

  useEffect(() => {
    if (ready) {
      void SplashScreen.hideAsync().catch(() => {
        // Hiding the splash screen twice is harmless.
      });
    }
  }, [ready]);

  if (!ready) {
    return null;
  }

  return (
    <Stack
      screenOptions={{
        animation: "slide_from_right",
        contentStyle: { backgroundColor: colors.bg },
        headerShown: false,
      }}
    >
      <Stack.Screen name="(tabs)" />
      <Stack.Screen name="clients/[id]" />
      <Stack.Screen name="+not-found" />
    </Stack>
  );
}
