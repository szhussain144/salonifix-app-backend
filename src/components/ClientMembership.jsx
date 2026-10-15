import { useCallback, useEffect, useState } from "react";
import { Crown } from "lucide-react";
import JoinMembershipDialog from "./JoinMembershipDialog";
import MemberDialog from "./MemberDialog";
import { Badge } from "./ui";
import { formatAmount } from "./format";
import { memberBadge, memberLine, perPeriod } from "./membership";
import { formatBookingDate } from "../context/functions";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import constanst from "../config/constants";

/** The client's membership on their page: what they get, when it renews, and "Add to a plan". */
export default function ClientMembership({ client }) {
  const { fetchWithLoading } = useApi();
  const { canOpen } = useSession();
  const [memberships, setMemberships] = useState(null);
  const [joining, setJoining] = useState(false);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/memberships/client/${client.id}`, { silent: true });
    setMemberships(res.ok ? (await res.json()).data : []);
  }, [client.id, fetchWithLoading]);

  useEffect(() => {
    load();
  }, [load]);

  if (memberships === null) return null;
  const current = memberships.find((m) => m.status === "active" || m.status === "past_due");
  const last = current || memberships[0];
  return (
    <div className="mt-6 border-t border-[var(--color-border-soft)] pt-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--color-faint)]">
          <Crown size={13} /> Membership
        </p>
        {!current && canOpen("memberships") && (
          <button type="button" onClick={() => setJoining(true)} className="text-[12.5px] font-medium text-[var(--color-accent)] hover:underline">
            + Add to a plan
          </button>
        )}
      </div>
      {!last ? (
        <p className="text-[12.5px] text-[var(--color-faint)]">Not a member.</p>
      ) : (
        <button
          type="button"
          onClick={() => setOpen(last.id)}
          className={`w-full rounded-xl p-3 text-left text-[12.5px] transition-colors ${current ? "banner" : "bg-[var(--color-panel-alt)] hover:bg-[var(--color-border-soft)]"}`}
        >
          <span className="flex items-center justify-between gap-2">
            <span className="font-semibold">{last.name}</span>
            {current ? <span className="rounded-full bg-white/20 px-2 py-0.5 text-[11px] font-semibold">{memberBadge(last)}</span> : <Badge>{memberBadge(last)}</Badge>}
          </span>
          <span className={`block ${current ? "text-white/80" : "text-[var(--color-muted)]"}`}>
            {formatAmount(last.price)} {perPeriod(last.billing_period)}
            {last.discount_percent > 0 ? ` · ${last.discount_percent}% off services` : ""}
          </span>
          {current &&
            current.benefits.map((b) => (
              <span key={b.id} className="mt-1 flex justify-between">
                <span>{b.service_name}</span>
                <span className="font-medium">{Math.max(0, b.quantity - b.used)} of {b.quantity} left this period</span>
              </span>
            ))}
          <span className={`mt-1 block text-[11.5px] ${current ? "text-white/70" : "text-[var(--color-faint)]"}`}>{memberLine(last, formatBookingDate)}</span>
        </button>
      )}
      {joining && (
        <JoinMembershipDialog
          client={client}
          onClose={() => setJoining(false)}
          onJoined={() => {
            setJoining(false);
            load();
          }}
        />
      )}
      {open && <MemberDialog id={open} onClose={() => setOpen(null)} onChanged={load} />}
    </div>
  );
}
