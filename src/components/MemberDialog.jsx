import { useCallback, useEffect, useState } from "react";
import { CalendarClock, Check, RotateCcw, X } from "lucide-react";
import Modal from "./Modal";
import { Badge, Button } from "./ui";
import { formatAmount } from "./format";
import { CHECKOUT_METHODS, forRegion, paymentMethodLabel } from "./labels";
import { memberBadge, memberLine, perPeriod } from "./membership";
import { formatBookingDate } from "../context/functions";
import { useApi } from "../context/ApiContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

const PAY_METHODS = CHECKOUT_METHODS.filter(([key]) => key !== "gift_card");
const chip = (on) =>
  `rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
    on ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
  }`;
const heading = "mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]";

/** One member: their period and benefits, renewals (paid or failed), cancel or resume, and history. */
export default function MemberDialog({ id, onClose, onChanged }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const [m, setM] = useState(null);
  const [method, setMethod] = useState("cash");
  const [cancelling, setCancelling] = useState(false);
  const [atEnd, setAtEnd] = useState(true);
  const [reason, setReason] = useState("");

  const load = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/memberships/${id}`, { silent: true });
    if (res.ok) setM((await res.json()).data);
  }, [fetchWithLoading, id]);

  useEffect(() => {
    load();
  }, [load]);

  const post = async (path, body) => {
    const res = await fetchWithLoading(`${constanst.API_URL}/memberships/${id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body || {}),
    });
    if (!res.ok) return;
    const data = await res.json();
    const message = body?.status === "paid" ? `Renewed until ${formatBookingDate(data.data.paid_until)}` : data.message;
    addToast({ message, type: body?.status === "failed" ? "info" : "success" });
    setM((prev) => ({ ...prev, ...data.data }));
    setCancelling(false);
    onChanged?.();
  };

  if (!m) return null;
  const running = m.status === "active" || m.status === "past_due";
  const next = m.next_renewal;

  return (
    <Modal
      title={m.client_name}
      subtitle={`${m.name} · ${formatAmount(m.price)} ${perPeriod(m.billing_period)}`}
      onClose={onClose}
      width="max-w-2xl"
    >
      <div className="space-y-6 text-[13px]">
        <div className="flex flex-wrap items-center gap-2.5">
          <Badge>{memberBadge(m)}</Badge>
          <span className="text-[var(--color-muted)]">{memberLine(m, formatBookingDate)}</span>
        </div>

        <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Fact label="This period">{formatBookingDate(m.period_start)} – {formatBookingDate(m.paid_until)}</Fact>
          <Fact label="Discount">{m.discount_percent > 0 ? `${m.discount_percent}% off services` : "None"}</Fact>
          <Fact label="Member since">{formatBookingDate(m.started_on)}</Fact>
          <Fact label="Joined at">{[m.location_name, m.sold_by_name].filter(Boolean).join(" · ") || "—"}</Fact>
        </dl>

        {m.benefits.length > 0 && (
          <section>
            <p className={heading}>Included this period</p>
            <div className="space-y-2.5">
              {m.benefits.map((b) => {
                const left = Math.max(0, b.quantity - b.used);
                return (
                  <div key={b.id}>
                    <div className="mb-1 flex justify-between text-[12.5px]">
                      <span>{b.service_name}</span>
                      <span className={left ? "font-semibold" : "text-[var(--color-faint)]"}>
                        {left} of {b.quantity} left
                      </span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-panel-alt)]">
                      <div className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-700" style={{ width: `${(left / b.quantity) * 100}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
            <p className="mt-2 text-[11.5px] text-[var(--color-faint)]">Unused treatments don't carry over. They're used at checkout.</p>
          </section>
        )}

        {/* Renewal or rejoin */}
        <section className="rounded-2xl border border-[var(--color-border)] p-4">
          <p className="mb-1 flex items-center gap-1.5 font-semibold">
            <CalendarClock size={15} className="text-[var(--color-accent)]" />
            {next.rejoin ? "Rejoin" : m.status === "past_due" ? "Collect the renewal" : "Next renewal"}
          </p>
          <p className="mb-3 text-[12.5px] text-[var(--color-muted)]">
            {formatAmount(next.amount)} for {formatBookingDate(next.start)} – {formatBookingDate(next.end)}
            {next.rejoin ? ", starting today." : "."}
          </p>
          {next.too_early ? (
            <p className="text-[12.5px] text-[var(--color-faint)]">Already paid for this period. The renewal can be taken in the last two weeks before it ends.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {forRegion(PAY_METHODS).map(([key, label]) => (
                  <button key={key} type="button" className={chip(method === key)} onClick={() => setMethod(key)}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" onClick={() => post("renewal", { status: "paid", payment_method: method })}>
                  <Check size={14} /> {next.rejoin ? `Rejoin · ${formatAmount(next.amount)}` : `Paid · ${formatAmount(next.amount)}`}
                </Button>
                {running && (
                  <Button type="button" variant="ghost" onClick={() => post("renewal", { status: "failed", payment_method: method })}>
                    <X size={14} /> Payment failed
                  </Button>
                )}
              </div>
            </>
          )}
        </section>

        {/* Cancel or resume */}
        {running && !m.cancel_at_period_end && (
          <section>
            {!cancelling ? (
              <button type="button" onClick={() => setCancelling(true)} className="text-[12.5px] font-medium text-[var(--color-red)] hover:underline">
                Cancel membership…
              </button>
            ) : (
              <div className="pop-in space-y-3 rounded-2xl border border-[var(--color-red)]/30 bg-[var(--color-red)]/5 p-4">
                <p className="font-semibold">Cancel {m.client_name}'s membership</p>
                {m.status === "active" && (
                  <div className="space-y-1.5">
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={atEnd} onChange={() => setAtEnd(true)} className="accent-[var(--color-accent)]" />
                      At the end of the period: benefits continue until {formatBookingDate(m.paid_until)}
                    </label>
                    <label className="flex items-center gap-2">
                      <input type="radio" checked={!atEnd} onChange={() => setAtEnd(false)} className="accent-[var(--color-accent)]" />
                      Now: benefits stop today (refund separately if needed)
                    </label>
                  </div>
                )}
                <input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason (optional)" maxLength={200} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 outline-none focus:border-[var(--color-accent)]" />
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="ghost" onClick={() => setCancelling(false)}>Keep it</Button>
                  <Button type="button" onClick={() => post("cancel", { at_period_end: m.status === "active" && atEnd, reason: reason.trim() || undefined })}>
                    Cancel membership
                  </Button>
                </div>
              </div>
            )}
          </section>
        )}
        {m.status === "active" && m.cancel_at_period_end && (
          <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-[var(--color-orange)]/10 p-4">
            <span>
              Set to end after {formatBookingDate(m.paid_until)}
              {m.cancel_reason ? <span className="text-[var(--color-muted)]"> · “{m.cancel_reason}”</span> : null}
            </span>
            <Button type="button" variant="ghost" onClick={() => post("resume")}>
              <RotateCcw size={14} /> Keep renewing
            </Button>
          </section>
        )}

        <section>
          <p className={heading}>Payments</p>
          <ul className="divide-y divide-[var(--color-border-soft)]">
            {m.payments.map((p) => (
              <li key={p.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                <span>
                  <span className="font-medium">{p.kind === "signup" ? "Joined" : "Renewal"}</span>
                  <span className="text-[var(--color-muted)]">
                    {" "}· {formatBookingDate(p.created_at)}
                    {p.method ? ` · ${paymentMethodLabel(p.method)}` : ""}
                    {p.period_start ? ` · for ${formatBookingDate(p.period_start)} – ${formatBookingDate(p.period_end)}` : ""}
                    {p.note ? ` · ${p.note}` : ""}
                  </span>
                </span>
                <span className="flex items-center gap-2">
                  {p.status === "failed" && <Badge>Failed</Badge>}
                  <span className={`tabular-nums ${p.status === "failed" ? "text-[var(--color-faint)] line-through" : "font-semibold"}`}>{formatAmount(p.amount)}</span>
                </span>
              </li>
            ))}
          </ul>
        </section>

        {m.visits.length > 0 && (
          <section>
            <p className={heading}>Treatments used</p>
            <ul className="divide-y divide-[var(--color-border-soft)]">
              {m.visits.map((v, i) => (
                <li key={i} className="flex justify-between py-2">
                  <a href={`/bookings/${v.booking_id}`} className="font-medium text-[var(--color-accent)] hover:underline">
                    {v.service_name}
                  </a>
                  <span className="text-[var(--color-muted)]">{formatBookingDate(v.booking_date)}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Modal>
  );
}

function Fact({ label, children }) {
  return (
    <div className="rounded-xl bg-[var(--color-panel-alt)] px-3 py-2.5">
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">{label}</dt>
      <dd className="mt-0.5 text-[12.5px] font-medium">{children}</dd>
    </div>
  );
}
