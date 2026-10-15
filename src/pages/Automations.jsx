import { useCallback, useEffect, useState } from "react";
import { Cake, CircleCheck, CircleX, HeartHandshake, MinusCircle, RefreshCw, Star } from "lucide-react";
import { Badge, Button, Card, Input } from "../components/ui";
import { formatBookingDate } from "../context/functions";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { PlanChip } from "../components/Upgrade";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

const ICONS = { birthday: Cake, win_back: HeartHandshake, review_request: Star, rebook: RefreshCw };
const CHANNELS = [
  ["whatsapp", "WhatsApp"],
  ["email", "Email"],
  ["sms", "SMS"],
];
const NAMES = { birthday: "Birthday", win_back: "We miss you", review_request: "Review request", rebook: "Time to rebook" };

function preview(message, business, kind, slug) {
  const link = kind === "review_request" ? "https://g.page/r/…" : `${window.location.origin}/book/${slug}`;
  return message.replace(/\{name\}/g, "Ayesha").replace(/\{business\}/g, business).replace(/\{link\}/g, link).replace(/\{service\}/g, "Haircut");
}

/** Marketing → Automations: messages that go out on their own. */
export default function Automations() {
  const { fetchWithLoading } = useApi();
  const [data, setData] = useState(null);

  const load = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/automations`);
    if (res.ok) setData((await res.json()).data);
  }, [fetchWithLoading]);

  useEffect(() => {
    load();
  }, [load]);

  if (!data) return null;
  return (
    <div className="space-y-5">
      <div className="grid gap-5 lg:grid-cols-2">
        {data.automations.map((a) => (
          <AutomationCard key={a.kind} automation={a} onSaved={setData} />
        ))}
      </div>

      <Card className="p-5">
        <h2 className="mb-3 font-display text-[17px] font-medium tracking-tight">Recently sent</h2>
        {data.recent.length === 0 ? (
          <p className="text-[13px] text-[var(--color-faint)]">Nothing yet. Messages go out between 10 am and 8 pm, checked every 15 minutes.</p>
        ) : (
          <ul className="divide-y divide-[var(--color-border-soft)] text-[13px]">
            {data.recent.map((r) => {
              const Icon = r.status === "sent" ? CircleCheck : r.status === "failed" ? CircleX : MinusCircle;
              return (
                <li key={r.id} className="flex flex-wrap items-center gap-x-3 gap-y-0.5 py-2">
                  <Icon size={15} className={r.status === "sent" ? "text-[var(--color-green)]" : r.status === "failed" ? "text-[var(--color-red)]" : "text-[var(--color-faint)]"} />
                  <span className="font-medium">{r.client_name}</span>
                  <span className="text-[var(--color-muted)]">{NAMES[r.kind]} · {r.channel === "sms" ? "SMS" : r.channel === "whatsapp" ? "WhatsApp" : "Email"}</span>
                  {r.error && <span className="text-[12px] text-[var(--color-faint)]">{r.error}</span>}
                  <span className="ml-auto text-[12px] text-[var(--color-faint)]">{formatBookingDate(r.created_at)}</span>
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}

function AutomationCard({ automation: a, onSaved }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { business, signIn, has } = useSession();
  // Growth sends automations by email; SMS and WhatsApp come with Popular.
  const usable = (list) => list.filter((c) => c === "email" || has("sms_whatsapp"));
  const [form, setForm] = useState({ enabled: a.enabled, channels: usable(a.channels), days: a.days ?? "", message: a.message });
  const [reviewUrl, setReviewUrl] = useState(business?.review_url || "");
  const Icon = ICONS[a.kind];
  const dirty =
    form.enabled !== a.enabled ||
    form.message !== a.message ||
    String(form.days) !== String(a.days ?? "") ||
    form.channels.join() !== usable(a.channels).join() ||
    (a.kind === "review_request" && reviewUrl !== (business?.review_url || ""));
  const needsReviewLink = a.kind === "review_request" && !reviewUrl;

  const save = async (patch = {}) => {
    const next = { ...form, ...patch };
    if (a.kind === "review_request" && reviewUrl !== (business?.review_url || "")) {
      const res = await fetchWithLoading(`${constanst.API_URL}/business`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ review_url: reviewUrl }) });
      if (!res.ok) return;
      const me = await fetchWithLoading(`${constanst.API_URL}/auth/me`, { silent: true });
      if (me.ok) signIn((await me.json()).data);
    }
    const res = await fetchWithLoading(`${constanst.API_URL}/automations/${a.kind}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled: next.enabled, channels: next.channels, days: next.days === "" ? null : Number(next.days), message: next.message }),
    });
    if (!res.ok) return;
    const body = await res.json();
    setForm(next);
    addToast({ message: next.enabled ? `${a.title} is on` : `${a.title} saved`, type: "success" });
    onSaved(body.data);
  };

  const toggleChannel = (key) =>
    setForm((f) => ({ ...f, channels: f.channels.includes(key) ? f.channels.filter((c) => c !== key) : [...f.channels, key] }));

  return (
    <Card className="flex flex-col p-5">
      <div className="mb-3 flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
          <Icon size={19} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-[17px] font-medium tracking-tight">{a.title}</h2>
            <Badge>{form.enabled ? "Active" : "Inactive"}</Badge>
          </div>
          <p className="text-[12.5px] text-[var(--color-muted)]">{a.description}</p>
        </div>
        <label className="relative inline-flex cursor-pointer items-center" title={form.enabled ? "Switch off" : "Switch on"}>
          <input
            type="checkbox"
            role="switch"
            aria-label={`${a.title} on`}
            className="peer sr-only"
            checked={form.enabled}
            disabled={needsReviewLink && !form.enabled}
            onChange={(e) => save({ enabled: e.target.checked })}
          />
          <span className="h-6 w-11 rounded-full bg-[var(--color-border)] transition-colors peer-checked:bg-[var(--color-accent)] peer-disabled:opacity-50" />
          <span className="absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform peer-checked:translate-x-5" />
        </label>
      </div>

      {a.kind === "review_request" && (
        <div className="mb-3">
          <Input label="Your review link (Google, Facebook…)" placeholder="https://g.page/r/your-business/review" value={reviewUrl} onChange={(e) => setReviewUrl(e.target.value)} />
          {needsReviewLink && <p className="mt-1 text-[11.5px] text-[var(--color-orange)]">Add your review link to switch this on.</p>}
        </div>
      )}

      <div className="mb-3 flex flex-wrap items-center gap-4 text-[13px]">
        {CHANNELS.map(([key, label]) => {
          const locked = key !== "email" && !has("sms_whatsapp");
          return (
            <label key={key} className={`flex items-center gap-1.5 ${locked ? "text-[var(--color-faint)]" : ""}`}>
              <input type="checkbox" checked={form.channels.includes(key)} disabled={locked} onChange={() => toggleChannel(key)} className="accent-[var(--color-accent)]" />
              {label}
              {locked && <PlanChip feature="sms_whatsapp" />}
            </label>
          );
        })}
        {a.days_label && (
          <label className="ml-auto flex items-center gap-2">
            <span className="text-[12.5px] text-[var(--color-muted)]">{a.days_label}</span>
            <input type="number" min={a.days_min} max={a.days_max} value={form.days} onChange={(e) => setForm((f) => ({ ...f, days: e.target.value }))} className="w-20 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5 text-[13px] outline-none focus:border-[var(--color-accent)]" />
          </label>
        )}
      </div>

      <label className="block">
        <span className="mb-1.5 block text-[12px] font-medium">Message</span>
        <textarea rows={3} value={form.message} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--color-accent)]" />
      </label>
      <p className="mt-1 text-[11.5px] text-[var(--color-faint)]">
        {"{name}"} first name · {"{business}"} · {"{link}"} {a.kind === "review_request" ? "review link" : "booking page"}{a.kind === "rebook" ? " · {service}" : ""}
      </p>
      <div className="mt-3 rounded-xl bg-[var(--color-panel-alt)] px-3 py-2.5 text-[12.5px] text-[var(--color-muted)]">
        <span className="font-semibold text-[var(--color-ink)]">Preview: </span>
        {preview(form.message, business?.name || "", a.kind, business?.slug)}
      </div>

      <div className="mt-auto flex items-center justify-between gap-3 pt-4">
        <span className="text-[12px] text-[var(--color-faint)]">{a.sent_30_days} sent in the last 30 days</span>
        <Button type="button" onClick={() => save()} disabled={!dirty}>Save</Button>
      </div>
    </Card>
  );
}
