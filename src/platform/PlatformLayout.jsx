import { Suspense, useEffect, useState } from "react";
import { Navigate, NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { Building2, LayoutDashboard, LogOut, Menu, Receipt, ShieldCheck, X } from "lucide-react";
import Mark from "../components/Mark";
import { clearPlatformSession, getPlatformSession, usePlatformApi } from "./platformApi";

const NAV = [
  { to: "/platform", label: "Overview", icon: LayoutDashboard, end: true },
  { to: "/platform/businesses", label: "Salons", icon: Building2 },
  { to: "/platform/invoices", label: "Invoices", icon: Receipt },
  { to: "/platform/admins", label: "Admins", icon: ShieldCheck },
];

/** The platform portal's frame: a navy side menu, and the page. */
export default function PlatformLayout() {
  const api = usePlatformApi();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const [admin, setAdmin] = useState(() => getPlatformSession()?.admin || null);
  const [open, setOpen] = useState(false);
  const signedIn = Boolean(getPlatformSession()?.token);

  useEffect(() => {
    if (!signedIn) return;
    api("/auth/me").then((r) => r.ok && setAdmin(r.data));
  }, [api, signedIn]);

  useEffect(() => {
    document.title = "Platform admin";
    setOpen(false);
  }, [pathname]);

  if (!signedIn) return <Navigate to="/platform/login" replace />;

  const signOut = () => {
    clearPlatformSession();
    navigate("/platform/login", { replace: true });
  };

  const menu = (
    <nav className="flex flex-1 flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          className={({ isActive }) =>
            `flex items-center gap-3 rounded-xl px-3 py-2.5 text-[13.5px] font-medium transition-colors ${
              isActive ? "bg-white/12 text-white" : "text-[var(--color-navy-ink-2)] hover:bg-white/6 hover:text-white"
            }`
          }
        >
          <Icon size={17} /> {label}
        </NavLink>
      ))}
    </nav>
  );
  const footer = (
    <div className="border-t border-white/10 pt-4">
      <p className="truncate text-[13px] font-semibold text-white">{admin?.name}</p>
      <p className="truncate text-[12px] text-[var(--color-navy-ink-2)]">{admin?.email}</p>
      <button type="button" onClick={signOut} className="mt-3 flex items-center gap-2 text-[12.5px] font-medium text-[var(--color-navy-accent)] hover:text-white">
        <LogOut size={14} /> Sign out
      </button>
    </div>
  );
  const brand = (
    <div className="flex items-center gap-2 text-[var(--color-navy-accent)]">
      <Mark size={22} />
      <span className="font-display text-[15px] font-semibold text-white">Salonifix</span>
      <span className="rounded-full bg-white/10 px-2 py-0.5 text-[10.5px] font-semibold">Platform</span>
    </div>
  );

  return (
    <div className="min-h-screen bg-[var(--color-bg)] lg:flex">
      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col gap-8 bg-[var(--color-navy)] p-5 lg:flex">
        {brand}
        {menu}
        {footer}
      </aside>

      <header className="sticky top-0 z-30 flex items-center justify-between bg-[var(--color-navy)] px-4 py-3 lg:hidden">
        {brand}
        <button type="button" aria-label={open ? "Close menu" : "Open menu"} onClick={() => setOpen((v) => !v)} className="rounded-lg p-1.5 text-white hover:bg-white/10">
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>
      {open && (
        <div className="fixed inset-x-0 top-[52px] z-30 flex flex-col gap-6 bg-[var(--color-navy)] p-4 shadow-xl lg:hidden">
          {menu}
          {footer}
        </div>
      )}

      <main className="wash min-w-0 flex-1">
        <div key={pathname} className="page-enter mx-auto max-w-[1280px] px-4 py-7 lg:px-8 lg:py-9">
          <Suspense fallback={<div className="h-40" />}>
            <Outlet />
          </Suspense>
        </div>
      </main>
    </div>
  );
}

/** Page heading used by every portal screen. */
export function PlatformHeading({ eyebrow, title, subtitle, action }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        {eyebrow && <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">{eyebrow}</p>}
        <h1 className="font-display text-[28px] font-medium leading-tight tracking-tight lg:text-[32px]">{title}</h1>
        {subtitle && <p className="mt-1.5 text-[14px] text-[var(--color-muted)]">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}
