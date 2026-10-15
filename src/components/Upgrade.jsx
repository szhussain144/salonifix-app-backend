import { Link } from "react-router-dom";
import { ArrowRight, Lock, Sparkles } from "lucide-react";
import { useSession } from "../context/SessionContext";
import { FEATURE_LABELS, FEATURE_PITCH, PLAN_NAMES, PLANS_LINK } from "../config/plans";

/** Small "🔒 Growth" chip next to a locked menu item or option. */
export function PlanChip({ feature, plan, className = "" }) {
  const { upgradeFor } = useSession();
  const needs = plan || upgradeFor(feature);
  if (!needs) return null;
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--color-accent-dark)] ${className}`}>
      <Lock size={10} strokeWidth={2.5} /> {PLAN_NAMES[needs]}
    </span>
  );
}

/** "See plans" for owners and admins; everyone else is told who can upgrade. */
function UpgradeAction({ compact }) {
  const { isManager } = useSession();
  if (!isManager) return <span className="text-[12px] text-[var(--color-muted)]">Ask the owner to upgrade.</span>;
  return (
    <Link
      to={PLANS_LINK.pathname}
      state={PLANS_LINK.state}
      className={`inline-flex items-center gap-1 rounded-full font-semibold transition-colors ${compact ? "text-[12.5px] text-[var(--color-accent)] hover:text-[var(--color-accent-dark)]" : "btn-primary bg-[var(--color-accent)] px-4 py-2 text-[13px] text-[var(--color-accent-ink)] hover:bg-[var(--color-accent-dark)]"}`}
    >
      {compact ? "See plans" : "Upgrade plan"} <ArrowRight size={13} />
    </Link>
  );
}

/**
 * A locked part of a page: says which plan unlocks it, with the way to upgrade. For a limit
 * (locations, team) pass `plan` (the plan that lifts it) and the message as children.
 */
export function UpgradeNote({ feature, plan, children }) {
  const { upgradeFor } = useSession();
  const needs = plan || upgradeFor(feature);
  if (!needs) return null;
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-accent)]/25 bg-[var(--color-accent-soft)]/60 px-4 py-3">
      <p className="flex min-w-0 items-start gap-2 text-[13px] text-[var(--color-ink-2)]">
        <Lock size={14} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
        <span>
          {children || (
            <>
              <b className="font-semibold text-[var(--color-ink)]">{FEATURE_LABELS[feature]}</b> comes with the {PLAN_NAMES[needs]} plan.
            </>
          )}
        </span>
      </p>
      <UpgradeAction compact />
    </div>
  );
}

/** Shown instead of a whole screen the plan doesn't include. */
export function UpgradeWall({ feature }) {
  const { upgradeFor, plan } = useSession();
  const needs = upgradeFor(feature);
  return (
    <div className="relative overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-card)] px-6 py-12 text-center shadow-[var(--shadow-card)] sm:py-16">
      <div aria-hidden="true" className="pointer-events-none absolute -top-24 left-1/2 h-56 w-[36rem] -translate-x-1/2 rounded-full bg-[var(--color-accent)]/10 blur-3xl" />
      <span className="relative mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
        <Sparkles size={20} />
      </span>
      <p className="relative mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
        {PLAN_NAMES[needs] || "Upgrade"} plan
      </p>
      <h2 className="relative font-display text-[24px] font-medium tracking-tight sm:text-[28px]">{FEATURE_LABELS[feature]}</h2>
      <p className="relative mx-auto mt-2 max-w-md text-[14px] text-[var(--color-muted)]">{FEATURE_PITCH[feature]}</p>
      <p className="relative mx-auto mt-1 max-w-md text-[13px] text-[var(--color-faint)]">
        You&apos;re on {plan?.name || "your plan"}. Upgrade to {PLAN_NAMES[needs]} to use it.
      </p>
      <div className="relative mt-6 flex justify-center">
        <UpgradeAction />
      </div>
    </div>
  );
}
