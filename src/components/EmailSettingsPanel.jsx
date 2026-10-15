import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, CircleAlert, Info, Send } from "lucide-react";
import { Button, Input, SectionTitle, Select } from "./ui";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

/** Common providers, so most owners only type their email and password. */
const PROVIDERS = [
  {
    key: "gmail",
    label: "Gmail / Google Workspace",
    host: "smtp.gmail.com",
    port: 587,
    security: "starttls",
    passwordLabel: "App password",
    tip: "Gmail needs an app password, not your normal password: Google Account → Security → 2-Step Verification → App passwords.",
  },
  {
    key: "outlook",
    label: "Outlook / Microsoft 365",
    host: "smtp.office365.com",
    port: 587,
    security: "starttls",
    passwordLabel: "Password (or app password)",
    tip: "Your Microsoft 365 admin may need to turn on “Authenticated SMTP” for this mailbox.",
  },
  { key: "zoho", label: "Zoho Mail", host: "smtp.zoho.com", port: 465, security: "ssl", passwordLabel: "Password (or app password)", tip: "If you use two-factor login, create an app-specific password in Zoho." },
  { key: "hostinger", label: "Hostinger", host: "smtp.hostinger.com", port: 465, security: "ssl", passwordLabel: "Email password" },
  { key: "other", label: "Other (my own server)", passwordLabel: "Password", tip: "Your email host shows these details in its “SMTP” or “email client setup” help page." },
];

const providerFor = (host) => PROVIDERS.find((p) => p.host && p.host === host)?.key || (host ? "other" : "gmail");

const EMPTY = { enabled: false, host: "", port: "", security: "starttls", username: "", password: "", from_email: "", from_name: "", reply_to: "" };

function Toggle({ checked, onChange, label }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-[24px] w-[42px] shrink-0 items-center rounded-full transition-colors ${checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`}
    >
      <span className={`inline-block h-[18px] w-[18px] rounded-full bg-white shadow transition-transform ${checked ? "translate-x-[21px]" : "translate-x-[3px]"}`} />
    </button>
  );
}

/* Settings → Email sending: connect the business's own mailbox so every email comes from it. */
export default function EmailSettingsPanel() {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { business, user } = useSession();
  const [saved, setSaved] = useState(null);
  const [form, setForm] = useState(EMPTY);
  const [provider, setProvider] = useState("gmail");
  const [advanced, setAdvanced] = useState(false);
  const [testTo, setTestTo] = useState(user?.email || "");
  const [testResult, setTestResult] = useState(null);

  const apply = useCallback((data) => {
    setSaved(data);
    setForm({ ...EMPTY, ...data, port: data.port ? String(data.port) : "", password: "" });
    setProvider(providerFor(data.host));
  }, []);

  useEffect(() => {
    fetchWithLoading(`${constanst.API_URL}/settings/email`).then(async (res) => res.ok && apply((await res.json()).data));
  }, [fetchWithLoading, apply]);

  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));
  const p = PROVIDERS.find((x) => x.key === provider);

  const pickProvider = (key) => {
    setProvider(key);
    const next = PROVIDERS.find((x) => x.key === key);
    if (next.host) setForm((f) => ({ ...f, host: next.host, port: String(next.port), security: next.security }));
    else setAdvanced(true);
  };

  const save = async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/settings/email`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        enabled: form.enabled,
        host: form.host.trim(),
        port: form.port ? Number(form.port) : undefined,
        security: form.security,
        // Most providers log in with the email address itself.
        username: (form.username || form.from_email).trim(),
        ...(form.password && { password: form.password }),
        from_email: form.from_email.trim(),
        from_name: form.from_name.trim(),
        reply_to: form.reply_to.trim(),
      }),
    });
    if (!res.ok) return false;
    apply((await res.json()).data);
    return true;
  };

  const onSave = async () => {
    if (await save()) addToast({ message: form.enabled ? "Email settings saved. Send a test to check them." : "Saved. Emails go out from the platform address.", type: "success" });
  };

  const onTest = async () => {
    setTestResult(null);
    if (!(await save())) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/settings/email/test`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ to: testTo.trim() }),
    });
    if (!res.ok) return;
    const body = await res.json();
    setSaved(body.data.settings);
    setTestResult({ ok: body.data.ok, message: body.message });
  };

  if (!saved) return <SectionTitle title="Email sending" />;

  const status =
    saved.route === "smtp"
      ? saved.last_test_ok === false
        ? { tone: "red", icon: CircleAlert, text: `Emails go out from ${saved.from_email}, but the last test failed: ${saved.last_error}` }
        : { tone: "green", icon: CheckCircle2, text: `Emails go out from your own address, ${saved.from_email}.${saved.last_test_ok ? " Tested and working." : " Send a test to make sure it works."}` }
      : saved.route === "platform"
        ? { tone: "blue", icon: Info, text: "Emails go out from the platform's address. Connect your own email so clients see your business address and replies come to you." }
        : { tone: "orange", icon: CircleAlert, text: "Email isn't set up yet, so booking confirmations and email campaigns can't be sent. Connect your email below." };
  const toneClass = {
    green: "bg-[var(--color-green)]/10 text-[var(--color-green)]",
    red: "bg-[var(--color-red)]/8 text-[var(--color-red)]",
    blue: "bg-[var(--color-blue)]/10 text-[var(--color-blue)]",
    orange: "bg-[var(--color-orange)]/10 text-[var(--color-orange)]",
  }[status.tone];

  return (
    <div className="space-y-5">
      <SectionTitle title="Email sending" />
      <p className={`flex items-start gap-2 rounded-xl px-3.5 py-3 text-[13px] ${toneClass}`}>
        <status.icon size={17} className="mt-px shrink-0" /> {status.text}
      </p>

      <label className="flex items-center justify-between gap-4 rounded-xl border border-[var(--color-border)] p-4">
        <span>
          <span className="block text-[14px] font-semibold">Send from my own email</span>
          <span className="block text-[12.5px] text-[var(--color-muted)]">Booking confirmations and campaigns come from your address, and replies reach your inbox.</span>
        </span>
        <Toggle label="Send from my own email" checked={form.enabled} onChange={(enabled) =>
            setForm((f) => ({
              ...f,
              enabled,
              // First time on: start with the chosen provider's server details.
              ...(enabled && !f.host && p?.host && { host: p.host, port: String(p.port), security: p.security }),
            }))
          } />
      </label>

      {form.enabled && (
        <div className="space-y-4">
          <div>
            <p className="mb-2 text-[12px] font-medium text-[var(--color-ink-2)]">Who provides your email?</p>
            <div className="flex flex-wrap gap-2">
              {PROVIDERS.map((x) => (
                <button
                  key={x.key}
                  type="button"
                  aria-pressed={provider === x.key}
                  onClick={() => pickProvider(x.key)}
                  className={`rounded-full border px-3.5 py-1.5 text-[12.5px] ${provider === x.key ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] font-semibold text-[var(--color-accent-dark)]" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"}`}
                >
                  {x.label}
                </button>
              ))}
            </div>
            {p?.tip && <p className="mt-2 text-[12px] text-[var(--color-muted)]">{p.tip}</p>}
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input label="Your email address" type="email" placeholder="hello@yoursalon.com" value={form.from_email} onChange={set("from_email")} />
            <Input
              label={p?.passwordLabel || "Password"}
              type="password"
              autoComplete="new-password"
              placeholder={saved.has_password ? "•••••••• (saved, type to change)" : ""}
              value={form.password}
              onChange={set("password")}
            />
          </div>
          <Input label="Sender name clients see" placeholder={business?.name} value={form.from_name} onChange={set("from_name")} />

          <button type="button" onClick={() => setAdvanced((v) => !v)} aria-expanded={advanced} className="flex items-center gap-1 text-[12.5px] font-medium text-[var(--color-accent)]">
            Server details <ChevronDown size={14} className={`transition-transform ${advanced ? "rotate-180" : ""}`} />
          </button>
          {advanced && (
            <div className="space-y-3 rounded-xl bg-[var(--color-panel-alt)] p-4">
              <div className="grid gap-3 sm:grid-cols-[1fr_110px_160px]">
                <Input label="SMTP server" placeholder="smtp.example.com" value={form.host} onChange={set("host")} />
                <Input label="Port" type="number" placeholder="587" value={form.port} onChange={set("port")} />
                <Select label="Security" value={form.security} onChange={set("security")}>
                  {[
                    { value: "starttls", label: "STARTTLS (587)" },
                    { value: "ssl", label: "SSL/TLS (465)" },
                    { value: "none", label: "None" },
                  ]}
                </Select>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Login username (if not your email)" placeholder={form.from_email} value={form.username === form.from_email ? "" : form.username} onChange={set("username")} />
                <Input label="Replies go to (optional)" type="email" placeholder={form.from_email} value={form.reply_to} onChange={set("reply_to")} />
              </div>
            </div>
          )}
        </div>
      )}

      <div className="flex flex-wrap items-end gap-2 border-t border-[var(--color-border-soft)] pt-4">
        <Button type="button" onClick={onSave}>Save</Button>
        {form.enabled && (
          <>
            <div className="ml-auto min-w-[200px] flex-1 sm:max-w-[260px]">
              <Input label="Send a test to" type="email" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
            </div>
            <Button variant="ghost" type="button" disabled={!testTo.trim() || !form.from_email.trim()} onClick={onTest}>
              <Send size={14} /> Save and send test
            </Button>
          </>
        )}
      </div>
      {testResult && (
        <p role="status" className={`flex items-start gap-2 rounded-xl px-3.5 py-3 text-[13px] ${testResult.ok ? "bg-[var(--color-green)]/10 text-[var(--color-green)]" : "bg-[var(--color-red)]/8 text-[var(--color-red)]"}`}>
          {testResult.ok ? <CheckCircle2 size={17} className="mt-px shrink-0" /> : <CircleAlert size={17} className="mt-px shrink-0" />}
          {testResult.message}
        </p>
      )}
    </div>
  );
}
