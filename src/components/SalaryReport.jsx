import { Fragment, useEffect, useState } from "react";
import { ChevronDown, HandCoins, Percent, UsersRound, Wallet } from "lucide-react";
import { Card, EmptyState, StatCard } from "./ui";
import { BranchMonthBars } from "./charts";
import Change from "./ReportChange";
import { formatCount, formatMoney } from "./format";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import constanst from "../config/constants";

const eyebrow = "mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]";

/**
 * Reports → Salaries by location (owners and admins, businesses with several branches).
 * Salary cost per branch for the chosen period, against the period before and against what
 * each branch sold. Staff moved between branches are split by the days at each.
 */
export default function SalaryReport({ range, compare, rangeName, previousName }) {
  const { fetchWithLoading } = useApi();
  const { business, terms } = useSession();
  const [data, setData] = useState(null);
  const [open, setOpen] = useState(null);

  useEffect(() => {
    fetchWithLoading(`${constanst.API_URL}/report/salaries/summary?from=${range.from}&to=${range.to}&compare=${compare}`).then(
      async (res) => res.ok && setData((await res.json()).data),
    );
  }, [fetchWithLoading, range.from, range.to, compare]);

  if (!data) return null;
  const money = (v) => formatMoney(v, data.currency || business?.currency || "PKR");
  const t = data.totals;
  const locations = data.locations;

  if (locations.length === 0) {
    return (
      <Card className="p-5">
        <EmptyState icon={Wallet} title="No salaries in this period">
          Set a monthly salary on your {terms.staffPlural.toLowerCase()} to see costs per branch.
        </EmptyState>
      </Card>
    );
  }

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Salary cost" value={money(t.total)} sub={<Change value={t.change} current={t.total} previous={t.prev_total} upIsGood={false} against={previousName} onAccent />} icon={Wallet} accent />
        <StatCard label={`${terms.staffPlural} paid`} value={formatCount(t.headcount)} sub={<span className="text-[11.5px] text-[var(--color-faint)]">across {locations.length} branches</span>} icon={UsersRound} />
        <StatCard label="Sales in the same period" value={money(t.sales)} icon={HandCoins} />
        <StatCard
          label="Salaries vs sales"
          value={t.share_of_sales === null ? "—" : `${t.share_of_sales}%`}
          sub={
            <span className={`text-[11.5px] ${t.share_of_sales > 100 ? "text-[var(--color-red)]" : "text-[var(--color-faint)]"}`}>
              {t.share_of_sales === null ? "No sales in this period" : t.share_of_sales > 100 ? "Salaries cost more than the sales" : "of sales went on salaries"}
            </span>
          }
          icon={Percent}
        />
      </div>

      {/* Branch against branch */}
      <Card className="p-5">
        <p className={eyebrow}>{rangeName}</p>
        <h2 className="mb-4 font-display text-[17px] font-medium tracking-tight">Branch by branch</h2>
        <div className="overflow-x-auto scrollbar-none">
          <table className="w-full min-w-[780px] text-left text-[13px]">
            <thead>
              <tr className="border-b border-[var(--color-border)] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">
                <th className="pb-2.5 pr-4">Branch</th>
                <th className="pb-2.5 pr-4 text-right">Salary cost</th>
                {previousName && <th className="pb-2.5 pr-4 text-right">{previousName}</th>}
                {previousName && <th className="pb-2.5 pr-4">Change</th>}
                <th className="pb-2.5 pr-4 text-right">Branch sales</th>
                <th className="w-[22%] pb-2.5 pr-4">Salaries vs sales</th>
                <th className="pb-2.5 text-right">People</th>
              </tr>
            </thead>
            <tbody>
              {locations.map((l) => {
                const share = l.share_of_sales;
                const over = share !== null && share > 100;
                const isOpen = open === l.location_id;
                return (
                  <Fragment key={l.location_id}>
                    <tr className="border-b border-[var(--color-border-soft)]">
                      <td className="py-2.5 pr-4">
                        <button
                          type="button"
                          aria-expanded={isOpen}
                          onClick={() => setOpen(isOpen ? null : l.location_id)}
                          className="flex items-center gap-1.5 font-medium hover:text-[var(--color-accent)]"
                        >
                          <ChevronDown size={14} className={`transition-transform ${isOpen ? "rotate-180" : "-rotate-90"}`} />
                          {l.location_name}
                        </button>
                      </td>
                      <td className="py-2.5 pr-4 text-right font-semibold tabular-nums">{money(l.total)}</td>
                      {previousName && <td className="py-2.5 pr-4 text-right tabular-nums text-[var(--color-muted)]">{money(l.prev_total)}</td>}
                      {previousName && <td className="py-2.5 pr-4"><Change value={l.change} current={l.total} previous={l.prev_total} upIsGood={false} /></td>}
                      <td className="py-2.5 pr-4 text-right tabular-nums">{money(l.sales)}</td>
                      <td className="py-2.5 pr-4">
                        {share === null ? (
                          <span className="text-[12px] text-[var(--color-faint)]">No sales</span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--color-accent-soft)]">
                              <span className={`block h-full rounded-full ${over ? "bg-[var(--color-red)]" : "bg-[var(--color-accent)]"}`} style={{ width: `${Math.min(100, share)}%` }} />
                            </span>
                            <span className={`w-14 text-right text-[12px] font-semibold tabular-nums ${over ? "text-[var(--color-red)]" : "text-[var(--color-muted)]"}`}>{share}%</span>
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 text-right tabular-nums">{l.staff.length}</td>
                    </tr>
                    {isOpen &&
                      l.staff.map((s) => (
                        <tr key={`${l.location_id}-${s.staff_id}`} className="bg-[var(--color-panel-alt)]/50 text-[12.5px]">
                          <td className="py-2 pr-4 pl-7">{s.staff_name}</td>
                          <td className="py-2 pr-4 text-right tabular-nums">{money(s.cost)}</td>
                          <td colSpan={previousName ? 5 : 3} className="py-2 pr-4 text-[var(--color-muted)]">
                            {money(s.monthly_salary)} a month · {s.days} day{s.days === 1 ? "" : "s"} at this branch in the period
                          </td>
                        </tr>
                      ))}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="mt-3 text-[12px] text-[var(--color-faint)]">
          Click a branch to see who was paid. Each monthly salary is charged for the days in the period; someone moved between branches is split by the days at each.
        </p>
      </Card>

      {data.months.length > 1 && (
        <Card className="p-5">
          <p className={eyebrow}>{rangeName}</p>
          <h2 className="mb-3 font-display text-[17px] font-medium tracking-tight">Month by month</h2>
          <BranchMonthBars
            months={data.months}
            locations={locations.map((l) => ({ id: l.location_id, name: l.location_name }))}
            valueFormatter={money}
            label={`Salary cost per branch per month, ${rangeName}`}
          />
        </Card>
      )}
    </div>
  );
}
