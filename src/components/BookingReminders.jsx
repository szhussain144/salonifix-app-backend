import { useEffect, useState } from "react";
import { BellRing, CheckCircle2, CircleAlert, Loader2, MinusCircle } from "lucide-react";
import { useApi } from "../context/ApiContext";
import constanst from "../config/constants";
import { uses12h } from "./format";

const TYPE = { reminder_day: "Day-before reminder", reminder_hour: "1-hour reminder" };
const CHANNEL = { email: "email", sms: "SMS", whatsapp: "WhatsApp" };
const STATUS = {
  sent: { icon: CheckCircle2, tone: "text-[var(--color-green)]", word: "sent" },
  failed: { icon: CircleAlert, tone: "text-[var(--color-red)]", word: "failed" },
  skipped: { icon: MinusCircle, tone: "text-[var(--color-faint)]", word: "not sent" },
  sending: { icon: Loader2, tone: "text-[var(--color-muted)]", word: "sending" },
};
const time = (iso) => (iso ? new Date(String(iso).replace(" ", "T")).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: uses12h() }) : "");

/** Appointment reminders sent to the client for this booking (Settings → Notifications). */
export default function BookingReminders({ bookingId }) {
  const { fetchWithLoading } = useApi();
  const [rows, setRows] = useState([]);

  useEffect(() => {
    let cancelled = false;
    fetchWithLoading(`${constanst.API_URL}/bookings/${bookingId}/messages`, { silent: true }).then(async (res) => {
      if (res.ok && !cancelled) setRows((await res.json()).data.filter((m) => m.type !== "confirmation"));
    });
    return () => {
      cancelled = true;
    };
  }, [fetchWithLoading, bookingId]);

  if (rows.length === 0) return null;
  return (
    <div className="rounded-xl bg-[var(--color-panel-alt)] px-3.5 py-2.5 text-[12.5px]">
      <p className="mb-1.5 flex items-center gap-2 font-semibold text-[var(--color-ink-2)]">
        <BellRing size={15} /> Reminders
      </p>
      <ul className="space-y-1">
        {rows.map((m) => {
          const s = STATUS[m.status] || STATUS.sending;
          const Icon = s.icon;
          return (
            <li key={`${m.type}-${m.channel}`} className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <Icon size={14} className={`shrink-0 ${s.tone} ${m.status === "sending" ? "animate-spin" : ""}`} />
              <span>
                {TYPE[m.type] || m.type} by {CHANNEL[m.channel] || m.channel} {s.word}
                {m.to_address && m.status !== "skipped" ? ` to ${m.to_address}` : ""}
              </span>
              <span className="text-[var(--color-faint)]">
                {m.status === "sent" ? time(m.sent_at) : m.error}
              </span>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
