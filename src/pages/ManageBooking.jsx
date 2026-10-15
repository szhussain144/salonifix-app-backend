import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Banknote, CalendarCheck, CalendarClock, CalendarPlus, CalendarX2, Check, MapPin, Phone, UserRound, Users } from "lucide-react";
import { formatMoney, setRegion } from "../components/format";
import { clockTime } from "../components/timeSlots";
import constanst from "../config/constants";
import { addDays, dayLabel, longDate, minutes, PERIODS } from "../components/bookingDays";
import { Shell } from "./BookOnline";

async function api(token, path = "", options) {
  const res = await fetch(`${constanst.API_URL}/public/manage/${token}${path}`, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || "Something went wrong. Please try again.");
  return body;
}
const post = (token, path, data) => api(token, path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(data) });

/** The client's own page for one booking (/manage/<token>, from their confirmation and reminders). */
export default function ManageBooking() {
  const { token } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [mode, setMode] = useState("view"); // view | move | cancel
  const [done, setDone] = useState(null); // "moved" | "cancelled"
  const [date, setDate] = useState(null);
  const [times, setTimes] = useState(null);
  const [time, setTime] = useState(null);
  const [reason, setReason] = useState("");
  const [problem, setProblem] = useState(null);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api(token)
      .then(({ data }) => {
        setRegion(data.business);
        setInfo(data);
        document.title = `Your booking · ${data.business.name}`;
      })
      .catch((e) => setError(e.message));
  }, [token]);

  useEffect(() => {
    if (mode !== "move" || !date) return;
    let live = true;
    setTimes(null);
    api(token, `/slots?date=${date}`)
      .then(({ data }) => live && setTimes(data.times))
      .catch((e) => live && (setTimes([]), setProblem(e.message)));
    return () => {
      live = false;
    };
  }, [mode, date, token]);

  if (error) {
    return (
      <Shell business={null}>
        <div className="pop-in rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-6 text-center">
          <CalendarX2 className="mx-auto mb-3 text-[var(--color-faint)]" size={28} />
          <p className="text-[15px] font-semibold">This link doesn&apos;t work</p>
          <p className="mt-1 text-[13px] text-[var(--color-muted)]">{error}</p>
        </div>
      </Shell>
    );
  }
  if (!info) return <Shell business={null}><p className="py-16 text-center text-[13px] text-[var(--color-muted)]">Loading your booking…</p></Shell>;

  const { business, booking: b } = info;
  const word = (business.terms?.booking || "booking").toLowerCase();
  const days = Array.from({ length: Math.min(info.max_days_ahead + 1, 21) }, (_, i) => addDays(info.today, i));

  const move = async () => {
    setSending(true);
    setProblem(null);
    try {
      const { data } = await post(token, "/reschedule", { date, time });
      setInfo(data);
      setDone("moved");
      setMode("view");
    } catch (e) {
      setProblem(e.message);
      // The time was just taken: refresh the list.
      api(token, `/slots?date=${date}`).then(({ data }) => setTimes(data.times)).catch(() => {});
      setTime(null);
    } finally {
      setSending(false);
    }
  };

  const cancel = async () => {
    setSending(true);
    setProblem(null);
    try {
      const { data } = await post(token, "/cancel", { reason: reason.trim() || undefined });
      setInfo(data);
      setDone("cancelled");
      setMode("view");
    } catch (e) {
      setProblem(e.message);
    } finally {
      setSending(false);
    }
  };

  const when = `${longDate(b.date)}, ${clockTime(b.start_time)}${b.end_time ? ` – ${clockTime(b.end_time)}` : ""}`;

  return (
    <Shell business={{ name: business.name, address: b.location.address, phone: business.phone }}>
      {done && (
        <div className="pop-in mb-4 flex items-start gap-3 rounded-2xl bg-[var(--color-green)]/10 p-4 text-[13.5px]">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--color-green)] text-white">
            <Check size={16} />
          </span>
          <p>
            {done === "moved" ? (
              <>
                <b>All set.</b> Your {word} is now {when}. We&apos;ve let the team know.
              </>
            ) : (
              <>
                <b>Cancelled.</b> Thanks for letting us know. We hope to see you another time.
              </>
            )}
          </p>
        </div>
      )}

      <div className="card-in rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">
          {b.cancelled ? `Cancelled ${word}` : `Your ${word}`}
        </p>
        <h1 className={`mt-1 font-display text-[22px] font-medium leading-tight ${b.cancelled ? "text-[var(--color-faint)] line-through" : ""}`}>
          {b.services.map((s) => s.name).join(", ")}
        </h1>
        <ul className="mt-4 space-y-2.5 text-[13.5px]">
          <li className="flex items-center gap-2.5"><CalendarCheck size={16} className="text-[var(--color-accent)]" /> {when}</li>
          {b.services.some((s) => s.staff) && (
            <li className="flex items-center gap-2.5"><UserRound size={16} className="text-[var(--color-accent)]" /> with {[...new Set(b.services.map((s) => s.staff).filter(Boolean))].join(", ")}</li>
          )}
          {b.guests?.length > 0 && (
            <li className="flex items-start gap-2.5">
              <Users size={16} className="mt-0.5 text-[var(--color-accent)]" />
              <span>
                With {b.guests.length} guest{b.guests.length === 1 ? "" : "s"}:{" "}
                {b.guests.map((g) => `${g.name} (${g.services})`).join(", ")}
              </span>
            </li>
          )}
          <li className="flex items-center gap-2.5"><MapPin size={16} className="text-[var(--color-accent)]" /> {[b.location.name, b.location.address].filter(Boolean).join(", ")}</li>
          {b.total > 0 && <li className="flex items-center gap-2.5"><Banknote size={16} className="text-[var(--color-accent)]" /> {formatMoney(b.total, business.currency)}</li>}
        </ul>

        {mode === "view" && (
          <div className="mt-5 border-t border-[var(--color-border-soft)] pt-4">
            {info.can_change ? (
              <>
                <div className={`grid gap-2 ${info.can_move ? "sm:grid-cols-2" : ""}`}>
                  {info.can_move && <button
                    type="button"
                    onClick={() => {
                      setMode("move");
                      setDate(b.date >= info.today ? b.date : info.today);
                      setTime(null);
                      setProblem(null);
                      setDone(null);
                    }}
                    className="btn-primary flex items-center justify-center gap-2 rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-[14px] font-semibold text-white transition-transform active:scale-[0.97]"
                  >
                    <CalendarClock size={16} /> Change time
                  </button>}
                  <button
                    type="button"
                    onClick={() => {
                      setMode("cancel");
                      setProblem(null);
                      setDone(null);
                    }}
                    className="flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] px-4 py-2.5 text-[14px] font-medium text-[var(--color-red)] transition-transform hover:border-[var(--color-red)] active:scale-[0.97]"
                  >
                    <CalendarX2 size={16} /> Cancel {b.guests?.length ? `for everyone` : word}
                  </button>
                </div>
                <p className="mt-3 text-center text-[12px] text-[var(--color-faint)]">
                  {!info.can_move && b.guests?.length
                    ? `To move a group, please ${business.phone ? `call us on ${business.phone}` : "contact us"} so we can find a time for everyone.`
                    : info.notice_hours > 0
                      ? `Changes can be made here up to ${info.notice_hours} hours before.`
                      : "Changes can be made here any time before your visit."}
                </p>
              </>
            ) : (
              <p className="text-[13px] text-[var(--color-muted)]">
                {info.reason}
                {business.phone && (!b.cancelled || !business.slug) && (
                  <a href={`tel:${business.phone}`} className="ml-1 inline-flex items-center gap-1 font-semibold text-[var(--color-accent)]">
                    <Phone size={13} /> {business.phone}
                  </a>
                )}
              </p>
            )}
            {b.cancelled && business.slug && (
              <a href={`/book/${business.slug}`} className="mt-3 inline-flex items-center gap-1.5 text-[13.5px] font-semibold text-[var(--color-accent)]">
                <CalendarPlus size={15} /> Book a new time
              </a>
            )}
          </div>
        )}
      </div>

      {mode === "move" && (
        <div className="card-in mt-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="mb-3 font-display text-[17px] font-medium">Choose a new time</h2>
          <div className="-mx-5 mb-4 flex gap-2 overflow-x-auto px-5 pb-1 scrollbar-none">
            {days.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDate(d);
                  setTime(null);
                  setProblem(null);
                }}
                className={`flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2 transition-colors ${date === d ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"}`}
              >
                <span className="text-[11px]">{dayLabel(d, info.today)}</span>
                <span className="text-[18px] font-semibold">{Number(d.slice(8))}</span>
              </button>
            ))}
          </div>
          {times === null ? (
            <p className="py-6 text-center text-[13px] text-[var(--color-muted)]">Finding free times…</p>
          ) : times.length === 0 ? (
            <p className="rounded-2xl bg-[var(--color-panel-alt)] p-4 text-center text-[13px] text-[var(--color-muted)]">No free times on {longDate(date)}. Try another day.</p>
          ) : (
            PERIODS.map(([label, from, to]) => {
              const group = times.filter((t) => minutes(t) >= from && minutes(t) < to);
              if (!group.length) return null;
              return (
                <div key={label} className="mb-3">
                  <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">{label}</p>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {group.map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={time === t}
                        onClick={() => setTime(t)}
                        className={`rounded-xl border py-2.5 text-[13px] tabular-nums transition-colors ${time === t ? "border-[var(--color-accent)] bg-[var(--color-accent)] font-semibold text-white" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"}`}
                      >
                        {clockTime(t)}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })
          )}
          {problem && <p className="mb-3 text-[13px] text-[var(--color-red)]">{problem}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setMode("view")} className="rounded-full border border-[var(--color-border)] px-4 py-2.5 text-[14px] font-medium">
              Back
            </button>
            <button
              type="button"
              disabled={!time || sending}
              onClick={move}
              className="btn-primary flex-1 rounded-full bg-[var(--color-accent)] px-4 py-2.5 text-[14px] font-semibold text-white transition-transform active:scale-[0.97] disabled:opacity-50"
            >
              {sending ? "Moving…" : time ? `Move to ${dayLabel(date, info.today) === "Today" || dayLabel(date, info.today) === "Tomorrow" ? dayLabel(date, info.today).toLowerCase() : longDate(date)}, ${clockTime(time)}` : "Choose a time"}
            </button>
          </div>
        </div>
      )}

      {mode === "cancel" && (
        <div className="card-in mt-4 rounded-3xl border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-card)]">
          <h2 className="font-display text-[17px] font-medium">Cancel this {word}?</h2>
          <p className="mt-1 text-[13px] text-[var(--color-muted)]">Your time will be freed up for someone else.</p>
          <label className="mt-4 block">
            <span className="mb-1.5 block text-[12.5px] font-medium">Reason (optional)</span>
            <input
              value={reason}
              maxLength={255}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Feeling unwell"
              className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--color-accent)]"
            />
          </label>
          {problem && <p className="mt-3 text-[13px] text-[var(--color-red)]">{problem}</p>}
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => setMode("view")} className="rounded-full border border-[var(--color-border)] px-4 py-2.5 text-[14px] font-medium">
              Keep it
            </button>
            <button
              type="button"
              disabled={sending}
              onClick={cancel}
              className="flex-1 rounded-full bg-[var(--color-red)] px-4 py-2.5 text-[14px] font-semibold text-white transition-transform active:scale-[0.97] disabled:opacity-50"
            >
              {sending ? "Cancelling…" : `Yes, cancel my ${word}`}
            </button>
          </div>
        </div>
      )}
    </Shell>
  );
}
