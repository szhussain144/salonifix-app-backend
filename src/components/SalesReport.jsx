import { useCallback, useEffect, useMemo, useState } from "react";
import { paymentMethodLabel } from "./labels";
import { Link } from "react-router-dom";
import {
  BadgePercent,
  CalendarDays,
  CircleX,
  Download,
  Hourglass,
  Receipt,
  Search,
  ShoppingBag,
  UsersRound,
  Wallet,
} from "lucide-react";
import { Button, Card, EmptyState, SectionTitle, StatCard } from "./ui";
import Change, { ChangeCell } from "./ReportChange";
import { daysIn, longFor, parse, pad, rangeLabel, tickFor } from "./reportPeriods";
import { CompareBars, CompareLegend, CompareTrendChart, DataTable, ViewToggle } from "./charts";
import { dateLocale, formatCount, formatMoney, todayISO, toNumber } from "./format";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { getActiveLocationId, getToken } from "../context/sessionStore";
import useDebounce from "../context/debounce";
import constanst from "../config/constants";

// ------------------------------------------------------------------ dates


const BREAKDOWNS = [
  { key: "service", label: "Services", count: "Times sold" },
  { key: "staff", label: "Staff", count: "Sales" },
  { key: "location", label: "Branches", count: "Sales" },
  { key: "payment_method", label: "Payment methods", count: "Payments" },
  { key: "product", label: "Products", count: "Units sold" },
];

// ------------------------------------------------------------------ the report

/** Reports → Sales: totals for any period, compared with the period before or last year. */
export default function SalesReport({ range, compare }) {
  const { fetchWithLoading } = useApi();
  const { business, terms, isAllLocations, activeLocations } = useSession();
  const [summary, setSummary] = useState(null);
  const [trendView, setTrendView] = useState("chart");
  const [dimension, setDimension] = useState("service");
  const [showAll, setShowAll] = useState(false);

  const rangeKey = `${range.from}|${range.to}`;
  const validRange = range.from && range.to && range.from <= range.to;

  const load = useCallback(async () => {
    if (!validRange) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/report/sales/summary?from=${range.from}&to=${range.to}&compare=${compare}`);
    if (res.ok) setSummary((await res.json()).data);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fetchWithLoading, rangeKey, compare, validRange]);

  useEffect(() => {
    load();
    setShowAll(false);
  }, [load]);

  const currency = summary?.currency || business?.currency || "PKR";
  const money = useCallback((v) => formatMoney(v, currency), [currency]);
  const currentName = rangeLabel(summary?.period);
  const previousName = summary?.compare_period ? rangeLabel(summary.compare_period) : null;
  const t = summary?.totals;
  const c = summary?.changes;
  const p = summary?.previous_totals;
  const days = daysIn(summary?.period) || 1;
  const prevDays = daysIn(summary?.compare_period) || 1;
  const perDay = t ? t.sales / days : 0;
  const prevPerDay = p ? p.sales / prevDays : 0;
  const perDayChange = p && prevPerDay ? Math.round(((perDay - prevPerDay) / prevPerDay) * 1000) / 10 : null;
  const against = previousName;

  const series = summary?.series || [];
  const spansYears = summary ? summary.period.from.slice(0, 4) !== summary.period.to.slice(0, 4) : false;
  const showBranches = isAllLocations && activeLocations.length > 1;
  const dims = BREAKDOWNS.filter((d) => d.key !== "location" || showBranches);
  const rows = (summary?.breakdown?.[dimension] || []).map((r) => (dimension === "payment_method" ? { ...r, name: paymentMethodLabel(r.name) } : r));
  const visibleRows = showAll ? rows : rows.slice(0, 8);

  return (
    <div className="space-y-5">
      {/* Headline numbers */}
      {t && (
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard label="Sales" value={money(t.sales)} sub={<Change value={c?.sales} current={t.sales} previous={p?.sales} against={against} onAccent />} icon={Wallet} accent />
          <StatCard label="Completed & paid" value={formatCount(t.sales_count)} sub={<Change value={c?.sales_count} current={t.sales_count} previous={p?.sales_count} against={against} />} icon={Receipt} />
          <StatCard label="Average sale" value={money(t.average_sale)} sub={<Change value={c?.average_sale} current={t.average_sale} previous={p?.average_sale} against={against} />} icon={ShoppingBag} />
          <StatCard label={`${terms.clientPlural} served`} value={formatCount(t.clients)} sub={<Change value={c?.clients} current={t.clients} previous={p?.clients} against={against} />} icon={UsersRound} />
          <StatCard label="Sales per day" value={money(perDay)} sub={<Change value={perDayChange} current={perDay} previous={prevPerDay} against={against} />} icon={CalendarDays} />
          <StatCard label="Discounts given" value={money(t.discounts)} sub={<Change value={c?.discounts} current={t.discounts} previous={p?.discounts} upIsGood={false} against={against} />} icon={BadgePercent} />
          <StatCard
            label="Still to pay"
            value={money(t.unpaid)}
            sub={
              <Link to="/bills/unpaid" className="text-[11.5px] text-[var(--color-accent)] hover:underline">
                {formatCount(t.unpaid_count)} unpaid {t.unpaid_count === 1 ? "bill" : "bills"} · collect →
              </Link>
            }
            icon={Hourglass}
          />
          <StatCard label="Cancelled" value={formatCount(t.cancelled)} sub={<Change value={c?.cancelled} current={t.cancelled} previous={p?.cancelled} upIsGood={false} against={against} />} icon={CircleX} />
        </div>
      )}

      {/* Sales over time */}
      {summary && (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">{summary.unit === "day" ? "Day by day" : "Month by month"}</p>
              <h2 className="font-display text-[17px] font-medium tracking-tight">Sales over time</h2>
              <div className="mt-2"><CompareLegend current={currentName} previous={previousName} /></div>
            </div>
            <ViewToggle value={trendView} onChange={setTrendView} />
          </div>
          {trendView === "chart" ? (
            <CompareTrendChart
              data={series}
              formatTick={(k) => tickFor(k, spansYears)}
              formatLabel={longFor}
              valueFormatter={money}
              currentName={currentName}
              previousName={previousName}
              label={`Sales ${currentName}${previousName ? ` compared with ${previousName}` : ""}`}
            />
          ) : (
            <DataTable
              rows={series}
              columns={[
                { key: "key", label: summary.unit === "day" ? "Day" : "Month", format: longFor },
                { key: "amount", label: "Sales", align: "right", format: money },
                { key: "count", label: "Sales count", align: "right" },
                ...(previousName
                  ? [
                      { key: "prev_key", label: "Compared with", format: (k) => (k ? longFor(k) : "—") },
                      { key: "prev_amount", label: "Sales then", align: "right", format: money },
                    ]
                  : []),
              ]}
            />
          )}
        </Card>
      )}

      {/* What the sales were made of */}
      {summary && (
        <Card className="p-5">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <SectionTitle title="Where sales came from" />
            <div className="flex flex-wrap gap-1.5" role="tablist">
              {dims.map((d) => (
                <button
                  key={d.key}
                  type="button"
                  role="tab"
                  aria-selected={dimension === d.key}
                  onClick={() => {
                    setDimension(d.key);
                    setShowAll(false);
                  }}
                  className={`rounded-full px-3 py-1.5 text-[12.5px] ${dimension === d.key ? "bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent-dark)]" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"}`}
                >
                  {d.key === "staff" ? terms.staffPlural : d.label}
                </button>
              ))}
            </div>
          </div>
          {rows.length === 0 ? (
            <EmptyState icon={Wallet} title="No sales in this period">Completed and paid {terms.bookingPlural.toLowerCase()} show up here.</EmptyState>
          ) : (
            <div className="overflow-x-auto scrollbar-none">
              <table className="w-full min-w-[620px] text-left text-[13px]">
                <thead>
                  <tr className="border-b border-[var(--color-border)] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">
                    <th className="pb-2.5 pr-4">{dims.find((d) => d.key === dimension)?.label}</th>
                    <th className="pb-2.5 pr-4 text-right">Sales</th>
                    <th className="w-[22%] pb-2.5 pr-4">Share</th>
                    {previousName && <th className="pb-2.5 pr-4 text-right">{previousName}</th>}
                    {previousName && <th className="pb-2.5 pr-4">Change</th>}
                    <th className="pb-2.5 text-right">{BREAKDOWNS.find((d) => d.key === dimension)?.count}</th>
                  </tr>
                </thead>
                <tbody>
                  {visibleRows.map((r) => {
                    const share = t?.sales ? r.amount / t.sales : 0;
                    return (
                      <tr key={r.key} className="border-b border-[var(--color-border-soft)] last:border-none">
                        <td className="py-2.5 pr-4 font-medium capitalize">{r.name}</td>
                        <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">{money(r.amount)}</td>
                        <td className="py-2.5 pr-4">
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-accent-soft)]">
                              <span className="block h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.max(share * 100, share > 0 ? 2 : 0)}%` }} />
                            </span>
                            <span className="w-10 text-right text-[12px] tabular-nums text-[var(--color-muted)]">{Math.round(share * 100)}%</span>
                          </span>
                        </td>
                        {previousName && <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--color-muted)]">{money(r.prev_amount)}</td>}
                        {previousName && <td className="py-2.5 pr-4"><ChangeCell row={r} /></td>}
                        <td className="py-2.5 text-right tabular-nums">{formatCount(r.count)}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              {rows.length > 8 && (
                <button type="button" onClick={() => setShowAll((v) => !v)} className="mt-3 text-[12.5px] font-medium text-[var(--color-accent)]">
                  {showAll ? "Show top 8" : `Show all ${rows.length}`}
                </button>
              )}
            </div>
          )}
        </Card>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-3">
        <MonthByMonth money={money} />
        <YearByYear money={money} />
      </div>

      {validRange && <AllSales range={range} rangeName={rangeLabel(range)} money={money} />}
    </div>
  );
}

// ------------------------------------------------------------------ month by month

function MonthByMonth({ money }) {
  const { fetchWithLoading } = useApi();
  const [year, setYear] = useState(() => Number(todayISO().slice(0, 4)));
  const [data, setData] = useState(null);
  const [view, setView] = useState("chart");

  useEffect(() => {
    fetchWithLoading(`${constanst.API_URL}/report/sales/monthly?year=${year}`).then(async (res) => res.ok && setData((await res.json()).data));
  }, [fetchWithLoading, year]);

  const thisYear = Number(todayISO().slice(0, 4));
  const years = useMemo(() => {
    const set = new Set([...(data?.years || []), thisYear, year]);
    return [...set].sort((a, b) => b - a);
  }, [data, thisYear, year]);

  if (!data) return <Card className="p-5 xl:col-span-2"><SectionTitle title="Month by month" /></Card>;
  const monthName = (m) => new Date(2000, m - 1, 1).toLocaleDateString(dateLocale(), { month: "long" });

  return (
    <Card className="p-5 xl:col-span-2">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">{year} against {year - 1}</p>
          <h2 className="font-display text-[17px] font-medium tracking-tight">Month by month</h2>
          <div className="mt-2"><CompareLegend current={String(year)} previous={String(year - 1)} /></div>
        </div>
        <div className="flex items-center gap-2">
          <select
            aria-label="Year"
            value={year}
            onChange={(e) => setYear(Number(e.target.value))}
            className="rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-1.5 text-[12.5px]"
          >
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
          <ViewToggle value={view} onChange={setView} />
        </div>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="rounded-xl bg-[var(--color-panel-alt)] p-3.5">
          <p className="text-[12px] text-[var(--color-muted)]">{year} in total{data.ytd ? " so far" : ""}</p>
          <p className="text-[20px] font-semibold tracking-tight tabular-nums">{money(data.totals.sales)}</p>
          <p className="mt-0.5"><Change value={data.change} current={data.totals.sales} previous={data.previous_totals.sales} against={`all of ${year - 1} (${money(data.previous_totals.sales)})`} /></p>
        </div>
        {data.ytd && (
          <div className="rounded-xl bg-[var(--color-panel-alt)] p-3.5">
            <p className="text-[12px] text-[var(--color-muted)]">Year to date (1 Jan – {parse(data.ytd.to).toLocaleDateString(dateLocale(), { day: "numeric", month: "short" })})</p>
            <p className="text-[20px] font-semibold tracking-tight tabular-nums">{money(data.ytd.sales)}</p>
            <p className="mt-0.5"><Change value={data.ytd.change} current={data.ytd.sales} previous={data.ytd.prev_sales} against={`same dates ${year - 1} (${money(data.ytd.prev_sales)})`} /></p>
          </div>
        )}
      </div>

      {view === "chart" ? (
        <CompareBars data={data.months} currentName={String(year)} previousName={String(year - 1)} valueFormatter={money} label={`Sales per month, ${year} against ${year - 1}`} />
      ) : (
        <DataTable
          rows={data.months}
          columns={[
            { key: "month", label: "Month", format: monthName },
            { key: "amount", label: String(year), align: "right", format: money },
            { key: "prev_amount", label: String(year - 1), align: "right", format: money },
            { key: "change", label: "Change", align: "right", format: (v) => (v === null ? "—" : `${v > 0 ? "▲" : v < 0 ? "▼" : ""} ${Math.abs(v)}%`) },
            { key: "count", label: "Sales", align: "right" },
          ]}
        />
      )}
    </Card>
  );
}

// ------------------------------------------------------------------ year by year

function YearByYear({ money }) {
  const { fetchWithLoading } = useApi();
  const [data, setData] = useState(null);

  useEffect(() => {
    fetchWithLoading(`${constanst.API_URL}/report/sales/yearly`).then(async (res) => res.ok && setData((await res.json()).data));
  }, [fetchWithLoading]);

  const years = [...(data?.years || [])].reverse();
  const best = Math.max(1, ...years.map((y) => y.amount));

  return (
    <Card className="p-5">
      <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">All years</p>
      <h2 className="mb-4 font-display text-[17px] font-medium tracking-tight">Year by year</h2>
      {!data ? null : years.length === 0 ? (
        <EmptyState icon={Wallet} title="No sales yet" />
      ) : (
        <ul className="space-y-4">
          {years.map((y) => (
            <li key={y.year}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="text-[13px] font-semibold">
                  {y.year}
                  {y.year === data.current_year && <span className="ml-1.5 text-[11px] font-normal text-[var(--color-faint)]">so far</span>}
                </span>
                <span className="text-[14px] font-semibold tabular-nums">{money(y.amount)}</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--color-accent-soft)]">
                <div className="h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${(y.amount / best) * 100}%` }} />
              </div>
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2 text-[11.5px] text-[var(--color-muted)]">
                <span>{formatCount(y.count)} sales · avg {money(y.average_sale)} · {formatCount(y.clients)} clients</span>
                {y.change !== null ? <Change value={y.change} current={y.amount} /> : <span className="text-[var(--color-faint)]">first year</span>}
              </div>
            </li>
          ))}
        </ul>
      )}
      {years.length === 1 && <p className="mt-4 text-[12px] text-[var(--color-faint)]">Growth appears here once there is a second year of sales.</p>}
    </Card>
  );
}

// ------------------------------------------------------------------ every sale

function AllSales({ range, rangeName, money }) {
  const { fetchWithLoading } = useApi();
  const { terms } = useSession();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const query = useDebounce(search.trim(), 400);
  const limit = 25;

  useEffect(() => setPage(1), [query, range.from, range.to]);

  useEffect(() => {
    const qs = new URLSearchParams({ from: range.from, to: range.to, page: String(page), limit: String(limit), ...(query && { search: query }) });
    fetchWithLoading(`${constanst.API_URL}/report/sales/list?${qs}`).then(async (res) => res.ok && setData((await res.json()).data));
  }, [fetchWithLoading, range.from, range.to, page, query]);

  /** Downloads every sale in the period (and search) as a spreadsheet file. */
  const download = async () => {
    const qs = new URLSearchParams({ from: range.from, to: range.to, ...(query && { search: query }) });
    const res = await fetch(`${constanst.API_URL}/report/sales/export?${qs}`, {
      headers: { Authorization: `Bearer ${getToken()}`, "X-Location-Id": getActiveLocationId() || "all" },
    });
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href: url, download: `sales_${range.from}_to_${range.to}.csv` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;
  const first = data && data.total ? (page - 1) * limit + 1 : 0;
  const last = data ? Math.min(page * limit, data.total) : 0;

  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">{rangeName}</p>
          <h2 className="font-display text-[17px] font-medium tracking-tight">All sales{data ? ` (${formatCount(data.total)})` : ""}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
            <input
              type="search"
              aria-label="Search sales"
              placeholder={`${terms.client}, phone, service or ${terms.staff.toLowerCase()}`}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[260px] max-w-full rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] py-2 pr-3 pl-8 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </label>
          <Button variant="ghost" type="button" onClick={download} disabled={!data?.total}>
            <Download size={14} /> Download (Excel/CSV)
          </Button>
        </div>
      </div>

      {data && data.rows.length === 0 ? (
        <EmptyState icon={Receipt} title={query ? "No sales match your search" : "No sales in this period"} />
      ) : (
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full min-w-[860px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">
                <th className="pb-2.5 pr-4">Date</th>
                <th className="pb-2.5 pr-4">{terms.client}</th>
                <th className="pb-2.5 pr-4">Services</th>
                <th className="pb-2.5 pr-4">{terms.staff}</th>
                <th className="pb-2.5 pr-4">Branch</th>
                <th className="pb-2.5 pr-4">Paid by</th>
                <th className="pb-2.5 pr-4 text-right">Discount</th>
                <th className="pb-2.5 text-right">Paid</th>
              </tr>
            </thead>
            <tbody>
              {(data?.rows || []).map((r) => (
                <tr key={r.id} className="border-b border-[var(--color-border-soft)] last:border-none">
                  <td className="whitespace-nowrap py-2.5 pr-4">
                    {parse(r.booking_date).toLocaleDateString(dateLocale(), { day: "numeric", month: "short", year: "numeric" })}
                    <span className="block text-[11.5px] text-[var(--color-faint)]">{(() => { const [h, m] = r.start_time.split(":").map(Number); return `${h % 12 || 12}:${pad(m)} ${h < 12 ? "AM" : "PM"}`; })()}</span>
                  </td>
                  <td className="py-2.5 pr-4">
                    <span className="font-medium">{r.client_name}</span>
                    {r.client_phone && <span className="block text-[11.5px] text-[var(--color-faint)]">{r.client_phone}</span>}
                  </td>
                  <td className="max-w-[220px] py-2.5 pr-4">{r.services}</td>
                  <td className="py-2.5 pr-4">{r.staff}</td>
                  <td className="py-2.5 pr-4">{r.location_name}</td>
                  <td className="py-2.5 pr-4">{paymentMethodLabel(r.payment_method)}</td>
                  <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--color-muted)]">{toNumber(r.discount_amount) ? `– ${money(r.discount_amount)}` : "—"}</td>
                  <td className="py-2.5 text-right font-semibold tabular-nums">
                    {money(r.sale_amount ?? r.total_amount)}
                    {toNumber(r.products_amount) > 0 && <span className="block text-[11px] font-normal text-[var(--color-faint)]">incl. {money(r.products_amount)} products</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.total > limit && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-[var(--color-muted)]">
          <span>Showing {first}–{last} of {formatCount(data.total)}</span>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>Previous</Button>
            <Button variant="ghost" type="button" disabled={page >= pages} onClick={() => setPage((n) => n + 1)}>Next</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
