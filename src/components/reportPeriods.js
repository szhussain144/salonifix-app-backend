/* Date ranges for the Reports screen: ready-made periods, labels and chart ticks. */
import { dateLocale, todayISO } from "./format";

export const pad = (n) => String(n).padStart(2, "0");
export const iso = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const parse = (s) => new Date(`${s}T00:00:00`);
const lastDay = (y, m) => new Date(y, m + 1, 0); // m is 0-based

/** Ready-made periods, worked out from today. */
export function presetRange(key) {
  const today = parse(todayISO());
  const y = today.getFullYear();
  const m = today.getMonth();
  const q = Math.floor(m / 3) * 3;
  switch (key) {
    case "this_month":
      return { from: iso(new Date(y, m, 1)), to: iso(today) };
    case "last_month":
      return { from: iso(new Date(y, m - 1, 1)), to: iso(lastDay(y, m - 1)) };
    case "last_30":
      return { from: iso(new Date(y, m, today.getDate() - 29)), to: iso(today) };
    case "this_quarter":
      return { from: iso(new Date(y, q, 1)), to: iso(today) };
    case "last_quarter":
      return { from: iso(new Date(y, q - 3, 1)), to: iso(lastDay(y, q - 1)) };
    case "this_year":
      return { from: `${y}-01-01`, to: iso(today) };
    case "last_year":
      return { from: `${y - 1}-01-01`, to: `${y - 1}-12-31` };
    default:
      return null;
  }
}

export const PRESETS = [
  ["this_month", "This month"],
  ["last_month", "Last month"],
  ["last_30", "Last 30 days"],
  ["this_quarter", "This quarter"],
  ["last_quarter", "Last quarter"],
  ["this_year", "This year"],
  ["last_year", "Last year"],
  ["custom", "Custom"],
];

/** "Oct 2026", "1–6 Oct 2026", "1 Jul – 30 Sep 2026", "15 Nov 2025 – 3 Feb 2026". */
export function rangeLabel(r) {
  if (!r) return "";
  const a = parse(r.from);
  const b = parse(r.to);
  const month = (d) => d.toLocaleDateString(dateLocale(), { month: "short" });
  const wholeMonth = a.getDate() === 1 && b.getDate() === lastDay(b.getFullYear(), b.getMonth()).getDate();
  if (wholeMonth && a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear()) return `${month(a)} ${a.getFullYear()}`;
  if (wholeMonth && a.getMonth() === 0 && b.getMonth() === 11 && a.getFullYear() === b.getFullYear()) return String(a.getFullYear());
  if (a.getFullYear() !== b.getFullYear()) return `${a.getDate()} ${month(a)} ${a.getFullYear()} – ${b.getDate()} ${month(b)} ${b.getFullYear()}`;
  if (a.getMonth() === b.getMonth()) return `${a.getDate()}–${b.getDate()} ${month(a)} ${a.getFullYear()}`;
  return `${a.getDate()} ${month(a)} – ${b.getDate()} ${month(b)} ${a.getFullYear()}`;
}

/** Axis and tooltip text for a bucket key ("2026-10-07" or "2026-10"). */
export const tickFor = (key, spansYears) =>
  key.length === 7
    ? parse(`${key}-01`).toLocaleDateString(dateLocale(), spansYears ? { month: "short", year: "2-digit" } : { month: "short" })
    : parse(key).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" });
export const longFor = (key) =>
  key.length === 7
    ? parse(`${key}-01`).toLocaleDateString(dateLocale(), { month: "long", year: "numeric" })
    : parse(key).toLocaleDateString(dateLocale(), { weekday: "short", day: "numeric", month: "short", year: "numeric" });

/** Days in a { from, to } range, both ends included. */
export const daysIn = (r) => (r ? Math.round((parse(r.to) - parse(r.from)) / 86_400_000) + 1 : 0);

const addMonths = (s, n) => {
  const [y, m, d] = s.split("-").map(Number);
  const index = y * 12 + (m - 1) + n;
  const year = Math.floor(index / 12);
  const month = (index % 12) + 1;
  const last = new Date(year, month, 0).getDate();
  return `${year}-${pad(month)}-${pad(Math.min(d, last))}`;
};
const addDays = (s, n) => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
const isLastOfMonth = (s) => addDays(s, 1).endsWith("-01");

/**
 * The period a range is compared with. Same rules as the API (sales-periods.ts):
 * whole months -> the same number of whole months before; month to date -> the same days of
 * the month before; anything else -> the same number of days just before; or last year.
 */
export function comparisonRange(r, mode) {
  if (!r || mode === "none") return null;
  if (mode === "last_year") return { from: addMonths(r.from, -12), to: addMonths(r.to, -12) };
  if (r.from.endsWith("-01")) {
    const months = (Number(r.to.slice(0, 4)) - Number(r.from.slice(0, 4))) * 12 + (Number(r.to.slice(5, 7)) - Number(r.from.slice(5, 7))) + 1;
    const from = addMonths(r.from, -months);
    if (isLastOfMonth(r.to)) {
      const lastMonthStart = addMonths(r.from, -1);
      return { from, to: iso(new Date(Number(lastMonthStart.slice(0, 4)), Number(lastMonthStart.slice(5, 7)), 0)) };
    }
    return { from, to: addMonths(r.to, -months) };
  }
  const days = daysIn(r);
  return { from: addDays(r.from, -days), to: addDays(r.from, -1) };
}
