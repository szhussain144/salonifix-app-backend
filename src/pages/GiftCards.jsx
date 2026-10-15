import { useCallback, useEffect, useState } from "react";
import { Gift, Mail, MessageCircle, Plus, Search, Wallet } from "lucide-react";
import Modal from "../components/Modal";
import { Badge, Button, Card, EmptyState, Input, Select, StatCard, Textarea } from "../components/ui";
import { formatCount, formatMoney } from "../components/format";
import { CHECKOUT_METHODS, forRegion, paymentMethodLabel } from "../components/labels";
import { formatBookingDate } from "../context/functions";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

const STATUS = { active: "Active", used: "Used up", void: "Cancelled" };
const saleMethods = () => [...forRegion(CHECKOUT_METHODS).filter(([k]) => k !== "gift_card"), ["free", "Free (a gift from us)"]];
const AMOUNTS = [1000, 2000, 5000, 10000];
const EMPTY = { amount: "", payment_method: "cash", buyer_name: "", buyer_phone: "", recipient_name: "", recipient_phone: "", recipient_email: "", message: "", expires_on: "", sendEmail: false, sendWhatsapp: false };

/** Gift cards: sell one, send it to the recipient, check balances and history. */
export default function GiftCards() {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { business, isManager } = useSession();
  const money = (v) => formatMoney(v, business?.currency || "PKR");
  const [data, setData] = useState(null);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [form, setForm] = useState(null);
  const [open, setOpen] = useState(null);

  const load = useCallback(async () => {
    const q = new URLSearchParams();
    if (search.trim()) q.set("search", search.trim());
    if (status) q.set("status", status);
    const res = await fetchWithLoading(`${constanst.API_URL}/gift-cards?${q}`);
    if (res.ok) setData((await res.json()).data);
  }, [fetchWithLoading, search, status]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const openCard = async (id) => {
    const res = await fetchWithLoading(`${constanst.API_URL}/gift-cards/${id}`);
    if (res.ok) setOpen((await res.json()).data);
  };

  const sell = async (e) => {
    e?.preventDefault();
    const send = [form.sendEmail && "email", form.sendWhatsapp && "whatsapp"].filter(Boolean);
    const body = Object.fromEntries(Object.entries({ ...form, amount: Number(form.amount), send }).filter(([k, v]) => !["sendEmail", "sendWhatsapp"].includes(k) && v !== ""));
    const res = await fetchWithLoading(`${constanst.API_URL}/gift-cards`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return;
    const { data: card, message } = await res.json();
    const failed = card.sent.filter((s) => !s.ok);
    addToast({ message: failed.length ? `${message}. Not sent: ${failed.map((f) => f.error).join(", ")}` : message, type: failed.length ? "error" : "success", duration: 6000 });
    setForm(null);
    setOpen(card);
    load();
  };

  const send = async (channel) => {
    const res = await fetchWithLoading(`${constanst.API_URL}/gift-cards/${open.id}/send`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ channel }) });
    if (!res.ok) return;
    const body = await res.json();
    addToast({ message: body.message, type: body.data.ok ? "success" : "error" });
  };

  const cancel = async () => {
    if (!window.confirm(`Cancel ${open.code}? Its ${money(open.balance)} balance can no longer be spent.`)) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/gift-cards/${open.id}/void`, { method: "POST" });
    if (!res.ok) return;
    setOpen((await res.json()).data);
    load();
  };

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const t = data?.totals;

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        <StatCard label="Unspent balance" value={money(t?.outstanding ?? 0)} sub={<span className="text-[11.5px] text-[var(--color-faint)]">owed to card holders</span>} icon={Wallet} accent />
        <StatCard label="Active cards" value={formatCount(t?.active ?? 0)} icon={Gift} />
        <StatCard label="Sold this month" value={money(t?.sold_this_month ?? 0)} icon={Gift} />
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex min-w-[220px] flex-1 items-center gap-2 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 focus-within:border-[var(--color-accent)]">
            <Search size={15} className="text-[var(--color-faint)]" />
            <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search code, name or phone" className="w-full bg-transparent text-[13px] outline-none" />
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status" className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-[13px]">
            <option value="">All cards</option>
            {Object.entries(STATUS).map(([k, l]) => <option key={k} value={k}>{l}</option>)}
          </select>
          <Button type="button" onClick={() => setForm({ ...EMPTY })}><Plus size={14} /> Sell a gift card</Button>
        </div>

        {data && data.cards.length === 0 ? (
          <EmptyState icon={Gift} title={search || status ? "No gift cards match" : "No gift cards yet"}>
            Gift cards bring money in up front and new clients through the door. Sell one, and it can be spent at checkout.
          </EmptyState>
        ) : (
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full min-w-[720px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">
                  <th className="pb-2.5 pr-4">Code</th>
                  <th className="pb-2.5 pr-4">For</th>
                  <th className="pb-2.5 pr-4">Sold</th>
                  <th className="pb-2.5 pr-4 text-right">Value</th>
                  <th className="pb-2.5 pr-4 text-right">Balance</th>
                  <th className="pb-2.5">Status</th>
                </tr>
              </thead>
              <tbody>
                {(data?.cards || []).map((c) => (
                  <tr key={c.id} onClick={() => openCard(c.id)} className="cursor-pointer border-b border-[var(--color-border-soft)] last:border-none hover:bg-[var(--color-panel-alt)]">
                    <td className="py-2.5 pr-4 font-mono font-semibold">{c.code}</td>
                    <td className="py-2.5 pr-4">
                      {c.recipient_name || c.buyer_name || "—"}
                      {c.buyer_name && c.recipient_name && <span className="block text-[11.5px] text-[var(--color-faint)]">from {c.buyer_name}</span>}
                    </td>
                    <td className="py-2.5 pr-4 text-[var(--color-muted)]">{formatBookingDate(c.created_at).replace(/ \d+:\d+ [ap]m$/, "")}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{money(c.initial_amount)}</td>
                    <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">{money(c.balance)}</td>
                    <td className="py-2.5"><Badge>{c.expired && c.status === "active" ? "Expired" : STATUS[c.status]}</Badge></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {form && (
        <Modal
          title="Sell a gift card"
          subtitle="The code can be spent at checkout, in one go or bit by bit."
          onClose={() => setForm(null)}
          footer={
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="button" onClick={sell} disabled={!(Number(form.amount) > 0)}>Create {Number(form.amount) > 0 ? money(form.amount) : ""} gift card</Button>
            </div>
          }
        >
          <form onSubmit={sell} className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <p className="mb-1.5 text-[12px] font-medium">Value</p>
              <div className="flex flex-wrap items-center gap-2">
                {AMOUNTS.map((a) => (
                  <button key={a} type="button" onClick={() => setForm((f) => ({ ...f, amount: String(a) }))} className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium ${Number(form.amount) === a ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "border-[var(--color-border)]"}`}>
                    {money(a)}
                  </button>
                ))}
                <input type="number" min="1" aria-label="Other amount" placeholder="Other amount" value={form.amount} onChange={set("amount")} className="w-36 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-accent)]" />
              </div>
            </div>
            <Select label="Paid by" value={form.payment_method} onChange={set("payment_method")}>
              {saleMethods().map(([value, label]) => ({ value, label }))}
            </Select>
            <Input label="Expires on (optional)" type="date" value={form.expires_on} onChange={set("expires_on")} />
            <Input label="Bought by" placeholder="Name" value={form.buyer_name} onChange={set("buyer_name")} />
            <Input label="Buyer's phone" value={form.buyer_phone} onChange={set("buyer_phone")} />
            <Input label="For (recipient)" placeholder="Name" value={form.recipient_name} onChange={set("recipient_name")} />
            <Input label="Recipient's phone" value={form.recipient_phone} onChange={set("recipient_phone")} />
            <div className="sm:col-span-2"><Input label="Recipient's email" type="email" value={form.recipient_email} onChange={set("recipient_email")} /></div>
            <div className="sm:col-span-2"><Textarea label="Message (optional)" rows={2} placeholder="Happy birthday!" value={form.message} onChange={set("message")} /></div>
            <div className="flex flex-wrap gap-4 text-[13px] sm:col-span-2">
              <label className={`flex items-center gap-2 ${form.recipient_email ? "" : "opacity-50"}`}><input type="checkbox" disabled={!form.recipient_email} checked={form.sendEmail} onChange={set("sendEmail")} className="accent-[var(--color-accent)]" /> Email it to the recipient</label>
              <label className={`flex items-center gap-2 ${form.recipient_phone ? "" : "opacity-50"}`}><input type="checkbox" disabled={!form.recipient_phone} checked={form.sendWhatsapp} onChange={set("sendWhatsapp")} className="accent-[var(--color-accent)]" /> WhatsApp it to the recipient</label>
            </div>
          </form>
        </Modal>
      )}

      {open && (
        <Modal title={open.code} subtitle={`${STATUS[open.status]}${open.expires_on ? ` · expires ${open.expires_on}` : ""}`} onClose={() => setOpen(null)}>
          <div className="mb-4 rounded-2xl bg-[var(--color-accent-soft)] p-5 text-center">
            <p className="text-[12px] text-[var(--color-muted)]">Balance</p>
            <p className="font-display text-[32px] font-medium">{money(open.balance)}</p>
            <p className="text-[12px] text-[var(--color-muted)]">of {money(open.initial_amount)} · paid by {paymentMethodLabel(open.payment_method)}</p>
          </div>
          <dl className="mb-4 grid grid-cols-2 gap-2 text-[13px]">
            <dt className="text-[var(--color-muted)]">Bought by</dt><dd>{open.buyer_name || "—"} {open.buyer_phone && <span className="text-[var(--color-faint)]">{open.buyer_phone}</span>}</dd>
            <dt className="text-[var(--color-muted)]">For</dt><dd>{open.recipient_name || "—"} {open.recipient_phone && <span className="text-[var(--color-faint)]">{open.recipient_phone}</span>}</dd>
            {open.message && (<><dt className="text-[var(--color-muted)]">Message</dt><dd>“{open.message}”</dd></>)}
            <dt className="text-[var(--color-muted)]">Sold</dt><dd>{formatBookingDate(open.created_at)}{open.sold_by_name ? ` by ${open.sold_by_name}` : ""}{open.location_name ? ` · ${open.location_name}` : ""}</dd>
          </dl>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">History</p>
          <ul className="mb-4 space-y-1 text-[13px]">
            {open.transactions.map((x) => (
              <li key={x.id} className="flex justify-between gap-3">
                <span>{{ issue: "Issued", redeem: "Spent", void: "Cancelled" }[x.kind]} · <span className="text-[var(--color-faint)]">{formatBookingDate(x.created_at)}{x.user_name ? ` · ${x.user_name}` : ""}</span></span>
                <span className={`tabular-nums ${x.amount < 0 ? "text-[var(--color-red)]" : "text-[var(--color-green)]"}`}>{x.amount > 0 ? "+" : "−"}{money(Math.abs(x.amount))}</span>
              </li>
            ))}
          </ul>
          {open.status === "active" && (
            <div className="flex flex-wrap gap-2">
              {open.recipient_email && <Button type="button" variant="ghost" onClick={() => send("email")}><Mail size={14} /> Email it</Button>}
              {open.recipient_phone && <Button type="button" variant="ghost" onClick={() => send("whatsapp")}><MessageCircle size={14} /> WhatsApp it</Button>}
              {isManager && <Button type="button" variant="ghost" onClick={cancel}>Cancel card</Button>}
            </div>
          )}
        </Modal>
      )}
    </div>
  );
}
