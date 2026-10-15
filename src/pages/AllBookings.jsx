import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { CheckCircle2, Plus, Search, X } from "lucide-react";
import { Card, SectionTitle, Table, Tr, Td, Badge, Button, Avatar, EmptyState } from "../components/ui";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import useDebounce from "../context/debounce";
import { DetailLink } from "../components/DetailLink";
import { formatAmount, formatDay, initialsOf } from "../components/format";
import { clockTime } from "../components/timeSlots";

const WHEN = [
  { value: "upcoming", label: "Upcoming" },
  { value: "today", label: "Today" },
  { value: "past", label: "Past" },
  { value: "all", label: "All dates" },
];
const STATUSES = ["All", "Upcoming", "Confirmed", "Completed", "Cancelled", "No-show"];
const PAGE_SIZE = 10;

/* Page numbers to show: first, last, and a window around the current page. */
function pageList(current, total) {
  const pages = new Set([1, total, current - 1, current, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);
  return sorted.flatMap((p, i) => (i > 0 && p - sorted[i - 1] > 1 ? ["…", p] : [p]));
}

export default function AllBookings() {
  const { fetchWithLoading } = useApi();
  const { isAllLocations, terms } = useSession();
  const routerLocation = useLocation();
  const navigate = useNavigate();

  const [when, setWhen] = useState("upcoming");
  const [status, setStatus] = useState("All");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 400);
  const [result, setResult] = useState({ bookings: [], total: 0, statusCounts: {} });
  const [created, setCreated] = useState(() => routerLocation.state?.created ?? null);

  // Show the "saved" banner once; a refresh should not bring it back.
  useEffect(() => {
    if (routerLocation.state?.created) navigate(routerLocation.pathname, { replace: true, state: null });
  }, [routerLocation, navigate]);

  const fetchBookings = useCallback(async () => {
    const params = new URLSearchParams({
      search: debouncedSearch,
      when,
      page: String(page),
      limit: String(PAGE_SIZE),
    });
    if (status !== "All") params.set("status", status);
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/bookings?${params}`);
      const json = await response.json();
      setResult({ bookings: json.data || [], total: json.count || 0, statusCounts: json.status_counts || {} });
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  }, [fetchWithLoading, debouncedSearch, when, status, page]);

  useEffect(() => {
    fetchBookings();
  }, [fetchBookings]);

  // Any filter change starts again from page 1.
  const changeFilter = (setter) => (value) => {
    setter(value);
    setPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(result.total / PAGE_SIZE));
  const allCount = Object.values(result.statusCounts).reduce((sum, n) => sum + n, 0);
  const from = result.total === 0 ? 0 : (page - 1) * PAGE_SIZE + 1;
  const to = Math.min(page * PAGE_SIZE, result.total);
  const plural = terms.bookingPlural.toLowerCase();

  const columns = [terms.client, "Date & time", ...(isAllLocations ? ["Location"] : []), "Services", "Amount", "Status", "Payment", ""];

  return (
    <Card className="p-5">
      <SectionTitle
        eyebrow={`${result.total} ${result.total === 1 ? terms.booking.toLowerCase() : plural}`}
        title={`All ${plural}`}
        action={
          <Link to="/new-booking">
            <Button><Plus size={14} /> New {terms.booking.toLowerCase()}</Button>
          </Link>
        }
      />

      {created && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-green)]/30 bg-[var(--color-green)]/10 px-4 py-3 text-[13px]">
          <span className="flex items-center gap-2">
            <CheckCircle2 size={16} className="text-[var(--color-green)]" />
            <span>
              {terms.booking} for <b>{created.client}</b> saved for {formatDay(created.date, { long: true })} at {clockTime(created.time)}.
            </span>
          </span>
          <span className="flex items-center gap-3">
            <DetailLink to={`/bookings/${created.id}`} className="font-medium text-[var(--color-accent)] hover:underline">
              View
            </DetailLink>
            <button type="button" onClick={() => setCreated(null)} aria-label="Dismiss" className="text-[var(--color-muted)] hover:text-[var(--color-ink)]">
              <X size={15} />
            </button>
          </span>
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <div className="flex w-full items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2 transition-shadow focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_3px_rgba(116,41,195,0.14)] sm:w-72">
          <Search size={14} className="text-[var(--color-faint)]" />
          <input
            placeholder={`Search name or phone…`}
            className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--color-faint)]"
            value={search}
            onChange={(e) => changeFilter(setSearch)(e.target.value)}
          />
        </div>
        <div className="inline-flex rounded-full bg-[var(--color-panel-alt)] p-1" role="tablist" aria-label="Dates">
          {WHEN.map((w) => (
            <button
              key={w.value}
              type="button"
              role="tab"
              aria-selected={when === w.value}
              onClick={() => changeFilter(setWhen)(w.value)}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${when === w.value ? "bg-[var(--color-panel)] text-[var(--color-ink)] shadow-sm" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"}`}
            >
              {w.label}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {STATUSES.map((s) => {
          const count = s === "All" ? allCount : result.statusCounts[s] ?? 0;
          return (
            <button
              key={s}
              type="button"
              onClick={() => changeFilter(setStatus)(s)}
              aria-pressed={s === status}
              className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${s === status ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "bg-[var(--color-panel-alt)] text-[var(--color-muted)] hover:text-[var(--color-ink)]"}`}
            >
              {s} <span className="tabular-nums opacity-75">{count}</span>
            </button>
          );
        })}
      </div>

      {result.bookings.length === 0 ? (
        <EmptyState title={`No ${plural} match`}>
          {when === "upcoming" ? "Nothing coming up with these filters. Try “All dates”." : "Try a different search or filter."}
        </EmptyState>
      ) : (
        <Table columns={columns}>
          {result.bookings.map((b) => {
            const discount = Number(b.discount_amount) || 0;
            const isNew = created && b.id === created.id;
            return (
              <Tr key={b.id}>
                <Td>
                  <div className="flex items-center gap-2.5">
                    <Avatar initials={initialsOf(b.guest_name || b.client_name)} size={30} />
                    <div>
                      <p className="font-medium">
                        {b.guest_name ? (
                          <>
                            {b.guest_name} <span className="text-[11.5px] font-normal text-[var(--color-muted)]">guest of {b.client_name}</span>
                          </>
                        ) : (
                          b.client_name
                        )}
                        {b.group_id && !b.guest_name && <span className="ml-2 rounded-full bg-[var(--color-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-accent)]">Group</span>}
                        {isNew && <span className="ml-2 rounded-full bg-[var(--color-green)]/15 px-1.5 py-0.5 text-[10px] font-semibold text-[var(--color-green)]">New</span>}
                      </p>
                      <p className="text-[11px] text-[var(--color-faint)]">{b.client_phone}</p>
                    </div>
                  </div>
                </Td>
                <Td>
                  <p>{formatDay(b.booking_date, { long: true })}</p>
                  <p className="text-[11.5px] text-[var(--color-muted)] tabular-nums">
                    {clockTime(String(b.start_time).slice(0, 5))}
                    {b.end_time && `–${clockTime(String(b.end_time).slice(0, 5))}`}
                  </p>
                </Td>
                {isAllLocations && <Td className="text-[var(--color-muted)]">{b.location_name}</Td>}
                <Td className="max-w-[220px]">{b.service_names || "—"}</Td>
                <Td className="font-medium tabular-nums">
                  {formatAmount(b.total_amount)}
                  {discount > 0 && (
                    <span className="block text-[11px] font-normal text-[var(--color-green)]" title={b.discount_note || ""}>
                      {formatAmount(discount)} off
                    </span>
                  )}
                </Td>
                <Td><Badge>{b.status}</Badge></Td>
                <Td>{b.payment_status ? <Badge>{b.payment_status}</Badge> : <span className="text-[12px] text-[var(--color-faint)]">—</span>}</Td>
                <Td>
                  <DetailLink to={`/bookings/${b.id}`} className="text-[12px] font-medium text-[var(--color-accent)] hover:underline">
                    View
                  </DetailLink>
                </Td>
              </Tr>
            );
          })}
        </Table>
      )}

      <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--color-muted)]">
          {result.total === 0 ? `No ${plural}` : `Showing ${from}–${to} of ${result.total} ${plural}`}
        </p>
        {totalPages > 1 && (
          <div className="inline-flex items-center gap-2">
            <Button variant="ghost" className="px-3" onClick={() => setPage((p) => p - 1)} disabled={page === 1}>
              Previous
            </Button>
            <div className="inline-flex items-center gap-1">
              {pageList(page, totalPages).map((p, i) =>
                p === "…" ? (
                  <span key={`gap-${i}`} className="px-1 text-[13px] text-[var(--color-faint)]">…</span>
                ) : (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPage(p)}
                    aria-current={p === page ? "page" : undefined}
                    className={`rounded-lg px-3 py-2 text-[13px] tabular-nums ${p === page ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "bg-[var(--color-panel-alt)] text-[var(--color-muted)] hover:bg-[var(--color-card)]"}`}
                  >
                    {p}
                  </button>
                ),
              )}
            </div>
            <Button variant="ghost" className="px-3" onClick={() => setPage((p) => p + 1)} disabled={page === totalPages}>
              Next
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}
