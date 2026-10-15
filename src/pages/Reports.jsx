import { useState } from "react";
import { HandCoins, Receipt, UsersRound, Wallet } from "lucide-react";
import { Segmented } from "../components/ui";
import ReportPeriodBar from "../components/ReportPeriodBar";
import { comparisonRange, PRESETS, presetRange, rangeLabel } from "../components/reportPeriods";
import SalesReport from "../components/SalesReport";
import StaffReport from "../components/StaffReport";
import ExpensesReport from "../components/ExpensesReport";
import SalaryReport from "../components/SalaryReport";
import { useSession } from "../context/SessionContext";

/**
 * Reports: one period and comparison, chosen once in the toolbar, shared by every tab, so
 * sales, staff, expenses and salaries always describe the same dates.
 */
export default function Reports() {
  const { isManager, locations, terms, isAllLocations } = useSession();
  const [tab, setTab] = useState("sales");
  const [preset, setPreset] = useState("this_month");
  const [custom, setCustom] = useState(() => presetRange("this_month"));
  const [compare, setCompare] = useState("previous");

  const range = preset === "custom" ? custom : presetRange(preset);
  const previous = comparisonRange(range, compare);
  const rangeName = rangeLabel(range);
  const previousName = previous ? rangeLabel(previous) : null;
  // Comparing branches only makes sense with more than one.
  const showSalaries = isManager && (locations?.length ?? 0) > 1;

  const tabs = [
    { key: "sales", label: "Sales", icon: Wallet },
    { key: "staff", label: `${terms.staff} performance`, icon: UsersRound },
    { key: "expenses", label: "Expenses", icon: Receipt },
    ...(showSalaries ? [{ key: "salaries", label: "Salaries by location", icon: HandCoins }] : []),
  ];
  // A tab that isn't available (e.g. after switching to a one-branch view) falls back to Sales.
  const current = tabs.some((t) => t.key === tab) ? tab : "sales";

  const props = { range, compare, rangeName, previousName };
  return (
    <div className="space-y-5">
      {/* On narrow screens the tabs scroll sideways instead of widening the page. */}
      <div className="-mx-4 overflow-x-auto px-4 pb-1 scrollbar-none">
        <div className="w-max">
          <Segmented value={current} onChange={setTab} options={tabs} />
        </div>
      </div>
      <ReportPeriodBar
        presets={PRESETS}
        preset={preset}
        range={range}
        rangeName={rangeName}
        onPreset={setPreset}
        onCustom={(r) => {
          setCustom(r);
          setPreset("custom");
        }}
        compare={compare}
        onCompare={setCompare}
        compareName={previousName}
        branchOnly={!isAllLocations}
      />
      {current === "sales" && <SalesReport {...props} />}
      {current === "staff" && <StaffReport {...props} />}
      {current === "expenses" && <ExpensesReport {...props} />}
      {current === "salaries" && showSalaries && <SalaryReport {...props} />}
    </div>
  );
}
