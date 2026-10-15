/** Membership wording shared by the Memberships page, the client page and the sign-up dialog. */

export const PERIOD_WORD = { month: "month", year: "year" };

/** "PKR 3,000 / month" style suffix. */
export const perPeriod = (period) => `/ ${PERIOD_WORD[period] || period}`;

/** The badge a member shows: Active, Ending (cancelled at period end), Renewal due, Cancelled, Expired. */
export function memberBadge(m) {
  if (m.status === "active") return m.cancel_at_period_end ? "Ending" : "Active";
  if (m.status === "past_due") return "Renewal due";
  if (m.status === "cancelled") return "Cancelled";
  return "Expired";
}

/** One line under the member's name: when it renews, ends or ended. */
export function memberLine(m, formatDate) {
  if (m.status === "active") {
    if (m.cancel_at_period_end) return `Ends after ${formatDate(m.paid_until)}`;
    if (m.days_left <= 0) return "Renews today";
    return `Renews ${formatDate(addDay(m.paid_until))}${m.days_left <= 7 ? ` · in ${m.days_left} day${m.days_left === 1 ? "" : "s"}` : ""}`;
  }
  if (m.status === "past_due") {
    return `Was due ${formatDate(addDay(m.paid_until))} · grace until ${formatDate(m.grace_ends)}${m.failed_attempts ? ` · ${m.failed_attempts} failed payment${m.failed_attempts === 1 ? "" : "s"}` : ""}`;
  }
  return m.ended_on ? `Ended ${formatDate(m.ended_on)}` : "Ended";
}

function addDay(iso) {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + 1);
  return d.toISOString().slice(0, 10);
}
