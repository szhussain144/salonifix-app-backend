import { useCallback, useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { Card, SectionTitle, Table, Tr, Td, Button, StatCard } from "../components/ui";
import { Link } from "react-router-dom";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import { formatBookingDate } from "../context/functions";
import { formatAmount } from "../components/format";

export default function Expenses() {
  // const total = expenses.reduce((s, e) => s + e.amount, 0);
  const [totalExpenses, setTotalExpenses] = useState(0);
  const [onlineEarning, setOnlineEarning] = useState(0);
  const [miscEarning, setMiscEarning] = useState(0);
  const [cashEarning, setCashEarning] = useState(0);
  const [expenses, setExpenses] = useState([]);
  const [filter, setFilter] = useState("Today");
  const { fetchWithLoading } = useApi();

  const fetchExpenses = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/expenses?filter=${filter.toLowerCase()}`);
      const data = await response.json();
      setExpenses(data.data.expenses.data);
      setTotalExpenses(data.data.counts.all);
      setCashEarning(data.data.expenses.earnings.cash)
      setOnlineEarning(data.data.expenses.earnings.online)
      setMiscEarning(data.data.expenses.earnings.misc)
    } catch (error) {
      console.log("Error listing expenses : ", error)
    }
  }, [fetchWithLoading, filter]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-[1fr_1fr_auto] items-end rounded-xl">
        <div></div>
        <div style={{ marginLeft: 'auto' }}>
          {["Today", "Weekly", "Monthly"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${filter === t ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "bg-[var(--color-panel-alt)] text-[var(--color-muted)]"
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-3 sm:grid-cols-3 gap-4">
        <StatCard label="Cash Earnings" value={formatAmount(cashEarning)} accent />
        <StatCard label="Online Earnings" value={formatAmount(onlineEarning)} accent />
        <StatCard label="Miscellaneous" value={formatAmount(miscEarning)} />
        {/* <StatCard label="Avg / Entry" value={formatAmount(Math.round(total / expenses.length))} /> */}
      </div>

      <Card className="p-5">
        <SectionTitle
          eyebrow="This Month"
          title="Expenses"
          action={<Link to="/expenses/new"><Button style={{ cursor: "pointer" }}><Plus size={14} /> Add Expense</Button></Link>}
        />

        <Table columns={["Category", "Type", "Amount", ""]}>
          {expenses.map((e) => (
            <Tr key={e.id}>
              <Td className="font-medium">{e.category}</Td>
              <Td className="text-[var(--color-muted)]">{formatBookingDate(e.created_at)}</Td>
              <Td className="font-medium">{formatAmount(e?.amount)}</Td>
              <Td>
                <Link to={`/expenses/update/${e.id}`}><button className="text-[12px] text-[var(--color-accent)] font-medium hover:underline">Edit</button></Link>
              </Td>
            </Tr>
          ))}
          <tr>
            <td className="pt-4 font-semibold text-[13px]" colSpan={2}>Total Expenses</td>
            <td className="pt-4 font-semibold text-[13px]">{formatAmount(+cashEarning + +onlineEarning + +miscEarning - +totalExpenses)}</td>
            <td></td>
          </tr>
        </Table>
      </Card>
    </div>
  );
}
