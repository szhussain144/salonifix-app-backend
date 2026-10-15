import { useCallback, useEffect, useState } from "react";
import { Layers, PackagePlus, Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import Modal from "../components/Modal";
import SellPackageDialog from "../components/SellPackageDialog";
import { Badge, Button, Card, EmptyState, Segmented, StatCard } from "../components/ui";
import { formatAmount, formatCount, toNumber } from "../components/format";
import { paymentMethodLabel } from "../components/labels";
import { formatBookingDate } from "../context/functions";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

const STATUS = { active: "Active", used: "Used up", expired: "Expired", void: "Cancelled" };
const TABS = [
  { key: "sold", label: "Clients' packages", icon: Users },
  { key: "catalog", label: "Packages for sale", icon: Layers },
];

/** Manage → Packages: prepaid bundles of sessions, and who has sessions left. */
export default function Packages() {
  const { isManager } = useSession();
  const [tab, setTab] = useState("sold");
  const [selling, setSelling] = useState(false);
  const [reload, setReload] = useState(0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmented options={TABS} value={tab} onChange={setTab} />
        <Button type="button" onClick={() => setSelling(true)}>
          <PackagePlus size={15} /> Sell a package
        </Button>
      </div>
      {tab === "sold" ? <SoldPackages key={reload} isManager={isManager} /> : <Catalog isManager={isManager} />}
      {selling && (
        <SellPackageDialog
          onClose={() => setSelling(false)}
          onSold={() => {
            setSelling(false);
            setTab("sold");
            setReload((n) => n + 1);
          }}
        />
      )}
    </div>
  );
}

function SoldPackages({ isManager }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("active");
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    const q = new URLSearchParams({ ...(status && { status }), ...(search.trim() && { search: search.trim() }) });
    const res = await fetchWithLoading(`${constanst.API_URL}/packages/sold?${q}`);
    if (res.ok) setData((await res.json()).data);
  }, [fetchWithLoading, status, search]);

  useEffect(() => {
    const timer = setTimeout(load, search ? 300 : 0);
    return () => clearTimeout(timer);
  }, [load, search]);

  const show = async (id) => {
    const res = await fetchWithLoading(`${constanst.API_URL}/packages/sold/${id}`);
    if (res.ok) setOpen((await res.json()).data);
  };

  const cancel = async () => {
    if (!window.confirm(`Cancel “${open.name}” for ${open.client_name}? Sessions left can no longer be used. Refund the client separately if needed.`)) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/packages/sold/${open.id}/void`, { method: "POST" });
    if (!res.ok) return;
    addToast({ message: "Package cancelled", type: "success" });
    setOpen(null);
    load();
  };

  if (!data) return null;
  return (
    <>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Active packages" value={formatCount(data.totals.active)} icon={Layers} accent />
        <StatCard label="Sessions still to use" value={formatCount(data.totals.sessions_left)} icon={Users} />
        <StatCard label="Sold this month" value={formatAmount(data.totals.sold_this_month)} icon={PackagePlus} />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 focus-within:border-[var(--color-accent)]">
            <Search size={15} className="text-[var(--color-faint)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search client or package" className="flex-1 bg-transparent text-[13px] outline-none" />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-[13px]">
            <option value="active">Active</option>
            <option value="used">Used up</option>
            <option value="expired">Expired</option>
            <option value="void">Cancelled</option>
            <option value="">All</option>
          </select>
        </div>
        {data.packages.length === 0 ? (
          <EmptyState icon={Layers} title="No packages here">Sell one with “Sell a package”. Sessions are used at checkout.</EmptyState>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {data.packages.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => show(p.id)} className="card-in w-full rounded-2xl border border-[var(--color-border)] p-4 text-left transition-[translate,box-shadow,border-color] hover:-translate-y-0.5 hover:border-[var(--color-accent)]/50 hover:shadow-[var(--shadow-card)]">
                  <div className="flex items-start justify-between gap-2">
                    <span>
                      <span className="block text-[14px] font-semibold">{p.client_name}</span>
                      <span className="block text-[12.5px] text-[var(--color-muted)]">{p.name}</span>
                    </span>
                    <Badge>{STATUS[p.status]}</Badge>
                  </div>
                  <div className="mt-3 space-y-2">
                    {p.items.map((i) => (
                      <SessionBar key={i.id} item={i} />
                    ))}
                  </div>
                  <p className="mt-3 text-[11.5px] text-[var(--color-faint)]">
                    Bought {formatBookingDate(p.created_at)}
                    {p.expires_on ? ` · use by ${formatBookingDate(p.expires_on)}` : ""}
                  </p>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {open && (
        <Modal
          title={open.name}
          subtitle={`${open.client_name} · ${formatAmount(open.price)} by ${paymentMethodLabel(open.payment_method)}`}
          onClose={() => setOpen(null)}
          footer={
            isManager && open.status !== "void" && (
              <div className="flex justify-end">
                <Button type="button" variant="ghost" onClick={cancel}>Cancel package</Button>
              </div>
            )
          }
        >
          <div className="space-y-3">
            {open.items.map((i) => (
              <SessionBar key={i.id} item={i} />
            ))}
          </div>
          <p className="mt-4 text-[12.5px] text-[var(--color-muted)]">
            Sold {formatBookingDate(open.created_at)}
            {open.sold_by_name ? ` by ${open.sold_by_name}` : ""}
            {open.location_name ? ` at ${open.location_name}` : ""}
            {open.expires_on ? `. Use by ${formatBookingDate(open.expires_on)}.` : "."}
          </p>
          <h3 className="mb-2 mt-5 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">Visits</h3>
          {open.visits.length === 0 ? (
            <p className="text-[13px] text-[var(--color-faint)]">No sessions used yet.</p>
          ) : (
            <ul className="divide-y divide-[var(--color-border-soft)] text-[13px]">
              {open.visits.map((v, i) => (
                <li key={i} className="flex justify-between py-2">
                  <a href={`/bookings/${v.booking_id}`} className="font-medium text-[var(--color-accent)] hover:underline">
                    {v.service_name}
                  </a>
                  <span className="text-[var(--color-muted)]">{formatBookingDate(v.booking_date)}</span>
                </li>
              ))}
            </ul>
          )}
        </Modal>
      )}
    </>
  );
}

/** "Haircut  ███░░  1 of 3 left" */
function SessionBar({ item }) {
  const left = item.quantity - item.used;
  return (
    <div className="text-[12.5px]">
      <div className="mb-1 flex justify-between">
        <span>{item.service_name}</span>
        <span className={left ? "font-semibold" : "text-[var(--color-faint)]"}>
          {left} of {item.quantity} left
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-[var(--color-panel-alt)]">
        <div className="h-full rounded-full bg-[var(--color-accent)] transition-[width] duration-700" style={{ width: `${(left / item.quantity) * 100}%` }} />
      </div>
    </div>
  );
}

function Catalog({ isManager }) {
  const { fetchWithLoading } = useApi();
  const [packages, setPackages] = useState(null);
  const [editing, setEditing] = useState(null);

  const load = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/packages`);
    if (res.ok) setPackages((await res.json()).data);
  }, [fetchWithLoading]);

  useEffect(() => {
    load();
  }, [load]);

  if (!packages) return null;
  return (
    <>
      {isManager && (
        <div className="flex justify-end">
          <Button type="button" variant="ghost" onClick={() => setEditing({})}>
            <Plus size={14} /> New package
          </Button>
        </div>
      )}
      {packages.length === 0 ? (
        <Card className="p-5">
          <EmptyState icon={Layers} title="No packages yet">
            Bundle sessions at a better price, e.g. “5 haircuts for the price of 4”. Clients pay once and use them on later visits.
          </EmptyState>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {packages.map((p) => (
            <Card key={p.id} className={`p-5 ${p.is_active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <h3 className="font-display text-[17px] font-medium">{p.name}</h3>
                {!p.is_active && <Badge>Inactive</Badge>}
              </div>
              {p.description && <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">{p.description}</p>}
              <ul className="mt-3 space-y-1 text-[13px]">
                {p.items.map((i) => (
                  <li key={i.service_id} className="flex justify-between">
                    <span>
                      {i.quantity}× {i.service_name}
                    </span>
                    <span className="tabular-nums text-[var(--color-faint)]">{formatAmount(i.quantity * i.unit_price)}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex items-end justify-between border-t border-[var(--color-border-soft)] pt-3">
                <span>
                  <span className="block text-[20px] font-semibold">{formatAmount(p.price)}</span>
                  {p.saving > 0 && <span className="text-[12px] font-medium text-[var(--color-green)]">Saves {formatAmount(p.saving)} ({Math.round((p.saving / p.value) * 100)}%)</span>}
                </span>
                {isManager && (
                  <Button type="button" variant="ghost" onClick={() => setEditing(p)}>
                    <Pencil size={13} /> Edit
                  </Button>
                )}
              </div>
              <p className="mt-2 text-[11.5px] text-[var(--color-faint)]">{p.valid_days ? `Use within ${p.valid_days} days` : "No expiry"}</p>
            </Card>
          ))}
        </div>
      )}
      {editing && (
        <PackageEditor
          pkg={editing}
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

function PackageEditor({ pkg, onClose, onSaved }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const [services, setServices] = useState([]);
  const [form, setForm] = useState({
    name: pkg.name || "",
    description: pkg.description || "",
    price: pkg.price !== undefined ? String(pkg.price) : "",
    valid_days: pkg.valid_days ? String(pkg.valid_days) : "",
    is_active: pkg.is_active === undefined ? true : Boolean(pkg.is_active),
    items: pkg.items?.map((i) => ({ service_id: i.service_id, quantity: i.quantity })) || [{ service_id: "", quantity: 5 }],
  });

  useEffect(() => {
    fetchWithLoading(`${constanst.API_URL}/services?limit=500`, { silent: true }).then(async (res) => {
      if (res.ok) setServices((await res.json()).data.filter((s) => s.is_active !== 0));
    });
  }, [fetchWithLoading]);

  const priceOf = (id) => toNumber(services.find((s) => s.id === Number(id))?.price);
  const value = form.items.reduce((sum, i) => sum + priceOf(i.service_id) * toNumber(i.quantity), 0);
  const saving = value - toNumber(form.price);
  const setItem = (index, patch) => setForm((f) => ({ ...f, items: f.items.map((x, j) => (j === index ? { ...x, ...patch } : x)) }));
  const valid = form.name.trim() && form.price !== "" && form.items.length && form.items.every((i) => i.service_id && toNumber(i.quantity) > 0);

  const save = async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/packages${pkg.id ? `/${pkg.id}` : ""}`, {
      method: pkg.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        price: toNumber(form.price),
        valid_days: form.valid_days ? toNumber(form.valid_days) : null,
        is_active: form.is_active,
        items: form.items.map((i) => ({ service_id: Number(i.service_id), quantity: toNumber(i.quantity) })),
      }),
    });
    if (!res.ok) return;
    addToast({ message: "Package saved", type: "success" });
    onSaved();
  };

  // Width is set per field: the service picker fills the row, the quantity box stays narrow.
  const field = "rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-accent)]";
  const input = `w-full ${field}`;
  return (
    <Modal
      title={pkg.id ? "Edit package" : "New package"}
      subtitle="Changes apply to packages sold from now on."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={save} disabled={!valid}>Save package</Button>
        </div>
      }
    >
      <div className="space-y-4 text-[13px]">
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium">Name</span>
          <input autoFocus value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. 5 haircuts" className={input} />
        </label>
        <div>
          <span className="mb-1 block text-[12px] font-medium">Sessions</span>
          <div className="space-y-2">
            {form.items.map((item, i) => (
              <div key={i} className="flex items-center gap-2">
                <select value={item.service_id} onChange={(e) => setItem(i, { service_id: e.target.value })} className={`${field} min-w-0 flex-1`} aria-label={`Service ${i + 1}`}>
                  <option value="">Choose a service</option>
                  {services
                    .filter((s) => s.id === Number(item.service_id) || !form.items.some((x) => Number(x.service_id) === s.id))
                    .map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name} · {formatAmount(s.price)}
                      </option>
                    ))}
                </select>
                <input type="number" min="1" max="100" aria-label={`Sessions ${i + 1}`} value={item.quantity} onChange={(e) => setItem(i, { quantity: e.target.value })} className={`${field} w-20 shrink-0 text-center`} />
                {form.items.length > 1 && (
                  <button type="button" aria-label="Remove" onClick={() => setForm((f) => ({ ...f, items: f.items.filter((_, j) => j !== i) }))} className="rounded-md p-1 text-[var(--color-faint)] hover:text-[var(--color-red)]">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
            ))}
          </div>
          <button type="button" onClick={() => setForm((f) => ({ ...f, items: [...f.items, { service_id: "", quantity: 1 }] }))} className="mt-2 text-[12.5px] font-medium text-[var(--color-accent)]">
            + Add a service
          </button>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium">Price</span>
            <input type="number" min="0" value={form.price} onChange={(e) => setForm((f) => ({ ...f, price: e.target.value }))} className={input} />
          </label>
          <label className="block">
            <span className="mb-1 block text-[12px] font-medium">Use within (days)</span>
            <input type="number" min="1" placeholder="No limit" value={form.valid_days} onChange={(e) => setForm((f) => ({ ...f, valid_days: e.target.value }))} className={input} />
          </label>
        </div>
        {value > 0 && (
          <p className={`rounded-xl px-3 py-2 ${saving > 0 ? "bg-[var(--color-green)]/10 text-[var(--color-green)]" : "bg-[var(--color-panel-alt)] text-[var(--color-muted)]"}`}>
            Worth {formatAmount(value)} at menu prices{saving > 0 ? ` · clients save ${formatAmount(saving)} (${Math.round((saving / value) * 100)}%)` : ""}.
          </p>
        )}
        <label className="block">
          <span className="mb-1 block text-[12px] font-medium">Description (optional)</span>
          <input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} className={input} />
        </label>
        <label className="flex items-center gap-2">
          <input type="checkbox" checked={form.is_active} onChange={(e) => setForm((f) => ({ ...f, is_active: e.target.checked }))} className="accent-[var(--color-accent)]" />
          For sale
        </label>
      </div>
    </Modal>
  );
}
