import { useEffect, useMemo, useState } from "react";
import { Crown, Minus, PackageCheck, Plus, Trash2, X } from "lucide-react";
import Modal from "./Modal";
import { Button } from "./ui";
import { formatMoney, toNumber } from "./format";
import { CHECKOUT_METHODS, forRegion } from "./labels";
import GiftCardCode from "./GiftCardCode";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const TIPS = [
  { key: "none", label: "No tip" },
  { key: "5", label: "5%" },
  { key: "10", label: "10%" },
  { key: "custom", label: "Other" },
];
const chip = (on) =>
  `rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
    on ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
  }`;
const numberField =
  "w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-[13px] tabular-nums outline-none focus:border-[var(--color-accent)]";

function Section({ title, children, action }) {
  return (
    <section className="mb-5">
      <div className="mb-2 flex items-center justify-between gap-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

/**
 * Checkout for a visit: products from the shelf, tip, payment (one method, split, or later)
 * and a receipt. Opens from the booking page.
 */
export default function CheckoutDialog({ booking, onClose, onDone }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { business } = useSession();
  const money = (v) => formatMoney(v, business?.currency || "PKR");

  const [bill, setBill] = useState(null);
  const [catalog, setCatalog] = useState([]);
  const [lines, setLines] = useState([]);
  const [tipMode, setTipMode] = useState("none");
  const [customTip, setCustomTip] = useState("");
  const [payLater, setPayLater] = useState(false);
  const [payments, setPayments] = useState([{ method: "cash", amount: "" }]);
  const [receipt, setReceipt] = useState({ email: Boolean(booking.client_email), whatsapp: false });
  const [saving, setSaving] = useState(false);
  // The client's packages and membership, and the sessions chosen to cover lines on this bill.
  const [clientPackages, setClientPackages] = useState([]);
  const [membership, setMembership] = useState(null);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    (async () => {
      const [b, p] = await Promise.all([
        fetchWithLoading(`${constanst.API_URL}/bookings/${booking.id}/bill`, { silent: true }),
        fetchWithLoading(`${constanst.API_URL}/bookings/${booking.id}/products`, { silent: true }),
      ]);
      if (b.ok) {
        const data = (await b.json()).data;
        setBill(data);
        setLines(data.products.map((l) => ({ product_id: l.product_id, name: l.name, quantity: l.quantity, unit_price: l.unit_price, staff_id: l.staff_id ?? "" })));
        if (data.bill.tip > 0) {
          setTipMode("custom");
          setCustomTip(String(data.bill.tip));
        }
      }
      if (p.ok) setCatalog((await p.json()).data.map((x) => ({ ...x, unit_price: toNumber(x.unit_price), in_stock: toNumber(x.in_stock) })));
    })();
  }, [fetchWithLoading, booking.id]);

  useEffect(() => {
    if (!booking.client_id) return;
    fetchWithLoading(`${constanst.API_URL}/packages/client/${booking.client_id}`, { silent: true }).then(async (res) => {
      if (res.ok) setClientPackages((await res.json()).data);
    });
    // Included treatments count only when the visit falls in the membership's paid period.
    const day = String(booking.booking_date || "").slice(0, 10);
    fetchWithLoading(`${constanst.API_URL}/memberships/client/${booking.client_id}`, { silent: true }).then(async (res) => {
      if (!res.ok) return;
      const running = (await res.json()).data.find((m) => ["active", "past_due"].includes(m.status) && day >= m.period_start && day <= m.paid_until);
      setMembership(running || null);
    });
  }, [fetchWithLoading, booking.client_id, booking.booking_date]);

  // Stock available to this bill = shelf + what this bill already holds.
  const stockFor = (productId) => {
    const shelf = catalog.find((c) => c.id === productId)?.in_stock ?? 0;
    const held = bill?.products.filter((l) => l.product_id === productId).reduce((s, l) => s + l.quantity, 0) ?? 0;
    return shelf + held;
  };

  const services = bill?.bill.services ?? toNumber(booking.total_amount);
  // Who can be credited with a product sale: the staff on this visit.
  const sellers = bill ? [...new Map(bill.services.filter((s) => s.staff_id).map((s) => [s.staff_id, { id: s.staff_id, name: s.staff_name }])).values()] : [];
  const productsTotal = round2(lines.reduce((s, l) => s + l.quantity * l.unit_price, 0));
  const tipBase = services + productsTotal;
  const tip = tipMode === "none" ? 0 : tipMode === "custom" ? round2(customTip) : round2((tipBase * Number(tipMode)) / 100);
  const total = round2(services + productsTotal + tip);
  const alreadyPaid = bill?.bill.paid ?? 0;
  const dueBeforeSessions = Math.max(0, round2(total - alreadyPaid));
  const sessionsTotal = Math.min(dueBeforeSessions, round2(sessions.reduce((s, x) => s + x.amount, 0)));
  // What's left for cash, card and the rest after package sessions.
  const toPay = Math.max(0, round2(dueBeforeSessions - sessionsTotal));

  // Lines a session could still cover: a service on the bill with a membership treatment or
  // package session left for it. The membership goes first: unused treatments lapse each period.
  const sessionOffers = (bill?.services ?? []).flatMap((line, index) => {
    if (sessions.some((x) => x.line === index) || alreadyPaid > 0) return [];
    const benefit = membership?.benefits.find((b) => b.service_id === line.service_id);
    if (benefit) {
      const left = benefit.quantity - benefit.used - sessions.filter((x) => x.kind === "membership" && x.item_id === benefit.id).length;
      if (left > 0) return [{ line: index, kind: "membership", item_id: benefit.id, amount: line.price, service: line.name, pkg: membership.name, left, of: benefit.quantity }];
    }
    for (const p of clientPackages) {
      const item = p.items.find((i) => i.service_id === line.service_id);
      if (!item) continue;
      const left = item.quantity - item.used - sessions.filter((x) => x.kind === "package" && x.item_id === item.id).length;
      if (left > 0) return [{ line: index, kind: "package", item_id: item.id, amount: line.price, service: line.name, pkg: p.name, left, of: item.quantity }];
    }
    return [];
  });
  const covering = (kind) => sessions.filter((x) => x.kind === kind).length;
  const coveredLabel = covering("membership") && covering("package") ? "Packages & membership" : covering("membership") ? "Membership" : "Package sessions";

  // One payment row defaults to the whole amount.
  const entered = round2(payments.reduce((s, p) => s + toNumber(p.amount), 0));
  const effectivePayments = useMemo(() => {
    const covered = sessions.map((x) =>
      x.kind === "membership"
        ? { method: "membership", amount: x.amount, membership_benefit_id: x.item_id }
        : { method: "package", amount: x.amount, package_item_id: x.item_id }
    );
    if (payLater) return covered;
    const rows = payments
      .map((p, i) => ({
        method: p.method,
        amount: p.amount === "" && payments.length === 1 && i === 0 ? toPay : toNumber(p.amount),
        ...(p.method === "gift_card" ? { gift_card_code: p.code || "" } : {}),
      }))
      .filter((p) => p.amount > 0);
    // Cash handed over beyond the bill is change, not payment.
    let excess = round2(rows.reduce((s, p) => s + p.amount, 0) - toPay);
    for (let i = rows.length - 1; i >= 0 && excess > 0; i--) {
      if (rows[i].method !== "cash") continue;
      const cut = Math.min(rows[i].amount, excess);
      rows[i].amount = round2(rows[i].amount - cut);
      excess = round2(excess - cut);
    }
    return [...covered, ...rows.filter((p) => p.amount > 0)];
  }, [payLater, payments, toPay, sessions]);
  const paying = round2(effectivePayments.filter((p) => p.method !== "package" && p.method !== "membership").reduce((s, p) => s + p.amount, 0));
  const change = payLater ? 0 : Math.max(0, round2((payments.length === 1 && payments[0].amount === "" ? toPay : entered) - toPay));
  const stillDue = Math.max(0, round2(toPay - paying));
  const overNonCash = !payLater && paying > toPay + 0.005;

  const addProduct = (id) => {
    const product = catalog.find((c) => c.id === Number(id));
    if (!product) return;
    setLines((all) => {
      const existing = all.find((l) => l.product_id === product.id);
      if (existing) return all.map((l) => (l === existing ? { ...l, quantity: Math.min(l.quantity + 1, stockFor(product.id)) } : l));
      // Credited to the person who did the services, when there's one.
      return [...all, { product_id: product.id, name: product.name, quantity: 1, unit_price: product.unit_price, staff_id: sellers.length === 1 ? sellers[0].id : "" }];
    });
  };
  const setQty = (productId, quantity) =>
    setLines((all) => all.map((l) => (l.product_id === productId ? { ...l, quantity: Math.max(1, Math.min(quantity, stockFor(productId))) } : l)));

  const submit = async () => {
    setSaving(true);
    const res = await fetchWithLoading(`${constanst.API_URL}/bookings/${booking.id}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        products: lines.map(({ product_id, quantity, unit_price, staff_id }) => ({ product_id, quantity, unit_price, ...(staff_id ? { staff_id: Number(staff_id) } : {}) })),
        tip,
        payments: effectivePayments,
        send_receipt: Object.entries(receipt).filter(([, on]) => on).map(([ch]) => ch),
      }),
    });
    setSaving(false);
    if (!res.ok) return;
    const body = await res.json();
    addToast({ message: change > 0 ? `${body.message}. Give ${money(change)} change.` : body.message, type: "success", duration: 6000 });
    onDone(body.data);
  };

  const available = catalog.filter((c) => !lines.some((l) => l.product_id === c.id));
  const hasPhone = Boolean(booking.client_phone);

  return (
    <Modal
      title="Checkout"
      subtitle={`${booking.client_name} · ${booking.location_name || ""}`}
      onClose={onClose}
      width="max-w-2xl"
      footer={
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="text-[12.5px] text-[var(--color-muted)]">
            {payLater ? (
              <span>Everything goes on the unpaid list.</span>
            ) : stillDue > 0 ? (
              <span className="text-[var(--color-orange)]">{money(stillDue)} will stay unpaid.</span>
            ) : change > 0 ? (
              <span className="font-semibold text-[var(--color-green)]">Give {money(change)} change</span>
            ) : (
              <span>Paid in full.</span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
            <Button type="button" onClick={submit} disabled={!bill || saving || overNonCash}>
              {payLater
                ? "Complete, pay later"
                : `Complete · ${[
                    covering("membership") ? `${covering("membership")} member treatment${covering("membership") === 1 ? "" : "s"}` : null,
                    covering("package") ? `${covering("package")} package session${covering("package") === 1 ? "" : "s"}` : null,
                    paying > 0 || !sessions.length ? money(paying) : null,
                  ].filter(Boolean).join(" + ")}`}
            </Button>
          </div>
        </div>
      }
    >
      {!bill ? (
        <div className="h-40" />
      ) : (
        <>
          <Section title="Services">
            <ul className="space-y-1.5 text-[13px]">
              {bill.services.map((s, i) => (
                <li key={i} className="flex justify-between gap-3">
                  <span>
                    {s.name}
                    {s.staff_name && <span className="text-[var(--color-faint)]"> · {s.staff_name}</span>}
                  </span>
                  <span className="tabular-nums">{money(s.price)}</span>
                </li>
              ))}
              {bill.discount > 0 && (
                <li className="flex justify-between gap-3 text-[var(--color-green)]">
                  <span>Discount{bill.discount_note ? ` · ${bill.discount_note}` : ""}</span>
                  <span className="tabular-nums">– {money(bill.discount)}</span>
                </li>
              )}
            </ul>
          </Section>

          <Section title="Products">
            {lines.length > 0 && (
              <ul className="mb-3 space-y-2">
                {lines.map((l) => (
                  <li key={l.product_id} className="flex items-center gap-3 rounded-xl bg-[var(--color-panel-alt)] px-3 py-2 text-[13px]">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate font-medium">{l.name}</span>
                      {sellers.length > 0 && (
                        <select
                          aria-label={`Sold by, ${l.name}`}
                          value={l.staff_id}
                          onChange={(e) => setLines((all) => all.map((x) => (x === l ? { ...x, staff_id: e.target.value } : x)))}
                          className="mt-0.5 max-w-full bg-transparent text-[11.5px] text-[var(--color-muted)] outline-none"
                        >
                          <option value="">Sold by: no one</option>
                          {sellers.map((s) => <option key={s.id} value={s.id}>Sold by: {s.name}</option>)}
                        </select>
                      )}
                    </span>
                    <span className="flex items-center gap-1">
                      <button type="button" aria-label={`One less ${l.name}`} onClick={() => setQty(l.product_id, l.quantity - 1)} className="rounded-md border border-[var(--color-border)] p-1 hover:border-[var(--color-accent)]"><Minus size={12} /></button>
                      <span className="w-6 text-center tabular-nums">{l.quantity}</span>
                      <button type="button" aria-label={`One more ${l.name}`} disabled={l.quantity >= stockFor(l.product_id)} onClick={() => setQty(l.product_id, l.quantity + 1)} className="rounded-md border border-[var(--color-border)] p-1 hover:border-[var(--color-accent)] disabled:opacity-40"><Plus size={12} /></button>
                    </span>
                    <span className="w-24 text-right tabular-nums">{money(l.quantity * l.unit_price)}</span>
                    <button type="button" aria-label={`Remove ${l.name}`} onClick={() => setLines((all) => all.filter((x) => x !== l))} className="rounded-md p-1 text-[var(--color-faint)] hover:text-[var(--color-red)]"><Trash2 size={14} /></button>
                  </li>
                ))}
              </ul>
            )}
            {catalog.length === 0 ? (
              <p className="text-[12.5px] text-[var(--color-faint)]">No products set up yet.</p>
            ) : (
              <select aria-label="Add a product" value="" onChange={(e) => addProduct(e.target.value)} className={numberField}>
                <option value="">+ Add a product…</option>
                {available.map((c) => (
                  <option key={c.id} value={c.id} disabled={stockFor(c.id) <= 0}>
                    {c.name} · {money(c.unit_price)} · {stockFor(c.id) > 0 ? `${stockFor(c.id)} in stock` : "out of stock"}
                  </option>
                ))}
              </select>
            )}
          </Section>

          <Section title="Tip">
            <div className="flex flex-wrap items-center gap-2">
              {TIPS.map((t) => (
                <button key={t.key} type="button" className={chip(tipMode === t.key)} onClick={() => setTipMode(t.key)}>
                  {t.label}
                  {(t.key === "5" || t.key === "10") && <span className="ml-1 opacity-70">{money((tipBase * Number(t.key)) / 100)}</span>}
                </button>
              ))}
              {tipMode === "custom" && (
                <input type="number" min="0" inputMode="decimal" aria-label="Tip amount" placeholder="Amount" value={customTip} onChange={(e) => setCustomTip(e.target.value)} className={`${numberField} w-32`} />
              )}
            </div>
          </Section>

          <div className="mb-5 rounded-2xl bg-[var(--color-panel-alt)] p-4 text-[13px]">
            <div className="flex justify-between"><span className="text-[var(--color-muted)]">Services</span><span className="tabular-nums">{money(services)}</span></div>
            {productsTotal > 0 && <div className="mt-1 flex justify-between"><span className="text-[var(--color-muted)]">Products</span><span className="tabular-nums">{money(productsTotal)}</span></div>}
            {tip > 0 && <div className="mt-1 flex justify-between"><span className="text-[var(--color-muted)]">Tip</span><span className="tabular-nums">{money(tip)}</span></div>}
            {alreadyPaid > 0 && <div className="mt-1 flex justify-between"><span className="text-[var(--color-muted)]">Already paid</span><span className="tabular-nums">– {money(alreadyPaid)}</span></div>}
            {sessionsTotal > 0 && <div className="mt-1 flex justify-between text-[var(--color-green)]"><span>{coveredLabel}</span><span className="tabular-nums">– {money(sessionsTotal)}</span></div>}
            <div className="mt-2 flex justify-between border-t border-[var(--color-border)] pt-2 text-[16px] font-semibold"><span>To pay</span><span className="tabular-nums">{money(toPay)}</span></div>
          </div>

          {(sessionOffers.length > 0 || sessions.length > 0) && (
            <Section title={membership ? (clientPackages.length ? "Membership & packages" : "Membership") : "Packages"}>
              <div className="space-y-2">
                {sessions.map((x) => (
                  <div key={x.line} className="pop-in flex items-center gap-2.5 rounded-xl border border-[var(--color-green)]/30 bg-[var(--color-green)]/10 px-3 py-2 text-[13px]">
                    {x.kind === "membership" ? <Crown size={16} className="shrink-0 text-[var(--color-green)]" /> : <PackageCheck size={16} className="shrink-0 text-[var(--color-green)]" />}
                    <span className="flex-1">
                      <b>{x.service}</b> covered by “{x.pkg}”{x.kind === "membership" ? " membership" : ""}
                    </span>
                    <span className="tabular-nums">{money(x.amount)}</span>
                    <button type="button" aria-label="Don't use this session" onClick={() => setSessions((all) => all.filter((y) => y.line !== x.line))} className="rounded-md p-1 text-[var(--color-faint)] hover:text-[var(--color-red)]">
                      <X size={14} />
                    </button>
                  </div>
                ))}
                {sessionOffers.map((o) => (
                  <div key={o.line} className="flex items-center gap-2.5 rounded-xl border border-dashed border-[var(--color-border)] px-3 py-2 text-[13px]">
                    {o.kind === "membership" ? <Crown size={16} className="shrink-0 text-[var(--color-accent)]" /> : <PackageCheck size={16} className="shrink-0 text-[var(--color-accent)]" />}
                    <span className="flex-1">
                      {o.kind === "membership" ? `${o.service} · ${o.left} of ${o.of} included this period (${o.pkg})` : `${o.service} · ${o.left} of ${o.of} left in “${o.pkg}”`}
                    </span>
                    <button type="button" onClick={() => setSessions((all) => [...all, o])} className={chip(false)}>
                      {o.kind === "membership" ? "Use membership" : "Use session"}
                    </button>
                  </div>
                ))}
              </div>
            </Section>
          )}

          <Section
            title="Payment"
            action={
              !payLater && (
                <button type="button" onClick={() => setPayments((all) => [...all, { method: all.some((p) => p.method === "pos") ? "cash" : "pos", amount: String(Math.max(0, round2(toPay - entered))) }])} className="text-[12.5px] font-medium text-[var(--color-accent)] hover:underline">
                  + Split between methods
                </button>
              )
            }
          >
            {!payLater &&
              payments.map((p, i) => (
                <div key={i} className="mb-2 flex flex-wrap items-center gap-2">
                  <div className="flex flex-wrap gap-1.5">
                    {forRegion(CHECKOUT_METHODS).map(([key, label]) => (
                      <button key={key} type="button" className={chip(p.method === key)} onClick={() => setPayments((all) => all.map((x, j) => (j === i ? { ...x, method: key } : x)))}>
                        {label}
                      </button>
                    ))}
                  </div>
                  <input
                    type="number"
                    min="0"
                    inputMode="decimal"
                    aria-label={`Amount ${i + 1}`}
                    placeholder={payments.length === 1 ? String(toPay) : "Amount"}
                    value={p.amount}
                    onChange={(e) => setPayments((all) => all.map((x, j) => (j === i ? { ...x, amount: e.target.value } : x)))}
                    className={`${numberField} w-32`}
                  />
                  {p.method === "gift_card" && (
                    <GiftCardCode
                      value={p.code || ""}
                      onChange={(code) => setPayments((all) => all.map((x, j) => (j === i ? { ...x, code } : x)))}
                      onChecked={(balance) =>
                        setPayments((all) => {
                          const others = all.reduce((s, x, j) => s + (j === i ? 0 : toNumber(x.amount)), 0);
                          const amount = Math.max(0, Math.min(balance, round2(toPay - others)));
                          return all.map((x, j) => (j === i ? { ...x, amount: String(amount) } : x));
                        })
                      }
                    />
                  )}
                  {payments.length > 1 && (
                    <button type="button" aria-label="Remove this payment" onClick={() => setPayments((all) => all.filter((_, j) => j !== i))} className="rounded-md p-1 text-[var(--color-faint)] hover:text-[var(--color-red)]"><Trash2 size={14} /></button>
                  )}
                </div>
              ))}
            {overNonCash && <p className="mb-2 text-[12px] text-[var(--color-red)]">Card and transfer payments can't be more than the bill.</p>}
            <label className="mt-1 flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={payLater} onChange={(e) => setPayLater(e.target.checked)} className="accent-[var(--color-accent)]" />
              Pay later (add to unpaid bills)
            </label>
          </Section>

          <Section title="Receipt">
            <div className="flex flex-wrap gap-4 text-[13px]">
              <label className={`flex items-center gap-2 ${booking.client_email ? "" : "opacity-50"}`}>
                <input type="checkbox" disabled={!booking.client_email} checked={receipt.email} onChange={(e) => setReceipt((r) => ({ ...r, email: e.target.checked }))} className="accent-[var(--color-accent)]" />
                Email{booking.client_email ? ` to ${booking.client_email}` : " (no email on file)"}
              </label>
              <label className={`flex items-center gap-2 ${hasPhone ? "" : "opacity-50"}`}>
                <input type="checkbox" disabled={!hasPhone} checked={receipt.whatsapp} onChange={(e) => setReceipt((r) => ({ ...r, whatsapp: e.target.checked }))} className="accent-[var(--color-accent)]" />
                WhatsApp{hasPhone ? ` to ${booking.client_phone}` : ""}
              </label>
            </div>
          </Section>
        </>
      )}
    </Modal>
  );
}
