"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { Icon, type IconName } from "@/components/ui/icon";

export type ToastVariant = "success" | "error" | "info";

export interface Toast {
  id: string;
  message: string;
  variant: ToastVariant;
}

interface ToastContextValue {
  toast: (message: string, variant?: ToastVariant) => void;
  dismiss: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

const variantIcon: Record<ToastVariant, IconName> = {
  success: "check",
  error: "alert",
  info: "note",
};

function ToastItem({
  item,
  onDismiss,
}: {
  item: Toast;
  onDismiss: (id: string) => void;
}) {
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused) {
      return;
    }

    const timeout = window.setTimeout(() => onDismiss(item.id), 4_500);
    return () => window.clearTimeout(timeout);
  }, [item.id, onDismiss, paused]);

  return (
    <div
      className={`toast toast--${item.variant}`}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      role={item.variant === "error" ? "alert" : "status"}
    >
      <span aria-hidden="true" className="toast__icon">
        <Icon name={variantIcon[item.variant]} size={18} />
      </span>
      <p className="toast__message">{item.message}</p>
      <button
        aria-label="إغلاق التنبيه"
        className="toast__close"
        onClick={() => onDismiss(item.id)}
        type="button"
      >
        <Icon name="close" size={15} />
      </button>
    </div>
  );
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setItems((current) => current.filter((item) => item.id !== id));
  }, []);

  const toast = useCallback(
    (message: string, variant: ToastVariant = "success") => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      setItems((current) => [...current.slice(-2), { id, message, variant }]);
    },
    [],
  );

  const value = useMemo(() => ({ toast, dismiss }), [dismiss, toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-label="تنبيهات التطبيق"
        className="toast-region"
        role="region"
      >
        {items.map((item) => (
          <ToastItem item={item} key={item.id} onDismiss={dismiss} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext);

  if (!context) {
    throw new Error("useToast must be used inside ToastProvider");
  }

  return context;
}
