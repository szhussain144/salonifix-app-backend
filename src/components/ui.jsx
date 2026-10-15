import { startTransition, useEffect, useLayoutEffect, useRef, useState } from "react";
import AnimatedNumber from "./AnimatedNumber";

export function Card({ className = "", children, ...props }) {
  return (
    <div
      className={`card-in bg-[var(--color-card)] border border-[var(--color-border)] rounded-[var(--radius-card)] shadow-[var(--shadow-card)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

export function SectionTitle({ eyebrow, title, action }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-4">
      <div className="min-w-0">
        {eyebrow && (
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)] mb-1">{eyebrow}</p>
        )}
        <h2 className="font-display text-[17px] font-medium tracking-tight text-[var(--color-ink)]">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function Button({ variant = "primary", className = "", children, ...props }) {
  const styles = {
    primary:
      "btn-primary bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold shadow-[0_1px_2px_rgba(32,34,53,0.12)] hover:bg-[var(--color-accent-dark)] hover:-translate-y-px hover:shadow-[0_10px_24px_-8px_rgba(116,41,195,0.55)]",
    ghost:
      "bg-[var(--color-panel)] text-[var(--color-ink-2)] font-medium border border-[var(--color-border)] hover:text-[var(--color-ink)] hover:border-[var(--color-accent)]/50",
    subtle:
      "bg-[var(--color-panel-alt)] text-[var(--color-ink)] font-medium hover:bg-[var(--color-accent-soft)] hover:text-[var(--color-accent-dark)]",
  };
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full text-[13px] whitespace-nowrap transition-all duration-200 active:scale-[0.97] disabled:opacity-50 disabled:pointer-events-none ${styles[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

const tone = {
  green: "text-[var(--color-green)] bg-[var(--color-green)]/10",
  blue: "text-[var(--color-blue)] bg-[var(--color-blue)]/10",
  orange: "text-[var(--color-orange)] bg-[var(--color-orange)]/10",
  accent: "text-[var(--color-accent)] bg-[var(--color-accent)]/10",
  red: "text-[var(--color-red)] bg-[var(--color-red)]/10",
  neutral: "text-[var(--color-muted)] bg-[var(--color-panel-alt)]",
};

const badgeColors = {
  Active: tone.green,
  Confirmed: tone.green,
  Completed: tone.green,
  Paid: tone.green,
  "In Stock": tone.green,
  Upcoming: tone.blue,
  "Walk-in Client": tone.orange,
  "Low Stock": tone.orange,
  Pending: tone.accent,
  Cancelled: tone.red,
  "No-show": tone.orange,
  Unpaid: tone.red,
  "Out of Stock": tone.red,
  Inactive: tone.neutral,
  Sent: tone.green,
  Failed: tone.red,
  // Payroll
  Partial: tone.orange,
  // Campaigns and call list
  Draft: tone.neutral,
  Scheduled: tone.blue,
  Sending: tone.accent,
  Canceled: tone.neutral,
  Queued: tone.neutral,
  Open: tone.blue,
  Done: tone.green,
  // Memberships
  "Renewal due": tone.orange,
  Ending: tone.orange,
  Expired: tone.neutral,
};

export function Badge({ children }) {
  const cls = badgeColors[children] || tone.neutral;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${cls}`}>
      {children}
    </span>
  );
}

/* Stylist-style hues from the marketing site, dark enough for white initials. */
const avatarHues = ["#7429C3", "#2F7D6B", "#47769D", "#B0407A"];

export function Avatar({ initials, size = 36 }) {
  const key = String(initials || "");
  const hue = avatarHues[[...key].reduce((n, c) => n + c.charCodeAt(0), 0) % avatarHues.length];
  return (
    <div
      className="rounded-full flex items-center justify-center text-[var(--color-accent-ink)] font-semibold shrink-0"
      style={{ width: size, height: size, fontSize: size * 0.36, background: hue }}
    >
      {initials}
    </div>
  );
}

export function StatCard({ label, value, sub, accent = false, icon: Icon, trend }) {
  return (
    <Card className={`relative overflow-hidden p-4 sm:p-5 transition-[translate,box-shadow] duration-300 hover:-translate-y-0.5 hover:shadow-[0_2px_4px_rgba(32,34,53,0.05),0_18px_36px_-16px_rgba(32,34,53,0.28)] ${accent ? "banner border-none" : ""}`}>
      <div className="flex items-start justify-between gap-3">
        <p className={`text-[12.5px] font-medium ${accent ? "text-[var(--color-accent-ink)]/80" : "text-[var(--color-muted)]"}`}>{label}</p>
        {Icon && (
          <span
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${
              accent ? "bg-white/15 text-[var(--color-accent-ink)]" : "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
            }`}
          >
            <Icon size={15} />
          </span>
        )}
      </div>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className={`text-[24px] sm:text-[26px] font-semibold tracking-tight leading-tight ${accent ? "text-[var(--color-accent-ink)]" : "text-[var(--color-ink)]"}`}>
          <AnimatedNumber value={value} />
        </p>
        {trend}
      </div>
      {sub && (
        <p className={`text-[12px] mt-1 ${accent ? "text-[var(--color-accent-ink)]/80" : "text-[var(--color-faint)]"}`}>{sub}</p>
      )}
    </Card>
  );
}

export function EmptyState({ icon: Icon, title, children, action }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-panel-alt)]/40 px-6 py-8 text-center">
      {Icon && (
        <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <Icon size={18} />
        </span>
      )}
      <p className="text-[14px] font-semibold text-[var(--color-ink)]">{title}</p>
      {children && <p className="mt-1 max-w-xs text-[12.5px] text-[var(--color-muted)]">{children}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function Segmented({ options, value, onChange }) {
  const wrap = useRef(null);
  const [pill, setPill] = useState(null);
  const [ready, setReady] = useState(false);
  // The pill moves on click; the new tab's content renders in the background (no blank flash
  // while its code loads).
  const [shown, setShown] = useState(value);
  useEffect(() => setShown(value), [value]);
  const choose = (key) => {
    setShown(key);
    startTransition(() => onChange(key));
  };

  // Measure the chosen tab; the pill then slides there (no slide on the first paint).
  useLayoutEffect(() => {
    const measure = () => {
      const el = wrap.current?.querySelector('[aria-selected="true"]');
      if (el) setPill({ left: el.offsetLeft, width: el.offsetWidth });
    };
    measure();
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (observer && wrap.current) observer.observe(wrap.current);
    const raf = requestAnimationFrame(() => setReady(true));
    return () => {
      observer?.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [shown, options.length]);

  return (
    <div ref={wrap} className="relative inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] p-1 shadow-[var(--shadow-card)]" role="tablist">
      {pill && (
        <span
          aria-hidden="true"
          className={`absolute top-1 bottom-1 rounded-full bg-[var(--color-accent)] shadow-[0_6px_16px_-8px_rgba(116,41,195,0.7)] ${ready ? "transition-[left,width] duration-300 ease-[cubic-bezier(0.22,1,0.36,1)]" : ""}`}
          style={{ left: pill.left, width: pill.width }}
        />
      )}
      {options.map((o) => (
        <button
          key={o.key}
          type="button"
          role="tab"
          aria-selected={shown === o.key}
          onClick={() => choose(o.key)}
          className={`relative z-10 inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors duration-200 ${
            shown === o.key
              ? `text-[var(--color-accent-ink)] ${pill ? "" : "bg-[var(--color-accent)]"}`
              : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          {o.icon && <o.icon size={14} />}
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function Table({ columns, children }) {
  return (
    <div className="overflow-x-auto scrollbar-none">
      <table className="w-full text-left border-collapse min-w-[560px]">
        <thead>
          <tr className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)] border-b border-[var(--color-border)]">
            {columns.map((c) => (
              <th key={c} className="pb-3 pr-4 whitespace-nowrap">
                {c}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="text-[13px] text-[var(--color-ink)]">{children}</tbody>
      </table>
    </div>
  );
}

export function Tr({ children }) {
  return (
    <tr className="row-in border-b border-[var(--color-border-soft)] last:border-none transition-colors hover:bg-[var(--color-panel-alt)]/60">
      {children}
    </tr>
  );
}

export function Td({ children, className = "", ...props }) {
  return <td className={`py-3.5 pr-4 whitespace-nowrap ${className}`} {...props}>{children}</td>;
}

const field =
  "w-full bg-[var(--color-panel)] border border-[var(--color-border)] rounded-[var(--radius-input)] px-3.5 py-2.5 text-[13px] text-[var(--color-ink)] outline-none transition-shadow focus:border-[var(--color-accent)] focus:shadow-[0_0_0_3px_rgba(116,41,195,0.14)] placeholder:text-[var(--color-faint)]";

function FieldLabel({ label }) {
  return label ? <span className="block text-[12px] font-medium text-[var(--color-ink-2)] mb-1.5">{label}</span> : null;
}

export function Input({ label, className = "", ...props }) {
  return (
    <label className="block">
      <FieldLabel label={label} />
      <input className={`${field} ${className}`} {...props} />
    </label>
  );
}

export function Textarea({ label, className = "", ...props }) {
  return (
    <label className="block">
      <FieldLabel label={label} />
      <textarea className={`${field} ${className}`} {...props} />
    </label>
  );
}

export function Select({ label, children, className = "", ...props }) {
  const options = Array.isArray(children) ? children : [];
  return (
    <label className="block">
      <FieldLabel label={label} />
      <select className={`${field} ${className}`} value={props.value} {...props}>
        <option key="" value="">Select Option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
