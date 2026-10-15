import { useCallback, useEffect, useState } from "react";
import { Plus, ShieldCheck } from "lucide-react";
import { Button, Card, Input } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { PlatformHeading } from "./PlatformLayout";
import { ago, getPlatformSession, usePlatformApi } from "./platformApi";

const EMPTY = { name: "", email: "", password: "" };

/** Who can sign in to the platform portal. */
export default function PlatformAdmins() {
  const api = usePlatformApi();
  const { addToast } = useToast();
  const [admins, setAdmins] = useState([]);
  const [form, setForm] = useState(null);
  const me = getPlatformSession()?.admin;

  const load = useCallback(() => api("/admins").then((r) => r.ok && setAdmins(r.data)), [api]);
  useEffect(() => {
    load();
  }, [load]);

  const add = async (e) => {
    e.preventDefault();
    const r = await api("/admins", { method: "POST", body: form });
    if (!r.ok) return;
    addToast({ message: r.message, type: "success" });
    setForm(null);
    load();
  };
  const toggle = async (a) => {
    if (a.is_active && !window.confirm(`Switch off ${a.name}? They're signed out straight away.`)) return;
    const r = await api(`/admins/${a.id}/${a.is_active ? "deactivate" : "activate"}`, { method: "POST" });
    if (r.ok) load();
  };

  return (
    <>
      <PlatformHeading
        eyebrow="Platform"
        title="Admins"
        subtitle="People who can manage every salon. They don't need a salon account."
        action={!form && <Button onClick={() => setForm({ ...EMPTY })}><Plus size={14} /> Add admin</Button>}
      />
      <Card className="p-5">
        {form && (
          <form onSubmit={add} className="mb-5 space-y-3 rounded-xl border border-[var(--color-border)] p-4">
            <div className="grid gap-3 sm:grid-cols-3">
              <Input label="Name" required value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
              <Input label="Email" type="email" required value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
              <Input label="Password (10+ characters)" type="password" required minLength={10} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={() => setForm(null)}>Cancel</Button>
              <Button type="submit">Add admin</Button>
            </div>
          </form>
        )}
        <ul className="divide-y divide-[var(--color-border-soft)]">
          {admins.map((a) => (
            <li key={a.id} className="flex flex-wrap items-center justify-between gap-3 py-3">
              <span className="flex min-w-0 items-center gap-3">
                <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${a.is_active ? "bg-[var(--color-accent-soft)] text-[var(--color-accent)]" : "bg-[var(--color-panel-alt)] text-[var(--color-faint)]"}`}>
                  <ShieldCheck size={16} />
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px] font-semibold">{a.name}{a.id === me?.id && " (you)"}{!a.is_active && <span className="font-normal text-[var(--color-faint)]"> · switched off</span>}</span>
                  <span className="block truncate text-[12px] text-[var(--color-muted)]">{a.email} · last signed in {ago(a.last_login_at).toLowerCase()}</span>
                </span>
              </span>
              {a.id !== me?.id && (
                <Button variant="ghost" onClick={() => toggle(a)}>{a.is_active ? "Switch off" : "Switch on"}</Button>
              )}
            </li>
          ))}
        </ul>
      </Card>
    </>
  );
}
