import { useEffect, useState } from "react";
import { HandCoins, Scissors, Star, Trophy, UserRound, Wallet } from "lucide-react";
import { Avatar, Card, EmptyState, StatCard } from "./ui";
import { CompareLegend, CompareRankBars, DataTable, ViewToggle } from "./charts";
import Change from "./ReportChange";
import { formatCount, formatMoney, initialsOf, toNumber } from "./format";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import constanst from "../config/constants";

const eyebrow = "mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]";

/** Reports → Staff performance: what each person brought in over the chosen period. */
export default function StaffReport({ range, compare, rangeName, previousName }) {
  const { fetchWithLoading } = useApi();
  const { business, terms } = useSession();
  const [data, setData] = useState(null);
  const [view, setView] = useState("chart");

  useEffect(() => {
    fetchWithLoading(`${constanst.API_URL}/report/staff/summary?from=${range.from}&to=${range.to}&compare=${compare}`).then(
      async (res) => res.ok && setData((await res.json()).data),
    );
  }, [fetchWithLoading, range.from, range.to, compare]);

  if (!data) return null;
  const currency = data.currency || business?.currency || "PKR";
  const money = (v) => formatMoney(v, currency);
  const t = data.totals;
  const pay = data.can_see_pay;
  const against = previousName;
  const staff = data.staff;
  const teamSales = t.team_sales || 0;
  const working = staff.filter((s) => s.sales > 0 || s.prev_sales > 0);

  return (
    <div className="space-y-5">
      <div className={`grid grid-cols-2 gap-4 ${pay ? "lg:grid-cols-3" : "lg:grid-cols-4"}`}>
        <StatCard label={`Sales by ${terms.staffPlural.toLowerCase()}`} value={money(teamSales)} sub={<Change value={t.sales_change} current={teamSales} previous={t.prev_team_sales} against={against} onAccent />} icon={Wallet} accent />
        <StatCard
          label="Services done"
          value={formatCount(t.services)}
          sub={<Change value={t.prev_services ? Math.round(((t.services - t.prev_services) / t.prev_services) * 1000) / 10 : null} current={t.services} previous={t.prev_services} against={against} />}
          icon={Scissors}
        />
        <StatCard label={`Sales per ${terms.staff.toLowerCase()}`} value={money(t.sales_per_staff)} sub={<span className="text-[11.5px] text-[var(--color-faint)]">{formatCount(t.staff_count)} people working</span>} icon={UserRound} />
        <StatCard
          label="Top performer"
          value={<span className="text-[20px]">{t.top?.name ?? "—"}</span>}
          sub={<span className="text-[11.5px] text-[var(--color-faint)]">{t.top ? `${money(t.top.sales)} · ${Math.round((t.top.sales / (teamSales || 1)) * 100)}% of sales` : "No sales yet"}</span>}
          icon={Trophy}
        />
        {pay && (
          <StatCard
            label="Salary cost"
            value={money(t.salary_cost)}
            sub={<Change value={t.prev_salary_cost ? Math.round(((t.salary_cost - t.prev_salary_cost) / t.prev_salary_cost) * 1000) / 10 : null} current={t.salary_cost} previous={t.prev_salary_cost} upIsGood={false} against={against} />}
            icon={HandCoins}
          />
        )}
        {pay && (
          <StatCard
            label="Sales per 1 of salary"
            value={t.sales_per_salary === null ? "—" : `${currency} ${toNumber(t.sales_per_salary).toFixed(2)}`}
            sub={
              <span className={`text-[11.5px] ${t.sales_per_salary !== null && t.sales_per_salary < 1 ? "text-[var(--color-red)]" : "text-[var(--color-faint)]"}`}>
                {t.sales_per_salary === null ? "No salaries set" : t.sales_per_salary < 1 ? "Salaries cost more than the sales" : "earned for every 1 paid in salary"}
              </span>
            }
            icon={Star}
          />
        )}
      </div>

      {/* Ranking */}
      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className={eyebrow}>{rangeName}</p>
            <h2 className="font-display text-[17px] font-medium tracking-tight">Sales by {terms.staff.toLowerCase()}</h2>
            <div className="mt-2"><CompareLegend current={rangeName} previous={previousName} /></div>
          </div>
          <ViewToggle value={view} onChange={setView} />
        </div>
        {working.length === 0 ? (
          <EmptyState icon={UserRound} title="No sales in this period">Completed and paid {terms.bookingPlural.toLowerCase()} show up here.</EmptyState>
        ) : view === "chart" ? (
          <CompareRankBars
            data={working.map((s) => ({ name: s.name, amount: s.sales, prev_amount: s.prev_sales }))}
            currentName={rangeName}
            previousName={previousName}
            valueFormatter={(v) => money(v)}
            label={`Sales by ${terms.staff.toLowerCase()}, ${rangeName}`}
          />
        ) : (
          <DataTable
            rows={working}
            columns={[
              { key: "name", label: terms.staff },
              { key: "sales", label: rangeName, align: "right", format: money },
              ...(previousName ? [{ key: "prev_sales", label: previousName, align: "right", format: money }] : []),
              { key: "change", label: "Change", align: "right", format: (v) => (v === null ? "—" : `${v > 0 ? "▲" : v < 0 ? "▼" : ""} ${Math.abs(v)}%`) },
            ]}
          />
        )}
      </Card>

      {/* Everyone in detail */}
      <Card className="p-5">
        <p className={eyebrow}>{rangeName}</p>
        <h2 className="mb-4 font-display text-[17px] font-medium tracking-tight">{terms.staffPlural} in detail</h2>
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full min-w-[900px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">
                <th className="pb-2.5 pr-4">{terms.staff}</th>
                <th className="pb-2.5 pr-4 text-right">Sales</th>
                <th className="w-[16%] pb-2.5 pr-4">Share</th>
                <th className="pb-2.5 pr-4 text-right">Services</th>
                <th className="pb-2.5 pr-4 text-right">{terms.clientPlural}</th>
                <th className="pb-2.5 pr-4 text-right">Avg sale</th>
                <th className="pb-2.5 pr-4 text-right">Cancelled</th>
                <th className="pb-2.5 pr-4 text-right">Rating</th>
                {pay && <th className="pb-2.5 pr-4 text-right">Salary cost</th>}
                {pay && <th className="pb-2.5 text-right">Sales ÷ salary</th>}
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => {
                const share = teamSales ? s.sales / teamSales : 0;
                return (
                  <tr key={s.staff_id} className="border-b border-[var(--color-border-soft)] last:border-none">
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center gap-2.5">
                        <Avatar initials={initialsOf(s.name)} size={30} />
                        <span className="min-w-0">
                          <span className="block font-medium">
                            {s.name}
                            {!s.is_active && <span className="ml-1.5 rounded-full bg-[var(--color-panel-alt)] px-1.5 py-0.5 text-[10.5px] font-normal text-[var(--color-muted)]">left</span>}
                          </span>
                          {s.location_name && <span className="block text-[11.5px] text-[var(--color-faint)]">{s.location_name}</span>}
                        </span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right">
                      <span className="block font-semibold tabular-nums">{money(s.sales)}</span>
                      {previousName && <Change value={s.change} current={s.sales} previous={s.prev_sales} />}
                    </td>
                    <td className="py-2.5 pr-4">
                      <span className="flex items-center gap-2">
                        <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-accent-soft)]">
                          <span className="block h-full rounded-full bg-[var(--color-accent)]" style={{ width: `${Math.max(share * 100, share > 0 ? 2 : 0)}%` }} />
                        </span>
                        <span className="w-9 text-right text-[12px] tabular-nums text-[var(--color-muted)]">{Math.round(share * 100)}%</span>
                      </span>
                    </td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{formatCount(s.services)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{formatCount(s.clients)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{s.bookings ? money(s.average_sale) : "—"}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{formatCount(s.cancelled)}</td>
                    <td className="py-2.5 pr-4 text-right tabular-nums">{s.rating === null ? "—" : `${toNumber(s.rating).toFixed(1)} ★`}</td>
                    {pay && <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--color-muted)]">{s.salary_cost ? money(s.salary_cost) : "—"}</td>}
                    {pay && (
                      <td className={`py-2.5 text-right font-semibold tabular-nums ${s.sales_per_salary !== null && s.sales_per_salary < 1 ? "text-[var(--color-red)]" : ""}`}>
                        {s.sales_per_salary === null ? "—" : `× ${toNumber(s.sales_per_salary).toFixed(2)}`}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pay && (
          <p className="mt-3 text-[12px] text-[var(--color-faint)]">
            Sales ÷ salary: how much each person brought in for every 1 of salary in this period. Below × 1.00 (in red), their salary cost more than their sales.
          </p>
        )}
      </Card>
    </div>
  );
}
