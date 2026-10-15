import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Ban, CalendarPlus, ExternalLink, Globe, Mail, MapPin, Phone, Plus, RotateCcw, UserRound } from "lucide-react";
import { Button, Card, SectionTitle } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { resolveActiveLocation, saveActiveLocationId, saveSession } from "../context/sessionStore";
import { PlanPill } from "./PlatformBusinesses";
import { InvoiceActions, InvoiceStatus, InvoiceSummary, NewInvoiceDialog } from "./invoiceParts";
import { ago, money, PLAN_LABEL, shortDate, usePlatformApi } from "./platformApi";

function Stat({ label, value, sub }) {
  return (
    <div className="rounded-xl border border-[var(--color-border-soft)] p-3.5">
      <p className="text-[12px] text-[var(--color-muted)]">{label}</p>
      <p className="mt-1 text-[20px] font-semibold tracking-tight">{value}</p>
      {sub && <p className="text-[11.5px] text-[var(--color-faint)]">{sub}</p>}
    </div>
  );
}

/** One salon: who runs it, its plan and trial, usage, invoices, and what support can do. */
export default function PlatformBusiness() {
  const { id } = useParams();
  const api = usePlatformApi();
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [missing, setMissing] = useState(false);
  const [planChoice, setPlanChoice] = useState("");
  const [trialDays, setTrialDays] = useState(14);
  const [invoicing, setInvoicing] = useState(false);

  const load = useCallback(async () => {
    const r = await api(`/businesses/${id}`, { silent: true });
    if (r.ok) setData(r.data);
    else setMissing(true);
  }, [api, id]);

  useEffect(() => {
    load();
  }, [load]);

  if (missing) return <p className="text-[14px] text-[var(--color-muted)]">This salon doesn&apos;t exist. <Link to="/platform/businesses" className="text-[var(--color-accent)]">Back to salons</Link></p>;
  if (!data) return <div className="h-60 animate-pulse rounded-[var(--radius-card)] bg-[var(--color-panel-alt)]" />;

  const { business: b, plan, totals } = data;
  const suspended = b.status === "suspended";
  const done = (r) => {
    if (!r.ok) return;
    setData(r.data);
    addToast({ message: r.message, type: "success" });
  };

  const changePlan = async () => {
    if (!planChoice) return;
    const label = planChoice === "trial" ? `a ${trialDays}-day free trial` : PLAN_LABEL[planChoice];
    if (!window.confirm(`Move ${b.name} to ${label}? No invoice is created; use "New invoice" to bill them.`)) return;
    done(await api(`/businesses/${id}/plan`, { method: "POST", body: { plan: planChoice, ...(planChoice === "trial" && { trial_days: trialDays }) } }));
    setPlanChoice("");
  };
  const extendTrial = async () => done(await api(`/businesses/${id}/trial`, { method: "POST", body: { days: Number(trialDays) } }));
  const suspend = async () => {
    const reason = window.prompt(`Suspend ${b.name}? Nobody can sign in, the booking page goes offline and automatic messages stop. Their data is kept.\n\nReason (shown to you only):`, "Unpaid invoices");
    if (reason === null) return;
    done(await api(`/businesses/${id}/suspend`, { method: "POST", body: { reason } }));
  };
  const reactivate = async () => {
    if (!window.confirm(`Reactivate ${b.name}?`)) return;
    done(await api(`/businesses/${id}/reactivate`, { method: "POST" }));
  };
  // Signs this browser in as the owner (2 hours) and opens their dashboard in a new tab.
  const openAsOwner = async () => {
    if (!window.confirm(`Open ${b.name} as its owner for 2 hours? It's recorded in their activity log, and it signs this browser out of any other salon.`)) return;
    const r = await api(`/businesses/${id}/support-session`, { method: "POST" });
    if (!r.ok) return;
    saveSession({ token: r.data.token, user: r.data.user, business: r.data.business, locations: r.data.locations, screens: r.data.screens, plan: r.data.plan, support: true });
    saveActiveLocationId(resolveActiveLocation(r.data.locations));
    window.open("/", "_blank", "noopener");
  };

  return (
    <>
      <Link to="/platform/businesses" className="mb-4 inline-flex items-center gap-1.5 text-[13px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
        <ArrowLeft size={14} /> All salons
      </Link>

      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="font-display text-[28px] font-medium leading-tight tracking-tight lg:text-[32px]">{b.name}</h1>
            <PlanPill business={b} />
            {suspended && <span className="rounded-full bg-[var(--color-red)] px-2.5 py-1 text-[11px] font-semibold text-white">Suspended</span>}
          </div>
          <p className="mt-1 text-[13.5px] text-[var(--color-muted)]">
            {b.industry[0].toUpperCase() + b.industry.slice(1)} · {b.country} · {b.currency} · joined {shortDate(b.created_at)} · last active {ago(b.last_active_at).toLowerCase()}
          </p>
          {suspended && <p className="mt-1 text-[13px] font-medium text-[var(--color-red)]">Suspended {shortDate(b.suspended_at)}{b.suspended_reason ? `: ${b.suspended_reason}` : ""}</p>}
        </div>
        <div className="flex flex-wrap gap-2">
          <Button variant="ghost" onClick={openAsOwner} disabled={suspended}><ExternalLink size={14} /> Open as owner</Button>
          {suspended ? (
            <Button onClick={reactivate}><RotateCcw size={14} /> Reactivate</Button>
          ) : (
            <Button variant="ghost" onClick={suspend} className="hover:!border-[var(--color-red)] hover:!text-[var(--color-red)]"><Ban size={14} /> Suspend</Button>
          )}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <SectionTitle eyebrow="Plan" title={plan.name} />
            <p className="-mt-2 mb-4 text-[13px] text-[var(--color-muted)]">
              {plan.trial
                ? `Free trial ends ${shortDate(plan.trial_ends_on)} (${plan.trial_days_left} day${plan.trial_days_left === 1 ? "" : "s"} left)`
                : plan.trial_ended
                  ? `Trial ended ${shortDate(plan.trial_ends_on)}; Starter features until they choose a plan`
                  : `Renews ${shortDate(b.current_period_end)}`}
              {!plan.chosen && " · hasn't picked a plan yet"}
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-[var(--color-border-soft)] p-4">
                <p className="text-[13px] font-semibold">Change plan</p>
                <p className="mb-3 text-[12px] text-[var(--color-muted)]">Takes effect now, without charging.</p>
                <div className="flex gap-2">
                  <select aria-label="New plan" value={planChoice} onChange={(e) => setPlanChoice(e.target.value)} className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 py-2 text-[13px]">
                    <option value="">Choose…</option>
                    {data.prices.map((p) => (
                      <option key={p.key} value={p.key} disabled={b.plan === p.key}>{p.name} · {money(p.amount, p.currency)}/mo</option>
                    ))}
                    <option value="trial">Free trial (restart)</option>
                  </select>
                  <Button onClick={changePlan} disabled={!planChoice}>Apply</Button>
                </div>
              </div>
              <div className="rounded-xl border border-[var(--color-border-soft)] p-4">
                <p className="text-[13px] font-semibold">{b.plan === "trial" ? "Extend the trial" : "Trial length"}</p>
                <p className="mb-3 text-[12px] text-[var(--color-muted)]">{b.plan === "trial" ? "Adds days to the end of the trial." : "Used when you restart a free trial."}</p>
                <div className="flex gap-2">
                  <input aria-label="Days" type="number" min={1} max={365} value={trialDays} onChange={(e) => setTrialDays(e.target.value)} className="w-24 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 py-2 text-[13px]" />
                  <span className="self-center text-[13px] text-[var(--color-muted)]">days</span>
                  {b.plan === "trial" && <Button variant="ghost" onClick={extendTrial} className="ml-auto"><CalendarPlus size={14} /> Extend</Button>}
                </div>
              </div>
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle eyebrow="Usage" title="How they use it" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Stat label="Locations" value={b.locations} sub={plan.limits.locations === null ? "No limit" : `of ${plan.limits.locations}`} />
              <Stat label="Team" value={b.staff} sub={plan.limits.team === null ? "No limit" : `of ${plan.limits.team}`} />
              <Stat label="Clients" value={b.clients} sub={`${totals.clients_30d} new in 30 days`} />
              <Stat label="Bookings" value={totals.bookings} sub={`${totals.bookings_30d} in 30 days · ${totals.completed_30d} done`} />
            </div>
          </Card>

          <Card className="p-5">
            <SectionTitle eyebrow="Billing" title="Invoices" action={<Button onClick={() => setInvoicing(true)}><Plus size={14} /> New invoice</Button>} />
            {data.invoices.length === 0 ? (
              <p className="text-[13px] text-[var(--color-muted)]">No invoices yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--color-border-soft)]">
                {data.invoices.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
                    <span className="min-w-0">
                      <span className="block text-[13.5px] font-medium">#{i.id} · {i.description}</span>
                      <span className="block text-[11.5px] text-[var(--color-muted)]">{shortDate(i.created_at)}{i.created_by ? ` · by ${i.created_by}` : ""}{i.paid_at ? ` · paid ${shortDate(i.paid_at)}` : ""}</span>
                    </span>
                    <span className="flex items-center gap-3">
                      <InvoiceSummary invoice={i} />
                      <InvoiceStatus invoice={i} />
                      <InvoiceActions invoice={i} onChange={(_, message) => { addToast({ message, type: "success" }); load(); }} />
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle eyebrow="Their activity log" title="Recent activity" />
            {data.activity.length === 0 ? (
              <p className="text-[13px] text-[var(--color-muted)]">Nothing yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {data.activity.map((a) => (
                  <li key={a.id} className="flex items-start justify-between gap-3 text-[13px]">
                    <span className="min-w-0">{a.title}{a.user_name ? <span className="text-[var(--color-muted)]"> · {a.user_name}</span> : null}</span>
                    <span className="shrink-0 text-[12px] text-[var(--color-faint)]">{ago(a.created_at)}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <SectionTitle eyebrow="Contact" title={b.owner_name || "Owner"} />
            <ul className="space-y-2.5 text-[13px]">
              {b.owner_email && <li className="flex items-center gap-2"><Mail size={14} className="text-[var(--color-muted)]" /><a href={`mailto:${b.owner_email}`} className="truncate text-[var(--color-accent)] hover:underline">{b.owner_email}</a></li>}
              {b.phone && <li className="flex items-center gap-2"><Phone size={14} className="text-[var(--color-muted)]" /><a href={`tel:${b.phone}`} className="hover:underline">{b.phone}</a></li>}
              <li className="flex items-center gap-2"><Globe size={14} className="text-[var(--color-muted)]" /><a href={`/book/${b.slug}`} target="_blank" rel="noreferrer" className="truncate hover:underline">/book/{b.slug}</a></li>
            </ul>
          </Card>

          <Card className="p-5">
            <SectionTitle eyebrow="Sign-ins" title={`Team accounts · ${data.users.length}`} />
            <ul className="space-y-3">
              {data.users.map((u) => (
                <li key={u.id} className="flex items-start gap-2.5 text-[13px]">
                  <UserRound size={15} className="mt-0.5 text-[var(--color-muted)]" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{u.name} <span className="text-[11.5px] font-normal capitalize text-[var(--color-muted)]">· {u.role}</span></span>
                    <span className="block truncate text-[12px] text-[var(--color-muted)]">{u.email} · {ago(u.last_login_at).toLowerCase()}</span>
                  </span>
                </li>
              ))}
            </ul>
          </Card>

          <Card className="p-5">
            <SectionTitle eyebrow="Branches" title={`Locations · ${data.locations.length}`} />
            <ul className="space-y-3">
              {data.locations.map((l) => (
                <li key={l.id} className="flex items-start gap-2.5 text-[13px]">
                  <MapPin size={15} className="mt-0.5 text-[var(--color-muted)]" />
                  <span className="min-w-0">
                    <span className="block font-medium">{l.name}{!l.is_active && <span className="text-[11.5px] font-normal text-[var(--color-faint)]"> (closed)</span>}</span>
                    {(l.address || l.phone) && <span className="block text-[12px] text-[var(--color-muted)]">{[l.address, l.phone].filter(Boolean).join(" · ")}</span>}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        </div>
      </div>

      {invoicing && (
        <NewInvoiceDialog
          business={data}
          onClose={() => setInvoicing(false)}
          onCreated={(_, message) => {
            setInvoicing(false);
            addToast({ message, type: "success" });
            load();
          }}
        />
      )}
    </>
  );
}
