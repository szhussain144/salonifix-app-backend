const compact = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const whole = new Intl.NumberFormat("en", { maximumFractionDigits: 0 });

export const toNumber = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const formatCompact = (value) => compact.format(toNumber(value));

/* The business's country, currency and clock (Settings → Region), set from the session. */
let region = { country: "PK", currency: "PKR", timeFormat: "12h", dialCode: "92" };

export function setRegion(business) {
  if (!business) return;
  region = {
    country: business.country || region.country,
    currency: business.currency || region.currency,
    timeFormat: business.time_format || region.timeFormat,
    dialCode: business.dial_code || region.dialCode,
  };
}

export const getRegion = () => region;

/* Day-month order everywhere except the US. */
export const dateLocale = () => (region.country === "US" ? "en-US" : "en-GB");

export const uses12h = () => region.timeFormat !== "24h";

/* "0300-1234567" in Pakistan, "+44 …" elsewhere: a hint for phone fields. */
export const phoneHint = () => (region.country === "PK" ? "0300-1234567" : `+${region.dialCode} …`);

const moneyFormats = new Map();
function moneyFormat(currency, short, whole) {
  const key = `${currency}|${short}|${whole}`;
  if (!moneyFormats.has(key)) {
    const options = short
      ? { style: "currency", currency, notation: "compact", maximumFractionDigits: 1 }
      : { style: "currency", currency, ...(whole && { minimumFractionDigits: 0, maximumFractionDigits: 0 }) };
    moneyFormats.set(key, new Intl.NumberFormat("en", options));
  }
  return moneyFormats.get(key);
}

/* Amount in the business's currency (or the one given): "PKR 2,500", "$25", "€12.50", "AED 1.2K" short. */
export function formatMoney(value, currency = region.currency, { short = false } = {}) {
  const n = toNumber(value);
  try {
    return moneyFormat(currency || "PKR", short, Number.isInteger(n)).format(n);
  } catch {
    return `${currency} ${short ? compact.format(n) : whole.format(n)}`;
  }
}

/* Amount in the business's currency. */
export const formatAmount = (value, { short = false } = {}) => formatMoney(value, region.currency, { short });

export const formatCount = (value) => whole.format(toNumber(value));

/* Today as "YYYY-MM-DD" in local time (for date inputs). */
export function todayISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/* "2026-10-05" -> "Mon 5" (or "Monday 5 Oct" with long). Parsed as a local
   date so it never shifts by a day. */
export function formatDay(iso, { long = false } = {}) {
  if (!iso) return "";
  const d = new Date(`${String(iso).slice(0, 10)}T00:00:00`);
  if (Number.isNaN(d.getTime())) return String(iso);
  return long
    ? d.toLocaleDateString(dateLocale(), { weekday: "long", day: "numeric", month: "short" })
    : `${d.toLocaleDateString(dateLocale(), { weekday: "short" })} ${d.getDate()}`;
}

/* "Waseem Ahmed" -> "WA"; tolerates null and extra spaces. */
export const initialsOf = (name) =>
  String(name || "?")
    .trim()
    .split(/\s+/)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
