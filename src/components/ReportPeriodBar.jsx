import { useEffect, useRef, useState } from "react";
import { CalendarDays, Check, ChevronDown } from "lucide-react";
import { Button } from "./ui";

const field =
  "mt-1 block w-full rounded-[var(--radius-input)] border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-accent)]";

const COMPARE = [
  ["previous", "Previous period"],
  ["last_year", "Last year"],
  ["none", "Off"],
];

/**
 * The Reports toolbar (shared by every tab): one period button (quick ranges + custom dates in a small
 * menu) and a three-way compare switch, with the compared dates spelled out beside it.
 */
export default function ReportPeriodBar({ presets, preset, range, rangeName, onPreset, onCustom, compare, onCompare, compareName, branchOnly }) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(range);
  const ref = useRef(null);
  const presetLabel = presets.find(([key]) => key === preset)?.[1] ?? "Custom";
  const draftValid = draft.from && draft.to && draft.from <= draft.to;

  // Each time the menu opens, the custom fields start from the period being shown.
  useEffect(() => {
    if (open) setDraft(range);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="sticky top-[64px] z-20 -mx-1 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-panel)]/95 px-3 py-2.5 shadow-[0_8px_24px_-16px_rgba(32,34,53,0.35)] backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2.5">
        {/* Period */}
        <div className="relative" ref={ref}>
          <button
            type="button"
            aria-haspopup="dialog"
            aria-expanded={open}
            aria-label={`Period: ${presetLabel}, ${rangeName}`}
            onClick={() => setOpen((v) => !v)}
            className="flex items-center gap-2.5 rounded-xl border border-[var(--color-border)] px-3 py-2 text-left transition-colors hover:border-[var(--color-accent)]"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
              <CalendarDays size={16} />
            </span>
            <span className="leading-tight">
              <span className="block text-[11px] font-medium uppercase tracking-[0.08em] text-[var(--color-faint)]">{presetLabel}</span>
              <span className="block text-[14px] font-semibold text-[var(--color-ink)]">{rangeName}</span>
            </span>
            <ChevronDown size={15} className={`ml-1 text-[var(--color-muted)] transition-transform ${open ? "rotate-180" : ""}`} />
          </button>

          {open && (
            <div
              role="dialog"
              aria-label="Choose a period"
              className="menu-in absolute left-0 top-[calc(100%+8px)] z-30 flex w-[min(560px,calc(100vw-40px))] flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[0_30px_70px_rgba(32,34,53,0.22)] sm:flex-row"
            >
              <ul className="border-b border-[var(--color-border-soft)] p-2 sm:w-[200px] sm:border-r sm:border-b-0" role="listbox" aria-label="Quick ranges">
                {presets
                  .filter(([key]) => key !== "custom")
                  .map(([key, label]) => (
                    <li key={key}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={preset === key}
                        onClick={() => {
                          onPreset(key);
                          setOpen(false);
                        }}
                        className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13px] ${
                          preset === key ? "bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent-dark)]" : "text-[var(--color-ink)] hover:bg-[var(--color-panel-alt)]"
                        }`}
                      >
                        {label}
                        {preset === key && <Check size={14} />}
                      </button>
                    </li>
                  ))}
              </ul>
              <form
                className="flex-1 space-y-3 p-4"
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!draftValid) return;
                  onCustom(draft);
                  setOpen(false);
                }}
              >
                <p className="text-[13px] font-semibold text-[var(--color-ink)]">Custom dates</p>
                <div className="grid grid-cols-2 gap-3">
                  <label className="text-[12px] font-medium text-[var(--color-ink-2)]">
                    From
                    <input type="date" value={draft.from} max={draft.to || undefined} onChange={(e) => setDraft((r) => ({ ...r, from: e.target.value }))} className={field} />
                  </label>
                  <label className="text-[12px] font-medium text-[var(--color-ink-2)]">
                    To
                    <input type="date" value={draft.to} min={draft.from || undefined} onChange={(e) => setDraft((r) => ({ ...r, to: e.target.value }))} className={field} />
                  </label>
                </div>
                {!draftValid && <p className="text-[12px] text-[var(--color-red)]">The end date must be on or after the start date.</p>}
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="ghost" type="button" onClick={() => setOpen(false)}>Cancel</Button>
                  <Button type="submit" disabled={!draftValid}>Apply</Button>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* Compare */}
        <div className="flex flex-wrap items-center gap-2.5">
          <span className="text-[12.5px] font-medium text-[var(--color-muted)]">Compare with</span>
          <div className="inline-flex rounded-full bg-[var(--color-panel-alt)] p-1" role="radiogroup" aria-label="Compare with">
            {COMPARE.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="radio"
                aria-checked={compare === key}
                onClick={() => onCompare(key)}
                className={`rounded-full px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  compare === key ? "bg-[var(--color-panel)] text-[var(--color-ink)] shadow-[0_1px_2px_rgba(32,34,53,0.14)]" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          {compareName && (
            <span className="text-[12.5px] text-[var(--color-muted)]">
              vs <b className="font-semibold text-[var(--color-ink)]">{compareName}</b>
            </span>
          )}
        </div>

        {branchOnly && (
          <span className="ml-auto rounded-full bg-[var(--color-panel-alt)] px-2.5 py-1 text-[11.5px] text-[var(--color-muted)]">This branch only</span>
        )}
      </div>
    </div>
  );
}
