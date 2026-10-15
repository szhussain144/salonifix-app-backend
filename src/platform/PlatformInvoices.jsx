import { useCallback, useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Plus, RefreshCw, Search } from "lucide-react";
import { Button, Card, EmptyState, Table, Td, Tr } from "../components/ui";
import { useToast } from "../context/ToastContext";
import useDebounce from "../context/debounce";
import { PlatformHeading } from "./PlatformLayout";
import { InvoiceActions, InvoiceStatus, InvoiceSummary, NewInvoiceDialog } from "./invoiceParts";
import { shortDate, usePlatformApi } from "./platformApi";

const FILTERS = [
  ["", "All"],
  ["pending", "Unpaid"],
  ["overdue", "Overdue"],
  ["paid", "Paid"],
  ["void", "Void"],
];
const LIMIT = 25;

/** Every invoice across salons: create and email them, record payments, run monthly renewals. */
export default function PlatformInvoices() {
  const api = usePlatformApi();
  const { addToast } = useToast();
  const [params, setParams] = useSearchParams();
  const status = params.get("status") || "";
  const page = Number(params.get("page") || 1);
  const [search, setSearch] = useState("");
  const query = useDebounce(search, 350);
  const [data, setData] = useState(null);
  const [creating, setCreating] = useState(false);

  const set = (key, value) =>
    setParams((p) => {
      const next = new URLSearchParams(p);
      if (value) next.set(key, value);
      else next.delete(key);
      if (key !== "page") next.delete("page");
      return next;
    });

  const load = useCallback(() => {
    const q = new URLSearchParams({ page: String(page), limit: String(LIMIT) });
    if (status) q.set("status", status);
    if (query) q.set("search", query);
    api(`/invoices?${q}`).then((r) => r.ok && setData(r.data));
  }, [api, status, page, query]);

  useEffect(() => {
    load();
  }, [load]);

  const renewals = async () => {
    if (!window.confirm("Create next month's invoice for every paid plan renewing in the next 7 days, and email each owner? Plans already invoiced are skipped.")) return;
    const r = await api("/invoices/renewals", { method: "POST", body: { days: 7 } });
    if (!r.ok) return;
    const failed = r.data.created.filter((c) => !c.sent).length;
    addToast({ message: `${r.message}${failed ? ` · ${failed} couldn't be emailed` : ""}`, type: r.data.created.length ? "success" : "info" });
    load();
  };

  const pages = data ? Math.max(1, Math.ceil(data.total / LIMIT)) : 1;

  return (
    <>
      <PlatformHeading
        eyebrow="Platform"
        title="Invoices"
        subtitle="Bill salons, email invoices and record payments. A paid plan invoice moves the salon onto that plan."
        action={
          <div className="flex gap-2">
            <Button variant="ghost" onClick={renewals}><RefreshCw size={14} /> Invoice renewals</Button>
            <Button onClick={() => setCreating(true)}><Plus size={14} /> New invoice</Button>
          </div>
        }
      />

      <Card className="p-5">
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <label className="flex w-full items-center gap-2 rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] px-3.5 py-2 focus-within:border-[var(--color-accent)] sm:w-64">
            <Search size={14} className="text-[var(--color-faint)]" />
            <input aria-label="Search invoices" placeholder="Salon, description or #" className="w-full bg-transparent text-[13px] outline-none placeholder:text-[var(--color-faint)]" value={search} onChange={(e) => setSearch(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Status">
            {FILTERS.map(([key, label]) => (
              <button
                key={key}
                type="button"
                aria-pressed={status === key}
                onClick={() => set("status", key)}
                className={`rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${status === key ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white" : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {data && data.invoices.length === 0 ? (
          <EmptyState title="No invoices here">Create one with “New invoice”, or invoice this month&apos;s renewals.</EmptyState>
        ) : (
          <Table columns={["Invoice", "Salon", "Amount", "Status", ""]}>
            {(data?.invoices || []).map((i) => (
              <Tr key={i.id}>
                <Td>
                  <span className="block text-[13.5px] font-medium">#{i.id} · {i.description}</span>
                  <span className="block text-[11.5px] text-[var(--color-muted)]">{shortDate(i.created_at)}{i.created_by ? ` · by ${i.created_by}` : ""}{i.paid_at ? ` · paid ${shortDate(i.paid_at)}` : ""}</span>
                </Td>
                <Td>
                  <Link to={`/platform/businesses/${i.business_id}`} className="text-[13px] font-medium hover:text-[var(--color-accent)]">{i.business_name}</Link>
                  <span className="block text-[11.5px] text-[var(--color-muted)]">{i.owner_email}</span>
                </Td>
                <Td><InvoiceSummary invoice={i} /></Td>
                <Td><InvoiceStatus invoice={i} /></Td>
                <Td><InvoiceActions invoice={i} onChange={(_, message) => { addToast({ message, type: "success" }); load(); }} /></Td>
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

      {creating && (
        <NewInvoiceDialog
          onClose={() => setCreating(false)}
          onCreated={(_, message) => {
            setCreating(false);
            addToast({ message, type: "success" });
            load();
          }}
        />
      )}
    </>
  );
}
