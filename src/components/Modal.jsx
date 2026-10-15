import { useEffect, useRef } from "react";
import { X } from "lucide-react";

/** Centered dialog with a title bar; Escape or the backdrop closes it. Scrolls inside on small screens. */
export default function Modal({ title, subtitle, onClose, children, footer, width = "max-w-xl" }) {
  const panel = useRef(null);
  // Latest onClose without re-running the setup below (callers pass a new function each render,
  // and re-running it would pull focus out of whatever field is being typed in).
  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && close.current();
    document.addEventListener("keydown", onKey);
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    // Focus the dialog once when it opens, unless a field inside already has focus (autoFocus).
    if (!panel.current?.contains(document.activeElement)) panel.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, []);

  return (
    <div className="drawer-fade fixed inset-0 z-[70] flex items-end justify-center bg-black/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-4" onMouseDown={onClose}>
      <div
        ref={panel}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onMouseDown={(e) => e.stopPropagation()}
        className={`pop-in flex max-h-[94vh] w-full ${width} flex-col overflow-hidden rounded-t-3xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-2xl outline-none sm:rounded-3xl`}
      >
        <div className="flex items-start justify-between gap-3 border-b border-[var(--color-border-soft)] px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 className="font-display text-[18px] font-medium tracking-tight">{title}</h2>
            {subtitle && <p className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">{subtitle}</p>}
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-panel-alt)]">
            <X size={18} />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <div className="border-t border-[var(--color-border-soft)] px-5 py-4 sm:px-6">{footer}</div>}
      </div>
    </div>
  );
}
