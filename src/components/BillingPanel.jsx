import { useCallback, useEffect, useState } from "react";
import { Check, Clock, MapPin, Receipt, Sparkles, UsersRound } from "lucide-react";
import { Badge, Button, SectionTitle } from "./ui";
import { formatDay, formatMoney } from "./format";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

/** Loads the plan summary; `reload()` refreshes it after a change. */
// oxlint-disable-next-line react/only-export-components -- small hook colocated with its panel
export function useBilling() {
  const { fetchWithLoading } = useApi();
  const { isManager } = useSession();
  const [billing, setBilling] = useState(null);

  const reload = useCallback(async () => {
    if (!isManager) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/billing`);
    if (res.ok) setBilling((await res.json()).data);
  }, [fetchWithLoading, isManager]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { billing, setBilling, reload };
}

/**
 * Starts the trial or switches plan, then refreshes the session so locked screens open
 * straight away. Resolves to the new summary, or null when nothing changed (yet).
 */
// oxlint-disable-next-line react/only-export-components -- shared with the plan picker after signup
export function useChoosePlan() {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { signIn } = useSession();
  return useCallback(
    async (plan) => {
      const res = await fetchWithLoading(`${constanst.API_URL}/billing/plan`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });
      if (!res.ok) return null;
      const body = await res.json();
      if (body.data.status === "pending" && body.data.checkout_url) {
        window.location.assign(body.data.checkout_url);
        return null;
      }
      const me = await fetchWithLoading(`${constanst.API_URL}/auth/me`, { silent: true });
      if (me.ok) signIn((await me.json()).data);
      addToast({ message: body.message, type: "success" });
      return body.data.summary;
    },
    [fetchWithLoading, addToast, signIn],
  );
}

// Popular sits in the middle (first on a phone), in colour, so it's the one people notice first.
const ORDER = { starter: 0, popular: 1, growth: 2 };

/**
 * The three plans side by side, Popular in the centre and in colour. `selected` highlights
 * one (the picker after signup); `current` marks the plan the business is on; `note(plan)`
 * adds a line under the price; `action(plan)` renders each card's button.
 */
export function PlanCards({ plans, current, selected, onSelect, note, action }) {
  return (
    <div className="grid gap-3 md:grid-cols-3 md:items-center">
      {[...plans].sort((a, b) => ORDER[a.key] - ORDER[b.key]).map((p) => {
        const isCurrent = p.key === current;
        const isSelected = p.key === selected;
        const featured = p.key === "popular";
        const Tag = onSelect ? "button" : "div";
        const muted = featured ? "text-[var(--color-navy-ink-2)]" : "text-[var(--color-muted)]";
        const chip = featured ? "bg-white/12" : "bg-[var(--color-panel-alt)]";
        return (
          <Tag
            key={p.key}
            {...(onSelect && { type: "button", onClick: () => onSelect(p.key), "aria-pressed": isSelected })}
            className={`relative flex flex-col rounded-2xl text-left transition-all duration-200 ${
              featured
                ? "banner order-first border-0 p-6 shadow-[0_28px_60px_-24px_rgba(116,41,195,0.7)] md:order-none md:-my-3 md:py-8"
                : "border bg-[var(--color-card)] p-5"
            } ${
              isSelected
                ? featured
                  ? "ring-[3px] ring-[var(--color-accent)] ring-offset-2 ring-offset-[var(--color-bg)]"
                  : "border-[var(--color-accent)] shadow-[0_0_0_3px_rgba(116,41,195,0.16),0_18px_36px_-18px_rgba(116,41,195,0.45)]"
                : featured
                  ? ""
                  : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
            } ${onSelect ? "hover:-translate-y-0.5" : ""}`}
          >
            {featured && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[var(--color-navy-accent)] px-3 py-1 text-[11px] font-semibold text-[var(--color-navy)] shadow">
                ★ Most popular
              </span>
            )}
            <div className="flex items-center justify-between gap-2">
              <p className={`font-display font-medium ${featured ? "text-[21px]" : "text-[18px]"}`}>{p.name}</p>
              {isCurrent && <Badge>Current</Badge>}
              {onSelect && (
                <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full border-2 ${isSelected ? (featured ? "border-white bg-white text-[var(--color-accent)]" : "border-[var(--color-accent)] bg-[var(--color-accent)] text-white") : featured ? "border-white/50" : "border-[var(--color-border)]"}`}>
                  {isSelected && <Check size={13} strokeWidth={3} />}
                </span>
              )}
            </div>
            <p className={`text-[12.5px] ${muted}`}>{p.tagline}</p>
            <p className="mt-4 flex items-baseline gap-1">
              <span className={`font-semibold tracking-tight ${featured ? "text-[30px]" : "text-[26px]"}`}>{formatMoney(p.price, p.currency)}</span>
              <span className={`text-[12.5px] ${muted}`}>/ month</span>
            </p>
            {note?.(p) && <p className={`mt-1 text-[12.5px] font-semibold ${featured ? "text-[var(--color-navy-accent)]" : "text-[var(--color-accent)]"}`}>{note(p)}</p>}
            <div className={`mt-3 flex flex-wrap gap-1.5 text-[11.5px] ${muted}`}>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${chip}`}>
                <UsersRound size={11} /> {p.limits.team === 1 ? "Just you" : "Your whole team"}
              </span>
              <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 ${chip}`}>
                <MapPin size={11} /> {p.limits.locations === null ? "Unlimited locations" : `${p.limits.locations} location${p.limits.locations === 1 ? "" : "s"}`}
              </span>
            </div>
            <ul className="mt-4 flex-1 space-y-2">
              {p.highlights.map((h) => (
                <li key={h} className="flex items-start gap-2 text-[13px]">
                  <Check size={14} className={`mt-0.5 shrink-0 ${featured ? "text-[var(--color-navy-accent)]" : "text-[var(--color-green)]"}`} /> {h}
                </li>
              ))}
            </ul>
            {action && <div className="mt-5">{action(p)}</div>}
          </Tag>
        );
      })}
    </div>
  );
}

/** "23 days left" / "Renews Friday, 14 Nov" under the plan name. */
function standing(billing) {
  if (billing.trial) return `${billing.trial_days_left} day${billing.trial_days_left === 1 ? "" : "s"} left · every feature unlocked`;
  if (billing.trial_ended) return "Your free trial has ended. Starter features apply until you choose a plan.";
  return `Renews ${formatDay(billing.current_period_end, { long: true })}`;
}

function Usage({ icon: Icon, label, used, limit }) {
  const pct = limit === null ? 0 : Math.min(100, Math.round((used / Math.max(limit, 1)) * 100));
  const full = limit !== null && used >= limit;
  return (
    <div className="rounded-xl border border-[var(--color-border-soft)] p-3.5">
      <p className="flex items-center justify-between text-[12.5px]">
        <span className="flex items-center gap-1.5 font-medium">
          <Icon size={13} className="text-[var(--color-accent)]" /> {label}
        </span>
        <span className={full ? "text-[var(--color-orange)]" : "text-[var(--color-muted)]"}>
          {limit === null ? `${used} · no limit` : `${used} of ${limit}`}
        </span>
      </p>
      {limit !== null && (
        <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label={label}>
          <div className={`h-full rounded-full ${full ? "bg-[var(--color-orange)]" : "bg-[var(--color-accent)]"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
    </div>
  );
}

const INVOICE_TONE = { paid: "Paid", pending: "Pending", failed: "Failed", void: "Void" };
const RANK = { starter: 0, growth: 1, popular: 2 };

/** Settings → Plan & billing: the current plan and trial, usage, switching plans, invoices. */
export default function BillingPanel({ billing, setBilling }) {
  const { isOwner } = useSession();
  const choose = useChoosePlan();

  if (!billing) return <p className="text-[13px] text-[var(--color-muted)]">Loading plan…</p>;

  const current = billing.trial || billing.trial_ended ? null : billing.plan;
  const isDown = (p) => current && RANK[p.key] < RANK[current];
  const switchTo = async (p) => {
    if (!window.confirm(`${isDown(p) ? "Move" : "Upgrade"} to ${p.name} for ${formatMoney(p.price, p.currency)} a month? It starts today.`)) return;
    const summary = await choose(p.key);
    if (summary) setBilling(summary);
  };

  return (
    <div className="space-y-5">
      <SectionTitle title="Plan & billing" />

      <div className="banner relative overflow-hidden rounded-2xl p-5">
        <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-navy-accent)]">
          {billing.trial && <Sparkles size={12} />}
          {billing.trial_ended && <Clock size={12} />}
          Your plan
        </p>
        <p className="mt-1 font-display text-[24px] font-medium">{billing.name}</p>
        <p className="mt-0.5 text-[13px] text-[var(--color-navy-ink-2)]">{standing(billing)}</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Usage icon={MapPin} label="Locations" used={billing.usage.locations} limit={billing.limits.locations} />
        <Usage icon={UsersRound} label="Team members" used={billing.usage.staff} limit={billing.limits.team} />
      </div>

      <div>
        <p className="mb-3 text-[13px] font-semibold">{billing.trial ? "Choose the plan to keep after your trial" : "Plans"}</p>
        <PlanCards
          plans={billing.plans}
          current={current}
          action={(p) =>
            p.key === current ? (
              <Button variant="ghost" className="w-full" disabled>Your plan</Button>
            ) : isOwner ? (
              <Button variant={isDown(p) ? "ghost" : "primary"} className="w-full" disabled={!billing.payments_enabled} onClick={() => switchTo(p)}>
                {isDown(p) ? `Move to ${p.name}` : `Choose ${p.name}`}
              </Button>
            ) : null
          }
        />
        {!isOwner && <p className="mt-3 text-[12.5px] text-[var(--color-muted)]">Only the owner can change the plan.</p>}
        {isOwner && !billing.payments_enabled && (
          <p className="mt-3 text-[12.5px] text-[var(--color-red)]">Online payments aren&apos;t set up yet. Contact support to change your plan.</p>
        )}
      </div>

      <div>
        <p className="mb-2 flex items-center gap-2 text-[13px] font-semibold">
          <Receipt size={14} className="text-[var(--color-muted)]" /> Invoices
        </p>
        {billing.invoices.length === 0 ? (
          <p className="text-[13px] text-[var(--color-muted)]">No invoices yet.</p>
        ) : (
          <div className="divide-y divide-[var(--color-border-soft)] rounded-xl border border-[var(--color-border-soft)]">
            {billing.invoices.map((inv) => (
              <div key={inv.id} className="flex flex-wrap items-center justify-between gap-2 px-3.5 py-2.5 text-[13px]">
                <div className="min-w-0">
                  <p className="font-medium">{inv.description}</p>
                  <p className="text-[12px] text-[var(--color-faint)]">#{inv.id} · {formatDay(inv.created_at, { long: true })}</p>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-semibold">{formatMoney(inv.amount_cents / 100, inv.currency)}</span>
                  <Badge>{INVOICE_TONE[inv.status] || inv.status}</Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
