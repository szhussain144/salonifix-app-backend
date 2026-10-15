import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { fromMinutes, isoDate, clockTime, toMinutes } from "./timeSlots";
import { dateLocale } from "./format";

const WEEKDAYS = ["Mo", "Tu", "We", "Th", "Fr", "Sa", "Su"];

/* Month grid. Days before `minDate` are disabled. */
export function MonthCalendar({ value, onChange, minDate }) {
  const [cursor, setCursor] = useState(() => {
    const d = new Date(`${value || minDate}T00:00:00`);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const days = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const offset = (first.getDay() + 6) % 7; // weeks start on Monday
    const count = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 0).getDate();
    return [
      ...Array.from({ length: offset }, () => null),
      ...Array.from({ length: count }, (_, i) => isoDate(new Date(cursor.getFullYear(), cursor.getMonth(), i + 1))),
    ];
  }, [cursor]);

  const today = isoDate(new Date());
  const minMonth = minDate ? new Date(`${minDate}T00:00:00`) : null;
  const atMinMonth =
    minMonth && cursor.getFullYear() === minMonth.getFullYear() && cursor.getMonth() === minMonth.getMonth();
  const shift = (n) => setCursor((c) => new Date(c.getFullYear(), c.getMonth() + n, 1));

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <button
          type="button"
          onClick={() => shift(-1)}
          disabled={atMinMonth}
          aria-label="Previous month"
          className="rounded-full p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-panel-alt)] disabled:opacity-30"
        >
          <ChevronLeft size={16} />
        </button>
        <p className="text-[13.5px] font-semibold">
          {cursor.toLocaleDateString(dateLocale(), { month: "long", year: "numeric" })}
        </p>
        <button
          type="button"
          onClick={() => shift(1)}
          aria-label="Next month"
          className="rounded-full p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-panel-alt)]"
        >
          <ChevronRight size={16} />
        </button>
      </div>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <span key={d} className="pb-1 text-[11px] font-medium text-[var(--color-faint)]">{d}</span>
        ))}
        {days.map((iso, i) => {
          if (!iso) return <span key={`blank-${i}`} />;
          const disabled = minDate && iso < minDate;
          const selected = iso === value;
          return (
            <button
              key={iso}
              type="button"
              disabled={disabled}
              onClick={() => onChange(iso)}
              aria-pressed={selected}
              aria-label={new Date(`${iso}T00:00:00`).toDateString()}
              className={`relative aspect-square rounded-lg text-[13px] tabular-nums transition-colors disabled:cursor-not-allowed disabled:text-[var(--color-faint)] disabled:opacity-40 ${
                selected
                  ? "bg-[var(--color-accent)] font-semibold text-[var(--color-accent-ink)]"
                  : "hover:bg-[var(--color-accent-soft)]"
              }`}
            >
              {Number(iso.slice(8))}
              {iso === today && (
                <span
                  className={`absolute bottom-1 left-1/2 h-1 w-1 -translate-x-1/2 rounded-full ${selected ? "bg-[var(--color-accent-ink)]" : "bg-[var(--color-accent)]"}`}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

const PERIODS = [
  { label: "Morning", from: 0, to: 12 * 60 },
  { label: "Afternoon", from: 12 * 60, to: 17 * 60 },
  { label: "Evening", from: 17 * 60, to: 24 * 60 },
];

/* Start-time chips grouped by part of day. Busy times are shown struck through with who is busy. */
export function SlotPicker({ slots, value, onChange, showUnavailable }) {
  const visible = slots.filter((s) => s.reason !== "past" && (showUnavailable || s.available));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-4">
      {PERIODS.map((period) => {
        const group = visible.filter((s) => toMinutes(s.time) >= period.from && toMinutes(s.time) < period.to);
        if (group.length === 0) return null;
        return (
          <div key={period.label}>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">
              {period.label}
            </p>
            <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 xl:grid-cols-5">
              {group.map((slot) => {
                const selected = slot.time === value;
                const why =
                  slot.reason === "busy"
                    ? slot.busy_staff.length
                      ? `${slot.busy_staff.join(", ")} not free (booked or not working)`
                      : "Everyone is booked"
                    : slot.reason === "closing"
                      ? "Runs past closing time"
                      : slot.reason === "closed"
                        ? "Closed this day"
                        : "";
                return (
                  <button
                    key={slot.time}
                    type="button"
                    disabled={!slot.available}
                    onClick={() => onChange(slot.time)}
                    title={why || `Start at ${clockTime(slot.time)}`}
                    aria-pressed={selected}
                    className={`rounded-lg border px-2 py-2 text-[12.5px] tabular-nums transition-colors ${
                      selected
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)] font-semibold text-[var(--color-accent-ink)]"
                        : slot.available
                          ? "border-[var(--color-border)] bg-[var(--color-panel)] hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]"
                          : "cursor-not-allowed border-dashed border-[var(--color-border-soft)] text-[var(--color-faint)] line-through"
                    }`}
                  >
                    {clockTime(slot.time)}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* One row per staff member: their booked blocks across opening hours, plus the chosen slot. */
export function StaffTimeline({ staff, open, close, selection }) {
  const start = toMinutes(open);
  let end = toMinutes(close);
  if (end <= start) end = 24 * 60;
  const span = end - start;
  const pct = (min) => `${Math.min(100, Math.max(0, ((min - start) / span) * 100))}%`;
  const width = (a, b) => `${Math.max(0, ((Math.min(b, end) - Math.max(a, start)) / span) * 100)}%`;
  const hours = [];
  for (let h = Math.ceil(start / 60) * 60; h <= end; h += 60 * Math.max(1, Math.round(span / 60 / 6))) hours.push(h);

  return (
    <div>
      <div className="relative ml-28 mb-1 h-4 text-[10.5px] text-[var(--color-faint)]">
        {hours.map((h) => (
          <span key={h} className="absolute -translate-x-1/2 tabular-nums" style={{ left: pct(h) }}>
            {clockTime(fromMinutes(h % (24 * 60))).replace(":00", "")}
          </span>
        ))}
      </div>
      <div className="space-y-2">
        {staff.map((s) => (
          <div key={s.id} className="flex items-center gap-3">
            <p className="w-25 shrink-0 truncate text-[12.5px] font-medium" title={s.name}>{s.name}</p>
            <div className="relative h-7 flex-1 overflow-hidden rounded-md bg-[var(--color-green)]/10">
              {s.busy.map((b) =>
                b.off ? (
                  // Not working: day off, outside their hours, break or time off.
                  <div
                    key={`off-${b.start}`}
                    className="absolute inset-y-0 bg-[var(--color-panel-alt)] [background-image:repeating-linear-gradient(135deg,transparent_0_5px,var(--color-border)_5px_6px)]"
                    style={{ left: pct(toMinutes(b.start)), width: width(toMinutes(b.start), toMinutes(b.end)) }}
                    title={`${b.client_name || "Not working"} ${clockTime(b.start)}–${b.end === "24:00" ? "midnight" : clockTime(b.end)}`}
                  />
                ) : (
                  <div
                    key={`${b.booking_id}-${b.start}`}
                    className="absolute inset-y-0 rounded-sm bg-[var(--color-red)]/25 border-x border-[var(--color-red)]/40"
                    style={{ left: pct(toMinutes(b.start)), width: width(toMinutes(b.start), toMinutes(b.end)) }}
                    title={`Booked ${clockTime(b.start)}–${clockTime(b.end)}${b.client_name ? ` · ${b.client_name}` : ""}`}
                  />
                ),
              )}
              {s.busy.some((b) => b.off && b.start === "00:00" && b.end === "24:00") && (
                <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-[var(--color-muted)]">
                  {s.busy.find((b) => b.off && b.start === "00:00" && b.end === "24:00").client_name}
                </span>
              )}
              {selection && (
                <div
                  className="absolute inset-y-0 rounded-sm border-2 border-[var(--color-accent)] bg-[var(--color-accent)]/25"
                  style={{ left: pct(selection.start), width: width(selection.start, selection.end) }}
                  title={`This booking: ${clockTime(fromMinutes(selection.start))}–${clockTime(fromMinutes(selection.end))}`}
                />
              )}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 flex flex-wrap gap-4 text-[11px] text-[var(--color-muted)]">
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-green)]/25" /> Free</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-red)]/35" /> Booked</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm bg-[var(--color-border)]" /> Not working</span>
        <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm border-2 border-[var(--color-accent)]" /> This booking</span>
      </div>
    </div>
  );
}
