import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  ArrowRight,
  BarChart3,
  CalendarClock,
  CalendarPlus,
  ClipboardList,
  Crown,
  Package,
  Plus,
  Receipt,
  Scissors,
  TrendingUp,
  UserRound,
  Users,
} from "lucide-react";
import { Card, SectionTitle, Badge, Avatar, Button, EmptyState, StatCard } from "../components/ui";
import { DataTable, Meter, Sparkline, TrendChart, ViewToggle } from "../components/charts";
import { formatAmount, formatCount, formatDay, initialsOf, todayISO, toNumber } from "../components/format";
import { todayLabel } from "../data/mockData";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { DetailLink } from "../components/DetailLink";

const quickActions = [
  { label: "New booking", icon: CalendarPlus, to: "/new-booking", screen: "bookings" },
  { label: "Appointments", icon: ClipboardList, to: "/bookings", screen: "bookings" },
  { label: "Clients", icon: Users, to: "/clients", screen: "clients" },
  { label: "Services", icon: Scissors, to: "/services", screen: "services" },
  { label: "Staff", icon: UserRound, to: "/staff", screen: "staff" },
  { label: "Products", icon: Package, to: "/products", screen: "products" },
  { label: "Expenses", icon: Receipt, to: "/expenses", screen: "expenses" },
  { label: "Reports", icon: BarChart3, to: "/reports", screen: "reports" },
];

export default function Dashboard() {
  const [bookings, setBookings] = useState(0);
  const [completedBookings, setCompletedBookings] = useState(0);
  const [pendingBookings, setPendingBookings] = useState(0);
  const [clientDetails, setClientDetails] = useState(null);
  const [weeklyStats, setWeeklyStats] = useState([]);
  const [recentBookings, setRecentBookings] = useState([]);
  const [todaysBookings, setTodaysBookings] = useState([]);
  const [revenueView, setRevenueView] = useState("chart");
  const { fetchWithLoading } = useApi();
  const { canOpen } = useSession();

  const fetchDashboardData = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/report/dashboard-count`);
      const data = await response.json();
      setBookings(data.data.counts.total_bookings);
      setCompletedBookings(data.data.counts.completed_bookings || 0);
      setPendingBookings(data.data.counts.pending_bookings || 0);
      let next7Days = [];
      let today = new Date();
      for (let i = 0; i < 7; i++) {
        let date = new Date(today);
        date.setDate(today.getDate() + i);
        next7Days.push({ day: date.toISOString().split("T")[0], revenue: 0 });
      }
      data.weeklyStats.weeklyStats.forEach((item) => {
        const index = next7Days.findIndex((d) => d.day === item.date);
        if (index !== -1) next7Days[index].revenue = +item.total_sales;
      });
      setWeeklyStats(next7Days);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
    }
  }, [fetchWithLoading]);

  const fetchRecentBookings = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/bookings?page=1&limit=5&sort=created`);
      const data = await response.json();
      setRecentBookings(data.data);
    } catch (error) {
      console.error("Error fetching recent bookings:", error);
    }
  }, [fetchWithLoading]);

  const fetchTodaysBookings = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/bookings/by-date?date=${todayISO()}`);
      const data = await response.json();
      setTodaysBookings(data.data);
    } catch (error) {
      console.error("Error fetching today's bookings:", error);
    }
  }, [fetchWithLoading]);

  const fetchStarClient = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/report/star-client`);
      const data = await response.json();
      setClientDetails(data.data.starClient);
    } catch (error) {
      console.error("Error fetching star client:", error);
    }
  }, [fetchWithLoading]);

  useEffect(() => {
    fetchDashboardData();
    fetchRecentBookings();
    fetchTodaysBookings();
    fetchStarClient();
  }, [fetchDashboardData, fetchRecentBookings, fetchTodaysBookings, fetchStarClient]);

  const weekTotal = weeklyStats.reduce((s, d) => s + toNumber(d.revenue), 0);
  const bestDay = weeklyStats.reduce((best, d) => (toNumber(d.revenue) > toNumber(best?.revenue) ? d : best), null);
  const star = clientDetails?.client;
  const todays = todaysBookings || [];
  const recent = recentBookings || [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Hero: today's book, the one number this view leads with. */}
        <Card className="banner relative overflow-hidden border-none p-6 sm:p-7 lg:col-span-2">
          <div className="pointer-events-none absolute -right-16 -top-20 h-64 w-64 rounded-full bg-white/10 blur-2xl" aria-hidden="true" />
          <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <p className="text-[12px] font-medium text-[var(--color-accent-ink)]/80">Today's overview · {todayLabel}</p>
              <p className="mt-3 text-[56px] font-semibold leading-none tracking-tight">{formatCount(bookings)}</p>
              <p className="mt-2 text-[13px] text-[var(--color-accent-ink)]/80">bookings on the book today</p>
            </div>
            <div className="w-full max-w-xs space-y-4">
              <div className="flex gap-3">
                <div className="flex-1 rounded-xl bg-white/10 px-3.5 py-2.5 backdrop-blur">
                  <p className="text-[11px] text-[var(--color-accent-ink)]/75">Completed</p>
                  <p className="text-[20px] font-semibold">{formatCount(completedBookings)}</p>
                </div>
                <div className="flex-1 rounded-xl bg-white/10 px-3.5 py-2.5 backdrop-blur">
                  <p className="text-[11px] text-[var(--color-accent-ink)]/75">Pending</p>
                  <p className="text-[20px] font-semibold">{formatCount(pendingBookings)}</p>
                </div>
              </div>
              <div>
                <div className="mb-1.5 flex justify-between text-[11.5px] text-[var(--color-accent-ink)]/80">
                  <span>Completion</span>
                  <span className="font-semibold text-[var(--color-accent-ink)]">
                    {toNumber(bookings) > 0 ? Math.round((toNumber(completedBookings) / toNumber(bookings)) * 100) : 0}%
                  </span>
                </div>
                <Meter value={toNumber(completedBookings)} max={toNumber(bookings)} tone="#FFFEFC" track="rgba(255,254,252,0.22)" />
              </div>
            </div>
          </div>
        </Card>

        <StatCard
          label="Revenue · next 7 days"
          value={formatAmount(weekTotal, { short: true })}
          sub={bestDay && toNumber(bestDay.revenue) > 0 ? `Busiest: ${formatDay(bestDay.day, { long: true })}` : "No bookings scheduled yet"}
          icon={TrendingUp}
          trend={<Sparkline values={weeklyStats.map((d) => d.revenue)} />}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card className="p-5">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">Next 7 days</p>
                <h2 className="font-display text-[17px] font-medium tracking-tight">Revenue overview</h2>
                <p className="mt-1 text-[13px] text-[var(--color-muted)]">
                  <span className="font-semibold text-[var(--color-ink)]">{formatAmount(weekTotal)}</span> booked so far
                </p>
              </div>
              <ViewToggle value={revenueView} onChange={setRevenueView} />
            </div>
            {revenueView === "chart" ? (
              <TrendChart data={weeklyStats} xKey="day" yKey="revenue" height={220} label="Revenue booked for the next seven days" />
            ) : (
              <DataTable
                rows={weeklyStats}
                columns={[
                  { key: "day", label: "Day", format: (v) => formatDay(v, { long: true }) },
                  { key: "revenue", label: "Revenue", align: "right", format: (v) => formatAmount(v) },
                ]}
              />
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle
              eyebrow={todayLabel}
              title="Today's appointments"
              action={
                <Link to="/bookings">
                  <Button variant="ghost" className="!py-1.5">
                    View all <ArrowRight size={13} />
                  </Button>
                </Link>
              }
            />
            {todays.length ? (
              <ol className="relative space-y-2 before:absolute before:left-[27px] before:top-3 before:bottom-3 before:w-px before:bg-[var(--color-border)]">
                {todays.map((b, i) => {
                  const [h = "--", m = "00"] = String(b.start_time || "").split(":");
                  return (
                    // One row per booked service, so a booking ID can repeat.
                    <li key={`${b.id}-${i}`}>
                      <DetailLink
                        to={`/bookings/${b.id}`}
                        className="relative flex items-center justify-between gap-3 rounded-xl border border-transparent p-2.5 transition-colors hover:border-[var(--color-border)] hover:bg-[var(--color-panel-alt)]/60"
                      >
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="relative z-10 flex h-[42px] w-[42px] shrink-0 flex-col items-center justify-center rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] leading-none">
                            <span className="text-[13px] font-semibold text-[var(--color-accent)]">{h}</span>
                            <span className="mt-0.5 text-[10px] text-[var(--color-faint)]">{m}</span>
                          </div>
                          <div className="min-w-0">
                            <p className="truncate text-[13.5px] font-semibold">{b.client_name}</p>
                            <p className="truncate text-[12px] text-[var(--color-muted)]">{b.service_names}</p>
                          </div>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <p className="hidden text-[13px] font-semibold tabular-nums sm:block">{formatAmount(b.total_amount)}</p>
                          <Badge>{b.status}</Badge>
                        </div>
                      </DetailLink>
                    </li>
                  );
                })}
              </ol>
            ) : (
              <EmptyState
                icon={CalendarClock}
                title="No appointments today"
                action={
                  <Link to="/new-booking">
                    <Button>
                      <Plus size={14} /> New booking
                    </Button>
                  </Link>
                }
              >
                The book is clear. Add a walk-in or schedule an appointment.
              </EmptyState>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5">
            <SectionTitle eyebrow="Top spender" title="Star client" />
            {star ? (
              <>
                <div className="mb-4 flex items-center gap-3">
                  <div className="relative">
                    <Avatar initials={initialsOf(star.client_name)} size={46} />
                    <span className="absolute -bottom-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-[#E0A21B] text-white ring-2 ring-[var(--color-panel)]">
                      <Crown size={11} />
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="truncate text-[15px] font-semibold capitalize">{star.client_name}</p>
                    <p className="text-[12px] text-[var(--color-muted)]">{star.phone}</p>
                  </div>
                </div>
                <div className="mb-4 grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-[var(--color-panel-alt)] p-3">
                    <p className="text-[11.5px] text-[var(--color-muted)]">Visits</p>
                    <p className="text-[18px] font-semibold">{formatCount(star.total_bookings)}</p>
                  </div>
                  <div className="rounded-xl bg-[var(--color-panel-alt)] p-3">
                    <p className="text-[11.5px] text-[var(--color-muted)]">Total spend</p>
                    <p className="text-[18px] font-semibold">{formatAmount(star.total_spent, { short: true })}</p>
                  </div>
                </div>
                <p className="mb-2 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">Recent visits</p>
                <ul className="max-h-56 space-y-1 overflow-y-auto scrollbar-none pb-3 [mask-image:linear-gradient(to_bottom,#000_82%,transparent)]">
                  {(clientDetails?.bookingDetails || []).map((h, i) => (
                    <li key={i} className="flex items-center justify-between gap-3 rounded-lg px-2 py-1.5 text-[12.5px] hover:bg-[var(--color-panel-alt)]/60">
                      <div className="min-w-0">
                        <p className="truncate text-[var(--color-ink)]">{h.services}</p>
                        <p className="text-[11px] text-[var(--color-faint)]">{formatDay(h.booking_date, { long: true })}</p>
                      </div>
                      <p className="shrink-0 font-semibold tabular-nums">{formatAmount(h.total_spent)}</p>
                    </li>
                  ))}
                </ul>
                <Link to="/clients">
                  <Button variant="subtle" className="mt-4 w-full">
                    All clients
                  </Button>
                </Link>
              </>
            ) : (
              <EmptyState icon={Crown} title="No star client yet">
                Your top-spending client will appear here.
              </EmptyState>
            )}
          </Card>

          <Card className="p-5">
            <SectionTitle
              title="Recent bookings"
              action={
                <Link to="/bookings" className="text-[12.5px] font-medium text-[var(--color-accent)] hover:underline">
                  See all
                </Link>
              }
            />
            {recent.length ? (
              <ul className="space-y-1">
                {recent.map((b) => (
                  <li key={b.id}>
                    <DetailLink
                      to={`/bookings/${b.id}`}
                      className="flex items-center gap-3 rounded-xl px-2 py-2 transition-colors hover:bg-[var(--color-panel-alt)]/60"
                    >
                      <Avatar initials={initialsOf(b.client_name)} size={32} />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] font-medium capitalize">{b.client_name}</p>
                        <p className="truncate text-[11.5px] text-[var(--color-muted)]">{b.service_names}</p>
                      </div>
                      <Badge>{b.status}</Badge>
                    </DetailLink>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState icon={ClipboardList} title="No bookings yet" />
            )}
          </Card>
        </div>
      </div>

      <Card className="p-5">
        <SectionTitle title="Quick actions" />
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-3">
          {quickActions.filter((a) => canOpen(a.screen)).map((a) => (
            <Link
              key={a.label}
              to={a.to}
              className="group flex flex-col items-center justify-center gap-2.5 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-panel-alt)]/50 p-4 text-center transition-all hover:-translate-y-0.5 hover:border-[var(--color-accent)]/40 hover:bg-[var(--color-panel)] hover:shadow-[var(--shadow-card)]"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)] transition-colors group-hover:bg-[var(--color-accent)] group-hover:text-[var(--color-accent-ink)]">
                <a.icon size={17} />
              </span>
              <span className="text-[12px] font-medium text-[var(--color-ink-2)]">{a.label}</span>
            </Link>
          ))}
        </div>
      </Card>
    </div>
  );
}
