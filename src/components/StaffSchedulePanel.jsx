import { useCallback, useEffect, useState } from "react";
import { CalendarOff, Clock, Copy, Plus, Trash2 } from "lucide-react";
import { Button, Card, Input, Segmented } from "./ui";
import { formatDay, todayISO } from "./format";
import { clockTime } from "./timeSlots";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

// Monday first, as rotas are usually written; weekday numbers follow the API (0 = Sunday).
const WEEK = [
  [1, "Monday"],
  [2, "Tuesday"],
  [3, "Wednesday"],
  [4, "Thursday"],
  [5, "Friday"],
  [6, "Saturday"],
  [0, "Sunday"],
];
const timeField =
  "w-full min-w-0 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5 text-[12.5px] tabular-nums outline-none focus:border-[var(--color-accent)] disabled:opacity-40";
const EMPTY_OFF = { start_date: todayISO(), end_date: todayISO(), partDay: false, start_time: "", end_time: "", reason: "" };

/**
 * Builds the 7-row editor from the saved rota, filling days off with the branch hours. With no
 * rota yet, every day starts as a working day with the branch hours.
 */
function toRows(days, open, close) {
  return WEEK.map(([weekday, name]) => {
    const saved = days.find((d) => Number(d.weekday) === weekday);
    return {
      weekday,
      name,
      working: days.length === 0 || Boolean(saved),
      start_time: saved?.start_time || open,
      end_time: saved?.end_time || close,
      break_start: saved?.break_start || "",
      break_end: saved?.break_end || "",
    };
  });
}

/**
 * A staff member's working days and hours, break, and time off. The booking form won't offer
 * times when they aren't working.
 */
export default function StaffSchedulePanel({ staff }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { canOpen, locations } = useSession();
  const canEdit = canOpen("staff");
  const branch = locations.find((l) => l.id === staff?.location_id);
  const open = String(branch?.opening_time || "10:00").slice(0, 5);
  const close = String(branch?.closing_time || "21:00").slice(0, 5);

  const [custom, setCustom] = useState(false);
  const [rows, setRows] = useState(() => toRows([], open, close));
  const [timeOff, setTimeOff] = useState([]);
  const [offForm, setOffForm] = useState(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    if (!staff?.id) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/staff/${staff.id}/hours`);
    if (!res.ok) return;
    const data = (await res.json()).data;
    setCustom(Boolean(data.custom_hours));
    setRows(toRows(data.days, open, close));
    setTimeOff(data.time_off);
    setDirty(false);
  }, [fetchWithLoading, staff?.id, open, close]);

  useEffect(() => {
    load();
  }, [load]);

  if (!staff) return null;

  const setRow = (weekday, patch) => {
    setRows((all) => all.map((r) => (r.weekday === weekday ? { ...r, ...patch } : r)));
    setDirty(true);
  };
  const copyFirst = () => {
    const first = rows.find((r) => r.working);
    if (!first) return;
    setRows((all) => all.map((r) => (r.working ? { ...r, start_time: first.start_time, end_time: first.end_time, break_start: first.break_start, break_end: first.break_end } : r)));
    setDirty(true);
  };

  const save = async () => {
    const days = rows
      .filter((r) => r.working)
      .map(({ weekday, start_time, end_time, break_start, break_end }) => ({ weekday, start_time, end_time, break_start: break_start || null, break_end: break_end || null }));
    const res = await fetchWithLoading(`${constanst.API_URL}/staff/${staff.id}/hours`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ custom_hours: custom, days }),
    });
    if (!res.ok) return;
    addToast({ message: "Working hours saved", type: "success" });
    load();
  };

  const addOff = async (e) => {
    e.preventDefault();
    const body = {
      start_date: offForm.start_date,
      end_date: offForm.partDay ? offForm.start_date : offForm.end_date,
      start_time: offForm.partDay ? offForm.start_time : null,
      end_time: offForm.partDay ? offForm.end_time : null,
      reason: offForm.reason || null,
    };
    const res = await fetchWithLoading(`${constanst.API_URL}/staff/${staff.id}/time-off`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    addToast({ message: "Time off added", type: "success" });
    setOffForm(null);
    load();
  };

  const removeOff = async (off) => {
    if (!window.confirm("Remove this time off?")) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/staff/${staff.id}/time-off/${off.id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  const offText = (o) => {
    const days = o.start_date === o.end_date ? formatDay(o.start_date) : `${formatDay(o.start_date)} – ${formatDay(o.end_date)}`;
    return o.start_time ? `${days}, ${clockTime(o.start_time)} – ${clockTime(o.end_time)}` : days;
  };

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="flex items-center gap-2 font-display text-[17px] font-medium tracking-tight"><Clock size={17} /> Working hours</h2>
          <p className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">Bookings are only offered when {staff.name.split(" ")[0]} is working.</p>
        </div>
        {canEdit && (
          <Segmented
            value={custom ? "custom" : "branch"}
            onChange={(v) => {
              setCustom(v === "custom");
              setDirty(true);
            }}
            options={[
              { key: "branch", label: "Branch hours" },
              { key: "custom", label: "Own hours" },
            ]}
          />
        )}
      </div>

      {!custom ? (
        <p className="rounded-xl bg-[var(--color-panel-alt)] px-4 py-3 text-[13px] text-[var(--color-muted)]">
          Works whenever {branch?.name || "the branch"} is open: every day, {clockTime(open)} – {clockTime(close)}.
        </p>
      ) : (
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full min-w-[560px] text-[12.5px]">
            <thead>
              <tr className="text-left text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">
                <th className="pb-2 pr-3">Day</th>
                <th className="pb-2 pr-2">Starts</th>
                <th className="pb-2 pr-2">Finishes</th>
                <th className="pb-2 pr-2">Break from</th>
                <th className="pb-2">Break to</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.weekday} className="border-t border-[var(--color-border-soft)]">
                  <td className="py-2 pr-3">
                    <label className="flex items-center gap-2 font-medium">
                      <input type="checkbox" checked={r.working} disabled={!canEdit} onChange={(e) => setRow(r.weekday, { working: e.target.checked })} className="accent-[var(--color-accent)]" />
                      {r.name}
                      {!r.working && <span className="font-normal text-[var(--color-faint)]">day off</span>}
                    </label>
                  </td>
                  {["start_time", "end_time", "break_start", "break_end"].map((key) => (
                    <td key={key} className="py-2 pr-2">
                      <input
                        type="time"
                        aria-label={`${r.name} ${key.replace("_", " ")}`}
                        value={r[key]}
                        disabled={!canEdit || !r.working}
                        onChange={(e) => setRow(r.weekday, { [key]: e.target.value })}
                        className={timeField}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {canEdit && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button type="button" onClick={save} disabled={!dirty}>Save hours</Button>
          {custom && (
            <Button type="button" variant="ghost" onClick={copyFirst}>
              <Copy size={14} /> Copy the first day to every working day
            </Button>
          )}
        </div>
      )}

      <div className="mt-6 border-t border-[var(--color-border)] pt-5">
        <div className="mb-3 flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-[14px] font-semibold"><CalendarOff size={15} /> Time off</h3>
          {canEdit && !offForm && (
            <Button type="button" variant="ghost" onClick={() => setOffForm({ ...EMPTY_OFF })}>
              <Plus size={14} /> Add time off
            </Button>
          )}
        </div>

        {offForm && (
          <form onSubmit={addOff} className="mb-4 grid gap-3 rounded-xl bg-[var(--color-panel-alt)] p-4 sm:grid-cols-2">
            <Input label={offForm.partDay ? "Day" : "First day"} type="date" value={offForm.start_date} onChange={(e) => setOffForm((f) => ({ ...f, start_date: e.target.value, end_date: f.end_date < e.target.value ? e.target.value : f.end_date }))} />
            {!offForm.partDay ? (
              <Input label="Last day" type="date" min={offForm.start_date} value={offForm.end_date} onChange={(e) => setOffForm((f) => ({ ...f, end_date: e.target.value }))} />
            ) : (
              <div className="grid grid-cols-2 gap-2">
                <Input label="From" type="time" value={offForm.start_time} onChange={(e) => setOffForm((f) => ({ ...f, start_time: e.target.value }))} />
                <Input label="To" type="time" value={offForm.end_time} onChange={(e) => setOffForm((f) => ({ ...f, end_time: e.target.value }))} />
              </div>
            )}
            <label className="flex items-center gap-2 text-[13px] sm:col-span-2">
              <input type="checkbox" checked={offForm.partDay} onChange={(e) => setOffForm((f) => ({ ...f, partDay: e.target.checked }))} className="accent-[var(--color-accent)]" />
              Only part of a day
            </label>
            <div className="sm:col-span-2">
              <Input label="Reason (optional)" placeholder="e.g. Holiday, Sick, Training" value={offForm.reason} onChange={(e) => setOffForm((f) => ({ ...f, reason: e.target.value }))} />
            </div>
            <div className="flex gap-2 sm:col-span-2">
              <Button type="submit">Add</Button>
              <Button type="button" variant="ghost" onClick={() => setOffForm(null)}>Cancel</Button>
            </div>
          </form>
        )}

        {timeOff.length === 0 ? (
          <p className="text-[12.5px] text-[var(--color-faint)]">No time off coming up.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border-soft)]">
            {timeOff.map((o) => (
              <li key={o.id} className="flex items-center gap-3 py-2 text-[13px]">
                <span className="min-w-0 flex-1">
                  <span className="font-medium">{offText(o)}</span>
                  {o.reason && <span className="text-[var(--color-muted)]"> · {o.reason}</span>}
                  {o.end_date < todayISO() && <span className="ml-1.5 text-[11.5px] text-[var(--color-faint)]">(past)</span>}
                </span>
                {canEdit && (
                  <button type="button" onClick={() => removeOff(o)} aria-label="Remove time off" className="rounded-lg p-1.5 text-[var(--color-faint)] hover:bg-[var(--color-red)]/10 hover:text-[var(--color-red)]">
                    <Trash2 size={14} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
