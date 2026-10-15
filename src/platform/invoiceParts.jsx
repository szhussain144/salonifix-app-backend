import { useEffect, useState } from "react";
import { Check, Mail, Send, X } from "lucide-react";
import Modal from "../components/Modal";
import { Button, Input, Select } from "../components/ui";
import { money, shortDate, usePlatformApi } from "./platformApi";

const today = () => new Date().toISOString().slice(0, 10);
const inDays = (n) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
};

/** Paid / Pending / Overdue / Void, as a pill. */
export function InvoiceStatus({ invoice: i }) {
  const overdue = i.status === "pending" && i.due_on && i.due_on < today();
  const [label, tone] = overdue
    ? ["Overdue", "bg-[var(--color-red)]/10 text-[var(--color-red)]"]
    : {
        paid: ["Paid", "bg-[var(--color-green)]/12 text-[var(--color-green)]"],
        pending: ["Pending", "bg-[var(--color-orange)]/12 text-[var(--color-orange)]"],
        failed: ["Failed", "bg-[var(--color-red)]/10 text-[var(--color-red)]"],
        void: ["Void", "bg-[var(--color-panel-alt)] text-[var(--color-muted)]"],
      }[i.status] || [i.status, ""];
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{label}</span>;
}

/** Amount, and when it was emailed. */
export function InvoiceSummary({ invoice: i }) {
  return (
    <span className="block">
      <span className="block text-[13.5px] font-semibold">{money(i.amount_cents / 100, i.currency)}</span>
      <span className="block text-[11.5px] text-[var(--color-muted)]">
        {i.sent_at ? `Emailed ${shortDate(i.sent_at)}` : "Not emailed"}
        {i.due_on ? ` · due ${shortDate(i.due_on)}` : ""}
      </span>
    </span>
  );
}

/** Email, mark paid, void: what can still be done with an open invoice. */
export function InvoiceActions({ invoice: i, onChange }) {
  const api = usePlatformApi();
  const open = i.status === "pending" || i.status === "failed";
  const act = async (path, confirm) => {
    if (confirm && !window.confirm(confirm)) return;
    const r = await api(`/invoices/${i.id}/${path}`, { method: "POST" });
    if (r.ok) onChange?.(r.data, r.message);
  };
  if (!open) return null;
  return (
    <span className="flex justify-end gap-1.5">
      <Button variant="ghost" className="px-3 py-1.5 text-[12px]" onClick={() => act("send")} title="Email the invoice to the owner">
        {i.sent_at ? <Send size={13} /> : <Mail size={13} />} {i.sent_at ? "Resend" : "Email"}
      </Button>
      <Button
        variant="ghost"
        className="px-3 py-1.5 text-[12px]"
        onClick={() => act("paid", `Mark invoice #${i.id} (${money(i.amount_cents / 100, i.currency)}) as paid?${i.plan ? ` ${i.business_name} moves to the ${i.plan[0].toUpperCase()}${i.plan.slice(1)} plan.` : ""}`)}
      >
        <Check size={13} /> Paid
      </Button>
      <Button variant="ghost" className="px-3 py-1.5 text-[12px]" aria-label={`Void invoice ${i.id}`} onClick={() => act("void", `Void invoice #${i.id}? It can't be paid after this.`)}>
        <X size={13} />
      </Button>
    </span>
  );
}

/**
 * New invoice: bill a plan (price filled in for the salon's currency) or anything else
 * (setup, training…). With `business` set the salon is fixed; otherwise pick one.
 */
export function NewInvoiceDialog({ business, onClose, onCreated }) {
  const api = usePlatformApi();
  const [businessId, setBusinessId] = useState(business ? String(business.business.id) : "");
  const [options, setOptions] = useState([]);
  const [prices, setPrices] = useState(business?.prices || null);
  const [kind, setKind] = useState("growth");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [due, setDue] = useState(inDays(7));
  const [send, setSend] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (business) return;
    api("/businesses?limit=100&sort=name").then((r) => r.ok && setOptions(r.data.businesses));
  }, [api, business]);

  // Plan prices follow the chosen salon's currency.
  useEffect(() => {
    if (business || !businessId) return;
    api(`/businesses/${businessId}`).then((r) => r.ok && setPrices(r.data.prices));
  }, [api, business, businessId]);

  const price = prices?.find((p) => p.key === kind);
  const currency = business?.business?.currency || options.find((o) => String(o.id) === businessId)?.currency || "PKR";
  const custom = kind === "custom";
  const ready = businessId && (custom ? description.trim() && Number(amount) > 0 : price);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    const body = custom
      ? { business_id: Number(businessId), description: description.trim(), amount: Number(amount), currency, due_on: due || undefined, send }
      : { business_id: Number(businessId), plan: kind, due_on: due || undefined, send };
    const r = await api("/invoices", { method: "POST", body });
    setBusy(false);
    if (r.ok) onCreated(r.data, r.message);
  };

  return (
    <Modal
      title="New invoice"
      subtitle={business ? business.business.name : "Bill a salon for a plan or anything else"}
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button variant="ghost" type="button" onClick={onClose}>Cancel</Button>
          <Button type="submit" form="new-invoice" disabled={!ready || busy}>
            {send ? "Create and email" : "Create invoice"}
          </Button>
        </div>
      }
    >
      <form id="new-invoice" onSubmit={submit} className="space-y-4">
        {!business && (
          <Select label="Salon" value={businessId} onChange={(e) => setBusinessId(e.target.value)} required>
            {[{ value: "", label: "Choose a salon" }, ...options.map((o) => ({ value: String(o.id), label: `${o.name} · ${o.owner_email}` }))]}
          </Select>
        )}
        <div>
          <span className="mb-1.5 block text-[12px] font-medium text-[var(--color-ink-2)]">What for</span>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[...(prices || []).map((p) => ({ key: p.key, label: p.name, sub: `${money(p.amount, p.currency)}/mo` })), { key: "custom", label: "Something else", sub: "Your amount" }].map((o) => (
              <button
                key={o.key}
                type="button"
                aria-pressed={kind === o.key}
                onClick={() => setKind(o.key)}
                className={`rounded-xl border p-2.5 text-left transition-colors ${kind === o.key ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"}`}
              >
                <span className="block text-[13px] font-semibold">{o.label}</span>
                <span className="block text-[11.5px] text-[var(--color-muted)]">{o.sub}</span>
              </button>
            ))}
          </div>
          {!custom && price && <p className="mt-2 text-[12px] text-[var(--color-muted)]">When it&apos;s paid, the salon moves to {price.name} for a month.</p>}
        </div>
        {custom && (
          <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
            <Input label="Description" placeholder="e.g. Setup and staff training" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={255} />
            <Input label={`Amount (${currency})`} type="number" min="0.01" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          <Input label="Due" type="date" min={today()} value={due} onChange={(e) => setDue(e.target.value)} />
          <label className="flex items-center gap-2 self-end pb-2.5 text-[13px]">
            <input type="checkbox" checked={send} onChange={(e) => setSend(e.target.checked)} className="accent-[var(--color-accent)]" />
            Email it to the owner now
          </label>
        </div>
      </form>
    </Modal>
  );
}
