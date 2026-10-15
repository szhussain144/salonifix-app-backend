import { useCallback, useEffect, useState } from "react";
import { Hourglass, Mail, MessageCircle, Search, Wallet } from "lucide-react";
import { Badge, Button, Card, EmptyState, StatCard } from "../components/ui";
import { formatCount, formatMoney } from "../components/format";
import { DetailLink } from "../components/DetailLink";
import TakePaymentDialog from "../components/TakePaymentDialog";
import { formatBookingDate } from "../context/functions";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

/** Completed visits that aren't fully paid: take a payment or send a friendly reminder. */
export default function UnpaidBills() {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { business, terms } = useSession();
  const money = (v) => formatMoney(v, business?.currency || "PKR");
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [paying, setPaying] = useState(null);

  const load = useCallback(async () => {
    const q = search.trim() ? `&search=${encodeURIComponent(search.trim())}` : "";
    const res = await fetchWithLoading(`${constanst.API_URL}/bills/unpaid?limit=200${q}`);
    if (res.ok) setData((await res.json()).data);
  }, [fetchWithLoading, search]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const remind = async (bill, channel) => {
    const res = await fetchWithLoading(`${constanst.API_URL}/bookings/${bill.id}/payment-reminder`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel }),
    });
    if (!res.ok) return;
    const body = await res.json();
    addToast({ message: body.message, type: body.data.status === "sent" ? "success" : "error", duration: 5000 });
  };

  const oldest = data?.items?.[0];
  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Still to collect" value={money(data?.total_due ?? 0)} icon={Wallet} accent />
        <StatCard label="Unpaid bills" value={formatCount(data?.count ?? 0)} icon={Hourglass} />
        <StatCard label="Oldest" value={oldest ? `${oldest.days_overdue} days` : "—"} sub={oldest && <span className="text-[11.5px] text-[var(--color-faint)]">{oldest.client_name}</span>} icon={Hourglass} />
      </div>

      <Card className="p-5">
        <label className="mb-4 flex max-w-sm items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 focus-within:border-[var(--color-accent)]">
          <Search size={15} className="text-[var(--color-faint)]" />
          <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={`Search ${terms.client.toLowerCase()} or phone`} className="w-full bg-transparent text-[13px] outline-none" />
        </label>

        {data && data.items.length === 0 ? (
          <EmptyState icon={Wallet} title={search ? "No unpaid bills match" : "Everything is paid"}>
            Visits checked out with “Pay later” or paid in part show up here.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full min-w-[820px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">
                  <th className="pb-2.5 pr-4">{terms.client}</th>
                  <th className="pb-2.5 pr-4">Visit</th>
                  <th className="pb-2.5 pr-4 text-right">Bill</th>
                  <th className="pb-2.5 pr-4 text-right">Paid</th>
                  <th className="pb-2.5 pr-4 text-right">To pay</th>
                  <th className="pb-2.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {(data?.items || []).map((b) => (
                  <tr key={b.id} className="border-b border-[var(--color-border-soft)] last:border-none">
                    <td className="py-2.5 pr-4">
                      <span className="block font-medium">{b.client_name}</span>
                      <span className="block text-[11.5px] text-[var(--color-faint)]">{b.client_phone}</span>
                    </td>
                    <td className="py-2.5 pr-4">
                      <DetailLink to={`/bookings/${b.id}`} className="hover:text-[var(--color-accent)]">
                        {formatBookingDate(b.booking_date, b.start_time)}
                      </DetailLink>
                      <span className="block max-w-[260px] truncate text-[11.5px] text-[var(--color-faint)]">
                        {b.services} · {b.location_name}
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{money(b.total)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--color-muted)]">{b.paid ? money(b.paid) : "—"}</td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className="font-semibold tabular-nums">{money(b.due)}</span>
                      <span className="block text-[11px] text-[var(--color-faint)]">{b.days_overdue === 0 ? "today" : `${b.days_overdue} days`}</span>
                      {b.payment_status === "Partly paid" && <Badge>Partial</Badge>}
                    </td>
                    <td className="py-2.5 text-right">
                      <div className="flex justify-end gap-1.5">
                        {b.client_email && (
                          <button type="button" title="Email a reminder" aria-label={`Email ${b.client_name} a reminder`} onClick={() => remind(b, "email")} className="rounded-lg border border-[var(--color-border)] p-2 hover:border-[var(--color-accent)]">
                            <Mail size={14} />
                          </button>
                        )}
                        {b.client_phone && (
                          <button type="button" title="WhatsApp a reminder" aria-label={`WhatsApp ${b.client_name} a reminder`} onClick={() => remind(b, "whatsapp")} className="rounded-lg border border-[var(--color-border)] p-2 hover:border-[var(--color-accent)]">
                            <MessageCircle size={14} />
                          </button>
                        )}
                        <Button type="button" onClick={() => setPaying(b)}>Take payment</Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {paying && (
        <TakePaymentDialog
          bookingId={paying.id}
          clientName={paying.client_name}
          due={paying.due}
          onClose={() => setPaying(null)}
          onDone={() => {
            setPaying(null);
            load();
          }}
        />
      )}
    </div>
  );
}
