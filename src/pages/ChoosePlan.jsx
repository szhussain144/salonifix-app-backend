import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ArrowRight, Gift } from "lucide-react";
import Mark from "../components/Mark";
import { PlanCards, useBilling, useChoosePlan } from "../components/BillingPanel";
import { formatMoney } from "../components/format";
import { Button } from "../components/ui";
import { useSession } from "../context/SessionContext";

/**
 * Straight after signing up. Popular is picked by default and its first month is free
 * (the free trial unlocks everything Popular has); Starter or Growth start paid today.
 * Owners only; the plan can change later in Settings.
 */
export default function ChoosePlan() {
  const navigate = useNavigate();
  const { user, plan, isOwner } = useSession();
  const { billing } = useBilling();
  const choose = useChoosePlan();
  const [selected, setSelected] = useState("popular");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Choose your plan";
  }, []);

  if (!isOwner || plan?.chosen) return <Navigate to="/" replace />;

  const picked = billing?.plans.find((p) => p.key === selected);
  const trialOn = selected === "popular";
  const start = async () => {
    setBusy(true);
    // Popular starts as the free month; the others are paid from today.
    const summary = await choose(trialOn ? "trial" : selected);
    setBusy(false);
    if (summary) navigate("/", { replace: true });
  };
  const firstName = (user?.name || "").split(" ")[0];

  return (
    <div className="wash min-h-screen bg-[var(--color-bg)] px-4 pb-32 pt-8 sm:pt-12">
      <div className="page-enter mx-auto max-w-5xl">
        <div className="mb-8 flex items-center gap-2 text-[var(--color-accent)]">
          <Mark size={22} />
          <span className="font-display text-[15px] font-semibold text-[var(--color-ink)]">Salonifix</span>
        </div>

        <div className="mb-10 text-center">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">
            {firstName ? `Welcome, ${firstName}` : "Welcome"}
          </p>
          <h1 className="font-display text-[30px] font-medium leading-tight tracking-tight sm:text-[38px]">Choose your plan</h1>
          <p className="mx-auto mt-2 max-w-xl text-[14.5px] text-[var(--color-muted)]">
            Try Popular free for a month, with every feature unlocked and no card needed. Then keep the plan that fits.
          </p>
          <p className="mt-4 inline-flex items-center gap-2 rounded-full bg-[var(--color-accent-soft)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--color-accent-dark)]">
            <Gift size={14} /> First month of Popular is free
          </p>
        </div>

        {billing ? (
          <PlanCards
            plans={billing.plans}
            selected={selected}
            onSelect={setSelected}
            note={(p) => (p.key === "popular" ? "Free for your first month" : null)}
          />
        ) : (
          <div className="grid gap-3 md:grid-cols-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="h-80 animate-pulse rounded-2xl bg-[var(--color-panel-alt)]" />
            ))}
          </div>
        )}
        <p className="mt-6 text-center text-[12.5px] text-[var(--color-faint)]">You can change your plan any time in Settings → Plan &amp; billing.</p>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--color-border)] bg-[var(--color-card)]/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3.5">
          <p className="text-[13px] text-[var(--color-muted)]">
            {trialOn ? (
              <>
                <b className="font-semibold text-[var(--color-ink)]">Popular, free for 30 days.</b> Then choose a plan to keep going.
              </>
            ) : picked ? (
              <>
                <b className="font-semibold text-[var(--color-ink)]">{picked.name}</b> · {formatMoney(picked.price, picked.currency)} a month, starting today
              </>
            ) : null}
          </p>
          <Button type="button" onClick={start} disabled={busy || !picked} className="px-6 py-2.5 text-[14px]">
            {trialOn ? "Start my free month" : `Continue with ${picked?.name ?? "this plan"}`} <ArrowRight size={15} />
          </Button>
        </div>
      </div>
    </div>
  );
}
