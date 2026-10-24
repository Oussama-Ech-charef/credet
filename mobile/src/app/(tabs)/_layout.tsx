import { Ionicons } from "@expo/vector-icons";
import { Tabs } from "expo-router/js-tabs";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { colors, fonts } from "@/constants/theme";

export default function TabsLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        sceneStyle: { backgroundColor: colors.bg },
        tabBarActiveTintColor: colors.actionStrong,
        tabBarInactiveTintColor: colors.dim,
        tabBarHideOnKeyboard: true,
        tabBarLabelStyle: {
          fontFamily: fonts.semibold,
          fontSize: 11,
          lineHeight: 20,
          marginTop: 0,
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
        tabBarStyle: {
          height: 72 + insets.bottom,
          paddingTop: 6,
          paddingBottom: insets.bottom + 6,
          backgroundColor: colors.bgDeep,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          elevation: 0,
          shadowOpacity: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "الرئيسية",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color as string}
              name={focused ? "home" : "home-outline"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="clients"
        options={{
          title: "الكليان",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color as string}
              name={focused ? "people" : "people-outline"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="quick-entry"
        options={{
          title: "تسجيل سريع",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={focused ? (color as string) : colors.action}
              name={focused ? "add-circle" : "add-circle-outline"}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: "الإعدادات",
          tabBarIcon: ({ color, focused, size }) => (
            <Ionicons
              color={color as string}
              name={focused ? "settings" : "settings-outline"}
              size={size}
            />
          ),
        }}
      />
    </Tabs>
  );
}
