import { useCallback, useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { CheckCircle2, ChevronLeft, ChevronRight, Lock, TriangleAlert, Unlock } from "lucide-react";
import { Badge, Button, Card, EmptyState, SectionTitle, Select } from "../components/ui";
import { formatAmount, todayISO, toNumber } from "../components/format";
import { paymentMethodLabel } from "../components/labels";
import { addDays, longDate } from "../components/bookingDays";
import { formatBookingDate } from "../context/functions";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

const money = (v) => formatAmount(v);
const round2 = (n) => Math.round(n * 100) / 100;

/** Manage → Close the day: count the cash drawer against the day's takings, per branch. */
export default function CloseOut() {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { activeLocation, activeLocations, isManager } = useSession();
  const [params, setParams] = useSearchParams();
  const date = params.get("date") || todayISO();
  const [branch, setBranch] = useState(() => activeLocation?.id ?? activeLocations[0]?.id ?? null);
  const [data, setData] = useState(null);
  const [form, setForm] = useState(null);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (activeLocation?.id) setBranch(activeLocation.id);
  }, [activeLocation?.id]);

  const load = useCallback(async () => {
    if (!branch) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/close-out?date=${date}&location_id=${branch}`);
    if (!res.ok) return;
    const d = (await res.json()).data;
    setData(d);
    setEditing(false);
    const c = d.close;
    setForm({
      opening_float: String(c ? c.opening_float : d.opening_float),
      cash_out: String(c ? c.cash_out : d.paid_out.total),
      counted_cash: c ? String(c.counted_cash) : "",
      cash_banked: c && c.cash_banked ? String(c.cash_banked) : "",
      note: c?.note || "",
    });
  }, [branch, date, fetchWithLoading]);

  useEffect(() => {
    load();
  }, [load]);

  const goTo = (next) => setParams(next === todayISO() ? {} : { date: next });

  if (!branch) return <EmptyState title="No branch yet">Add a location in Settings first.</EmptyState>;
  if (!data || !form) return null;

  const closed = Boolean(data.close);
  const locked = closed && !editing;
  const expected = round2(toNumber(form.opening_float) + data.cash_in - toNumber(form.cash_out));
  const counted = form.counted_cash === "" ? null : toNumber(form.counted_cash);
  const difference = counted === null ? null : round2(counted - expected);
  const leftover = counted === null ? null : round2(counted - toNumber(form.cash_banked));
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const save = async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/close-out`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        date,
        location_id: branch,
        opening_float: toNumber(form.opening_float),
        cash_out: toNumber(form.cash_out),
        counted_cash: toNumber(form.counted_cash),
        ...(form.cash_banked !== "" && { cash_banked: toNumber(form.cash_banked) }),
        note: form.note.trim() || undefined,
      }),
    });
    if (!res.ok) return;
    const d = (await res.json()).data;
    setData(d);
    setEditing(false);
    const diff = d.close.difference;
    addToast({ message: diff === 0 ? "Day closed. The drawer matches." : `Day closed. Drawer ${diff < 0 ? "short" : "over"} by ${money(Math.abs(diff))}.`, type: diff === 0 ? "success" : "info", duration: 5000 });
  };

  const reopen = async () => {
    if (!window.confirm(`Reopen ${longDate(date)} at ${data.location.name}? The saved count will be removed.`)) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/close-out/${data.close.id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  const field = "w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-right text-[14px] tabular-nums outline-none focus:border-[var(--color-accent)] disabled:bg-[var(--color-panel-alt)] disabled:text-[var(--color-muted)]";

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] p-1 shadow-[var(--shadow-card)]">
          <button type="button" aria-label="Previous day" onClick={() => goTo(addDays(date, -1))} className="rounded-full p-1.5 hover:bg-[var(--color-panel-alt)]">
            <ChevronLeft size={16} />
          </button>
          <input type="date" value={date} max={data.today} onChange={(e) => e.target.value && goTo(e.target.value)} className="bg-transparent px-1 text-[13px] font-medium outline-none" />
          <button type="button" aria-label="Next day" disabled={date >= data.today} onClick={() => goTo(addDays(date, 1))} className="rounded-full p-1.5 hover:bg-[var(--color-panel-alt)] disabled:opacity-30">
            <ChevronRight size={16} />
          </button>
        </div>
        {activeLocations.length > 1 && (
          <div className="w-56">
            <Select value={String(branch)} onChange={(e) => setBranch(Number(e.target.value))}>
              {activeLocations.map((l) => ({ value: String(l.id), label: l.name }))}
            </Select>
          </div>
        )}
        {closed ? (
          <Badge>Closed</Badge>
        ) : (
          <span className="text-[12.5px] text-[var(--color-muted)]">{date === data.today ? "Count the drawer when you close up." : "Not closed yet."}</span>
        )}
      </div>

      {closed && (
        <div className="card-in flex flex-wrap items-center gap-3 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel)] px-4 py-3 text-[13px]">
          <Lock size={16} className="text-[var(--color-accent)]" />
          <span>
            Closed by <b>{data.close.closed_by_name || "someone"}</b>, {formatBookingDate(data.close.closed_at)}.{" "}
            {data.close.difference === 0 ? "The drawer matched." : `The drawer was ${data.close.difference < 0 ? "short" : "over"} by ${money(Math.abs(data.close.difference))}.`}
          </span>
          {isManager && (
            <span className="ml-auto flex gap-2">
              {!editing && <Button type="button" variant="ghost" onClick={() => setEditing(true)}>Correct it</Button>}
              <Button type="button" variant="ghost" onClick={reopen}><Unlock size={14} /> Reopen</Button>
            </span>
          )}
        </div>
      )}

      <div className="grid gap-5 lg:grid-cols-[1.1fr_1fr]">
        <Card className="p-5">
          <SectionTitle eyebrow={data.location.name} title={`Money in · ${longDate(date)}`} />
          {data.takings.length === 0 ? (
            <EmptyState title="Nothing taken yet">Payments at checkout and gift cards sold show here.</EmptyState>
          ) : (
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">
                  <th className="pb-2 text-left">Method</th>
                  <th className="pb-2 text-right">Bills</th>
                  <th className="pb-2 text-right">Gift cards</th>
                  {data.packages_sold > 0 && <th className="pb-2 text-right">Packages</th>}
                  {data.membership_payments > 0 && <th className="pb-2 text-right">Memberships</th>}
                  <th className="pb-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {data.takings.map((t) => (
                  <tr key={t.method} className="row-in border-b border-[var(--color-border-soft)]">
                    <td className="py-2.5 font-medium">{paymentMethodLabel(t.method)}</td>
                    <td className="py-2.5 text-right tabular-nums text-[var(--color-muted)]">{t.bills ? money(t.bills) : "—"}</td>
                    <td className="py-2.5 text-right tabular-nums text-[var(--color-muted)]">{t.gift_cards ? money(t.gift_cards) : "—"}</td>
                    {data.packages_sold > 0 && <td className="py-2.5 text-right tabular-nums text-[var(--color-muted)]">{t.packages ? money(t.packages) : "—"}</td>}
                    {data.membership_payments > 0 && <td className="py-2.5 text-right tabular-nums text-[var(--color-muted)]">{t.memberships ? money(t.memberships) : "—"}</td>}
                    <td className="py-2.5 text-right font-semibold tabular-nums">{money(t.total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr>
                  <td className="pt-3 font-semibold" colSpan={3 + (data.packages_sold > 0 ? 1 : 0) + (data.membership_payments > 0 ? 1 : 0)}>Total taken</td>
                  <td className="pt-3 text-right text-[15px] font-semibold tabular-nums">{money(data.total_taken)}</td>
                </tr>
              </tfoot>
            </table>
          )}
          <ul className="mt-4 space-y-1.5 text-[12.5px] text-[var(--color-muted)]">
            <li>{data.bills_paid} bill{data.bills_paid === 1 ? "" : "s"} paid{data.gift_cards_sold ? `, ${data.gift_cards_sold} gift card${data.gift_cards_sold === 1 ? "" : "s"} sold` : ""}.</li>
            {data.tips > 0 && <li>Includes {money(data.tips)} in tips for the team.</li>}
            {data.packages_sold > 0 && <li>{data.packages_sold} package{data.packages_sold === 1 ? "" : "s"} sold.</li>}
            {data.paid_with_packages > 0 && <li>{money(data.paid_with_packages)} of visits were covered by package sessions (paid for when the package was sold).</li>}
            {data.membership_payments > 0 && <li>{data.membership_payments} membership payment{data.membership_payments === 1 ? "" : "s"} (sign-ups and renewals).</li>}
            {data.paid_with_memberships > 0 && <li>{money(data.paid_with_memberships)} of visits were treatments included in memberships (paid for with the membership).</li>}
            {data.paid_with_gift_cards > 0 && <li>{money(data.paid_with_gift_cards)} was paid with gift cards (already paid for, not counted above).</li>}
            {data.still_to_collect.bills > 0 && (
              <li className="text-[var(--color-orange)]">
                {data.still_to_collect.bills} bill{data.still_to_collect.bills === 1 ? "" : "s"} from this day still to collect: {money(data.still_to_collect.amount)}.
              </li>
            )}
          </ul>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Cash drawer" />
          <div className="space-y-3 text-[13px]">
            <Line label="Opening float" hint={data.opening_float_from && !closed ? `Left in the drawer on ${formatBookingDate(data.opening_float_from)}` : "Cash in the drawer when the day started"}>
              <input type="number" min="0" step="any" aria-label="Opening float" value={form.opening_float} onChange={set("opening_float")} disabled={locked} className={field} />
            </Line>
            <Line label="+ Cash taken" hint="From the table on the left">
              <span className="block px-3 py-2 text-right font-semibold tabular-nums">{money(data.cash_in)}</span>
            </Line>
            <Line label="− Paid out in cash" hint={`Today's expenses ${money(data.paid_out.expenses)}${data.paid_out.wages ? ` + cash wages ${money(data.paid_out.wages)}` : ""}. Change it if some were paid another way.`}>
              <input type="number" min="0" step="any" aria-label="Paid out in cash" value={form.cash_out} onChange={set("cash_out")} disabled={locked} className={field} />
            </Line>
            <div className="flex items-center justify-between rounded-xl bg-[var(--color-panel-alt)] px-3 py-2.5">
              <span className="font-semibold">Should be in the drawer</span>
              <span className="text-[16px] font-semibold tabular-nums">{money(expected)}</span>
            </div>
            <Line label="Cash counted" hint="Count every note and coin">
              <input type="number" min="0" step="any" aria-label="Cash counted" autoFocus={!closed} value={form.counted_cash} onChange={set("counted_cash")} disabled={locked} className={`${field} text-[16px] font-semibold`} />
            </Line>
            {difference !== null && (
              <div
                className={`pop-in flex items-center gap-2 rounded-xl px-3 py-2.5 font-semibold ${difference === 0 ? "bg-[var(--color-green)]/10 text-[var(--color-green)]" : "bg-[var(--color-orange)]/10 text-[var(--color-orange)]"}`}
                key={difference === 0 ? "ok" : "off"}
              >
                {difference === 0 ? <CheckCircle2 size={16} /> : <TriangleAlert size={16} />}
                {difference === 0 ? "The drawer matches" : `${difference < 0 ? "Short" : "Over"} by ${money(Math.abs(difference))}`}
              </div>
            )}
            <Line label="Taking to the bank" hint={leftover !== null ? `Leaves ${money(leftover)} in the drawer for tomorrow` : "Optional"}>
              <input type="number" min="0" step="any" aria-label="Taking to the bank" value={form.cash_banked} onChange={set("cash_banked")} disabled={locked} className={field} />
            </Line>
            <label className="block">
              <span className="mb-1 block text-[12px] font-medium text-[var(--color-ink-2)]">Note {difference ? "(why is it different?)" : "(optional)"}</span>
              <textarea rows={2} value={form.note} onChange={set("note")} disabled={locked} maxLength={500} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-[13px] outline-none focus:border-[var(--color-accent)] disabled:bg-[var(--color-panel-alt)]" />
            </label>
            {!locked && (
              <Button type="button" className="w-full py-2.5" onClick={save} disabled={counted === null || (leftover !== null && leftover < 0)}>
                {closed ? "Save correction" : `Close ${date === data.today ? "today" : longDate(date)}`}
              </Button>
            )}
          </div>
        </Card>
      </div>

      {data.history.length > 0 && (
        <Card className="p-5">
          <SectionTitle title="Recent days" />
          <ul className="divide-y divide-[var(--color-border-soft)] text-[13px]">
            {data.history.map((h) => (
              <li key={h.id} className="row-in flex flex-wrap items-center gap-x-4 gap-y-1 py-2.5">
                <button type="button" onClick={() => goTo(h.date)} className="w-40 text-left font-medium text-[var(--color-accent)] hover:underline">
                  {longDate(h.date)}
                </button>
                <span className="tabular-nums text-[var(--color-muted)]">Counted {money(h.counted_cash)}</span>
                <span className={`font-semibold tabular-nums ${h.difference === 0 ? "text-[var(--color-green)]" : "text-[var(--color-orange)]"}`}>
                  {h.difference === 0 ? "Matched" : `${h.difference < 0 ? "Short" : "Over"} ${money(Math.abs(h.difference))}`}
                </span>
                {h.cash_banked > 0 && <span className="text-[var(--color-muted)]">Banked {money(h.cash_banked)}</span>}
                <span className="ml-auto text-[12px] text-[var(--color-faint)]">{h.closed_by_name}</span>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}

function Line({ label, hint, children }) {
  return (
    <div className="grid grid-cols-[1fr_9.5rem] items-center gap-3">
      <span>
        <span className="block font-medium">{label}</span>
        {hint && <span className="block text-[11.5px] text-[var(--color-faint)]">{hint}</span>}
      </span>
      {children}
    </div>
  );
}
