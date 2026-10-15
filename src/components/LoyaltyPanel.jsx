import { useCallback, useEffect, useState } from "react";
import { Pencil, Plus, Star, Trash2 } from "lucide-react";
import { Badge, Button, Input, SectionTitle, Select } from "./ui";
import { formatMoney } from "./format";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

const RULE_TYPES = [
  { value: "nth_visit", label: "Visit count (e.g. every 10th visit)" },
  { value: "monthly_regular", label: "Comes every month" },
  { value: "spend_threshold", label: "Total spend reaches an amount" },
];

const THRESHOLD_LABEL = {
  nth_visit: "Visit number",
  monthly_regular: "Months in a row",
  spend_threshold: "Total spend",
};

const EMPTY_RULE = {
  name: "",
  type: "nth_visit",
  threshold: "10",
  repeats: true,
  discount_type: "percent",
  discount_value: "20",
  max_discount: "",
  is_active: true,
};

/* Star-client rules: managers add and edit them, everyone can see what clients earn. */
export default function LoyaltyPanel() {
  const { fetchWithLoading } = useApi();
  const { isManager, business } = useSession();
  const { addToast } = useToast();
  const [rules, setRules] = useState([]);
  const [summary, setSummary] = useState(null);
  const [form, setForm] = useState(null); // null = closed; { id?, ...fields } = open

  const load = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/loyalty/rules`);
    if (res.ok) setRules((await res.json()).data);
    if (isManager) {
      const sum = await fetchWithLoading(`${constanst.API_URL}/loyalty/summary`);
      if (sum.ok) setSummary((await sum.json()).data);
    }
  }, [fetchWithLoading, isManager]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (e) => {
    e.preventDefault();
    const body = {
      name: form.name,
      type: form.type,
      threshold: Number(form.threshold),
      repeats: form.repeats,
      discount_type: form.discount_type,
      discount_value: Number(form.discount_value),
      max_discount: form.discount_type === "percent" && form.max_discount !== "" ? Number(form.max_discount) : null,
      is_active: form.is_active,
    };
    const res = await fetchWithLoading(`${constanst.API_URL}/loyalty/rules${form.id ? `/${form.id}` : ""}`, {
      method: form.id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) return;
    addToast({ message: form.id ? "Rule updated" : "Rule added", type: "success" });
    setForm(null);
    load();
  };

  const toggle = async (rule) => {
    const res = await fetchWithLoading(`${constanst.API_URL}/loyalty/rules/${rule.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !rule.is_active }),
    });
    if (res.ok) load();
  };

  const remove = async (rule) => {
    if (!window.confirm(`Delete "${rule.name}"? Bookings that already got this discount keep it.`)) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/loyalty/rules/${rule.id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  const edit = (rule) =>
    setForm({
      ...rule,
      threshold: String(rule.threshold),
      discount_value: String(rule.discount_value),
      max_discount: rule.max_discount == null ? "" : String(rule.max_discount),
    });

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const currency = business?.currency || "PKR";

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Loyalty & rewards"
        action={isManager && !form && (
          <Button variant="subtle" onClick={() => setForm({ ...EMPTY_RULE })}>
            <Plus size={14} /> Add rule
          </Button>
        )}
      />
      <p className="text-[13px] text-[var(--color-muted)]">
        Rewards are worked out from each client&apos;s bookings and applied automatically when a booking is made.
        If several rules match, the client gets the biggest discount (they are not added together).
        Clients who reach a milestone show a <span className="text-[var(--color-orange)] font-semibold">★ Star</span> badge.
      </p>

      {summary && summary.bookings > 0 && (
        <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-panel-alt)] p-3.5 text-[13px]">
          <p className="font-medium">
            This month: {formatMoney(summary.discount_total, currency)} in discounts on {summary.bookings} booking{summary.bookings === 1 ? "" : "s"}
          </p>
          <p className="mt-1 text-[12px] text-[var(--color-muted)]">
            {summary.by_rule.map((r) => `${r.rule_name}: ${formatMoney(r.discount_total, currency)} (${r.bookings})`).join(" · ")}
          </p>
        </div>
      )}

      {form && (
        <form onSubmit={save} className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
          <Input label="Name" value={form.name} onChange={set("name")} placeholder="e.g. 10th visit reward" required />
          <div className="grid gap-3 sm:grid-cols-2">
            <Select label="Reward clients for" value={form.type} onChange={set("type")}>
              {RULE_TYPES}
            </Select>
            <Input
              label={form.type === "spend_threshold" ? `${THRESHOLD_LABEL[form.type]} (${currency})` : THRESHOLD_LABEL[form.type]}
              type="number"
              min="1"
              step={form.type === "spend_threshold" ? "any" : "1"}
              value={form.threshold}
              onChange={set("threshold")}
              required
            />
          </div>
          {form.type === "nth_visit" && (
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={form.repeats} onChange={set("repeats")} />
              Repeat: every {form.threshold || "N"}th visit (untick for that visit only, e.g. a welcome offer on visit 1)
            </label>
          )}
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label="Discount" value={form.discount_type} onChange={set("discount_type")}>
              {[
                { value: "percent", label: "Percent off" },
                { value: "fixed", label: `Fixed amount (${currency})` },
              ]}
            </Select>
            <Input
              label={form.discount_type === "percent" ? "Percent" : "Amount"}
              type="number"
              min="0.01"
              max={form.discount_type === "percent" ? "100" : undefined}
              step="any"
              value={form.discount_value}
              onChange={set("discount_value")}
              required
            />
            {form.discount_type === "percent" && (
              <Input label="Up to (optional)" type="number" min="1" step="any" value={form.max_discount} onChange={set("max_discount")} placeholder="No limit" />
            )}
          </div>
          <label className="flex items-center gap-2 text-[13px]">
            <input type="checkbox" checked={form.is_active} onChange={set("is_active")} />
            Active
          </label>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancel</Button>
            <Button type="submit">{form.id ? "Save rule" : "Add rule"}</Button>
          </div>
        </form>
      )}

      {rules.length === 0 && !form && (
        <p className="text-[13px] text-[var(--color-muted)]">
          No rules yet.{isManager ? " Add one, for example 20% off every 10th visit." : ""}
        </p>
      )}

      <div className="divide-y divide-[var(--color-border-soft)]">
        {rules.map((rule) => (
          <div key={rule.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
            <div className="flex items-start gap-3 min-w-0">
              <Star size={16} className={`mt-0.5 shrink-0 ${rule.is_active ? "text-[var(--color-orange)]" : "text-[var(--color-faint)]"}`} />
              <div className="min-w-0">
                <p className="text-[13.5px] font-medium">{rule.name}</p>
                <p className="text-[12.5px] text-[var(--color-muted)]">
                  {rule.condition} → <span className="text-[var(--color-ink)]">{rule.reward}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge>{rule.is_active ? "Active" : "Inactive"}</Badge>
              {isManager && (
                <>
                  <Button variant="ghost" className="px-3" onClick={() => toggle(rule)}>
                    {rule.is_active ? "Turn off" : "Turn on"}
                  </Button>
                  <Button variant="ghost" className="px-2.5" onClick={() => edit(rule)} aria-label={`Edit ${rule.name}`}>
                    <Pencil size={14} />
                  </Button>
                  <Button variant="ghost" className="px-2.5" onClick={() => remove(rule)} aria-label={`Delete ${rule.name}`}>
                    <Trash2 size={14} />
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
