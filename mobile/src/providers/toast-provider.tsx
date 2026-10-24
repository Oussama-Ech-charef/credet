import { Ionicons } from "@expo/vector-icons";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  Animated,
  Platform,
  StyleSheet,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { colors, fonts, radius, spacing } from "@/constants/theme";

export type ToastTone = "success" | "error" | "info";

interface ToastState {
  message: string;
  tone: ToastTone;
  id: number;
}

interface ToastContextValue {
  showToast: (message: string, tone?: ToastTone) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const useNativeDriver = Platform.OS !== "web";

const toneStyles: Record<ToastTone, { color: string; background: string; icon: keyof typeof Ionicons.glyphMap }> = {
  success: {
    color: colors.paymentText,
    background: colors.paymentSoft,
    icon: "checkmark-circle",
  },
  error: {
    color: colors.debtText,
    background: colors.debtSoft,
    icon: "alert-circle",
  },
  info: {
    color: colors.actionText,
    background: colors.actionSoft,
    icon: "information-circle",
  },
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const insets = useSafeAreaInsets();
  const [toast, setToast] = useState<ToastState | null>(null);
  const [opacity] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(-8));
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const counter = useRef(0);

  const hide = useCallback(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 0,
        duration: 160,
        useNativeDriver,
      }),
      Animated.timing(translateY, {
        toValue: -6,
        duration: 160,
        useNativeDriver,
      }),
    ]).start(() => setToast(null));
  }, [opacity, translateY]);

  const showToast = useCallback(
    (message: string, tone: ToastTone = "success") => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }

      counter.current += 1;
      setToast({ message, tone, id: counter.current });
      opacity.setValue(0);
      translateY.setValue(-8);

      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 180,
          useNativeDriver,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 180,
          useNativeDriver,
        }),
      ]).start();

      hideTimer.current = setTimeout(hide, 2800);
    },
    [hide, opacity, translateY],
  );

  useEffect(() => {
    return () => {
      if (hideTimer.current) {
        clearTimeout(hideTimer.current);
      }
    };
  }, []);

  const tone = toast ? toneStyles[toast.tone] : null;

  return (
    <ToastContext.Provider value={{ showToast }}>
      <View style={styles.root}>
        {children}
        <View pointerEvents="none" style={styles.overlay}>
          {toast && tone ? (
            <Animated.View
              accessibilityLiveRegion="polite"
              accessibilityRole="alert"
              style={[
                styles.toast,
                {
                  top: insets.top + (Platform.OS === "web" ? 14 : 8),
                  opacity,
                  transform: [{ translateY }],
                  borderColor: tone.color,
                },
              ]}
            >
              <View style={[styles.icon, { backgroundColor: tone.background }]}>
                <Ionicons color={tone.color} name={tone.icon} size={18} />
              </View>
              <AppText style={styles.message} variant="bodyStrong">
                {toast.message}
              </AppText>
            </Animated.View>
          ) : null}
        </View>
      </View>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const value = useContext(ToastContext);

  if (!value) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return value;
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  overlay: {
    position: "absolute",
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1000,
    elevation: 1000,
  },
  toast: {
    position: "absolute",
    left: spacing.lg,
    right: spacing.lg,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    minHeight: 54,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
    borderWidth: 1,
    borderRadius: radius.lg,
    backgroundColor: colors.surface2,
    shadowColor: "#000000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.28,
    shadowRadius: 18,
    elevation: 8,
  },
  icon: {
    width: 34,
    height: 34,
    borderRadius: radius.sm,
    alignItems: "center",
    justifyContent: "center",
  },
  message: {
    flex: 1,
    fontFamily: fonts.semibold,
  },
});
