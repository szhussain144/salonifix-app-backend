import { useEffect, useState } from "react";
import { Download, PiggyBank, Receipt, Search, Tags, TrendingDown, Wallet } from "lucide-react";
import { Button, Card, EmptyState, SectionTitle, StatCard } from "./ui";
import { CompareLegend, CompareTrendChart, DataTable, ViewToggle } from "./charts";
import Change from "./ReportChange";
import { dateLocale, formatCount, formatMoney } from "./format";
import { longFor, parse, tickFor } from "./reportPeriods";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { getActiveLocationId, getToken } from "../context/sessionStore";
import useDebounce from "../context/debounce";
import constanst from "../config/constants";

const eyebrow = "mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]";
const pct = (now, then) => (then ? Math.round(((now - then) / then) * 1000) / 10 : null);

/** Money in (sales) against money out (salaries, expenses) and what was left. */
function MoneyInOut({ money: m, fmt, rangeName, previousName }) {
  const rows = [
    { key: "sales", label: "Sales", sign: "+", value: m.sales, prev: m.previous?.sales, upIsGood: true },
    { key: "salaries", label: "Salaries", sign: "−", value: m.salaries, prev: m.previous?.salaries, upIsGood: false },
    { key: "expenses", label: "Expenses", sign: "−", value: m.expenses, prev: m.previous?.expenses, upIsGood: false },
  ];
  const max = Math.max(1, m.sales, m.salaries + m.expenses);
  const profit = m.net >= 0;
  return (
    <Card className="p-5">
      <p className={eyebrow}>{rangeName}</p>
      <h2 className="mb-4 font-display text-[17px] font-medium tracking-tight">Money in and out</h2>
      <ul className="space-y-3.5">
        {rows.map((r) => (
          <li key={r.key}>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-[13px] font-medium">
                <span className="mr-1.5 inline-block w-3 text-center text-[var(--color-muted)]">{r.sign}</span>
                {r.label}
              </span>
              <span className="flex items-baseline gap-2">
                <span className="text-[14px] font-semibold tabular-nums">{fmt(r.value)}</span>
                {previousName && <Change value={pct(r.value, r.prev ?? 0)} current={r.value} previous={r.prev} upIsGood={r.upIsGood} />}
              </span>
            </div>
            <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-[var(--color-panel-alt)]">
              <div
                className="h-full rounded-full"
                style={{ width: `${(r.value / max) * 100}%`, background: r.key === "sales" ? "var(--color-accent)" : "#B48AF7" }}
              />
            </div>
          </li>
        ))}
      </ul>
      <div className={`mt-5 flex flex-wrap items-center justify-between gap-2 rounded-xl px-4 py-3 ${profit ? "bg-[var(--color-green)]/10" : "bg-[var(--color-red)]/8"}`}>
        <span className={`flex items-center gap-2 text-[13px] font-semibold ${profit ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>
          {profit ? <PiggyBank size={16} /> : <TrendingDown size={16} />}
          {profit ? "Left over (profit)" : "Shortfall (loss)"}
        </span>
        <span className="flex items-baseline gap-2">
          <span className={`text-[18px] font-semibold tabular-nums ${profit ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>{fmt(m.net)}</span>
          {m.previous && <span className="text-[12px] text-[var(--color-muted)]">before: {fmt(m.previous.net)}</span>}
        </span>
      </div>
      <p className="mt-2 text-[11.5px] text-[var(--color-faint)]">Sales minus salaries (share of each monthly salary for the days in the period) minus recorded expenses.</p>
    </Card>
  );
}

const DIMENSIONS = [
  ["category", "Categories"],
  ["location", "Branches"],
  ["type", "Types"],
];

/** Reports → Expenses: spending over the chosen period, where it went, and every expense. */
export default function ExpensesReport({ range, compare, rangeName, previousName }) {
  const { fetchWithLoading } = useApi();
  const { business, isAllLocations, activeLocations } = useSession();
  const [data, setData] = useState(null);
  const [view, setView] = useState("chart");
  const [dimension, setDimension] = useState("category");

  useEffect(() => {
    fetchWithLoading(`${constanst.API_URL}/report/expenses/summary?from=${range.from}&to=${range.to}&compare=${compare}`).then(
      async (res) => res.ok && setData((await res.json()).data),
    );
  }, [fetchWithLoading, range.from, range.to, compare]);

  if (!data) return null;
  const currency = data.currency || business?.currency || "PKR";
  const money = (v) => formatMoney(v, currency);
  const t = data.totals;
  const spansYears = data.period.from.slice(0, 4) !== data.period.to.slice(0, 4);
  const dims = DIMENSIONS.filter(([key]) => key !== "location" || (isAllLocations && activeLocations.length > 1));
  const rows = data.breakdown[dimension] || [];

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Spent" value={money(t.total)} sub={<Change value={t.change} current={t.total} previous={t.prev_total} upIsGood={false} against={previousName} onAccent />} icon={Wallet} accent />
        <StatCard
          label="Expenses recorded"
          value={formatCount(t.count)}
          sub={<span className="text-[11.5px] text-[var(--color-faint)]">avg {money(t.average)} each</span>}
          icon={Receipt}
        />
        <StatCard
          label="Biggest category"
          value={<span className="text-[20px]">{t.biggest?.name ?? "—"}</span>}
          sub={<span className="text-[11.5px] text-[var(--color-faint)]">{t.biggest ? `${money(t.biggest.amount)} · ${Math.round((t.biggest.amount / (t.total || 1)) * 100)}% of spending` : "Nothing spent"}</span>}
          icon={Tags}
        />
        <StatCard
          label="Spending vs sales"
          value={t.share_of_sales === null ? "—" : `${t.share_of_sales}%`}
          sub={<span className="text-[11.5px] text-[var(--color-faint)]">{t.share_of_sales === null ? "No sales in this period" : "of sales went on expenses"}</span>}
          icon={TrendingDown}
        />
      </div>

      <div className={`grid grid-cols-1 gap-5 ${data.money ? "xl:grid-cols-3" : ""}`}>
        <Card className={`p-5 ${data.money ? "xl:col-span-2" : ""}`}>
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className={eyebrow}>{data.unit === "day" ? "Day by day" : "Month by month"}</p>
              <h2 className="font-display text-[17px] font-medium tracking-tight">Spending over time</h2>
              <div className="mt-2"><CompareLegend current={rangeName} previous={previousName} /></div>
            </div>
            <ViewToggle value={view} onChange={setView} />
          </div>
          {view === "chart" ? (
            <CompareTrendChart
              data={data.series}
              formatTick={(k) => tickFor(k, spansYears)}
              formatLabel={longFor}
              valueFormatter={money}
              currentName={rangeName}
              previousName={previousName}
              label={`Spending ${rangeName}${previousName ? ` compared with ${previousName}` : ""}`}
            />
          ) : (
            <DataTable
              rows={data.series}
              columns={[
                { key: "key", label: data.unit === "day" ? "Day" : "Month", format: longFor },
                { key: "amount", label: "Spent", align: "right", format: money },
                { key: "count", label: "Expenses", align: "right" },
                ...(previousName ? [{ key: "prev_amount", label: "Spent before", align: "right", format: money }] : []),
              ]}
            />
          )}
        </Card>
        {data.money && <MoneyInOut money={data.money} fmt={money} rangeName={rangeName} previousName={previousName} />}
      </div>

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <SectionTitle title="Where the money went" />
          <div className="flex flex-wrap gap-1.5" role="tablist">
            {dims.map(([key, label]) => (
              <button
                key={key}
                type="button"
                role="tab"
                aria-selected={dimension === key}
                onClick={() => setDimension(key)}
                className={`rounded-full px-3 py-1.5 text-[12.5px] ${dimension === key ? "bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent-dark)]" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
        {rows.length === 0 ? (
          <EmptyState icon={Receipt} title="No expenses in this period" />
        ) : (
          <div className="overflow-x-auto scrollbar-none">
            <table className="w-full min-w-[620px] text-left text-[13px]">
              <thead>
                <tr className="border-b border-[var(--color-border)] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">
                  <th className="pb-2.5 pr-4">{dims.find(([k]) => k === dimension)?.[1]}</th>
                  <th className="pb-2.5 pr-4 text-right">Spent</th>
                  <th className="w-[22%] pb-2.5 pr-4">Share</th>
                  {previousName && <th className="pb-2.5 pr-4 text-right">{previousName}</th>}
                  {previousName && <th className="pb-2.5 pr-4">Change</th>}
                  <th className="pb-2.5 text-right">Expenses</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const share = t.total ? r.amount / t.total : 0;
                  return (
                    <tr key={r.key} className="border-b border-[var(--color-border-soft)] last:border-none">
                      <td className="py-2.5 pr-4 font-medium">{r.name}</td>
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
                      {previousName && <td className="py-2.5 pr-4"><Change value={r.change} current={r.amount} previous={r.prev_amount} upIsGood={false} /></td>}
                      <td className="py-2.5 text-right tabular-nums">{formatCount(r.count)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ExpenseList range={range} rangeName={rangeName} money={money} />
    </div>
  );
}

function ExpenseList({ range, rangeName, money }) {
  const { fetchWithLoading } = useApi();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const query = useDebounce(search.trim(), 400);
  const limit = 25;

  useEffect(() => setPage(1), [query, range.from, range.to]);
  useEffect(() => {
    const qs = new URLSearchParams({ from: range.from, to: range.to, page: String(page), limit: String(limit), ...(query && { search: query }) });
    fetchWithLoading(`${constanst.API_URL}/report/expenses/list?${qs}`).then(async (res) => res.ok && setData((await res.json()).data));
  }, [fetchWithLoading, range.from, range.to, page, query]);

  const download = async () => {
    const qs = new URLSearchParams({ from: range.from, to: range.to, ...(query && { search: query }) });
    const res = await fetch(`${constanst.API_URL}/report/expenses/export?${qs}`, {
      headers: { Authorization: `Bearer ${getToken()}`, "X-Location-Id": getActiveLocationId() || "all" },
    });
    if (!res.ok) return;
    const url = URL.createObjectURL(await res.blob());
    const a = Object.assign(document.createElement("a"), { href: url, download: `expenses_${range.from}_to_${range.to}.csv` });
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / limit)) : 1;
  return (
    <Card className="p-5">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className={eyebrow}>{rangeName}</p>
          <h2 className="font-display text-[17px] font-medium tracking-tight">All expenses{data ? ` (${formatCount(data.total)})` : ""}</h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="relative">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-faint)]" />
            <input
              type="search"
              aria-label="Search expenses"
              placeholder="Category, type or branch"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-[240px] max-w-full rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] py-2 pr-3 pl-8 text-[13px] outline-none focus:border-[var(--color-accent)]"
            />
          </label>
          <Button variant="ghost" type="button" onClick={download} disabled={!data?.total}>
            <Download size={14} /> Download (Excel/CSV)
          </Button>
        </div>
      </div>
      {data && data.rows.length === 0 ? (
        <EmptyState icon={Receipt} title={query ? "No expenses match your search" : "No expenses in this period"} />
      ) : (
        <DataTable
          rows={data?.rows || []}
          columns={[
            { key: "date", label: "Date", format: (v) => `${parse(v.slice(0, 10)).toLocaleDateString(dateLocale(), { day: "numeric", month: "short", year: "numeric" })}` },
            { key: "category", label: "Category" },
            { key: "expense_type", label: "Type", format: (v) => v || "—" },
            { key: "location_name", label: "Branch" },
            { key: "amount", label: "Amount", align: "right", format: money },
          ]}
        />
      )}
      {data && data.total > limit && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[12.5px] text-[var(--color-muted)]">
          <span>Showing {(page - 1) * limit + 1}–{Math.min(page * limit, data.total)} of {formatCount(data.total)}</span>
          <div className="flex gap-2">
            <Button variant="ghost" type="button" disabled={page <= 1} onClick={() => setPage((n) => n - 1)}>Previous</Button>
            <Button variant="ghost" type="button" disabled={page >= pages} onClick={() => setPage((n) => n + 1)}>Next</Button>
          </div>
        </div>
      )}
    </Card>
  );
}
