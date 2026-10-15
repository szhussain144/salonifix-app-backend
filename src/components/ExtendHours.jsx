import { useState } from "react";
import { MoonStar, RotateCcw } from "lucide-react";
import { Button } from "./ui";
import { clockTime, fromMinutes, toMinutes } from "./timeSlots";
import { useApi } from "../context/ApiContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

/** Closing times offered when extending: every half hour after today's closing, until 23:30. */
function laterTimes(close) {
  const out = [];
  for (let m = toMinutes(close) + 30; m <= 23 * 60 + 30; m += 30) out.push(fromMinutes(m));
  return out;
}

/**
 * For managers on the booking form: keep the branch open later on this day (special hours), open
 * a closed day, or go back to the usual hours. `hours` is the availability's location block.
 */
export default function ExtendHours({ date, hours, dayLabel, onChanged }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const [open, setOpen] = useState(false);
  const options = laterTimes(hours.closing_time);
  const [closeAt, setCloseAt] = useState(options[1] ?? options[0] ?? "");
  const [note, setNote] = useState("");
  const url = `${constanst.API_URL}/locations/${hours.id}/special-hours/${date}`;

  const save = async (body, method = "PUT") => {
    const res = await fetchWithLoading(url, { method, headers: { "Content-Type": "application/json" }, ...(body && { body: JSON.stringify(body) }) });
    if (!res.ok) return;
    const { data } = await res.json();
    addToast({ message: data ? `Open ${clockTime(data.opening_time)}–${clockTime(data.closing_time)} ${dayLabel}` : `Usual hours ${dayLabel}`, type: "success" });
    setOpen(false);
    onChanged();
  };

  const extended = hours.special && !hours.closed && hours.closing_time !== hours.usual_closing;
  return (
    <div className="mt-3 rounded-xl border border-dashed border-[var(--color-border)] px-3 py-2.5 text-[12.5px]">
      {hours.closed ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            {hours.name} is closed {dayLabel}
            {hours.note ? ` (${hours.note})` : ""}.
          </span>
          {hours.special && (
            <button type="button" onClick={() => save(null, "DELETE")} className="inline-flex items-center gap-1 font-semibold text-[var(--color-accent)] hover:underline">
              <RotateCcw size={13} /> Open with the usual hours
            </button>
          )}
        </div>
      ) : !open ? (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[var(--color-muted)]">
            {extended ? (
              <>
                Open until <b className="text-[var(--color-ink)]">{clockTime(hours.closing_time)}</b> {dayLabel} (usually {clockTime(hours.usual_closing)})
                {hours.note ? ` · ${hours.note}` : ""}
              </>
            ) : (
              "Busy day, or a long or group booking that won't fit?"
            )}
          </span>
          <span className="flex items-center gap-3">
            {extended && (
              <button type="button" onClick={() => save(null, "DELETE")} className="inline-flex items-center gap-1 font-medium text-[var(--color-muted)] hover:text-[var(--color-ink)]">
                <RotateCcw size={13} /> Usual hours
              </button>
            )}
            {options.length > 0 && (
              <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1 font-semibold text-[var(--color-accent)] hover:underline">
                <MoonStar size={13} /> {extended ? "Stay open later" : `Extend ${dayLabel}'s hours`}
              </button>
            )}
          </span>
        </div>
      ) : (
        <div className="pop-in space-y-2.5">
          <p className="font-semibold">
            Keep {hours.name} open later {dayLabel}
          </p>
          <div className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block text-[11.5px] text-[var(--color-muted)]">Close at</span>
              <select aria-label="Close at" value={closeAt} onChange={(e) => setCloseAt(e.target.value)} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 py-2 text-[13px]">
                {options.map((t) => (
                  <option key={t} value={t}>
                    {clockTime(t)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block min-w-[160px] flex-1">
              <span className="mb-1 block text-[11.5px] text-[var(--color-muted)]">Reason (optional)</span>
              <input value={note} onChange={(e) => setNote(e.target.value)} maxLength={150} placeholder="e.g. Wedding party" className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 py-2 text-[13px] outline-none focus:border-[var(--color-accent)]" />
            </label>
            <Button type="button" onClick={() => save({ opening_time: hours.opening_time, closing_time: closeAt, note: note.trim() || undefined })}>
              Extend hours
            </Button>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
          <p className="text-[11.5px] text-[var(--color-faint)]">
            Applies to this day only, for every booking (online too). Staff with set working hours still finish at their usual time; change those under Staff.
          </p>
        </div>
      )}
    </div>
  );
}
