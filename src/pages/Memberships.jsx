import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { AlarmClock, CalendarClock, Crown, Pencil, Plus, Repeat, Search, Trash2, UserPlus, Users } from "lucide-react";
import JoinMembershipDialog from "../components/JoinMembershipDialog";
import MemberDialog from "../components/MemberDialog";
import Modal from "../components/Modal";
import { Badge, Button, Card, EmptyState, Segmented, StatCard } from "../components/ui";
import { formatAmount, formatCount, toNumber } from "../components/format";
import { memberBadge, memberLine, perPeriod } from "../components/membership";
import { formatBookingDate } from "../context/functions";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

const TABS = [
  { key: "members", label: "Members", icon: Users },
  { key: "plans", label: "Plans", icon: Crown },
];
const FILTERS = [
  { key: "", label: "Current" },
  { key: "past_due", label: "Renewal due" },
  { key: "renewing_soon", label: "Renewing this week" },
  { key: "cancelled", label: "Cancelled" },
  { key: "expired", label: "Expired" },
  { key: "all", label: "All" },
];

/** Manage → Memberships: monthly and annual plans, members, renewals and cancellations. */
export default function Memberships() {
  const { isManager } = useSession();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState("members");
  const [joining, setJoining] = useState(false);
  const [reload, setReload] = useState(0);
  const openId = Number(params.get("member")) || null;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented options={TABS} value={tab} onChange={setTab} />
        <Button type="button" onClick={() => setJoining(true)}>
          <UserPlus size={15} /> Add a member
        </Button>
      </div>
      {tab === "members" ? <Members key={reload} onOpen={(id) => setParams({ member: id })} /> : <Plans isManager={isManager} />}
      {joining && (
        <JoinMembershipDialog
          onClose={() => setJoining(false)}
          onJoined={(m) => {
            setJoining(false);
            setTab("members");
            setReload((n) => n + 1);
            setParams({ member: m.id });
          }}
        />
      )}
      {openId && <MemberDialog id={openId} onClose={() => setParams({})} onChanged={() => setReload((n) => n + 1)} />}
    </div>
  );
}

function Members({ onOpen }) {
  const { fetchWithLoading } = useApi();
  const [data, setData] = useState(null);
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    const q = new URLSearchParams({ ...(filter && filter !== "all" && { status: filter }), ...(search.trim() && { search: search.trim() }) });
    const res = await fetchWithLoading(`${constanst.API_URL}/memberships?${q}`);
    if (res.ok) setData((await res.json()).data);
  }, [fetchWithLoading, filter, search]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  if (!data) return null;
  // "Current" leaves out members who have ended.
  const members = filter === "" ? data.members.filter((m) => m.status === "active" || m.status === "past_due") : data.members;
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Active members" value={formatCount(data.totals.active)} icon={Crown} accent />
        <StatCard label="Renewal due" value={formatCount(data.totals.past_due)} sub="Unpaid, in grace days" icon={AlarmClock} />
        <StatCard label="Renewing this week" value={formatCount(data.totals.renewing_soon)} icon={CalendarClock} />
        <StatCard label="Monthly recurring" value={formatAmount(data.totals.monthly_value)} sub={`${formatAmount(data.totals.collected_this_month)} collected this month`} icon={Repeat} />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 focus-within:border-[var(--color-accent)]">
            <Search size={15} className="text-[var(--color-faint)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client or plan" className="flex-1 bg-transparent text-[13px] outline-none" />
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Show">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                aria-pressed={filter === f.key}
                onClick={() => setFilter(f.key)}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  filter === f.key ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
                }`}
              >
                {f.label}
                {f.key === "past_due" && data.totals.past_due > 0 && <span className="ml-1.5 rounded-full bg-[var(--color-orange)] px-1.5 text-[10.5px] text-white">{data.totals.past_due}</span>}
              </button>
            ))}
          </div>
        </div>
        {members.length === 0 ? (
          <EmptyState icon={Crown} title="No members here">Sign a client up with “Add a member”. Their discount applies to bookings automatically.</EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {members.map((m) => (
              <li key={m.id}>
                <MemberCard m={m} onOpen={() => onOpen(m.id)} />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function MemberCard({ m, onOpen }) {
  const running = m.status === "active" || m.status === "past_due";
  // How far through the paid period the member is.
  const total = Math.max(1, (Date.parse(m.paid_until) - Date.parse(m.period_start)) / 86_400_000 + 1);
  const through = running ? Math.min(100, Math.max(0, ((total - Math.max(0, m.days_left + 1)) / total) * 100)) : 100;
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`card-in w-full rounded-2xl border p-4 text-left transition-[translate,box-shadow,border-color] hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)] ${
        m.status === "past_due" ? "border-[var(--color-orange)]/50 hover:border-[var(--color-orange)]" : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
      } ${running ? "" : "opacity-70"}`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="min-w-0">
          <span className="block truncate text-[14px] font-semibold">{m.client_name}</span>
          <span className="flex items-center gap-1 text-[12.5px] text-[var(--color-muted)]">
            <Crown size={12} className="text-[var(--color-accent)]" /> {m.name} · {formatAmount(m.price)} {perPeriod(m.billing_period)}
          </span>
        </span>
        <Badge>{memberBadge(m)}</Badge>
      </div>
      {running && (
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-[var(--color-panel-alt)]">
          <div
            className={`h-full rounded-full transition-[width] duration-700 ${m.status === "past_due" ? "bg-[var(--color-orange)]" : "bg-[var(--color-accent)]"}`}
            style={{ width: `${through}%` }}
          />
        </div>
      )}
      <p className={`mt-2 text-[12px] ${m.status === "past_due" ? "font-medium text-[var(--color-orange)]" : "text-[var(--color-muted)]"}`}>{memberLine(m, formatBookingDate)}</p>
      {running && m.benefits.length > 0 && (
        <p className="mt-1.5 text-[11.5px] text-[var(--color-faint)]">
          This period: {m.benefits.map((b) => `${Math.max(0, b.quantity - b.used)} of ${b.quantity} ${b.service_name}`).join(" · ")} left
        </p>
      )}
    </button>
  );
}

function Plans({ isManager }) {
  const { fetchWithLoading } = useApi();
  const [plans, setPlans] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/memberships/plans`);
    if (res.ok) setPlans((await res.json()).data);
  }, [fetchWithLoading]);

  useEffect(() => {
    load();
  }, [load]);

  if (!plans) return null;
  return (
    <>
      {isManager && (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={() => setEditing({})}>
            <Plus size={14} /> New plan
          </Button>
        </div>
      )}
      {plans.length === 0 ? (
        <Card className="p-5">
          <EmptyState icon={Crown} title="No plans yet">
            Offer a monthly or annual membership, e.g. “Gold: 10% off every service and a free blow-dry each month”. Members pay each period and keep coming back.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {plans.map((p) => (
            <Card key={p.id} className={`relative overflow-hidden p-5 ${p.is_active ? "" : "opacity-60"}`}>
              <span aria-hidden className="pointer-events-none absolute -right-6 -top-6 text-[var(--color-accent)] opacity-[0.07]">
                <Crown size={120} />
              </span>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-[17px] font-medium">{p.name}</h3>
                {!p.is_active && <Badge>Inactive</Badge>}
              </div>
              {p.description && <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">{p.description}</p>}
              <p className="mt-3">
                <span className="text-[22px] font-semibold">{formatAmount(p.price)}</span>{" "}
                <span className="text-[12.5px] text-[var(--color-muted)]">{perPeriod(p.billing_period)}</span>
              </p>
              {p.billing_period === "year" && <p className="text-[12px] text-[var(--color-faint)]">{formatAmount(p.monthly_price)} a month</p>}
              <ul className="mt-3 space-y-1.5 text-[13px]">
                {p.discount_percent > 0 && <Perk>{p.discount_percent}% off every service</Perk>}
                {p.items.map((i) => (
                  <Perk key={i.service_id}>
                    {i.quantity}× {i.service_name} included each {p.billing_period}
                    <span className="ml-1 text-[var(--color-faint)]">({formatAmount(i.quantity * i.unit_price)})</span>
                  </Perk>
                ))}
              </ul>
              <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border-soft)] pt-3 text-[12px] text-[var(--color-muted)]">
                <span>
                  {formatCount(p.members)} member{p.members === 1 ? "" : "s"} · {p.grace_days} grace day{p.grace_days === 1 ? "" : "s"}
                </span>
                {isManager && (
                  <Button type="button" variant="ghost" onClick={() => setEditing(p)}>
                    <Pencil size={13} /> Edit
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}
      {editing && (
        <PlanEditor
          plan={editing}
          onClose={() => setEditing(null)}
          onSaved={() => {
            setEditing(null);
            load();
          }}
        />
      )}
    </>
  );
}

function Perk({ children }) {
  return (
    <li className="flex items-start gap-2">
      <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--color-accent)]" />
      <span>{children}</span>
    </li>
  );
}

function PlanEditor({ plan, onClose, onSaved }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    name: plan.name || "",
    description: plan.description || "",
    price: plan.price !== undefined ? String(plan.price) : "",
    billing_period: plan.billing_period || "month",
    discount_percent: plan.discount_percent !== undefined ? String(plan.discount_percent) : "10",
    grace_days: plan.grace_days !== undefined ? String(plan.grace_days) : "7",
    is_active: plan.is_active === undefined ? true : Boolean(plan.is_active),
    items: plan.items?.map((i) => ({ service_id: i.service_id, quantity: i.quantity })) || [],
  });

  useEffect(() => {
    fetchWithLoading(`${constanst.API_URL}/services?limit=500`, { silent: true }).then(async (res) => {
      if (res.ok) setServices((await res.json()).data.filter((s) => s.is_active !== 0));
    });
  }, [fetchWithLoading]);

  const set = (patch) => setForm((f) => ({ ...f, ...patch }));
  const priceOf = (id) => toNumber(services.find((s) => s.id === Number(id))?.price);
  const included = form.items.reduce((sum, i) => sum + priceOf(i.service_id) * toNumber(i.quantity), 0);
  const setItem = (index, patch) => set({ items: form.items.map((x, j) => (j === index ? { ...x, ...patch } : x)) });
  const hasPerk = toNumber(form.discount_percent) > 0 || form.items.length > 0;
  const valid = form.name.trim() && form.price !== "" && hasPerk && form.items.every((i) => i.service_id && toNumber(i.quantity) > 0);

  const save = async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/memberships/plans${plan.id ? `/${plan.id}` : ""}`, {
      method: plan.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: toNumber(form.price),
        billing_period: form.billing_period,
        discount_percent: toNumber(form.discount_percent),
        grace_days: toNumber(form.grace_days),
        is_active: form.is_active,
        items: form.items.map((i) => ({ service_id: Number(i.service_id), quantity: toNumber(i.quantity) })),
      }),
    });
    if (!res.ok) return;
    addToast({ message: "Plan saved", type: "success" });
    onSaved();
  };

  // Width is set per field: the service picker fills the row, the quantity box stays narrow.
  const field = "rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-accent)]";
  const input = `w-full ${field}`;
  const per = form.billing_period === "year" ? "year" : "month";
  return (
    <Modal
      title={plan.id ? "Edit plan" : "New plan"}
      subtitle="Changes apply to members who join from now on; current members keep their terms."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={save} disabled={!valid}>Save plan</Button>
        </div>
      }
    >
      <div className="space-y-4 text-[13px]">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium">Name</span>
          <input autoFocus value={form.name} onChange={(e) => set({ name: e.target.value })} placeholder="e.g. Gold" className={input} />
        </label>
        <div>
          <span className="mb-1 block text-[12px] font-medium">Billed</span>
          <Segmented
            options={[
              { key: "month", label: "Monthly" },
              { key: "year", label: "Annually" },
            ]}
            value={form.billing_period}
            onChange={(v) => set({ billing_period: v })}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium">Price a {per}</span>
            <input type="number" min="0" aria-label="Price" value={form.price} onChange={(e) => set({ price: e.target.value })} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium">Discount on services (%)</span>
            <input type="number" min="0" max="100" aria-label="Discount percent" value={form.discount_percent} onChange={(e) => set({ discount_percent: e.target.value })} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium">Grace days</span>
            <input type="number" min="0" max="60" aria-label="Grace days" value={form.grace_days} onChange={(e) => set({ grace_days: e.target.value })} className={input} />
          </label>
        </div>
        <p className="-mt-2 text-[11.5px] text-[var(--color-faint)]">Grace days: how long an unpaid renewal stays open before the membership expires.</p>
        <div>
          <span className="mb-1 block text-[12px] font-medium">Included each {per}</span>
          <div className="space-y-2">
            {form.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <select value={item.service_id} onChange={(e) => setItem(i, { service_id: e.target.value })} className={`${field} min-w-0 flex-1`} aria-label={`Treatment ${i + 1}`}>
                  <option value="">Choose a treatment</option>
                  {services
                    .filter((s) => s.id === Number(item.service_id) || !form.items.some((x) => Number(x.service_id) === s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {formatAmount(s.price)}
                      </option>
                    ))}
                </select>
                <input type="number" min="1" max="100" aria-label={`How many ${i + 1}`} value={item.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} className={`${field} w-20 shrink-0 text-center`} />
                <button type="button" aria-label="Remove" onClick={() => set({ items: form.items.filter((_, j) => j !== i) })} className="rounded-md p-1 text-[var(--color-faint)] hover:text-[var(--color-red)]">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>
          <button type="button" onClick={() => set({ items: [...form.items, { service_id: "", quantity: 1 }] })} className="mt-2 text-[12.5px] font-medium text-[var(--color-accent)]">
            + Include a treatment
          </button>
        </div>
        {included > 0 && toNumber(form.price) > 0 && (
          <p className={`rounded-xl px-3 py-2 ${included >= toNumber(form.price) ? "bg-[var(--color-green)]/10 text-[var(--color-green)]" : "bg-[var(--color-panel-alt)] text-[var(--color-muted)]"}`}>
            Included treatments are worth {formatAmount(included)} a {per} at menu prices
            {included >= toNumber(form.price) ? ", as much as the plan costs." : "."}
          </p>
        )}
        {!hasPerk && <p className="text-[12px] text-[var(--color-orange)]">Give members a discount or include at least one treatment.</p>}
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium">Description (optional)</span>
          <input value={form.description} onChange={(e) => set({ description: e.target.value })} className={input} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.is_active} onChange={(e) => set({ is_active: e.target.checked })} className="accent-[var(--color-accent)]" />
          Open to new members
        </label>
      </div>
    </Modal>
  );
}
