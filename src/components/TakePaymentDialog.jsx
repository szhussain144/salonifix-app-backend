import { useState } from "react";
import Modal from "./Modal";
import { Button } from "./ui";
import { formatMoney, toNumber } from "./format";
import { CHECKOUT_METHODS, forRegion } from "./labels";
import GiftCardCode from "./GiftCardCode";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

const chip = (on) =>
  `rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
    on ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
  }`;

/** A payment towards an open bill (paying off "pay later" in full or in part). */
export default function TakePaymentDialog({ bookingId, clientName, due, onClose, onDone }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { business } = useSession();
  const money = (v) => formatMoney(v, business?.currency || "PKR");
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState(String(due));
  const [code, setCode] = useState("");
  const value = toNumber(amount);
  const change = method === "cash" && value > due ? Math.round((value - due) * 100) / 100 : 0;
  const invalid = value <= 0 || (method !== "cash" && value > due + 0.005);

  const submit = async (e) => {
    e?.preventDefault();
    const res = await fetchWithLoading(`${constanst.API_URL}/bookings/${bookingId}/payments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ method, amount: Math.min(value, due), ...(method === "gift_card" ? { gift_card_code: code } : {}) }),
    });
    if (!res.ok) return;
    const body = await res.json();
    addToast({ message: change > 0 ? `${body.message} Give ${money(change)} change.` : body.message, type: "success", duration: 6000 });
    onDone(body.data);
  };

  return (
    <Modal
      title="Take payment"
      subtitle={`${clientName} · ${money(due)} to pay`}
      onClose={onClose}
      width="max-w-md"
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={submit} disabled={invalid}>Take {money(Math.min(value, due))}</Button>
        </div>
      }
    >
      <form onSubmit={submit} className="space-y-4">
        <div className="flex flex-wrap gap-1.5">
          {forRegion(CHECKOUT_METHODS).map(([key, label]) => (
            <button key={key} type="button" className={chip(method === key)} onClick={() => setMethod(key)}>
              {label}
            </button>
          ))}
        </div>
        {method === "gift_card" && <GiftCardCode value={code} onChange={setCode} onChecked={(balance) => setAmount(String(Math.min(balance, due)))} />}
        <label className="block">
          <span className="mb-1.5 block text-[12px] font-medium">Amount {method === "cash" ? "received" : ""}</span>
          <input
            type="number"
            min="0"
            inputMode="decimal"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5 text-[15px] tabular-nums outline-none focus:border-[var(--color-accent)]"
          />
        </label>
        {change > 0 && <p className="text-[13px] font-semibold text-[var(--color-green)]">Give {money(change)} change</p>}
        {value > 0 && value < due && <p className="text-[12.5px] text-[var(--color-muted)]">{money(due - value)} will still be owed.</p>}
        {method !== "cash" && value > due + 0.005 && <p className="text-[12.5px] text-[var(--color-red)]">Can't be more than the {money(due)} owed.</p>}
      </form>
    </Modal>
  );
}
