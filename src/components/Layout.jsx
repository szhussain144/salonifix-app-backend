import { Suspense, useEffect, useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { Clock, Headset, Lock, Sparkles } from "lucide-react";
import TopNav from "./TopNav";
import { EmptyState } from "./ui";
import { UpgradeWall } from "./Upgrade";
import { featureForPath, PLANS_LINK } from "../config/plans";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { LANDING_ORDER, screenForPath } from "../config/screens";
import constanst from "../config/constants";

/** Page headings; {business}, {staff}, {client}... are filled from the session. */
const titles = {
  "/": { eyebrow: "Home", title: "Welcome back", subtitle: "Here's what's happening at {place} today." },
  "/calendar": { eyebrow: "Schedule", title: "Calendar", subtitle: "Every {staff} and {booking} on one screen." },
  "/new-booking": { eyebrow: "Schedule", title: "New {Booking}", subtitle: "Pick services, then a time when your staff are free." },
  "/bookings": { eyebrow: "Schedule", title: "All {bookings}", subtitle: "Track and manage every {booking}." },
  "/clients": { eyebrow: "{Clients}", title: "{Clients}", subtitle: "Every {client}'s story, in one place." },
  "/services": { eyebrow: "Manage", title: "Services", subtitle: "Your menu, pricing, and durations." },
  "/staff": { eyebrow: "Manage", title: "{Staff}", subtitle: "Your team and how they're doing." },
  "/products": { eyebrow: "Manage", title: "Products", subtitle: "Retail product catalogue." },
  "/messages": { eyebrow: "Marketing", title: "Message templates", subtitle: "Reusable reminder and confirmation texts." },
  "/marketing": { eyebrow: "Marketing", title: "Campaigns", subtitle: "Email, SMS, WhatsApp and voice campaigns for your {clients}." },
  "/marketing/new": { eyebrow: "Marketing", title: "New campaign", subtitle: "Choose a channel, who receives it, and what it says." },
  "/marketing/email-templates": { eyebrow: "Marketing", title: "Email templates", subtitle: "Branded emails you design once and send to {clients} from any campaign." },
  "/marketing/email-templates/new": { eyebrow: "Marketing", title: "New email", subtitle: "Pick a starting point. You can change everything." },
  "/marketing/automations": { eyebrow: "Marketing", title: "Automations", subtitle: "Messages that go out on their own and bring {clients} back." },
  "/marketing/calls": { eyebrow: "Marketing", title: "Call list", subtitle: "Phone follow-ups that win {clients} back." },
  "/payroll": { eyebrow: "Manage", title: "Payroll", subtitle: "Salaries owed, paid and outstanding at {place}." },
  "/expenses": { eyebrow: "Manage", title: "Expenses", subtitle: "Track spending at {place}." },
  "/reports": { eyebrow: "Reports", title: "Reports", subtitle: "The numbers that matter, already worked out." },
  "/inventory": { eyebrow: "Manage", title: "Inventory", subtitle: "Know what's on the shelf before you run out." },
  "/settings": { eyebrow: "Manage", title: "Settings", subtitle: "Your business, locations, team and who can see what." },
  "/packages": { eyebrow: "Manage", title: "Packages", subtitle: "Prepaid bundles of sessions: sell them, and see who has sessions left." },
  "/memberships": { eyebrow: "Manage", title: "Memberships", subtitle: "Monthly and annual plans: members, renewals and what they get." },
  "/close-out": { eyebrow: "Manage", title: "Close the day", subtitle: "What came in by payment method, and whether the cash drawer matches." },
  "/gift-cards": { eyebrow: "Manage", title: "Gift cards", subtitle: "Sell gift cards, send them to the lucky person, and see what's left on each." },
  "/bills/unpaid": { eyebrow: "Schedule", title: "Unpaid bills", subtitle: "Visits checked out to pay later or paid in part. Collect, or send a friendly reminder." },
  "/account": { eyebrow: "You", title: "My account", subtitle: "Your password and where you're signed in." },
};

const prefixes = [
  ["/bookings/", { eyebrow: "Schedule", title: "{Booking} details", subtitle: "Services, payment, and status." }],
  ["/clients/", { eyebrow: "{Clients}", title: "{Client} details", subtitle: "Profile and visit history." }],
  ["/services/", { eyebrow: "Manage", title: "Service", subtitle: "Service details and pricing." }],
  ["/staff/", { eyebrow: "Manage", title: "Staff details", subtitle: "Profile and performance." }],
  ["/products/", { eyebrow: "Manage", title: "Product details", subtitle: "Stock and history." }],
  ["/expenses/", { eyebrow: "Manage", title: "Expense", subtitle: "Expense details." }],
  ["/messages/", { eyebrow: "Marketing", title: "Message", subtitle: "Message details and log." }],
  ["/marketing/email-templates/", { eyebrow: "Marketing", title: "Edit email", subtitle: "Drag blocks in, type straight into the email, then save." }],
  ["/marketing/campaigns/", { eyebrow: "Marketing", title: "Campaign", subtitle: "Message, audience and delivery." }],
  ["/payroll/payslips/", { eyebrow: "Payroll", title: "Payslip", subtitle: "Salary, adjustments and payments." }],
];

function matchTitle(pathname) {
  if (titles[pathname]) return titles[pathname];
  const hit = prefixes.find(([p]) => pathname.startsWith(p));
  return hit ? hit[1] : { title: "{business}" };
}

function fill(text, vars) {
  return text?.replace(/\{(\w+)\}/g, (m, key) => vars[key] ?? m);
}

export default function Layout() {
  const location = useLocation();
  const { loading, fetchWithLoading } = useApi();
  const { business, terms, activeLocation, isAllLocations, activeLocationId, canOpen, signIn, plan, has, isOwner } = useSession();

  // Re-read the session once per visit so screens the owner switched on or off apply
  // without signing out. Pages wait for it, so none opens from an outdated list.
  const [sessionChecked, setSessionChecked] = useState(false);
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetchWithLoading(`${constanst.API_URL}/auth/me`, { silent: true });
        if (res.ok && !cancelled) signIn((await res.json()).data);
      } finally {
        if (!cancelled) setSessionChecked(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fetchWithLoading, signIn]);

  // A new owner picks a plan (or starts the free trial) before anything else.
  if (sessionChecked && isOwner && plan && !plan.chosen) return <Navigate to="/choose-plan" replace />;

  const allowed = canOpen(screenForPath(location.pathname));
  // Screens the plan doesn't include stay in the menu and show what upgrading gives.
  const feature = featureForPath(location.pathname);
  const included = has(feature);
  if (sessionChecked && !allowed && location.pathname === "/") {
    // Dashboard switched off: start on the first screen this role can open.
    const landing = LANDING_ORDER.find(([, screen]) => canOpen(screen));
    if (landing) return <Navigate to={landing[0]} replace />;
  }

  const vars = {
    business: business?.name || "",
    place: isAllLocations || !activeLocation ? business?.name || "your business" : `${business?.name} · ${activeLocation.name}`,
    staff: terms.staff.toLowerCase(),
    Staff: terms.staffPlural,
    client: terms.client.toLowerCase(),
    clients: terms.clientPlural.toLowerCase(),
    Client: terms.client,
    Clients: terms.clientPlural,
    booking: terms.booking.toLowerCase(),
    Booking: terms.booking,
    bookings: terms.bookingPlural.toLowerCase(),
  };
  const heading = matchTitle(location.pathname);
  const [eyebrow, title, subtitle] = [heading.eyebrow, heading.title, heading.subtitle].map((t) => fill(t, vars));

  return (
    <div className="min-h-screen bg-[var(--color-bg)]">
      <SupportBanner />
      <TopNav />
      <PlanBanner />
      <div className="wash">
        <main className="relative mx-auto max-w-[1440px] px-4 pb-10 lg:px-6">
          {/* Keyed by location too, so switching branch remounts the page and reloads its data. */}
          <div key={`${location.pathname}|${activeLocationId}`} className="page-enter">
            <div className="pt-7 pb-6 lg:pt-9">
              {eyebrow && (
                <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">{eyebrow}</p>
              )}
              <h1 className="font-display text-[28px] font-medium leading-tight tracking-tight text-[var(--color-ink)] lg:text-[34px]">
                {title}
              </h1>
              {subtitle && <p className="mt-1.5 text-[14px] text-[var(--color-muted)]">{subtitle}</p>}
            </div>
            {!sessionChecked ? null : allowed && !included ? (
              <UpgradeWall feature={feature} />
            ) : allowed ? (
              <Suspense fallback={<div className="h-40" />}>
                <Outlet />
              </Suspense>
            ) : (
              <EmptyState icon={Lock} title="This screen is switched off for your role">
                Ask the business owner to turn it on in Settings → Roles &amp; permissions.
              </EmptyState>
            )}
          </div>
          {loading && (
            <>
              <div className="absolute inset-0 z-20 bg-[var(--color-bg)]/40" />
              <div className="pointer-events-none fixed inset-x-0 top-14 z-40 h-[3px] overflow-hidden bg-[var(--color-accent)]/15">
                <div className="h-full w-1/3 animate-[loadbar_1.1s_ease-in-out_infinite] bg-[var(--color-accent)]" />
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

/** A slim line under the menu while the free trial runs, and once it has ended. Managers only. */
function PlanBanner() {
  const { plan, isManager, isOwner } = useSession();
  if (!isManager || !plan || !(plan.trial || plan.trial_ended)) return null;
  const ending = plan.trial && plan.trial_days_left <= 7;
  const tone = plan.trial_ended || ending ? "bg-[var(--color-orange)]/10 text-[var(--color-orange)]" : "bg-[var(--color-accent-soft)] text-[var(--color-accent-dark)]";
  const Icon = plan.trial_ended ? Clock : Sparkles;
  return (
    <div className={`border-b border-[var(--color-border-soft)] ${tone}`}>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-2 text-[12.5px] lg:px-6">
        <p className="flex items-center gap-2 font-medium">
          <Icon size={14} />
          {plan.trial_ended
            ? "Your free trial has ended. Starter features apply until you choose a plan."
            : `Free trial: ${plan.trial_days_left} day${plan.trial_days_left === 1 ? "" : "s"} left with every feature unlocked.`}
        </p>
        <Link to={PLANS_LINK.pathname} state={PLANS_LINK.state} className="font-semibold underline-offset-2 hover:underline">
          {isOwner ? "Choose a plan" : "See plans"}
        </Link>
      </div>
    </div>
  );
}

/** Shown while a platform admin is looking at the business as its owner. */
function SupportBanner() {
  const { isSupport, business, signOut } = useSession();
  if (!isSupport) return null;
  const exit = () => {
    signOut();
    window.location.assign("/platform");
  };
  return (
    <div className="bg-[var(--color-orange)] text-white">
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-1.5 text-[12.5px] lg:px-6">
        <p className="flex items-center gap-2 font-medium">
          <Headset size={14} /> Support session: you&apos;re seeing {business?.name} as its owner. It ends after 2 hours.
        </p>
        <button type="button" onClick={exit} className="font-semibold underline underline-offset-2">Exit to the platform</button>
      </div>
    </div>
  );
}
