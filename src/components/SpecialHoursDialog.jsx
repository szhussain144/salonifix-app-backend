import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Trash2 } from "lucide-react";
import Modal from "./Modal";
import { Button, Input } from "./ui";
import { todayISO } from "./format";
import { clockTime } from "./timeSlots";
import { formatBookingDate } from "../context/functions";
import { useApi } from "../context/ApiContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

const hhmm = (t) => String(t || "").slice(0, 5);

/** Settings → Locations → Special hours: open late, close early or closed on chosen dates. */
export default function SpecialHoursDialog({ location, onClose }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const [days, setDays] = useState(null);
  const [form, setForm] = useState({ day: todayISO(), closed: false, opening_time: hhmm(location.opening_time), closing_time: hhmm(location.closing_time), note: "" });
  const base = `${constanst.API_URL}/locations/${location.id}/special-hours`;

  const load = useCallback(async () => {
    const res = await fetchWithLoading(base, { silent: true });
    if (res.ok) setDays((await res.json()).data);
  }, [base, fetchWithLoading]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    const res = await fetchWithLoading(`${base}/${form.day}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form.closed ? { closed: true, note: form.note.trim() || undefined } : { opening_time: form.opening_time, closing_time: form.closing_time, note: form.note.trim() || undefined }),
    });
    if (!res.ok) return;
    const { data } = await res.json();
    const message = data.is_closed ? `Closed on ${formatBookingDate(data.day)}` : `Open ${clockTime(data.opening_time)}–${clockTime(data.closing_time)} on ${formatBookingDate(data.day)}`;
    addToast({
      message: data.bookings_outside > 0 ? `${message}. ${data.bookings_outside} booking${data.bookings_outside === 1 ? " falls" : "s fall"} outside these hours: move or cancel ${data.bookings_outside === 1 ? "it" : "them"}.` : message,
      type: data.bookings_outside > 0 ? "info" : "success",
      duration: data.bookings_outside > 0 ? 8000 : undefined,
    });
    setForm((f) => ({ ...f, note: "" }));
    load();
  };

  const remove = async (day) => {
    const res = await fetchWithLoading(`${base}/${day}`, { method: "DELETE" });
    if (!res.ok) return;
    addToast({ message: "Back to the usual hours", type: "success" });
    load();
  };

  return (
    <Modal title={`Special hours · ${location.name}`} subtitle={`Usually open ${clockTime(hhmm(location.opening_time))}–${clockTime(hhmm(location.closing_time))}. Change the hours for a single day: stay open late, close early, or close.`} onClose={onClose}>
      <div className="space-y-5 text-[13px]">
        <form onSubmit={save} className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Date" type="date" min={todayISO()} required value={form.day} onChange={(e) => setForm((f) => ({ ...f, day: e.target.value }))} />
            <label className="flex items-end gap-2 pb-2.5">
              <input type="checkbox" checked={form.closed} onChange={(e) => setForm((f) => ({ ...f, closed: e.target.checked }))} className="accent-[var(--color-accent)]" />
              Closed all day
            </label>
          </div>
          {!form.closed && (
            <div className="grid grid-cols-2 gap-3">
              <Input label="Opens" type="time" required value={form.opening_time} onChange={(e) => setForm((f) => ({ ...f, opening_time: e.target.value }))} />
              <Input label="Closes" type="time" required value={form.closing_time} onChange={(e) => setForm((f) => ({ ...f, closing_time: e.target.value }))} />
            </div>
          )}
          <Input label="Reason (optional)" placeholder="e.g. Wedding season, Eid" maxLength={150} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          <div className="flex justify-end">
            <Button type="submit">Save day</Button>
          </div>
        </form>

        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">Coming up</p>
          {days === null ? null : days.length === 0 ? (
            <p className="text-[var(--color-faint)]">No special days. Every day uses the usual hours.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border-soft)]">
              {days.map((d) => {
                const later = !d.is_closed && d.closing_time > d.usual_closing;
                return (
                  <li key={d.day} className="row-in flex items-center justify-between gap-3 py-2.5">
                    <span className="flex items-start gap-2.5">
                      <CalendarClock size={15} className={`mt-0.5 shrink-0 ${d.is_closed ? "text-[var(--color-red)]" : "text-[var(--color-accent)]"}`} />
                      <span>
                        <b className="font-semibold">{formatBookingDate(d.day)}</b>
                        <span className="block text-[12px] text-[var(--color-muted)]">
                          {d.is_closed ? "Closed" : `${clockTime(d.opening_time)}–${clockTime(d.closing_time)}${later ? " (open late)" : ""}`}
                          {d.note ? ` · ${d.note}` : ""}
                        </span>
                      </span>
                    </span>
                    <button type="button" aria-label={`Usual hours on ${d.day}`} onClick={() => remove(d.day)} className="rounded-md p-1.5 text-[var(--color-faint)] hover:text-[var(--color-red)]">
                      <Trash2 size={14} />
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>
      </div>
    </Modal>
  );
}
