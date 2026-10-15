import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import Modal from "./Modal";
import { Button } from "./ui";
import { formatMoney } from "./format";
import { useApi } from "../context/ApiContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

const plural = (n, one, many = `${one}s`) => `${n} ${n === 1 ? one : many}`;
/* 0.013261 -> "0.013261", 278.4512 -> "278.45": enough digits to be useful, no more. */
const tidy = (n) => String(Number(n.toPrecision(n < 1 ? 5 : 6)));

/**
 * Changing the business's currency. Prices can be converted once at a rate the owner confirms
 * (pre-filled from a daily rates service); past bills, payments and expenses keep their amounts.
 */
export default function CurrencyChangeDialog({ to, onClose, onDone }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const [preview, setPreview] = useState(null);
  const [mode, setMode] = useState("convert");
  const [rate, setRate] = useState("");
  const [roundTo, setRoundTo] = useState("");

  useEffect(() => {
    let live = true;
    fetchWithLoading(`${constanst.API_URL}/business/currency/preview?to=${to}`).then(async (res) => {
      if (!res.ok) return onClose();
      const data = (await res.json()).data;
      if (!live) return;
      setPreview(data);
      setMode(data.items.length ? "convert" : "label");
      if (data.suggested_rate) setRate(tidy(data.suggested_rate.rate));
    });
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [to]);

  if (!preview) return null;
  const { from, items, history, examples, suggested_rate: suggested, round_steps: steps } = preview;
  const r = Number(rate);
  const rateOk = r > 0 && Number.isFinite(r);
  const convert = (amount) => (roundTo ? Math.round((amount * r) / Number(roundTo)) * Number(roundTo) : Math.round(amount * r * 100) / 100);
  const canSave = mode === "label" || rateOk;

  const save = async () => {
    const body = mode === "convert" ? { to, convert: true, rate: r, ...(roundTo && { round_to: Number(roundTo) }) } : { to, convert: false };
    const res = await fetchWithLoading(`${constanst.API_URL}/business/currency`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    const data = (await res.json()).data;
    addToast({ message: data.converted.length ? `Currency is now ${to}. Converted ${data.converted.join(", ")}.` : `Currency is now ${to}`, type: "success" });
    onDone();
  };

  const option = (key, title, children) => (
    <label className={`block cursor-pointer rounded-2xl border p-4 transition-colors ${mode === key ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)]"}`}>
      <span className="flex items-start gap-3">
        <input type="radio" name="currency-mode" checked={mode === key} onChange={() => setMode(key)} className="mt-1 accent-[var(--color-accent)]" />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] font-semibold">{title}</span>
          {children}
        </span>
      </span>
    </label>
  );

  return (
    <Modal
      title={`Change currency from ${from} to ${to}`}
      subtitle="Amounts are stored as numbers. Choose what happens to yours."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={save} disabled={!canSave}>
            {mode === "convert" ? `Convert to ${to}` : `Change to ${to}`}
          </Button>
        </div>
      }
    >
      {(history.bills > 0 || history.expenses > 0) && (
        <div className="mb-4 flex gap-2.5 rounded-xl border border-[var(--color-orange)]/30 bg-[var(--color-orange)]/10 px-3.5 py-3 text-[12.5px]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--color-orange)]" />
          <p>
            Your {[history.bills && plural(history.bills, "bill"), history.expenses && plural(history.expenses, "expense")].filter(Boolean).join(" and ")} were recorded in {from}. They
            stay exactly as they are, so reports covering dates before today add {from} and {to} amounts together.
          </p>
        </div>
      )}

      <div className="space-y-3">
        {items.length > 0 &&
          option(
            "convert",
            `Convert my prices to ${to}`,
            <>
              <span className="mt-0.5 block text-[12.5px] text-[var(--color-muted)]">{items.map((i) => `${i.count} ${i.label}`).join(", ")}.</span>
              {mode === "convert" && (
                <span className="mt-3 block space-y-3" onClick={(e) => e.preventDefault()}>
                  <span className="flex flex-wrap items-center gap-2 text-[13px]">
                    1 {from} =
                    <input
                      type="number"
                      inputMode="decimal"
                      min="0"
                      step="any"
                      aria-label="Exchange rate"
                      value={rate}
                      onChange={(e) => setRate(e.target.value)}
                      className="w-32 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5 text-[13px] outline-none focus:border-[var(--color-accent)]"
                    />
                    {to}
                    {rateOk && <span className="text-[12px] text-[var(--color-faint)]">(1 {to} = {tidy(1 / r)} {from})</span>}
                  </span>
                  <span className="block text-[12px] text-[var(--color-faint)]">
                    {suggested
                      ? `Today's rate from ${suggested.source} (${suggested.date}). Use your bank's rate if you prefer.`
                      : "We couldn't look up today's rate. Enter the rate you want to use."}
                  </span>
                  <span className="flex flex-wrap items-center gap-2 text-[13px]">
                    Round prices to
                    <select
                      aria-label="Round prices to"
                      value={roundTo}
                      onChange={(e) => setRoundTo(e.target.value)}
                      className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5 text-[13px] outline-none focus:border-[var(--color-accent)]"
                    >
                      <option value="">the cent (no rounding)</option>
                      {steps.map((s) => (
                        <option key={s} value={s}>
                          the nearest {s}
                        </option>
                      ))}
                    </select>
                  </span>
                  {rateOk && examples.length > 0 && (
                    <span className="block rounded-xl bg-[var(--color-card)] px-3 py-2 text-[12.5px]">
                      {examples.map((e) => (
                        <span key={e.name} className="flex justify-between gap-3 py-0.5">
                          <span className="truncate">{e.name}</span>
                          <span className="shrink-0 tabular-nums text-[var(--color-muted)]">
                            {formatMoney(e.price, from)} → <b className="text-[var(--color-ink)]">{formatMoney(convert(e.price), to)}</b>
                          </span>
                        </span>
                      ))}
                    </span>
                  )}
                  <span className="block text-[12px] text-[var(--color-faint)]">Gift card balances convert exactly, without rounding. Percentage discounts don&apos;t change.</span>
                </span>
              )}
            </>,
          )}
        {option(
          "label",
          "Keep the numbers, just change the label",
          <span className="mt-0.5 block text-[12.5px] text-[var(--color-muted)]">
            {items.length ? `Choose this if your prices are already in ${to}. A ${formatMoney(examples[0]?.price ?? 1000, from)} price becomes ${formatMoney(examples[0]?.price ?? 1000, to)}.` : "You have no prices yet, so nothing needs converting."}
          </span>,
        )}
      </div>
    </Modal>
  );
}
