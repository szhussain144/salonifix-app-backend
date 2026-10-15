import { createContext, useCallback, useContext, useEffect, useRef } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ExternalLink, X } from "lucide-react";

const DrawerContext = createContext(false);

/** True when rendered inside a detail drawer (pages can hide full-page-only chrome). */
// oxlint-disable-next-line react/only-export-components -- hook is colocated with its provider
export function useInDrawer() {
  return useContext(DrawerContext);
}

/**
 * Right-hand drawer that shows a detail page over the list it was opened from.
 * The list stays mounted underneath (see the background-location routes in App.jsx).
 */
export default function DetailDrawer({ title, children }) {
  const location = useLocation();
  const navigate = useNavigate();
  const panelRef = useRef(null);
  const background = location.state?.background;

  const close = useCallback(
    () => navigate(`${background?.pathname ?? "/"}${background?.search ?? ""}`, { replace: true }),
    [navigate, background],
  );

  // Escape closes; the page behind doesn't scroll while the drawer is open.
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [close]);

  // Move focus into the drawer each time a new item opens, for keyboard and screen-reader users.
  useEffect(() => {
    panelRef.current?.focus();
  }, [location.pathname]);

  return (
    <DrawerContext.Provider value={true}>
      <div className="fixed inset-0 z-50">
        <div className="drawer-fade absolute inset-0 bg-[var(--color-ink)]/35 backdrop-blur-[1px]" onClick={close} aria-hidden="true" />
        <aside
          ref={panelRef}
          tabIndex={-1}
          role="dialog"
          aria-modal="true"
          aria-label={title}
          className="drawer-slide absolute inset-y-0 right-0 flex w-full max-w-[1000px] flex-col bg-[var(--color-bg)] shadow-[-24px_0_60px_rgba(32,34,53,0.22)] outline-none"
        >
          <header className="flex shrink-0 items-center justify-between gap-3 border-b border-[var(--color-border)] bg-[var(--color-panel)] px-5 py-3.5">
            <h2 className="font-display text-[18px] font-medium text-[var(--color-ink)]">{title}</h2>
            <div className="flex items-center gap-1">
              <Link
                to={location.pathname}
                replace
                className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-[12px] text-[var(--color-muted)] hover:bg-[var(--color-panel-alt)] hover:text-[var(--color-ink)]"
              >
                <ExternalLink size={14} /> Open full page
              </Link>
              <button
                type="button"
                onClick={close}
                aria-label="Close"
                className="rounded-lg p-2 text-[var(--color-muted)] hover:bg-[var(--color-panel-alt)] hover:text-[var(--color-ink)]"
              >
                <X size={18} />
              </button>
            </div>
          </header>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-5 sm:px-6">{children}</div>
        </aside>
      </div>
    </DrawerContext.Provider>
  );
}
