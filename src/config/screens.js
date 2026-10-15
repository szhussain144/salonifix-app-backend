/**
 * Screens the owner can switch on or off per role (Settings → Roles & permissions).
 * Keys match the API (src/modules/permissions/screens.ts); the API also refuses requests
 * from a screen that is off, so hiding it here is for tidiness, not security.
 */

/** Where each screen lives, most specific first; the first match wins. */
const SCREEN_PATHS = [
  ["/marketing/calls", "call_list"],
  ["/marketing", "marketing"],
  ["/new-booking", "bookings"],
  ["/bookings", "bookings"],
  ["/bills", "bookings"],
  ["/calendar", "calendar"],
  ["/clients", "clients"],
  ["/messages", "messages"],
  ["/services", "services"],
  ["/staff", "staff"],
  ["/products", "products"],
  ["/inventory", "inventory"],
  ["/payroll", "payroll"],
  ["/expenses", "expenses"],
  ["/gift-cards", "gift_cards"],
  ["/close-out", "close_out"],
  ["/packages", "packages"],
  ["/memberships", "memberships"],
  ["/settings", "settings"],
  ["/reports", "reports"],
];

/** The screen a path belongs to ("/" is the dashboard), or null for paths that are always open. */
export function screenForPath(pathname) {
  if (pathname === "/") return "dashboard";
  const hit = SCREEN_PATHS.find(([path]) => pathname === path || pathname.startsWith(`${path}/`));
  return hit ? hit[1] : null;
}

/** Where to land when the dashboard is switched off: the first screen the user can open. */
export const LANDING_ORDER = [
  ["/calendar", "calendar"],
  ["/bookings", "bookings"],
  ["/clients", "clients"],
  ["/marketing/calls", "call_list"],
  ["/services", "services"],
  ["/staff", "staff"],
  ["/products", "products"],
  ["/reports", "reports"],
  ["/settings", "settings"],
];

/**
 * Used only for a session saved before the API returned `screens` (refreshed on the next
 * load). Matches the API defaults.
 */
const MANAGERS_ONLY = ["marketing", "payroll"];
export function fallbackScreens(role) {
  const all = ["dashboard", "calendar", "bookings", "clients", "call_list", "messages", "services", "staff", "products", "inventory", "expenses", "gift_cards", "packages", "memberships", "close_out", "settings", "reports", ...MANAGERS_ONLY];
  return role === "owner" || role === "admin" ? all : all.filter((s) => !MANAGERS_ONLY.includes(s));
}
