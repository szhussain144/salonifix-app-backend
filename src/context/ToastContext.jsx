import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { CircleAlert, CircleCheck, Info } from "lucide-react";

const ToastContext = createContext(null);

const LEAVE_MS = 220;
const ICONS = { success: CircleCheck, error: CircleAlert, info: Info };

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  // Slides out, then is removed.
  const dismiss = useCallback((id) => {
    setToasts((s) => s.map((x) => (x.id === id ? { ...x, leaving: true } : x)));
    setTimeout(() => setToasts((s) => s.filter((x) => x.id !== id)), LEAVE_MS);
  }, []);

  const addToast = useCallback(
    // action: an optional { label, onClick } button, e.g. "See plans" on an upgrade message.
    ({ message, type = "info", duration = 3000, action }) => {
      const id = Date.now() + Math.random();
      setToasts((s) => [...s, { id, message, type, duration, action }]);
      setTimeout(() => dismiss(id), duration);
    },
    [dismiss],
  );

  const value = useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed right-4 bottom-4 z-[80] flex flex-col items-end gap-2">
        {toasts.map((t) => {
          const Icon = ICONS[t.type] || Info;
          const coloured = t.type === "success" || t.type === "error";
          return (
            <div
              key={t.id}
              role="status"
              onClick={() => dismiss(t.id)}
              className={`${t.leaving ? "toast-out" : "toast-in"} relative flex max-w-xs cursor-pointer items-start gap-2 overflow-hidden rounded-xl px-4 py-2.5 text-sm shadow-[0_16px_36px_-14px_rgba(32,34,53,0.45)] ${
                t.type === "success"
                  ? "bg-[var(--color-green)] text-white"
                  : t.type === "error"
                    ? "bg-[var(--color-red)] text-white"
                    : "border border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-ink)]"
              }`}
            >
              <Icon size={16} className={`mt-0.5 shrink-0 ${coloured ? "" : "text-[var(--color-accent)]"}`} />
              <span>
                {t.message}
                {t.action && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      dismiss(t.id);
                      t.action.onClick();
                    }}
                    className={`mt-1.5 block font-semibold underline underline-offset-2 ${coloured ? "text-white" : "text-[var(--color-accent)]"}`}
                  >
                    {t.action.label}
                  </button>
                )}
              </span>
              <span
                aria-hidden="true"
                className={`toast-timer absolute inset-x-0 bottom-0 h-[3px] ${coloured ? "bg-white/40" : "bg-[var(--color-accent)]/40"}`}
                style={{ animationDuration: `${t.duration}ms` }}
              />
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

// oxlint-disable-next-line react/only-export-components -- hook is colocated with its provider
export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
