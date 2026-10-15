import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Mail, MessageCircle, Printer, Wallet } from "lucide-react";
import { Badge, Button, Card } from "./ui";
import { formatMoney, uses12h } from "./format";
import { paymentMethodLabel } from "./labels";
import TakePaymentDialog from "./TakePaymentDialog";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

const when = (iso) =>
  iso ? new Date(String(iso).replace(" ", "T")).toLocaleString(undefined, { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", hour12: uses12h() }) : "";

/** The bill of a checked-out visit: what was charged, what's paid, and what's still owed. */
export default function BillCard({ booking, refreshKey, onChanged }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { business } = useSession();
  const money = (v) => formatMoney(v, business?.currency || "PKR");
  const [data, setData] = useState(null);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/bookings/${booking.id}/bill`, { silent: true });
    if (res.ok) setData((await res.json()).data);
  }, [fetchWithLoading, booking.id]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  if (!data) return null;
  const { bill } = data;

  const send = async (channel) => {
    const res = await fetchWithLoading(`${constanst.API_URL}/bookings/${booking.id}/receipt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    if (!res.ok) return;
    const body = await res.json();
    addToast({ message: body.message, type: body.data.status === "sent" ? "success" : "error", duration: 5000 });
  };

  return (
    <Card className="p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="flex items-center gap-2 font-display text-[17px] font-medium tracking-tight"><Wallet size={17} /> Bill</h2>
        <Badge>{bill.status === "Paid" ? "Paid" : bill.status === "Partly paid" ? "Partial" : "Unpaid"}</Badge>
      </div>

      <dl className="space-y-1 text-[13px]">
        <div className="flex justify-between"><dt className="text-[var(--color-muted)]">Services</dt><dd className="tabular-nums">{money(bill.services)}</dd></div>
        {data.products.map((p) => (
          <div key={p.id} className="flex justify-between">
            <dt className="text-[var(--color-muted)]">{p.name}{p.quantity > 1 ? ` × ${p.quantity}` : ""}</dt>
            <dd className="tabular-nums">{money(p.quantity * p.unit_price)}</dd>
          </div>
        ))}
        {bill.tip > 0 && <div className="flex justify-between"><dt className="text-[var(--color-muted)]">Tip</dt><dd className="tabular-nums">{money(bill.tip)}</dd></div>}
        <div className="flex justify-between border-t border-[var(--color-border-soft)] pt-1.5 font-semibold"><dt>Total</dt><dd className="tabular-nums">{money(bill.total)}</dd></div>
      </dl>

      {data.payments.length > 0 && (
        <ul className="mt-3 space-y-1 text-[12.5px] text-[var(--color-muted)]">
          {data.payments.map((p) => (
            <li key={p.id} className="flex justify-between gap-2">
              <span>
                {paymentMethodLabel(p.method)} · {when(p.created_at)}
                {p.received_by ? ` · ${p.received_by}` : ""}
              </span>
              <span className="tabular-nums">{money(p.amount)}</span>
            </li>
          ))}
        </ul>
      )}

      {bill.due > 0 && (
        <div className="mt-3 flex items-center justify-between rounded-xl bg-[var(--color-orange)]/10 px-3 py-2 text-[13px] font-semibold text-[var(--color-orange)]">
          <span>Still to pay</span>
          <span className="tabular-nums">{money(bill.due)}</span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2">
        {bill.due > 0 && <Button type="button" onClick={() => setPaying(true)}>Take payment</Button>}
        <Link to={`/receipt/${booking.id}`} target="_blank">
          <Button type="button" variant="ghost"><Printer size={14} /> Print</Button>
        </Link>
        {booking.client_email && <Button type="button" variant="ghost" onClick={() => send("email")}><Mail size={14} /> Email receipt</Button>}
        {booking.client_phone && <Button type="button" variant="ghost" onClick={() => send("whatsapp")}><MessageCircle size={14} /> WhatsApp</Button>}
      </div>

      {paying && (
        <TakePaymentDialog
          bookingId={booking.id}
          clientName={booking.client_name}
          due={bill.due}
          onClose={() => setPaying(false)}
          onDone={() => {
            setPaying(false);
            load();
            onChanged?.();
          }}
        />
      )}
    </Card>
  );
}
