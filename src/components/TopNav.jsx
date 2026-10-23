import { useEffect, useRef, useState } from "react";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  Boxes,
  Calendar,
  CalendarPlus,
  ChevronDown,
  Crown,
  ClipboardList,
  LayoutDashboard,
  LayoutTemplate,
  Gift,
  Vault,
  Layers,
  Workflow,
  KeyRound,
  LogOut,
  MapPin,
  Mail,
  Menu,
  MessageCircle,
  Package,
  PhoneCall,
  Plus,
  Receipt,
  Settings,
  UserRound,
  Wallet,
  Users,
  X,
} from "lucide-react";
import ChairIcon from "./ChairIcon";
import Mark from "./Mark";
import NotificationBell from "./NotificationBell";
import { useSession } from "../context/SessionContext";
import { ALL_LOCATIONS } from "../context/sessionStore";
import { PlanChip } from "./Upgrade";
import { featureForPath } from "../config/plans";

/* Grouped the way Salonifix groups its features (features-data.ts):
   scheduling & payments, client relationships, marketing & automation,
   and management. Each group opens as a mega menu: a feature card on the
   left (with its most-used action) and the pages in labelled columns. */
const buildNav = (t) => [
  { to: "/", label: "Home", icon: LayoutDashboard, end: true, screen: "dashboard" },
  {
    label: "Schedule",
    icon: Calendar,
    intro: "Fill the book and keep the front desk calm.",
    text: `See the day at a glance, book walk-ins and collect what's owed.`,
    action: { to: "/new-booking", label: `New ${t.booking.toLowerCase()}`, screen: "bookings" },
    sections: [
      {
        title: "Book",
        items: [
          { to: "/calendar", label: "Calendar", icon: Calendar, screen: "calendar", short: `Colour-coded schedule for every ${t.staff.toLowerCase()}.` },
          { to: "/new-booking", label: `New ${t.booking.toLowerCase()}`, icon: CalendarPlus, screen: "bookings", short: "Walk-in or appointment in a few taps." },
        ],
      },
      {
        title: "Follow up",
        items: [
          { to: "/bookings", label: `All ${t.bookingPlural.toLowerCase()}`, icon: ClipboardList, screen: "bookings", short: `Track and manage every ${t.booking.toLowerCase()}.` },
          { to: "/bills/unpaid", label: "Unpaid bills", icon: Wallet, screen: "bookings", short: "Collect what's owed, send reminders." },
        ],
      },
    ],
  },
  { to: "/clients", label: t.clientPlural, icon: Users, screen: "clients" },
  {
    label: "Marketing",
    icon: MessageCircle,
    intro: "Bring clients back by email, SMS, WhatsApp and calls.",
    text: "Send a campaign today, or let automations do the remembering.",
    action: { to: "/marketing/new", label: "New campaign", screen: "marketing" },
    sections: [
      {
        title: "Campaigns",
        items: [
          { to: "/marketing", label: "Campaigns", icon: Mail, screen: "marketing", short: "Email, SMS, WhatsApp and voice campaigns." },
          { to: "/marketing/new", label: "New campaign", icon: Plus, screen: "marketing", short: "Pick a channel, audience and message." },
          { to: "/marketing/email-templates", label: "Email templates", icon: LayoutTemplate, screen: "marketing", short: "Design branded emails to reuse in campaigns." },
        ],
      },
      {
        title: "Keep in touch",
        items: [
          { to: "/marketing/automations", label: "Automations", icon: Workflow, screen: "marketing", short: "Birthday, we miss you, reviews, rebook." },
          { to: "/marketing/calls", label: "Call list", icon: PhoneCall, screen: "call_list", short: "Follow up by phone and log outcomes." },
          { to: "/messages", label: "Message templates", icon: MessageCircle, screen: "messages", short: "Reusable reminder and confirmation texts." },
        ],
      },
    ],
  },
  {
    label: "Manage",
    icon: Boxes,
    intro: "Run the business side with numbers you can trust.",
    text: "Menu, stock, team and money, all in one place. End each day with a counted drawer.",
    action: { to: "/close-out", label: "Close the day", screen: "close_out" },
    sections: [
      {
        title: "Menu & stock",
        items: [
          { to: "/services", label: "Services", icon: ChairIcon, screen: "services", short: "Menu, pricing, and durations." },
          { to: "/products", label: "Products", icon: Package, screen: "products", short: "Retail catalogue and stock." },
          { to: "/inventory", label: "Inventory", icon: Boxes, screen: "inventory", short: "Stock levels and reorder alerts." },
        ],
      },
      {
        title: "Sell more",
        items: [
          { to: "/gift-cards", label: "Gift cards", icon: Gift, screen: "gift_cards", short: "Sell them, send them, see balances." },
          { to: "/packages", label: "Packages", icon: Layers, screen: "packages", short: "Prepaid bundles of sessions." },
          { to: "/memberships", label: "Memberships", icon: Crown, screen: "memberships", short: "Monthly and annual plans with member perks." },
        ],
      },
      {
        title: "Team & setup",
        items: [
          { to: "/staff", label: t.staffPlural, icon: UserRound, screen: "staff", short: "Your team and their performance." },
          { to: "/payroll", label: "Payroll", icon: Wallet, screen: "payroll", short: "Pay salaries and track balances." },
          { to: "/settings", label: "Settings", icon: Settings, screen: "settings", short: "Business, locations and team." },
        ],
      },
      {
        title: "Money",
        items: [
          { to: "/expenses", label: "Expenses", icon: Receipt, screen: "expenses", short: "Track spending per location." },
          { to: "/close-out", label: "Close the day", icon: Vault, screen: "close_out", short: "Count the cash drawer against the takings." },
        ],
      },
    ],
  },
  { to: "/reports", label: "Reports", icon: BarChart3, screen: "reports" },
];

const isUnder = (pathname, to) => (to === "/" ? pathname === "/" : pathname === to || pathname.startsWith(`${to}/`));

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("user")) || {};
  } catch {
    return {};
  }
}

function initialsOf(name) {
  return String(name || "A")
    .split(/[\s@.]+/)
    .filter(Boolean)
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

const tabBase =
  "flex items-center gap-2 px-3 py-2 rounded-[9px] text-[13px] whitespace-nowrap transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-navy-accent)]";
const tabOn = "bg-white/12 text-[var(--color-navy-ink)] font-semibold";
const tabOff = "text-[var(--color-navy-ink-2)] hover:text-[var(--color-navy-ink)] hover:bg-white/6";

function useDismiss(ref, open, close) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && close();
    const onKey = (e) => e.key === "Escape" && close();
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [ref, open, close]);
}

function LocationSwitcher() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const close = () => setOpen(false);
  useDismiss(ref, open, close);
  const { activeLocations, activeLocation, isAllLocations, setActiveLocationId } = useSession();

  if (activeLocations.length === 0) return null;
  const label = isAllLocations ? "All locations" : activeLocation?.name || "Select location";
  const options = [
    ...(activeLocations.length > 1 ? [{ id: ALL_LOCATIONS, name: "All locations" }] : []),
    ...activeLocations,
  ];

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Location: ${label}`}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 rounded-lg border border-white/15 px-2.5 py-1.5 text-[12.5px] text-[var(--color-navy-ink)] hover:bg-white/6"
      >
        <MapPin size={14} className="text-[var(--color-navy-accent)]" />
        <span className="max-w-[130px] truncate">{label}</span>
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div
          role="menu"
          className="menu-in absolute right-0 top-[calc(100%+10px)] z-50 w-60 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-panel)] p-1.5 shadow-[0_30px_70px_rgba(32,34,53,0.18)]"
        >
          <p className="px-3 pt-1.5 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">Location</p>
          {options.map((loc) => {
            const selected = String(loc.id) === (isAllLocations ? ALL_LOCATIONS : String(activeLocation?.id));
            return (
              <button
                key={loc.id}
                type="button"
                role="menuitemradio"
                aria-checked={selected}
                onClick={() => {
                  setActiveLocationId(loc.id);
                  close();
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[13px] ${
                  selected ? "bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent-dark)]" : "text-[var(--color-ink)] hover:bg-[var(--color-panel-alt)]"
                }`}
              >
                <span className="truncate">{loc.name}</span>
                {loc.address && <span className="ml-2 truncate text-[11px] text-[var(--color-faint)]">{loc.address.split(",")[0]}</span>}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* One top-bar group. The wrapper is not positioned, so the panel spans the whole
   header (the sticky header is its containing block) while staying next to its
   button in the tab order. */
function MegaMenu({ group, pathname, open, onToggle, onClose, onHover, onLeave }) {
  const items = group.sections.flatMap((s) => s.items);
  const on = items.some((i) => isUnder(pathname, i.to));
  // The most specific matching item wins (/marketing/calls should not also light up /marketing).
  const activeTo = items
    .filter((i) => isUnder(pathname, i.to))
    .reduce((best, i) => (i.to.length > (best?.length ?? 0) ? i.to : best), null);
  const Icon = group.icon;
  const id = `mega-${group.label.toLowerCase()}`;
  const panelRef = useRef(null);
  const wide = group.sections.length > 2;
  let n = 0; // running index, so links ripple in column by column

  const onKeyDown = (e) => {
    if (e.key !== "ArrowDown") return;
    e.preventDefault();
    if (!open) onToggle();
    requestAnimationFrame(() => panelRef.current?.querySelector("a")?.focus());
  };

  return (
    <div data-mega onPointerEnter={(e) => e.pointerType === "mouse" && onHover()} onPointerLeave={(e) => e.pointerType === "mouse" && onLeave()}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={id}
        onClick={onToggle}
        onKeyDown={onKeyDown}
        className={`${tabBase} ${on || open ? tabOn : tabOff}`}
      >
        <Icon size={15} strokeWidth={on ? 2.4 : 2} className="hidden xl:block" />
        {group.label}
        <ChevronDown size={13} className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          id={id}
          ref={panelRef}
          className="mega-in absolute inset-x-0 top-full z-50 border-t border-[var(--color-border)] bg-[var(--color-panel)] shadow-[0_30px_60px_-20px_rgba(24,50,74,0.35)]"
        >
          <div className="mx-auto flex max-w-[1440px] gap-8 px-6 py-7">
            <aside className="banner relative flex w-[290px] shrink-0 flex-col overflow-hidden rounded-[var(--radius-card)] p-6">
              <span aria-hidden className="pointer-events-none absolute -right-10 -bottom-12 opacity-[0.12]">
                <Icon size={190} strokeWidth={1.2} />
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 backdrop-blur-sm">
                <Icon size={19} />
              </span>
              <p className="mt-4 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-white/70">{group.label}</p>
              <h2 className="mt-1 font-display text-[19px] font-semibold leading-snug">{group.intro}</h2>
              <p className="mt-2 text-[12.5px] leading-relaxed text-white/75">{group.text}</p>
              {group.action && (
                <Link
                  to={group.action.to}
                  onClick={onClose}
                  className="group/cta relative mt-6 inline-flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-[12.5px] font-semibold text-[var(--color-accent-dark)] shadow-[0_8px_20px_-8px_rgba(0,0,0,0.45)] transition-transform hover:-translate-y-0.5"
                >
                  {group.action.label}
                  <ArrowRight size={14} className="transition-transform group-hover/cta:translate-x-0.5" />
                </Link>
              )}
            </aside>

            <div className={`grid flex-1 content-start gap-x-6 gap-y-6 ${wide ? "grid-cols-2 xl:grid-cols-4" : "max-w-[760px] grid-cols-2"}`}>
              {group.sections.map((section) => (
                <div key={section.title} className="min-w-0">
                  <p className="mega-item mb-2 border-b border-[var(--color-border-soft)] px-3 pb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]" style={{ "--m": n }}>
                    {section.title}
                  </p>
                  {section.items.map((item) => {
                    const active = item.to === activeTo;
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        onClick={onClose}
                        aria-current={active ? "page" : undefined}
                        style={{ "--m": ++n }}
                        className={`mega-item group/item flex items-start gap-3 rounded-xl px-3 py-2.5 transition-colors outline-none focus-visible:ring-2 focus-visible:ring-[var(--color-accent)] ${
                          active ? "bg-[var(--color-accent-soft)]" : "hover:bg-[var(--color-panel-alt)]"
                        }`}
                      >
                        <span
                          className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-[10px] transition-transform duration-300 group-hover/item:scale-110 group-hover/item:-rotate-6 ${
                            active
                              ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                              : "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                          }`}
                        >
                          <item.icon size={16} />
                        </span>
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 text-[13.5px] font-semibold text-[var(--color-ink)]">
                            {item.label}
                            <PlanChip feature={featureForPath(item.to)} className="ml-1" />
                            <ArrowRight size={12} className="-translate-x-1 opacity-0 transition-all duration-200 group-hover/item:translate-x-0 group-hover/item:opacity-100" />
                          </span>
                          <span className="block text-[12px] leading-snug text-[var(--color-muted)]">{item.short}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function UserMenu() {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const close = () => setOpen(false);
  useDismiss(ref, open, close);
  const { business, signOut, canOpen } = useSession();
  const user = readUser();
  const name = user.name || user.email || "Admin";

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg py-1 pl-3 lg:border-l lg:border-white/15 text-[var(--color-navy-ink-2)] hover:text-[var(--color-navy-ink)]"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-[var(--color-accent)] text-[10px] font-semibold text-[var(--color-accent-ink)]">
          {initialsOf(name)}
        </span>
        <span className="hidden text-left leading-tight md:block lg:hidden 2xl:block">
          <b className="block max-w-[140px] truncate text-[12px] font-semibold text-[var(--color-navy-ink)]">{name}</b>
          <i className="block max-w-[140px] truncate text-[11px]">{business?.name}</i>
        </span>
        <ChevronDown size={13} />
      </button>

      {open && (
        <div className="menu-in absolute right-0 top-[calc(100%+10px)] z-50 w-52 rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-panel)] p-1.5 shadow-[0_30px_70px_rgba(32,34,53,0.18)]">
          <Link
            to="/account"
            onClick={close}
            className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-[var(--color-ink)] hover:bg-[var(--color-panel-alt)]"
          >
            <KeyRound size={15} className="text-[var(--color-muted)]" /> My account
          </Link>
          {canOpen("settings") && (
            <Link
              to="/settings"
              onClick={close}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-[13px] text-[var(--color-ink)] hover:bg-[var(--color-panel-alt)]"
            >
              <Settings size={15} className="text-[var(--color-muted)]" /> Settings
            </Link>
          )}
          <button
            type="button"
            onClick={() => {
              signOut();
              navigate("/login");
            }}
            className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-[var(--color-red)] hover:bg-[var(--color-red)]/8"
          >
            <LogOut size={15} /> Sign out
          </button>
        </div>
      )}
    </div>
  );
}

function MobileMenu({ nav, pathname, onClose }) {
  return (
    <div className="lg:hidden">
      <div className="fixed inset-0 z-40 bg-[var(--color-ink)]/40" onClick={onClose} />
      <nav className="menu-in fixed inset-x-3 top-[68px] z-50 max-h-[calc(100vh-84px)] overflow-y-auto rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-panel)] p-2 shadow-[0_30px_70px_rgba(32,34,53,0.25)]">
        {nav.map((entry) =>
          entry.sections ? (
            <div key={entry.label} className="py-1">
              <p className="px-3 pt-2 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">
                {entry.label}
              </p>
              {entry.sections.map((section) => (
                <div key={section.title}>
                  <p className="px-3 pt-1.5 pb-0.5 text-[11px] font-medium text-[var(--color-muted)]">{section.title}</p>
                  {section.items.map((item) => (
                    <MobileLink key={item.to} item={item} active={isUnder(pathname, item.to)} onClose={onClose} />
                  ))}
                </div>
              ))}
            </div>
          ) : (
            <MobileLink key={entry.to} item={entry} active={isUnder(pathname, entry.to)} onClose={onClose} />
          )
        )}
      </nav>
    </div>
  );
}

function MobileLink({ item, active, onClose }) {
  return (
    <Link
      to={item.to}
      onClick={onClose}
      className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-[14px] ${
        active ? "bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent-dark)]" : "text-[var(--color-ink)] hover:bg-[var(--color-panel-alt)]"
      }`}
    >
      <item.icon size={16} />
      <span className="flex-1">{item.label}</span>
      <PlanChip feature={featureForPath(item.to)} />
    </Link>
  );
}

export default function TopNav() {
  const { pathname } = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [openMenu, setOpenMenu] = useState(null);
  const timer = useRef(null);
  const { terms, canOpen } = useSession();
  // Screens switched off for this role (Settings → Roles & permissions) are left out.
  const nav = buildNav(terms)
    .map((entry) =>
      entry.sections
        ? {
            ...entry,
            action: entry.action && canOpen(entry.action.screen) ? entry.action : null,
            sections: entry.sections
              .map((s) => ({ ...s, items: s.items.filter((i) => canOpen(i.screen)) }))
              .filter((s) => s.items.length > 0),
          }
        : entry
    )
    .filter((entry) => (entry.sections ? entry.sections.length > 0 : canOpen(entry.screen)));

  const closeMenu = () => {
    clearTimeout(timer.current);
    setOpenMenu(null);
  };
  // Hover opens after a short pause (so sweeping the mouse across the bar doesn't
  // flash panels), switches instantly once one is open, and forgives a brief exit.
  const hoverMenu = (label) => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpenMenu(label), openMenu ? 0 : 140);
  };
  const leaveMenu = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setOpenMenu(null), 260);
  };

  useEffect(() => {
    setMobileOpen(false);
    setOpenMenu(null);
  }, [pathname]);
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!openMenu) return;
    const onDown = (e) => !e.target.closest("[data-mega]") && setOpenMenu(null);
    const onKey = (e) => e.key === "Escape" && setOpenMenu(null);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [openMenu]);

  return (
    <header className="sticky top-0 z-30 bg-[var(--color-navy)] shadow-[0_1px_0_rgba(255,255,255,0.04),0_8px_24px_-12px_rgba(24,50,74,0.6)]">
      {openMenu && <div aria-hidden className="mega-veil fixed inset-x-0 top-14 bottom-0 hidden bg-[var(--color-ink)]/30 backdrop-blur-[2px] lg:block" />}
      <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-4 px-4 lg:px-6">
        <button
          type="button"
          aria-label={mobileOpen ? "Close menu" : "Open menu"}
          onClick={() => setMobileOpen((v) => !v)}
          className="-ml-1 rounded-lg p-1.5 text-[var(--color-navy-ink-2)] hover:text-[var(--color-navy-ink)] lg:hidden"
        >
          {mobileOpen ? <X size={20} /> : <Menu size={20} />}
        </button>

        <Link to="/" className="flex shrink-0 items-center gap-2 text-[var(--color-navy-accent)]" aria-label="Salonifix home">
          <Mark size={22} />
          <span className="hidden font-display text-[15px] font-semibold tracking-tight text-[var(--color-navy-ink)] sm:inline">
            Salonifix
          </span>
        </Link>

        <nav className="hidden min-w-0 items-center gap-0.5 lg:flex" aria-label="Main">
          {nav.map((entry) =>
            entry.sections ? (
              <MegaMenu
                key={entry.label}
                group={entry}
                pathname={pathname}
                open={openMenu === entry.label}
                onToggle={() => {
                  clearTimeout(timer.current);
                  setOpenMenu((v) => (v === entry.label ? null : entry.label));
                }}
                onClose={closeMenu}
                onHover={() => hoverMenu(entry.label)}
                onLeave={leaveMenu}
              />
            ) : (
              <NavLink
                key={entry.to}
                to={entry.to}
                end={entry.end}
                className={({ isActive }) => `${tabBase} ${isActive || isUnder(pathname, entry.to) ? tabOn : tabOff}`}
              >
                {({ isActive }) => (
                  <>
                    <entry.icon size={15} strokeWidth={isActive ? 2.4 : 2} className="hidden xl:block" />
                    {entry.label}
                  </>
                )}
              </NavLink>
            )
          )}
        </nav>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          <LocationSwitcher />
          {canOpen("bookings") && <Link
            to="/new-booking"
            title={`New ${terms.booking.toLowerCase()}`}
            aria-label={`New ${terms.booking.toLowerCase()}`}
            className="hidden items-center gap-1.5 rounded-full bg-[var(--color-accent)] px-3.5 py-1.5 text-[12.5px] font-semibold text-[var(--color-accent-ink)] transition-colors hover:bg-[#8a3fdc] sm:inline-flex"
          >
            {/* Icon only on mid-size screens, where the menu needs the room. */}
            <Plus size={14} strokeWidth={2.5} /> <span className="lg:hidden xl:inline">New {terms.booking.toLowerCase()}</span>
          </Link>}
          <NotificationBell />
          <UserMenu />
        </div>
      </div>

      {mobileOpen && <MobileMenu nav={nav} pathname={pathname} onClose={() => setMobileOpen(false)} />}
    </header>
  );
}
