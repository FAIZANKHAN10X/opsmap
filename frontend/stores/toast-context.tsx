"use client";

/**
 * Ephemeral toast notifications — success / error / warning / info (Phase 10).
 * Centralized so feature components do not own toast state.
 */

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { NotificationSeverity } from "@/types/domain";

export type ToastItem = {
  id: string;
  severity: NotificationSeverity;
  title: string;
  message?: string;
  durationMs: number;
};

type ToastContextValue = {
  toasts: ToastItem[];
  push: (
    severity: NotificationSeverity,
    title: string,
    message?: string,
    durationMs?: number,
  ) => void;
  success: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
  dismiss: (id: string) => void;
};

const ToastContext = createContext<ToastContextValue | null>(null);

const DEFAULT_DURATION: Record<NotificationSeverity, number> = {
  success: 3500,
  info: 4000,
  warning: 5000,
  error: 6000,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  const dismiss = useCallback((id: string) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const push = useCallback(
    (
      severity: NotificationSeverity,
      title: string,
      message?: string,
      durationMs?: number,
    ) => {
      const id = `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const duration = durationMs ?? DEFAULT_DURATION[severity];
      const item: ToastItem = { id, severity, title, message, durationMs: duration };
      setToasts((prev) => [...prev.slice(-4), item]);
      if (duration > 0) {
        const timer = setTimeout(() => dismiss(id), duration);
        timers.current.set(id, timer);
      }
    },
    [dismiss],
  );

  const value = useMemo<ToastContextValue>(
    () => ({
      toasts,
      push,
      success: (title, message) => push("success", title, message),
      error: (title, message) => push("error", title, message),
      warning: (title, message) => push("warning", title, message),
      info: (title, message) => push("info", title, message),
      dismiss,
    }),
    [toasts, push, dismiss],
  );

  return (
    <ToastContext.Provider value={value}>{children}</ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return ctx;
}
