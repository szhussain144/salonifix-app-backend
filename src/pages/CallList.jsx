import { useCallback, useEffect, useState } from "react";
import { Phone, PhoneCall, Plus, UserPlus } from "lucide-react";
import { Badge, Button, Card, EmptyState, Input, SectionTitle, Segmented, Select, Table, Td, Tr } from "../components/ui";
import { formatDay, todayISO } from "../components/format";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

const OUTCOMES = [
  { value: "answered", label: "Answered" },
  { value: "booked", label: "Booked" },
  { value: "no_answer", label: "No answer" },
  { value: "busy", label: "Busy" },
  { value: "call_back", label: "Call back" },
  { value: "not_interested", label: "Not interested" },
  { value: "wrong_number", label: "Wrong number" },
];
const OUTCOME_LABEL = Object.fromEntries(OUTCOMES.map((o) => [o.value, o.label]));

/**
 * Phone follow-ups. "Call" uses Twilio click-to-call: your phone rings first, then the
 * client is connected (your number stays private). "Dial" uses this device's phone app.
 */
export default function CallList() {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { isManager, activeLocations, terms } = useSession();
  const [status, setStatus] = useState("open");
  const [tasks, setTasks] = useState([]);
  const [total, setTotal] = useState(0);
  const [logging, setLogging] = useState(null);
  const [adding, setAdding] = useState(null);

  const load = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/marketing/calls?status=${status}&limit=100`);
    if (!res.ok) return;
    const json = await res.json();
    setTasks(json.data);
    setTotal(json.count);
  }, [fetchWithLoading, status]);

  useEffect(() => {
    load();
  }, [load]);

  const request = async (path, method, body) => {
    const res = await fetchWithLoading(`${constanst.API_URL}/marketing/calls${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body && { body: JSON.stringify(body) }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    addToast({ message: json.message, type: "success", duration: 5000 });
    return json;
  };

  const dial = (task) => request(`/${task.id}/dial`, "POST", {}).then((r) => r && load());

  const saveOutcome = async (e) => {
    e.preventDefault();
    const ok = await request(`/${logging.id}`, "PUT", {
      outcome: logging.outcome,
      ...(logging.notes && { notes: logging.notes }),
      ...(logging.outcome === "call_back" && logging.due_date && { due_date: logging.due_date }),
      ...(logging.opt_out && { opt_out: true }),
    });
    if (ok) {
      setLogging(null);
      load();
    }
  };

  const addClients = async (e) => {
    e.preventDefault();
    const ok = await request("", "POST", {
      audience_type: adding.audience_type,
      ...(adding.audience_type !== "all" && { audience_days: Number(adding.audience_days) }),
      ...(adding.location_id && { location_id: Number(adding.location_id) }),
      ...(adding.reason && { reason: adding.reason }),
      ...(adding.due_date && { due_date: adding.due_date }),
    });
    if (ok) {
      setAdding(null);
      load();
    }
  };

  return (
    <Card className="p-5">
      <SectionTitle
        eyebrow={`${total} ${status === "open" ? "to call" : "done"}`}
        title="Call list"
        action={isManager && !adding && (
          <Button type="button" onClick={() => setAdding({ audience_type: "inactive", audience_days: "45", location_id: "", reason: "Win-back call", due_date: todayISO() })}>
            <UserPlus size={14} /> Add {terms.clientPlural.toLowerCase()}
          </Button>
        )}
      />

      {adding && (
        <form onSubmit={addClients} className="mb-5 space-y-3 rounded-xl border border-[var(--color-border)] p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <Select label="Who" value={adding.audience_type} onChange={(e) => setAdding((a) => ({ ...a, audience_type: e.target.value }))}>
              {[
                { value: "inactive", label: "Haven't visited recently" },
                { value: "active", label: "Visited recently" },
                { value: "all", label: "Everyone" },
              ]}
            </Select>
            {adding.audience_type !== "all" && (
              <Input label="Within (days)" type="number" min="1" value={adding.audience_days} onChange={(e) => setAdding((a) => ({ ...a, audience_days: e.target.value }))} />
            )}
            <Select label="Location (optional)" value={adding.location_id} onChange={(e) => setAdding((a) => ({ ...a, location_id: e.target.value }))}>
              {activeLocations.map((l) => ({ value: String(l.id), label: l.name }))}
            </Select>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Reason" value={adding.reason} onChange={(e) => setAdding((a) => ({ ...a, reason: e.target.value }))} />
            <Input label="Call by" type="date" value={adding.due_date} onChange={(e) => setAdding((a) => ({ ...a, due_date: e.target.value }))} />
          </div>
          <p className="text-[12px] text-[var(--color-muted)]">Clients already on the list or who asked not to be called are skipped.</p>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setAdding(null)}>Cancel</Button>
            <Button type="submit"><Plus size={14} /> Add to call list</Button>
          </div>
        </form>
      )}

      <div className="mb-4">
        <Segmented value={status} onChange={setStatus} options={[{ key: "open", label: "To call" }, { key: "done", label: "Done" }]} />
      </div>

      {logging && (
        <form onSubmit={saveOutcome} className="mb-5 space-y-3 rounded-xl border border-[var(--color-accent)]/40 bg-[var(--color-accent-soft)]/40 p-4">
          <p className="text-[13px] font-semibold">How did the call with {logging.client_name} go?</p>
          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map((o) => (
              <button
                key={o.value}
                type="button"
                aria-pressed={logging.outcome === o.value}
                onClick={() => setLogging((l) => ({ ...l, outcome: o.value }))}
                className={`rounded-full px-3 py-1.5 text-[12px] font-medium ${
                  logging.outcome === o.value ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "bg-[var(--color-panel)] text-[var(--color-muted)] border border-[var(--color-border)]"
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Notes" value={logging.notes} onChange={(e) => setLogging((l) => ({ ...l, notes: e.target.value }))} />
            {logging.outcome === "call_back" && (
              <Input label="Call back on" type="date" min={todayISO()} value={logging.due_date} onChange={(e) => setLogging((l) => ({ ...l, due_date: e.target.value }))} />
            )}
          </div>
          {logging.outcome === "not_interested" && (
            <label className="flex items-center gap-2 text-[12.5px]">
              <input type="checkbox" checked={logging.opt_out} onChange={(e) => setLogging((l) => ({ ...l, opt_out: e.target.checked }))} className="accent-[var(--color-accent)]" />
              Don&apos;t call this client for marketing again
            </label>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" type="button" onClick={() => setLogging(null)}>Cancel</Button>
            <Button type="submit" disabled={!logging.outcome}>Save</Button>
          </div>
        </form>
      )}

      {tasks.length === 0 ? (
        <EmptyState icon={Phone} title={status === "open" ? "Nobody to call right now" : "No calls logged yet"}>
          {status === "open" ? `Add ${terms.clientPlural.toLowerCase()} who haven't visited in a while to win them back.` : "Logged calls show here."}
        </EmptyState>
      ) : (
        <Table columns={[terms.client, "Phone", "Last visit", "Reason", status === "open" ? "Call by" : "Outcome", "Attempts", ""]}>
          {tasks.map((t) => (
            <Tr key={t.id}>
              <Td>
                <p className="font-medium">{t.client_name}</p>
                {t.location_name && <p className="text-[11px] text-[var(--color-faint)]">{t.location_name}</p>}
              </Td>
              <Td className="text-[var(--color-muted)]">{t.client_phone}</Td>
              <Td className="text-[var(--color-muted)]">{t.last_visit ? formatDay(t.last_visit, { long: true }) : "Never"}</Td>
              <Td className="max-w-[200px] truncate text-[var(--color-muted)]">{t.notes || t.reason || "—"}</Td>
              <Td>
                {status === "open" ? (
                  <span className={t.due_date && t.due_date < todayISO() ? "text-[var(--color-red)]" : "text-[var(--color-muted)]"}>
                    {t.due_date ? formatDay(t.due_date, { long: true }) : "—"}
                  </span>
                ) : (
                  <Badge>{OUTCOME_LABEL[t.outcome] || "Done"}</Badge>
                )}
              </Td>
              <Td>{t.attempts}</Td>
              <Td>
                {status === "open" && (
                  <div className="flex items-center gap-1.5">
                    <Button type="button" className="!px-3 !py-1.5" onClick={() => dial(t)} title="Your phone rings first, then the client is connected">
                      <PhoneCall size={13} /> Call
                    </Button>
                    <a href={`tel:${t.client_phone}`} className="rounded-full border border-[var(--color-border)] px-3 py-1.5 text-[12px] text-[var(--color-muted)] hover:text-[var(--color-ink)]" title="Dial from this device">
                      Dial
                    </a>
                    <Button variant="ghost" type="button" className="!px-3 !py-1.5" onClick={() => setLogging({ id: t.id, client_name: t.client_name, outcome: "", notes: t.notes || "", due_date: "", opt_out: false })}>
                      Log
                    </Button>
                  </div>
                )}
              </Td>
            </Tr>
          ))}
        </Table>
      )}
    </Card>
  );
}
