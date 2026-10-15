import { useState } from "react";
import { formatMoney } from "./format";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import constanst from "../config/constants";

/**
 * Gift card code box for a payment: checks the code and shows the balance.
 * Calls onChecked(balance) when the card can be used, so the amount can be filled in.
 */
export default function GiftCardCode({ value, onChange, onChecked }) {
  const { fetchWithLoading } = useApi();
  const { business } = useSession();
  const [status, setStatus] = useState(null);

  const check = async () => {
    if (!value.trim()) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/gift-cards/lookup?code=${encodeURIComponent(value.trim())}`, { silent: true });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return setStatus({ ok: false, text: body.message || "Code not found" });
    const card = body.data;
    if (!card.usable) return setStatus({ ok: false, text: card.problem });
    onChange(card.code);
    setStatus({ ok: true, text: `${formatMoney(card.balance, business?.currency || "PKR")} on this card` });
    onChecked?.(card.balance);
  };

  return (
    <div className="flex flex-wrap items-center gap-2">
      <input
        aria-label="Gift card code"
        placeholder="GC-XXXX-XXXX"
        value={value}
        onChange={(e) => {
          onChange(e.target.value.toUpperCase());
          setStatus(null);
        }}
        onBlur={check}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), check())}
        className="w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 font-mono text-[13px] uppercase outline-none focus:border-[var(--color-accent)]"
      />
      <button type="button" onClick={check} className="text-[12.5px] font-medium text-[var(--color-accent)] hover:underline">Check</button>
      {status && <span className={`text-[12px] ${status.ok ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>{status.text}</span>}
    </div>
  );
}
