import { dateLocale } from "./format";

/* Day and time helpers for the public booking and "change or cancel" pages. */
export const PERIODS = [
  ["Morning", 0, 12 * 60],
  ["Afternoon", 12 * 60, 17 * 60],
  ["Evening", 17 * 60, 24 * 60],
];
export const minutes = (t) => {
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
};
export const addDays = (iso, n) => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
};
export const dayLabel = (iso, today) => {
  if (iso === today) return "Today";
  if (iso === addDays(today, 1)) return "Tomorrow";
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString(dateLocale(), { weekday: "short", timeZone: "UTC" });
};
export const longDate = (iso) => new Date(`${iso}T00:00:00Z`).toLocaleDateString(dateLocale(), { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" });
