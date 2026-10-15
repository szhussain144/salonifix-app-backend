import { useEffect, useState } from "react";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import { formatAmount, formatDay } from "./format";

/* "★ Star" pill; the reasons show on hover. */
export function StarBadge({ reasons = [], compact = false }) {
  return (
    <span
      title={reasons.length ? `Star client: ${reasons.join(", ")}` : "Star client"}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold text-[var(--color-orange)] bg-[var(--color-orange)]/10 whitespace-nowrap"
    >
      ★{compact ? "" : " Star client"}
    </span>
  );
}

/* Loyalty status for one client from /loyalty/clients/:id. Reloads when `refreshKey` changes. */
// oxlint-disable-next-line react/only-export-components -- hook is colocated with the card that uses it
export function useClientLoyalty(clientId, refreshKey) {
  const { fetchWithLoading } = useApi();
  const [state, setState] = useState({ clientId: null, data: null });

  useEffect(() => {
    if (!clientId) return;
    let cancelled = false;
    fetchWithLoading(`${constanst.API_URL}/loyalty/clients/${clientId}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => !cancelled && setState({ clientId, data: json?.data ?? null }))
      .catch(() => !cancelled && setState({ clientId, data: null }));
    return () => {
      cancelled = true;
    };
  }, [clientId, refreshKey, fetchWithLoading]);

  // Ignore a result that belongs to a previous client.
  return state.clientId === clientId ? state.data : null;
}

/* Visits, monthly streak, spend and the next reward. */
export function ClientLoyaltyCard({ clientId, refreshKey, compact = false }) {
  const loyalty = useClientLoyalty(clientId, refreshKey);
  if (!loyalty) return null;

  const next = loyalty.next_rewards?.[0];
  const stats = [
    ["Visits", loyalty.visits],
    ["Monthly streak", loyalty.monthly_streak ? `${loyalty.monthly_streak} mo` : "—"],
    ["Total spent", formatAmount(loyalty.total_spent)],
    ["Last visit", loyalty.last_visit ? formatDay(loyalty.last_visit, { long: true }) : "—"],
  ];

  return (
    <div className={`rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-panel-alt)] ${compact ? "p-3" : "p-4"}`}>
      <div className="flex items-center justify-between gap-2 mb-3">
        <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--color-muted)]">Loyalty</p>
        {loyalty.is_star && <StarBadge reasons={loyalty.reasons} />}
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {stats.map(([label, value]) => (
          <div key={label}>
            <p className="text-[11px] text-[var(--color-muted)]">{label}</p>
            <p className="text-[14px] font-semibold">{value}</p>
          </div>
        ))}
      </div>
      {loyalty.is_star && loyalty.reasons.length > 0 && (
        <p className="mt-3 text-[12px] text-[var(--color-muted)]">Star for: {loyalty.reasons.join(" · ")}</p>
      )}
      {next && (
        <p className="mt-2 text-[12.5px]">
          <span className="text-[var(--color-accent)] font-semibold">
            {next.visits_left === 1 ? "Next visit" : `In ${next.visits_left} visits`}
          </span>{" "}
          earns {next.reward} ({next.name}, visit #{next.at_visit})
        </p>
      )}
      {Number(loyalty.client_discount) > 0 && (
        <p className="mt-2 text-[12px] text-[var(--color-muted)]">Personal discount: {Number(loyalty.client_discount)}%</p>
      )}
    </div>
  );
}

/* Price / discount / total rows for a booking summary. */
export function DiscountLines({ subtotal, discount, note, total, waived }) {
  const row = "flex items-center justify-between gap-3 text-[12.5px] mb-2";
  return (
    <>
      <div className={row}>
        <span className="text-[var(--color-muted)]">Price</span>
        <span>{formatAmount(subtotal)}</span>
      </div>
      <div className={row}>
        <span className="text-[var(--color-muted)]">Discount</span>
        <span className={Number(discount) > 0 ? "text-[var(--color-green)] text-right" : "text-right"}>
          {Number(discount) > 0 ? `− ${formatAmount(discount)}` : waived ? "Waived" : "None"}
          {Number(discount) > 0 && note && <span className="block text-[11px] text-[var(--color-muted)]">{note}</span>}
        </span>
      </div>
      <div className={`${row} font-semibold text-[13.5px]`}>
        <span>Total</span>
        <span>{formatAmount(total)}</span>
      </div>
    </>
  );
}
