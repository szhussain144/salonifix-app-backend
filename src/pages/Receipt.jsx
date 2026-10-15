import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Printer } from "lucide-react";
import { Button } from "../components/ui";
import { formatMoney } from "../components/format";
import { paymentMethodLabel } from "../components/labels";
import { formatBookingDate } from "../context/functions";
import { useApi } from "../context/ApiContext";
import constanst from "../config/constants";

/** Printable receipt (opens in its own tab; fits an A4 page or a receipt printer). */
export default function Receipt() {
  const { id } = useParams();
  const { fetchWithLoading } = useApi();
  const [r, setR] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchWithLoading(`${constanst.API_URL}/bookings/${id}/receipt`, { silent: true }).then(async (res) => {
      if (res.ok) setR((await res.json()).data);
      else setError("This receipt couldn't be found.");
    });
  }, [fetchWithLoading, id]);

  if (error) return <p className="p-10 text-center text-[14px]">{error}</p>;
  if (!r) return null;
  const money = (v) => formatMoney(v, r.currency);
  const row = (label, value, strong, key) => (
    <div key={key ?? label} className={`flex justify-between gap-4 py-0.5 ${strong ? "font-semibold" : ""}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] py-8 print:bg-white print:py-0">
      <div className="mx-auto mb-4 flex max-w-sm justify-end px-4 print:hidden">
        <Button type="button" onClick={() => window.print()}><Printer size={14} /> Print</Button>
      </div>
      <article className="mx-auto max-w-sm rounded-2xl bg-white p-6 font-mono text-[12.5px] text-black shadow print:max-w-none print:rounded-none print:p-0 print:shadow-none">
        <header className="mb-4 text-center">
          <p className="text-[16px] font-bold">{r.business_name}</p>
          <p>{r.location_name}</p>
          {r.business_address && <p>{r.business_address}</p>}
          {r.location_phone && <p>{r.location_phone}</p>}
        </header>
        <div className="mb-3 border-y border-dashed border-black py-2">
          {row("Receipt", `#${r.id}`)}
          {row("Date", formatBookingDate(r.booking_date, r.start_time))}
          {row("Client", r.client_name)}
        </div>
        {r.services.map((s, i) => row(`${s.name}${s.staff_name ? ` (${s.staff_name})` : ""}`, money(s.price), false, `s${i}`))}
        {r.discount > 0 && row(`Discount${r.discount_note ? ` (${r.discount_note})` : ""}`, `-${money(r.discount)}`)}
        {r.products.map((p) => row(`${p.name}${p.quantity > 1 ? ` × ${p.quantity}` : ""}`, money(p.quantity * p.unit_price), false, `p${p.id}`))}
        {r.bill.tip > 0 && row("Tip", money(r.bill.tip))}
        <div className="mt-2 border-t border-dashed border-black pt-2">{row("TOTAL", money(r.bill.total), true)}</div>
        <div className="mt-2">
          {r.payments.map((p) => row(paymentMethodLabel(p.method), money(p.amount), false, `pay${p.id}`))}
          {r.bill.due > 0 ? row("Still to pay", money(r.bill.due), true) : row("Paid in full", "✓")}
        </div>
        <p className="mt-5 text-center">Thank you for your visit!</p>
      </article>
    </div>
  );
}
