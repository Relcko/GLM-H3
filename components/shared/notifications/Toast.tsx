"use client";

import { useState, useEffect, createContext, useContext, useCallback, type ReactNode } from "react";
import { cn } from "@/lib/shared/cn";

interface Toast {
  id: string;
  title: string;
  message?: string;
  type: "success" | "error" | "warning" | "info";
  duration?: number;
}

interface ToastContextType {
  addToast: (toast: Omit<Toast, "id">) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

const typeStyles: Record<string, string> = {
  success: "border-green-500/20 bg-green-500/10",
  error: "border-red-500/20 bg-red-500/10",
  warning: "border-yellow-500/20 bg-yellow-500/10",
  info: "border-accent/20 bg-accent/10",
};

const typeIcons: Record<string, ReactNode> = {
  success: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-green-400"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3" /><path d="M8 12l3 3 5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>,
  error: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-red-400"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3" /><path d="M15 9l-6 6M9 9l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  warning: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-yellow-400"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3" /><path d="M12 8v4M12 16h0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
  info: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-accent"><circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="1.5" opacity="0.3" /><path d="M12 16v-4M12 8h0" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>,
};

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((toast: Omit<Toast, "id">) => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { ...toast, id }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2" aria-live="polite" aria-label="Notifications">
        {toasts.map((toast) => (
          <ToastItem key={toast.id} toast={toast} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: (id: string) => void }) {
  useEffect(() => {
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      const timer = setTimeout(() => onDismiss(toast.id), duration);
      return () => clearTimeout(timer);
    }
  }, [toast, onDismiss]);

  return (
    <div
      className={cn(
        "flex w-80 items-start gap-3 rounded-xl border px-4 py-3 shadow-xl backdrop-blur-xl animate-in slide-in-from-right-2",
        typeStyles[toast.type]
      )}
      role="alert"
    >
      <span className="mt-0.5 shrink-0">{typeIcons[toast.type]}</span>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-white/90">{toast.title}</p>
        {toast.message && <p className="mt-0.5 text-xs text-white/50">{toast.message}</p>}
      </div>
      <button
        onClick={() => onDismiss(toast.id)}
        className="shrink-0 rounded p-0.5 text-white/30 hover:text-white/70"
        aria-label="Dismiss"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path d="M6 6l12 12M18 6l-12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );
}

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}

export function toast(...args: Parameters<ToastContextType["addToast"]>) {
  throw new Error("toast() must be called within a React component via useToast().addToast()");
}
