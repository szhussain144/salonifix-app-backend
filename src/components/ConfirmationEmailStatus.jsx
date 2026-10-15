import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CheckCircle2, CircleAlert, Loader2, Mail, MailX } from "lucide-react";
import { useApi } from "../context/ApiContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";
import { uses12h } from "./format";

const time = (iso) => (iso ? new Date(String(iso).replace(" ", "T")).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: uses12h() }) : "");

/** While an email is "sending" in the background, check back this often, this many times. */
const POLL_MS = 2000;
const MAX_POLLS = 5;

/**
 * One line on a booking: whether the client was emailed their confirmation, and if not, why,
 * with a button to send it (again).
 */
export default function ConfirmationEmailStatus({ bookingId, bookingStatus }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const [note, setNote] = useState(undefined); // undefined = loading, null = never sent
  const confirmed = String(bookingStatus || "").toLowerCase() === "confirmed";

  const fetchNote = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/bookings/${bookingId}/confirmation`, { silent: true });
    return res.ok ? (await res.json()).data : null;
  }, [fetchWithLoading, bookingId]);

  // Load once. Only while the email is actually "sending" (just confirmed), check back a few
  // times; the cancelled flag stops any chain when the booking or page changes.
  useEffect(() => {
    let cancelled = false;
    let timer;
    let polls = 0;
    const load = async () => {
      const data = await fetchNote();
      if (cancelled) return;
      setNote(data);
      if (data?.status === "sending" && polls++ < MAX_POLLS) timer = setTimeout(load, POLL_MS);
    };
    load();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [fetchNote]);

  const send = async () => {
    setNote((n) => ({ ...(n || {}), status: "sending" }));
    const res = await fetchWithLoading(`${constanst.API_URL}/bookings/${bookingId}/confirmation`, { method: "POST" });
    if (!res.ok) {
      setNote(await fetchNote());
      return;
    }
    const body = await res.json();
    setNote(body.data);
    addToast({ message: body.message, type: body.data?.status === "sent" ? "success" : "error", duration: 5000 });
  };

  if (note === undefined || (!note && !confirmed)) return null;

  const action = (label) =>
    confirmed && (
      <button type="button" onClick={send} className="ml-auto shrink-0 font-semibold underline-offset-2 hover:underline">
        {label}
      </button>
    );
  const row = (tone, Icon, text, extra) => (
    <div className={`flex flex-wrap items-center gap-2 rounded-xl px-3.5 py-2.5 text-[12.5px] ${tone}`}>
      <Icon size={16} className={`shrink-0 ${Icon === Loader2 ? "animate-spin" : ""}`} />
      <span className="min-w-0">{text}</span>
      {extra}
    </div>
  );

  // Confirmed before confirmation emails existed (or never attempted): offer to send it.
  if (!note) {
    return row("bg-[var(--color-panel-alt)] text-[var(--color-muted)]", Mail, "No confirmation email sent yet.", action("Send now"));
  }
  if (note.status === "sending") {
    return row("bg-[var(--color-panel-alt)] text-[var(--color-muted)]", Loader2, "Sending the confirmation email…");
  }
  if (note.status === "sent") {
    return row(
      "bg-[var(--color-green)]/10 text-[var(--color-green)]",
      CheckCircle2,
      <>Confirmation emailed to <b>{note.to_address}</b>{note.sent_at ? ` · ${time(note.sent_at)}` : ""}{note.via === "smtp" ? " from your own email" : ""}</>,
      action("Resend"),
    );
  }
  if (note.status === "failed") {
    return row("bg-[var(--color-red)]/8 text-[var(--color-red)]", CircleAlert, <>Confirmation email failed: {note.error}</>, action("Try again"));
  }
  const setupLink = /Email sending/.test(note.error || "") && (
    <Link to="/settings" state={{ section: "email" }} className="ml-auto font-semibold underline">Set up email</Link>
  );
  return row(
    "bg-[var(--color-orange)]/10 text-[var(--color-orange)]",
    MailX,
    <>Confirmation email not sent: {note.error}.</>,
    setupLink || (/no email/.test(note.error || "") ? null : action("Send now")),
  );
}
