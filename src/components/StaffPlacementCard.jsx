import { useCallback, useEffect, useState } from "react";
import { ArrowRightLeft, MapPin, Percent, Wallet } from "lucide-react";
import { Button, Card, Input, Select, SectionTitle } from "./ui";
import { formatDay, formatMoney, todayISO } from "./format";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

/**
 * Where a staff member works, their salary, and the history of transfers and salary
 * changes. Owners and admins can transfer them (the salary moves with them).
 */
export default function StaffPlacementCard({ staff, onChanged }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { activeLocations, business, isManager } = useSession();
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState(null);
  const currency = business?.currency || "PKR";

  const loadHistory = useCallback(async () => {
    if (!staff?.id || !isManager) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/staff/${staff.id}/assignments`);
    if (res.ok) setHistory((await res.json()).data);
  }, [fetchWithLoading, staff?.id, isManager]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  if (!staff || !isManager) return null;

  const openForm = () =>
    setForm({
      location_id: String(staff.location_id),
      monthly_salary: staff.monthly_salary != null ? String(Number(staff.monthly_salary)) : "",
      effective_date: todayISO(),
      note: "",
    });

  const submit = async (e) => {
    e.preventDefault();
    const payload = { effective_date: form.effective_date };
    if (Number(form.location_id) !== staff.location_id) payload.location_id = Number(form.location_id);
    if (form.monthly_salary !== "") payload.monthly_salary = Number(form.monthly_salary);
    if (form.note.trim()) payload.note = form.note.trim();

    const res = await fetchWithLoading(`${constanst.API_URL}/staff/${staff.id}/transfer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return; // reason shown by the API layer (e.g. upcoming bookings)
    addToast({ message: (await res.json()).message, type: "success" });
    setForm(null);
    loadHistory();
    onChanged?.();
  };

  const moving = form && Number(form.location_id) !== staff.location_id;

  return (
    <Card className="p-5">
      <SectionTitle
        title="Location & salary"
        action={!form && (
          <Button variant="ghost" type="button" onClick={openForm}>
            <ArrowRightLeft size={14} /> Transfer
          </Button>
        )}
      />

      <div className="space-y-2.5 text-[13px]">
        <div className="flex items-center gap-2.5">
          <MapPin size={14} className="text-[var(--color-accent)]" />
          <span>Works at <b>{staff.location_name}</b></span>
        </div>
        <div className="flex items-center gap-2.5">
          <Wallet size={14} className="text-[var(--color-accent)]" />
          <span>
            {staff.monthly_salary != null ? <><b>{formatMoney(staff.monthly_salary, currency)}</b> / month</> : "No salary set"}
          </span>
        </div>
        <CommissionRow staff={staff} onChanged={onChanged} />
      </div>

      {form && (
        <form onSubmit={submit} className="mt-4 space-y-3 rounded-xl border border-[var(--color-border)] p-4">
          <Select label="Location" value={form.location_id} onChange={(e) => setForm((f) => ({ ...f, location_id: e.target.value }))}>
            {activeLocations.map((l) => ({ value: String(l.id), label: l.id === staff.location_id ? `${l.name} (current)` : l.name }))}
          </Select>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label={`Monthly salary (${currency})`}
              type="number"
              min="0"
              step="500"
              value={form.monthly_salary}
              onChange={(e) => setForm((f) => ({ ...f, monthly_salary: e.target.value }))}
            />
            <Input
              label="Effective from"
              type="date"
              max={todayISO()}
              required
              value={form.effective_date}
              onChange={(e) => setForm((f) => ({ ...f, effective_date: e.target.value }))}
            />
          </div>
          <Input label="Note (optional)" placeholder="e.g. Covering the new branch" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          <p className="text-[12px] text-[var(--color-muted)]">
            {moving
              ? "Their salary moves with them. Bookings at the current branch from this date must be reassigned first."
              : "Change the salary, or pick another location to transfer them."}
          </p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancel</Button>
            <Button type="submit">{moving ? "Transfer" : "Save salary"}</Button>
          </div>
        </form>
      )}

      {history.length > 0 && (
        <div className="mt-5">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">History</p>
          <ol className="space-y-3 border-l border-[var(--color-border)] pl-4">
            {history.map((h) => (
              <li key={h.id} className="relative text-[12.5px]">
                <span className={`absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full ${h.end_date ? "bg-[var(--color-border)]" : "bg-[var(--color-accent)]"}`} />
                <p className="font-medium">
                  {h.location_name}
                  {h.monthly_salary != null && <span className="font-normal text-[var(--color-muted)]"> · {formatMoney(h.monthly_salary, currency)}/mo</span>}
                </p>
                <p className="text-[var(--color-faint)]">
                  {formatDay(h.start_date, { long: true })} – {h.end_date ? formatDay(h.end_date, { long: true }) : "now"}
                  {h.note && ` · ${h.note}`}
                </p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </Card>
  );
}

/** Commission on services done and products sold; added to payslips when payroll runs. */
function CommissionRow({ staff, onChanged }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const [form, setForm] = useState(null);
  const service = Number(staff.service_commission_rate || 0);
  const product = Number(staff.product_commission_rate || 0);

  const save = async (e) => {
    e.preventDefault();
    const res = await fetchWithLoading(`${constanst.API_URL}/staff/${staff.id}/commission`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ service_rate: Number(form.service || 0), product_rate: Number(form.product || 0) }),
    });
    if (!res.ok) return;
    addToast({ message: "Commission saved. It's added to payslips when you run payroll.", type: "success" });
    setForm(null);
    onChanged?.();
  };

  if (form) {
    return (
      <form onSubmit={save} className="space-y-2 rounded-xl border border-[var(--color-border)] p-3">
        <div className="grid grid-cols-2 gap-2">
          <Input label="On services (%)" type="number" min="0" max="100" step="0.5" value={form.service} onChange={(e) => setForm((f) => ({ ...f, service: e.target.value }))} />
          <Input label="On products (%)" type="number" min="0" max="100" step="0.5" value={form.product} onChange={(e) => setForm((f) => ({ ...f, product: e.target.value }))} />
        </div>
        <div className="flex gap-2">
          <Button type="submit">Save</Button>
          <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
        </div>
      </form>
    );
  }
  return (
    <div className="flex items-center gap-2.5">
      <Percent size={14} className="text-[var(--color-accent)]" />
      <span className="flex-1">
        {service || product ? (
          <>Commission <b>{service}%</b> on services · <b>{product}%</b> on products</>
        ) : (
          "No commission"
        )}
      </span>
      <button type="button" onClick={() => setForm({ service: String(service), product: String(product) })} className="text-[12px] font-medium text-[var(--color-accent)] hover:underline">
        Change
      </button>
    </div>
  );
}
