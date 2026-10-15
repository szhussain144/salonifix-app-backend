import { toNumber } from "./format";

/**
 * Change against the comparison: arrow + percent, green when it's good news. For costs
 * (discounts, unpaid, cancellations) a rise is bad news, so the colours swap.
 */
export default function Change({ value, previous, current, upIsGood = true, onAccent = false, against }) {
  if (value === null || value === undefined) {
    const text = toNumber(current) > 0 && !toNumber(previous) ? "New: nothing before" : "No change to compare";
    return <span className={`text-[11.5px] ${onAccent ? "text-[var(--color-accent-ink)]/80" : "text-[var(--color-faint)]"}`}>{text}</span>;
  }
  const good = value === 0 ? null : (value > 0) === upIsGood;
  const tone = onAccent
    ? "bg-white/18 text-[var(--color-accent-ink)]"
    : good === null
      ? "bg-[var(--color-panel-alt)] text-[var(--color-muted)]"
      : good
        ? "bg-[var(--color-green)]/12 text-[var(--color-green)]"
        : "bg-[var(--color-red)]/10 text-[var(--color-red)]";
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11.5px] font-semibold tabular-nums ${tone}`}>
        {value > 0 ? "▲" : value < 0 ? "▼" : "■"} {Math.abs(value)}%
      </span>
      {against && <span className={`text-[11.5px] ${onAccent ? "text-[var(--color-accent-ink)]/80" : "text-[var(--color-faint)]"}`}>vs {against}</span>}
    </span>
  );
}

export function ChangeCell({ row }) {
  return <Change value={row.change} current={row.amount} previous={row.prev_amount} />;
}
