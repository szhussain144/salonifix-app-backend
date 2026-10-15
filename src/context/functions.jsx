import { uses12h } from "../components/format";

/**
 * Formats API dates for display, e.g. "12th october 2026 10:00 am".
 *
 * The API sends wall-clock values without a timezone ("2026-10-12", "2026-10-12 14:30:00",
 * times like "10:00:00"). They are read as local time: `new Date("2026-10-12")` would treat a
 * date-only string as UTC midnight, which showed bookings 5 hours early in Pakistan.
 * Pass `time` (e.g. a booking's start_time) to show it with a date-only value.
 */
export function formatBookingDate(value, time) {
  if (!value) return "";

  const date = parseLocal(value);
  if (!date) return value;

  const day = date.getDate();
  const month = date.toLocaleString("en-US", { month: "long" }).toLowerCase();
  const text = `${day}${ordinal(day)} ${month} ${date.getFullYear()}`;

  const hasClock = typeof value !== "string" || /\d:\d/.test(value);
  const clock = time || (hasClock ? `${date.getHours()}:${date.getMinutes()}` : null);
  return clock ? `${text} ${formatClock(clock)}` : text;
}

/** "14:05:00" → "2:05 pm". */
export function formatClock(value) {
  const [h, m] = String(value).split(":").map(Number);
  if (Number.isNaN(h)) return "";
  if (!uses12h()) return `${String(h).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "pm" : "am"}`;
}

function parseLocal(value) {
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2}))?)?$/.exec(String(value));
  if (match) {
    const [, y, mo, d, h = 0, mi = 0, s = 0] = match;
    return new Date(+y, +mo - 1, +d, +h, +mi, +s);
  }
  // Full ISO strings with a timezone ("...Z") are converted to local time by the browser.
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function ordinal(d) {
  if (d % 100 >= 11 && d % 100 <= 13) return "th";
  return { 1: "st", 2: "nd", 3: "rd" }[d % 10] || "th";
}
