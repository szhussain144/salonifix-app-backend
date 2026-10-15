/* Plans as the app shows them. What each plan unlocks comes from the API (session.plan). */

/** Where "See plans" goes: Settings → Plan & billing. */
export const PLANS_LINK = { pathname: "/settings", state: { section: "billing" } };

export const PLAN_NAMES = { starter: "Starter", growth: "Growth", popular: "Popular" };

/** Names for locked-feature prompts; keys match the API's plan features. */
export const FEATURE_LABELS = {
  online_booking: "Online booking",
  templates: "Your own templates",
  call_list: "Call list",
  automations: "Automations",
  products: "Products and inventory",
  packages: "Packages",
  payroll: "Payroll",
  booking_page_design: "Booking page design",
  sms_whatsapp: "SMS and WhatsApp",
  loyalty: "Loyalty rewards",
  memberships: "Memberships",
  gift_cards: "Gift cards",
};

/** What each locked feature would give the business, for the upgrade screen. */
export const FEATURE_PITCH = {
  online_booking: "Let clients book themselves from a link, day or night.",
  templates: "Design branded emails and reusable messages once, send them from any campaign.",
  call_list: "Follow up with clients by phone and keep a log of every call.",
  automations: "Birthday wishes, we-miss-you and review requests that go out on their own.",
  products: "Sell retail products, track stock and get low-stock alerts.",
  packages: "Sell prepaid bundles of sessions and see who has sessions left.",
  payroll: "Pay salaries and commission, and see what's still owed.",
  booking_page_design: "Your banner, colours, tabs and form options on the booking page.",
  sms_whatsapp: "Reach clients by SMS and WhatsApp as well as email.",
  loyalty: "Reward regulars with automatic discounts that bring them back.",
  memberships: "Monthly and annual memberships with discounts and included treatments.",
  gift_cards: "Sell gift cards, send them to the lucky person, and track balances.",
};

/** Screens that belong to a plan feature. Longest prefix wins. */
const PATH_FEATURES = [
  ["/products", "products"],
  ["/inventory", "products"],
  ["/packages", "packages"],
  ["/memberships", "memberships"],
  ["/gift-cards", "gift_cards"],
  ["/payroll", "payroll"],
  ["/marketing/calls", "call_list"],
  ["/marketing/automations", "automations"],
  ["/marketing/email-templates", "templates"],
  ["/messages", "templates"],
];

export function featureForPath(pathname) {
  const hit = PATH_FEATURES.filter(([p]) => pathname === p || pathname.startsWith(`${p}/`)).sort((a, b) => b[0].length - a[0].length)[0];
  return hit ? hit[1] : null;
}
