import { useCallback, useEffect, useState } from "react";
import { CircleCheck, RefreshCw, Users, Wallet } from "lucide-react";
import { Badge, Button, Card, EmptyState, Input, SectionTitle, StatCard, Table, Td, Tr } from "../components/ui";
import { formatMoney, todayISO } from "../components/format";
import { DetailLink } from "../components/DetailLink";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";
import { PAYMENT_METHOD as METHOD_LABEL, PAYSLIP_STATUS as STATUS_LABEL } from "../components/labels";

/** Monthly payroll: what each staff member is owed, what's been paid, and what's left. */
export default function Payroll() {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { business, terms } = useSession();
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [data, setData] = useState(null);
  const currency = business?.currency || "PKR";
  const money = (v) => formatMoney(v, currency);

  const load = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/payroll?month=${month}`);
    if (res.ok) setData((await res.json()).data);
  }, [fetchWithLoading, month]);

  useEffect(() => {
    load();
  }, [load]);

  const run = async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/payroll/runs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ month }),
    });
    if (!res.ok) return;
    const body = await res.json();
    setData(body.data);
    addToast({ message: body.message, type: "success" });
  };

  const summary = data?.summary;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-44">
          <Input label="Month" type="month" value={month} max={todayISO().slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} />
        </div>
        <Button type="button" onClick={run}>
          <RefreshCw size={14} /> {data?.payslips.length ? "Refresh payroll" : "Run payroll"}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total payroll" value={money(summary?.total_net ?? 0)} icon={Wallet} accent />
        <StatCard label="Paid" value={money(summary?.total_paid ?? 0)} icon={CircleCheck} />
        <StatCard label="Outstanding" value={money(summary?.outstanding ?? 0)} />
        <StatCard label={`${terms.staffPlural} paid`} value={`${summary?.paid_count ?? 0} / ${summary?.staff_count ?? 0}`} icon={Users} />
      </div>

      <Card className="p-5">
        <SectionTitle
          eyebrow={month}
          title="Payslips"
          action={summary?.by_method?.length > 0 && (
            <span className="text-[12px] text-[var(--color-muted)]">
              {summary.by_method.map((m) => `${METHOD_LABEL[m.method] || m.method}: ${money(m.total)}`).join(" · ")}
            </span>
          )}
        />
        {data && data.payslips.length === 0 ? (
          <EmptyState icon={Wallet} title="No payslips for this month yet">
            Click <b>Run payroll</b> to calculate salaries from each {terms.staff.toLowerCase()}&apos;s salary and transfers.
          </EmptyState>
        ) : (
          <Table columns={[terms.staff, "Location", "Salary", "Commission", "Bonus / deduction", "Net pay", "Paid", "Balance", "Status", ""]}>
            {data?.payslips.map((p) => {
              const adj = Number(p.bonus_amount) - Number(p.deduction_amount);
              return (
                <Tr key={p.id}>
                  <Td>
                    <p className="font-medium">{p.staff_name}</p>
                    <p className="text-[11px] text-[var(--color-faint)]">{p.staff_role}</p>
                  </Td>
                  <Td className="text-[var(--color-muted)]">{p.location_name}</Td>
                  <Td>{money(p.base_amount)}</Td>
                  <Td className={Number(p.commission_amount) > 0 ? "" : "text-[var(--color-faint)]"}>{Number(p.commission_amount) > 0 ? money(p.commission_amount) : "—"}</Td>
                  <Td className={adj > 0 ? "text-[var(--color-green)]" : adj < 0 ? "text-[var(--color-red)]" : "text-[var(--color-faint)]"}>
                    {adj === 0 ? "—" : `${adj > 0 ? "+" : "−"}${money(Math.abs(adj))}`}
                  </Td>
                  <Td className="font-semibold">{money(p.net_amount)}</Td>
                  <Td>{money(p.paid_amount)}</Td>
                  <Td className={p.balance > 0 ? "font-medium text-[var(--color-red)]" : "text-[var(--color-faint)]"}>{money(Math.max(p.balance, 0))}</Td>
                  <Td><Badge>{STATUS_LABEL[p.status]}</Badge></Td>
                  <Td>
                    <DetailLink to={`/payroll/payslips/${p.id}`} className="text-[12px] font-medium text-[var(--color-accent)] hover:underline">
                      {p.balance > 0 ? "Pay" : "View"}
                    </DetailLink>
                  </Td>
                </Tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}
