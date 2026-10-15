import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, Building2, CircleDollarSign, Clock, Receipt, Sparkles } from "lucide-react";
import { Card, SectionTitle, StatCard } from "../components/ui";
import { TrendChart } from "../components/charts";
import { PlatformHeading } from "./PlatformLayout";
import { ago, money, planText, usePlatformApi } from "./platformApi";

/** The last 30 days, one point per day (days without sign-ups count as 0). */
function last30(signups) {
  const byDay = new Map(signups.map((s) => [s.day, s.signups]));
  return Array.from({ length: 30 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - 29 + i);
    const day = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    return { day, signups: byDay.get(day) ?? 0 };
  });
}

const PLAN_TONE = { starter: "#47769D", growth: "#2F7D6B", popular: "#7429C3" };

/** Platform home: how many salons, how they're paying, what's owed, and who needs attention. */
export default function PlatformOverview() {
  const api = usePlatformApi();
  const [data, setData] = useState(null);

  useEffect(() => {
    api("/overview").then((r) => r.ok && setData(r.data));
  }, [api]);

  if (!data) return <div className="h-60 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-panel-alt)]" />;
  const { counts } = data;
  const paying = data.plans.starter + data.plans.growth + data.plans.popular;
  const owed = data.outstanding.reduce((n, o) => n + o.invoices, 0);
  const overdue = data.outstanding.reduce((n, o) => n + o.overdue, 0);
  const list = (items) => items.map((i) => money(i.amount, i.currency)).join(" + ") || "—";

  return (
    <>
      <PlatformHeading eyebrow="Platform" title="Overview" subtitle="Every salon on Salonifix, at a glance." />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard label="Salons" value={counts.businesses} icon={Building2} accent sub={`${counts.new_this_month} new this month · ${counts.suspended} suspended`} />
        <StatCard label="On free trial" value={counts.on_trial} icon={Sparkles} sub={`${counts.trial_ending_7d} ending this week · ${counts.trial_ended} ended`} />
        <StatCard label="Paying salons" value={paying} icon={CircleDollarSign} sub={`Monthly: ${list(data.mrr)}`} />
        <StatCard label="Unpaid invoices" value={owed} icon={Receipt} sub={owed ? `${list(data.outstanding)}${overdue ? ` · ${overdue} overdue` : ""}` : "All paid"} />
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <Card className="p-5 lg:col-span-2">
          <SectionTitle eyebrow="Last 30 days" title={`Sign-ups · ${counts.new_7d} this week`} />
          <TrendChart data={last30(data.signups)} xKey="day" yKey="signups" height={220} valueFormatter={(v) => `${v} salon${v === 1 ? "" : "s"}`} label="Sign-ups per day" />
        </Card>

        <Card className="p-5">
          <SectionTitle eyebrow="Plans" title="Who pays for what" />
          <div className="space-y-3">
            {["popular", "growth", "starter"].map((key) => {
              const n = data.plans[key];
              const pct = paying ? Math.round((n / paying) * 100) : 0;
              return (
                <Link key={key} to={`/platform/businesses?plan=${key}`} className="block rounded-xl p-2 -m-2 hover:bg-[var(--color-panel-alt)]">
                  <p className="mb-1.5 flex items-center justify-between text-[13px]">
                    <span className="font-medium capitalize">{key}</span>
                    <span className="text-[var(--color-muted)]">{n} salon{n === 1 ? "" : "s"}</span>
                  </p>
                  <div className="h-2 overflow-hidden rounded-full bg-[var(--color-border)]">
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, background: PLAN_TONE[key] }} />
                  </div>
                </Link>
              );
            })}
            <div className="border-t border-[var(--color-border-soft)] pt-3 text-[12.5px] text-[var(--color-muted)]">
              <p>Collected this month: <b className="text-[var(--color-ink)]">{data.revenue.map((r) => money(r.this_month, r.currency)).join(" + ") || "—"}</b></p>
              <p className="mt-1">Last month: {data.revenue.map((r) => money(r.last_month, r.currency)).join(" + ") || "—"}</p>
            </div>
          </div>
        </Card>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-2">
        <Card className="p-5">
          <SectionTitle
            eyebrow="Needs attention"
            title="Trials ending this week"
            action={<Link to="/platform/businesses?plan=trial" className="flex items-center gap-1 text-[12.5px] font-semibold text-[var(--color-accent)]">All trials <ArrowRight size={13} /></Link>}
          />
          {data.trials_ending.length === 0 ? (
            <p className="text-[13px] text-[var(--color-muted)]">No trials end in the next 7 days.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border-soft)]">
              {data.trials_ending.map((t) => (
                <li key={t.id}>
                  <Link to={`/platform/businesses/${t.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-[var(--color-accent)]">
                    <span className="min-w-0">
                      <span className="block truncate text-[13.5px] font-medium">{t.name}</span>
                      <span className="block truncate text-[12px] text-[var(--color-muted)]">{t.owner_email}</span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1 text-[12.5px] font-semibold text-[var(--color-orange)]">
                      <Clock size={13} /> {t.trial_days_left === 0 ? "Ends today" : `${t.trial_days_left} day${t.trial_days_left === 1 ? "" : "s"}`}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle
            eyebrow="Latest"
            title="New salons"
            action={<Link to="/platform/businesses" className="flex items-center gap-1 text-[12.5px] font-semibold text-[var(--color-accent)]">All salons <ArrowRight size={13} /></Link>}
          />
          <ul className="divide-y divide-[var(--color-border-soft)]">
            {data.recent.map((b) => (
              <li key={b.id}>
                <Link to={`/platform/businesses/${b.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:text-[var(--color-accent)]">
                  <span className="min-w-0">
                    <span className="block truncate text-[13.5px] font-medium">{b.name}</span>
                    <span className="block truncate text-[12px] text-[var(--color-muted)]">{b.owner_name} · joined {ago(b.created_at)}</span>
                  </span>
                  <span className="shrink-0 text-[12px] font-medium text-[var(--color-muted)]">{planText(b)}</span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </>
  );
}
