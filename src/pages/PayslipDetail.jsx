import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Printer, Trash2 } from "lucide-react";
import { Badge, Button, Card, Input, SectionTitle, Select, Table, Td, Tr } from "../components/ui";
import { dateLocale, formatDay, formatMoney, todayISO } from "../components/format";
import { BackLink } from "../components/DetailLink";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";
import { forRegion, PAYMENT_METHOD as METHOD_LABEL, PAYSLIP_STATUS as STATUS_LABEL } from "../components/labels";

const monthLabel = (ym) =>
  ym ? new Date(`${ym}-01T00:00:00`).toLocaleDateString(dateLocale(), { month: "long", year: "numeric" }) : "";

/** One payslip: how the amount was worked out, bonuses/deductions, and payments. */
export default function PayslipDetail() {
  const { id } = useParams();
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { business, terms } = useSession();
  const [slip, setSlip] = useState(null);
  const [payment, setPayment] = useState(null);
  const [adjustment, setAdjustment] = useState(null);
  const currency = business?.currency || "PKR";
  const money = (v) => formatMoney(v, currency);

  const load = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/payroll/payslips/${id}`);
    if (res.ok) setSlip((await res.json()).data);
  }, [fetchWithLoading, id]);

  useEffect(() => {
    load();
  }, [load]);

  const post = async (path, body, method = "POST") => {
    const res = await fetchWithLoading(`${constanst.API_URL}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body && { body: JSON.stringify(body) }),
    });
    if (!res.ok) return false;
    const json = await res.json();
    setSlip(json.data);
    addToast({ message: json.message, type: "success" });
    return true;
  };

  const submitPayment = async (e) => {
    e.preventDefault();
    const ok = await post(`/payroll/payslips/${id}/payments`, {
      amount: Number(payment.amount),
      method: payment.method,
      kind: payment.kind,
      paid_on: payment.paid_on,
      ...(payment.reference && { reference: payment.reference }),
      ...(payment.note && { note: payment.note }),
    });
    if (ok) setPayment(null);
  };

  const submitAdjustment = async (e) => {
    e.preventDefault();
    const ok = await post(`/payroll/payslips/${id}/adjustments`, {
      kind: adjustment.kind,
      amount: Number(adjustment.amount),
      ...(adjustment.note && { note: adjustment.note }),
    });
    if (ok) setAdjustment(null);
  };

  if (!slip) return null;

  return (
    <div className="space-y-5">
      <BackLink to="/payroll">Back to Payroll</BackLink>

      <div className="print-area space-y-5">
        <Card className="p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">
                Payslip · {monthLabel(slip.month)}
              </p>
              <h2 className="mt-1 font-display text-[22px] font-medium">{slip.staff_name}</h2>
              <p className="text-[13px] text-[var(--color-muted)]">
                {[slip.staff_role, slip.location_name, business?.name].filter(Boolean).join(" · ")}
              </p>
            </div>
            <div className="text-right">
              <Badge>{STATUS_LABEL[slip.status]}</Badge>
              <p className="mt-2 font-display text-[26px] font-medium">{money(slip.net_amount)}</p>
              <p className="text-[12px] text-[var(--color-muted)]">
                Paid {money(slip.paid_amount)} · Balance <b className={slip.balance > 0 ? "text-[var(--color-red)]" : ""}>{money(Math.max(slip.balance, 0))}</b>
              </p>
            </div>
          </div>
          <div className="no-print mt-4 flex flex-wrap gap-2">
            {slip.balance > 0 && (
              <Button type="button" onClick={() => setPayment({ amount: String(slip.balance), method: "cash", kind: "salary", paid_on: todayISO(), reference: "", note: "" })}>
                Record payment
              </Button>
            )}
            <Button variant="ghost" type="button" onClick={() => setAdjustment({ kind: "bonus", amount: "", note: "" })}>
              Add bonus / deduction
            </Button>
            <Button variant="ghost" type="button" onClick={() => window.print()}>
              <Printer size={14} /> Print payslip
            </Button>
          </div>

          {payment && (
            <form onSubmit={submitPayment} className="no-print mt-4 space-y-3 rounded-xl border border-[var(--color-border)] p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Input label="Amount" type="number" min="1" step="1" required value={payment.amount} onChange={(e) => setPayment((p) => ({ ...p, amount: e.target.value }))} />
                <Select label="Method" value={payment.method} onChange={(e) => setPayment((p) => ({ ...p, method: e.target.value }))}>
                  {forRegion(Object.entries(METHOD_LABEL)).map(([value, label]) => ({ value, label }))}
                </Select>
                <Input label="Paid on" type="date" max={todayISO()} required value={payment.paid_on} onChange={(e) => setPayment((p) => ({ ...p, paid_on: e.target.value }))} />
              </div>
              <div className="grid gap-3 sm:grid-cols-3">
                <Select label="Type" value={payment.kind} onChange={(e) => setPayment((p) => ({ ...p, kind: e.target.value }))}>
                  {[{ value: "salary", label: "Salary" }, { value: "advance", label: "Advance" }]}
                </Select>
                <Input label="Reference (optional)" placeholder="Txn ID / cheque no." value={payment.reference} onChange={(e) => setPayment((p) => ({ ...p, reference: e.target.value }))} />
                <Input label="Note (optional)" value={payment.note} onChange={(e) => setPayment((p) => ({ ...p, note: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => setPayment(null)}>Cancel</Button>
                <Button type="submit">Save payment</Button>
              </div>
            </form>
          )}

          {adjustment && (
            <form onSubmit={submitAdjustment} className="no-print mt-4 space-y-3 rounded-xl border border-[var(--color-border)] p-4">
              <div className="grid gap-3 sm:grid-cols-3">
                <Select label="Type" value={adjustment.kind} onChange={(e) => setAdjustment((a) => ({ ...a, kind: e.target.value }))}>
                  {[{ value: "bonus", label: "Bonus" }, { value: "deduction", label: "Deduction" }]}
                </Select>
                <Input label="Amount" type="number" min="1" step="1" required value={adjustment.amount} onChange={(e) => setAdjustment((a) => ({ ...a, amount: e.target.value }))} />
                <Input label="Reason (optional)" placeholder="e.g. Eid bonus, late days" value={adjustment.note} onChange={(e) => setAdjustment((a) => ({ ...a, note: e.target.value }))} />
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" type="button" onClick={() => setAdjustment(null)}>Cancel</Button>
                <Button type="submit">Save</Button>
              </div>
            </form>
          )}
        </Card>

        <Card className="p-5">
          <SectionTitle title="How it's calculated" />
          <Table columns={["Location", "Period", "Days", "Monthly salary", "Amount"]}>
            {(slip.breakdown || []).map((l, i) => (
              <Tr key={i}>
                <Td className="font-medium">{l.location_name}</Td>
                <Td className="text-[var(--color-muted)]">{formatDay(l.from)} – {formatDay(l.to)}</Td>
                <Td>{l.days}</Td>
                <Td className="text-[var(--color-muted)]">{money(l.monthly_salary)}</Td>
                <Td>{money(l.amount)}</Td>
              </Tr>
            ))}
            {Number(slip.commission_amount) > 0 && slip.commission_breakdown && (
              <Tr key="commission">
                <Td className="font-medium">Commission</Td>
                <Td className="text-[var(--color-muted)]" colSpan={3}>
                  {[
                    slip.commission_breakdown.service_rate > 0 && `${slip.commission_breakdown.service_rate}% of ${money(slip.commission_breakdown.service_sales)} services`,
                    slip.commission_breakdown.product_rate > 0 && `${slip.commission_breakdown.product_rate}% of ${money(slip.commission_breakdown.product_sales)} products`,
                  ]
                    .filter(Boolean)
                    .join(" + ")}
                </Td>
                <Td className="text-[var(--color-green)]">+{money(slip.commission_amount)}</Td>
              </Tr>
            )}
            {slip.adjustments.map((a) => (
              <Tr key={`a${a.id}`}>
                <Td className="font-medium">{a.kind === "bonus" ? "Bonus" : "Deduction"}</Td>
                <Td className="text-[var(--color-muted)]" colSpan={3}>{a.note || "—"}</Td>
                <Td>
                  <span className={a.kind === "bonus" ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}>
                    {a.kind === "bonus" ? "+" : "−"}{money(a.amount)}
                  </span>
                  <button type="button" aria-label="Remove" className="no-print ml-2 align-middle text-[var(--color-faint)] hover:text-[var(--color-red)]" onClick={() => post(`/payroll/adjustments/${a.id}`, null, "DELETE")}>
                    <Trash2 size={13} />
                  </button>
                </Td>
              </Tr>
            ))}
          </Table>
          <div className="mt-3 flex justify-end text-[14px]">
            <span className="text-[var(--color-muted)]">Net pay&nbsp;</span>
            <b>{money(slip.net_amount)}</b>
          </div>
        </Card>

        <Card className="p-5">
          <SectionTitle title="Payments" />
          {slip.payments.length === 0 ? (
            <p className="text-[13px] text-[var(--color-muted)]">Nothing paid yet.</p>
          ) : (
            <Table columns={["Date", "Type", "Method", "Reference", "Amount", ""]}>
              {slip.payments.map((p) => (
                <Tr key={p.id}>
                  <Td>{formatDay(p.paid_on, { long: true })}</Td>
                  <Td className="capitalize">{p.kind}</Td>
                  <Td>{METHOD_LABEL[p.method] || p.method}</Td>
                  <Td className="text-[var(--color-muted)]">{p.reference || p.note || "—"}</Td>
                  <Td className="font-medium">{money(p.amount)}</Td>
                  <Td>
                    <button
                      type="button"
                      className="no-print text-[12px] text-[var(--color-faint)] hover:text-[var(--color-red)]"
                      onClick={() => window.confirm(`Remove this ${money(p.amount)} payment?`) && post(`/payroll/payments/${p.id}`, null, "DELETE")}
                    >
                      Remove
                    </button>
                  </Td>
                </Tr>
              ))}
            </Table>
          )}
          <p className="mt-4 hidden text-[12px] text-[var(--color-muted)] print:block">
            {terms.staff} signature: ______________________ &nbsp;&nbsp; Issued by {business?.name}
          </p>
        </Card>
      </div>
    </div>
  );
}
