import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Search } from "lucide-react";
import { Card, EmptyState, Table, Td, Tr } from "../components/ui";
import useDebounce from "../context/debounce";
import { PlatformHeading } from "./PlatformLayout";
import { ago, planText, shortDate, usePlatformApi } from "./platformApi";

const PLAN_FILTERS = [
  ["", "All"],
  ["trial", "On trial"],
  ["trial_ended", "Trial ended"],
  ["starter", "Starter"],
  ["growth", "Growth"],
  ["popular", "Popular"],
];
const LIMIT = 20;

/** A plan as a small coloured pill. */
export function PlanPill({ business: b }) {
  const tone =
    b.plan === "trial"
      ? b.trial_days_left >= 0
        ? b.trial_days_left <= 7
          ? "bg-[var(--color-orange)]/12 text-[var(--color-orange)]"
          : "bg-[var(--color-accent-soft)] text-[var(--color-accent-dark)]"
        : "bg-[var(--color-red)]/10 text-[var(--color-red)]"
      : b.plan === "popular"
        ? "bg-[var(--color-accent)] text-white"
        : b.plan === "growth"
          ? "bg-[var(--color-green)]/12 text-[var(--color-green)]"
          : "bg-[var(--color-blue)]/12 text-[var(--color-blue)]";
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${tone}`}>{planText(b)}</span>;
}

/** Every salon that signed up: search, filter by plan or status, open one to manage it. */
export default function PlatformBusinesses() {
  const api = usePlatformApi();
  const [params, setParams] = useSearchParams();
  const [search, setSearch] = useState(params.get("search") || "");
  const query = useDebounce(search, 350);
  const plan = params.get("plan") || "";
  const status = params.get("status") || "";
  const sort = params.get("sort") || "newest";
  const page = Number(params.get("page") || 1);
  const [data, setData] = useState(null);

  const set = (key, value) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });

  useEffect(() => {
    const q = new URLSearchParams({ page: String(page), limit: String(LIMIT), sort });
    if (query) q.set("search", query);
    if (plan) q.set("plan", plan);
    if (status) q.set("status", status);
    api(`/businesses?${q}`).then((r) => r.ok && setData(r.data));
  }, [api, query, plan, status, sort, page]);

  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <>
      <PlatformHeading eyebrow="Platform" title="Salons" subtitle={data ? `${data.total} salon${data.total === 1 ? "" : "s"}${plan || status || query ? " match" : " signed up"}` : " "} />

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex w-full items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2 transition-shadow focus-within:border-[var(--color-accent)] sm:w-72">
            <Search size={14} className="text-[var(--color-faint)]" />
            <input
              aria-label="Search salons"
              placeholder="Name, owner, email or phone"
              className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--color-faint)]"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                set("page", "");
              }}
            />
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Plan">
            {PLAN_FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={plan === key}
                onClick={() => set("plan", key)}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
                  plan === key ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white" : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
                }`}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="ml-auto flex gap-2">
            <select aria-label="Status" value={status} onChange={(e) => set("status", e.target.value)} className="rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5 text-[12.5px]">
              <option value="">Any status</option>
              <option value="active">Active</option>
              <option value="suspended">Suspended</option>
            </select>
            <select aria-label="Sort" value={sort} onChange={(e) => set("sort", e.target.value)} className="rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5 text-[12.5px]">
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
              <option value="active">Recently active</option>
              <option value="name">Name</option>
            </select>
          </div>
        </div>

        {data && data.businesses.length === 0 ? (
          <EmptyState title="No salons match">Try another search or filter.</EmptyState>
        ) : (
          <Table columns={["Salon", "Plan", "Locations", "Team", "Clients", "Bookings · 30 days", "Last active", "Joined"]}>
            {(data?.businesses || []).map((b) => (
              <Tr key={b.id}>
                <Td>
                  <Link to={`/platform/businesses/${b.id}`} className="group block max-w-[260px]">
                    <span className="flex items-center gap-2 text-[13.5px] font-semibold group-hover:text-[var(--color-accent)]">
                      <span className="truncate">{b.name}</span>
                      {b.status === "suspended" && <span className="rounded-full bg-[var(--color-red)]/10 px-2 py-0.5 text-[10.5px] font-semibold text-[var(--color-red)]">Suspended</span>}
                    </span>
                    <span className="block truncate text-[12px] text-[var(--color-muted)]">{b.owner_name} · {b.owner_email}</span>
                  </Link>
                </Td>
                <Td><PlanPill business={b} /></Td>
                <Td className="text-[13px]">{b.locations}</Td>
                <Td className="text-[13px]">{b.staff}</Td>
                <Td className="text-[13px]">{b.clients}</Td>
                <Td className="text-[13px]">{b.bookings_30d}</Td>
                <Td className="text-[12.5px] text-[var(--color-muted)]">{ago(b.last_active_at)}</Td>
                <Td className="text-[12.5px] text-[var(--color-muted)]">{shortDate(b.created_at)}</Td>
              </Tr>
            ))}
          </Table>
        )}

        {pages > 1 && (
          <div className="mt-4 flex items-center justify-end gap-2 text-[12.5px]">
            <button type="button" aria-label="Previous page" disabled={page <= 1} onClick={() => set("page", String(page - 1))} className="rounded-full border border-[var(--color-border)] p-1.5 disabled:opacity-30"><ChevronLeft size={14} /></button>
            <span>Page {page} of {pages}</span>
            <button type="button" aria-label="Next page" disabled={page >= pages} onClick={() => set("page", String(page + 1))} className="rounded-full border border-[var(--color-border)] p-1.5 disabled:opacity-30"><ChevronRight size={14} /></button>
          </div>
        )}
      </Card>
    </>
  );
}
