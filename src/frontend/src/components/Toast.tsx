import { useCallback, useEffect, useState } from "react";

type ToastVariant = "success" | "error" | "info";

interface ToastMessage {
  id: number;
  message: string;
  variant: ToastVariant;
}

let toastIdCounter = 0;
let globalAddToast: ((msg: string, variant: ToastVariant) => void) | null =
  null;

export function toast(message: string, variant: ToastVariant = "info") {
  if (globalAddToast) globalAddToast(message, variant);
}

const variantStyles: Record<ToastVariant, string> = {
  success: "bg-green-600 text-white",
  error: "bg-red-600 text-white",
  info: "bg-primary text-primary-foreground",
};

const variantIcons: Record<ToastVariant, string> = {
  success: "✓",
  error: "✕",
  info: "ℹ",
};

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant) => {
    const id = ++toastIdCounter;
    setToasts((prev) => [...prev, { id, message, variant }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  useEffect(() => {
    globalAddToast = addToast;
    return () => {
      globalAddToast = null;
    };
  }, [addToast]);

  if (toasts.length === 0) return null;

  return (
    <div
      className="fixed top-4 right-4 z-[9999] flex flex-col gap-2 max-w-xs"
      aria-live="polite"
      aria-atomic="true"
      data-ocid="toast"
    >
      {toasts.map((t) => (
        <div
          key={t.id}
          role="alert"
          className={`flex items-start gap-2 px-4 py-3 rounded-lg shadow-lg text-sm font-medium transition-all animate-in slide-in-from-right-4 ${variantStyles[t.variant]}`}
        >
          <span
            className="mt-0.5 font-bold text-base leading-none"
            aria-hidden="true"
          >
            {variantIcons[t.variant]}
          </span>
          <span>{t.message}</span>
        </div>
      ))}
    </div>
  );
}
