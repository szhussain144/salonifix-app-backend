import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowLeft, CalendarClock, LayoutTemplate, Pencil, Plus, Send, Type, Users } from "lucide-react";
import { Button, Card, EmptyState, Input, SectionTitle, Segmented, Select, Textarea } from "../components/ui";
import EmailPreview from "../components/EmailPreview";
import { fillPreview } from "../components/emailStarters";
import { phoneHint, todayISO } from "../components/format";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import useDebounce from "../context/debounce";
import constanst from "../config/constants";
import { CHANNELS } from "../components/labels";
import { PlanChip, UpgradeNote } from "../components/Upgrade";

const TOKENS = ["{first_name}", "{name}", "{business}", "{location}"];
const LIMITS = { email: 5000, sms: 1600, whatsapp: 1600, voice: 1000 };
const HINTS = {
  email: "Sent from the platform's email address. Connect your own in Settings → Email sending.",
  sms: "Long messages are split into 160-character parts, each billed by Twilio.",
  whatsapp: "Outside a 24-hour chat window, WhatsApp only delivers templates approved by Meta.",
  voice: "Twilio calls each client and reads this message aloud.",
};

const EMPTY = { name: "", channel: "sms", subject: "", body: "", email_template_id: "", audience_type: "all", audience_days: "30", location_id: "" };

/** Create or edit a campaign, check who it reaches, test it, then send or schedule. */
export default function CampaignEditor() {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { activeLocations, business, has } = useSession();
  // SMS, WhatsApp and voice campaigns come with Popular; smaller plans send email.
  const textChannels = has("sms_whatsapp");
  // "?template=ID" (from the email builder) starts an email campaign with that template.
  const [form, setForm] = useState(() => {
    const template = searchParams.get("template");
    if (template) return { ...EMPTY, channel: "email", email_template_id: template };
    return textChannels ? EMPTY : { ...EMPTY, channel: "email" };
  });
  // Designed emails (templates) come with Growth; Starter writes plain-text emails.
  const [emailMode, setEmailMode] = useState(() => (has("templates") ? "template" : "plain"));
  const [templates, setTemplates] = useState(null);
  const [template, setTemplate] = useState(null); // the chosen template, rendered
  const [channels, setChannels] = useState([]);
  const [audience, setAudience] = useState(null);
  const [testTo, setTestTo] = useState("");
  const [scheduleAt, setScheduleAt] = useState("");
  const set = (field) => (e) => setForm((f) => ({ ...f, [field]: e.target.value }));

  useEffect(() => {
    fetchWithLoading(`${constanst.API_URL}/marketing/overview`)
      .then((r) => r.json())
      .then((d) => setChannels(d.data?.channels || []));
    if (!id) return;
    fetchWithLoading(`${constanst.API_URL}/marketing/campaigns/${id}`)
      .then((r) => r.json())
      .then(({ data }) => {
        // Email campaigns open on the design they were made with, or on plain text.
        setEmailMode(data.email_template_id ? "template" : "plain");
        return setForm({
          name: data.name,
          channel: data.channel,
          subject: data.subject || "",
          body: data.email_template_id ? "" : data.body,
          email_template_id: data.email_template_id ? String(data.email_template_id) : "",
          audience_type: data.audience_type,
          audience_days: String(data.audience_days || 30),
          location_id: data.location_id ? String(data.location_id) : "",
        });
      });
  }, [fetchWithLoading, id]);

  // Email templates, loaded when the email channel is picked.
  useEffect(() => {
    if (form.channel !== "email" || templates) return;
    fetchWithLoading(`${constanst.API_URL}/marketing/email-templates`)
      .then((r) => (r.ok ? r.json() : { data: [] }))
      .then((d) => setTemplates(d.data || []));
  }, [fetchWithLoading, form.channel, templates]);

  // The chosen template's rendered email for the preview; a new choice also fills the subject.
  useEffect(() => {
    if (!form.email_template_id) {
      setTemplate(null);
      return;
    }
    fetchWithLoading(`${constanst.API_URL}/marketing/email-templates/${form.email_template_id}`, { silent: true })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!d) return;
        setTemplate(d.data);
        setForm((f) => (f.subject ? f : { ...f, subject: d.data.subject }));
      });
  }, [fetchWithLoading, form.email_template_id]);

  const useTemplate = form.channel === "email" && emailMode === "template";
  const chooseTemplate = (value) =>
    setForm((f) => ({
      ...f,
      email_template_id: value,
      // Take the new template's subject unless the subject was typed by hand.
      subject: !f.subject || f.subject === template?.subject ? "" : f.subject,
    }));

  const audiencePayload = useMemo(
    () => ({
      channel: form.channel,
      audience_type: form.audience_type,
      ...(form.audience_type !== "all" && { audience_days: Number(form.audience_days) || 30 }),
      ...(form.location_id && { location_id: Number(form.location_id) }),
    }),
    [form.channel, form.audience_type, form.audience_days, form.location_id],
  );
  const debouncedAudience = useDebounce(JSON.stringify(audiencePayload), 400);

  useEffect(() => {
    fetchWithLoading(`${constanst.API_URL}/marketing/audience/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: debouncedAudience,
      silent: true,
    })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setAudience(d?.data ?? null));
  }, [fetchWithLoading, debouncedAudience]);

  const channelInfo = channels.find((c) => c.channel === form.channel);
  const ready = channelInfo?.configured;
  const segments = form.channel === "sms" ? Math.max(1, Math.ceil(form.body.length / 160)) : null;
  const preview = form.body
    .replace(/\{first_name\}/g, "Ayesha")
    .replace(/\{name\}/g, "Ayesha Khan")
    .replace(/\{business\}/g, business?.name || "")
    .replace(/\{location\}/g, activeLocations.find((l) => String(l.id) === form.location_id)?.name || business?.name || "");

  const payload = () => ({
    name: form.name.trim(),
    channel: form.channel,
    ...(useTemplate ? { email_template_id: Number(form.email_template_id) } : { body: form.body, email_template_id: null }),
    ...(form.channel === "email" && form.subject.trim() && { subject: form.subject.trim() }),
    ...audiencePayload,
  });
  const hasContent = useTemplate ? Boolean(form.email_template_id) : Boolean(form.body.trim());

  /** Saves the campaign (create or update); returns its id. */
  const save = async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/marketing/campaigns${id ? `/${id}` : ""}`, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload()),
    });
    if (!res.ok) return null;
    return (await res.json()).data.id;
  };

  const saveDraft = async () => {
    if (await save()) {
      addToast({ message: "Draft saved", type: "success" });
      navigate("/marketing");
    }
  };

  const send = async (scheduled) => {
    const campaignId = await save();
    if (!campaignId) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/marketing/campaigns/${campaignId}/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(scheduled ? { scheduled_at: scheduleAt } : {}),
    });
    if (!res.ok) return;
    addToast({ message: (await res.json()).message, type: "success" });
    navigate("/marketing");
  };

  const testSend = async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/marketing/test-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channel: form.channel,
        to: testTo,
        ...(useTemplate ? { email_template_id: Number(form.email_template_id) } : { body: form.body }),
        ...(form.channel === "email" && form.subject && { subject: form.subject }),
      }),
    });
    if (res.ok) addToast({ message: (await res.json()).message, type: "success" });
  };

  const insertToken = (token) => setForm((f) => ({ ...f, body: `${f.body}${f.body && !f.body.endsWith(" ") ? " " : ""}${token}` }));

  return (
    <div className="space-y-5">
      <Link to="/marketing" className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
        <ArrowLeft size={14} /> Back to Marketing
      </Link>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <Card className="p-5">
            <SectionTitle title="Channel" />
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {Object.entries(CHANNELS).map(([key, c]) => {
                const info = channels.find((x) => x.channel === key);
                const selected = form.channel === key;
                const locked = key !== "email" && !textChannels;
                return (
                  <button
                    key={key}
                    type="button"
                    disabled={locked}
                    onClick={() => setForm((f) => ({ ...f, channel: key }))}
                    aria-pressed={selected}
                    className={`rounded-xl border p-3 text-left transition-colors disabled:cursor-not-allowed ${
                      selected
                        ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                        : locked
                          ? "border-[var(--color-border)] bg-[var(--color-panel-alt)]"
                          : "border-[var(--color-border)] hover:border-[var(--color-accent)]/50"
                    }`}
                  >
                    <span className="flex items-start justify-between gap-1">
                      <c.icon size={18} className={locked ? "text-[var(--color-faint)]" : "text-[var(--color-accent)]"} />
                      {locked && <PlanChip feature="sms_whatsapp" />}
                    </span>
                    <p className={`mt-2 text-[13px] font-semibold ${locked ? "text-[var(--color-faint)]" : ""}`}>{c.label}</p>
                    <p className={`text-[11px] ${info?.configured && !locked ? "text-[var(--color-green)]" : "text-[var(--color-faint)]"}`}>
                      {locked ? "Upgrade to use" : info ? (info.configured ? "Ready" : "Not set up") : ""}
                    </p>
                  </button>
                );
              })}
            </div>
            {!textChannels && (
              <div className="mt-3">
                <UpgradeNote feature="sms_whatsapp">
                  Your plan sends campaigns by email. <b className="font-semibold text-[var(--color-ink)]">SMS, WhatsApp and voice</b> come with Popular.
                </UpgradeNote>
              </div>
            )}
            <p className="mt-3 text-[12px] text-[var(--color-muted)]">
              {form.channel === "email" && channelInfo?.via === "smtp" ? "Sent from your own email address (Settings → Email sending)." : HINTS[form.channel]}
            </p>
          </Card>

          <Card className="p-5 space-y-4">
            <SectionTitle title="Message" />
            <Input label="Campaign name (only you see this)" placeholder="e.g. Eid offer" value={form.name} onChange={set("name")} />
            {form.channel === "email" && (
              <Segmented
                value={emailMode}
                onChange={setEmailMode}
                options={[
                  { key: "template", label: "Designed email", icon: LayoutTemplate },
                  { key: "plain", label: "Plain text", icon: Type },
                ]}
              />
            )}
            {form.channel === "email" && <Input label="Email subject" value={form.subject} onChange={set("subject")} placeholder={useTemplate && template ? template.subject : ""} />}
            {useTemplate && templates?.length === 0 && !has("templates") && (
              <UpgradeNote feature="templates">
                <b className="font-semibold text-[var(--color-ink)]">Designed emails</b> come with Growth. On your plan, send a plain-text email.
              </UpgradeNote>
            )}
            {useTemplate && templates?.length === 0 && has("templates") && (
              <EmptyState
                icon={LayoutTemplate}
                title="No email templates yet"
                action={<Link to="/marketing/email-templates/new"><Button type="button"><Plus size={14} /> Design an email</Button></Link>}
              >
                Design a branded email with your colours, pictures and a booking button, then come back to send it.
              </EmptyState>
            )}
            {useTemplate && templates?.length > 0 && (
              <div className="space-y-4">
                <div className="flex flex-wrap items-end gap-2">
                  <div className="min-w-[220px] flex-1">
                    <Select label="Email template" value={form.email_template_id} onChange={(e) => chooseTemplate(e.target.value)}>
                      {templates.map((t) => ({ value: String(t.id), label: t.name }))}
                    </Select>
                  </div>
                  {form.email_template_id && (
                    <Link to={`/marketing/email-templates/${form.email_template_id}`}>
                      <Button variant="ghost" type="button"><Pencil size={14} /> Edit design</Button>
                    </Link>
                  )}
                  <Link to="/marketing/email-templates/new">
                    <Button variant="ghost" type="button"><Plus size={14} /> New</Button>
                  </Link>
                </div>
                {template && String(template.id) === form.email_template_id && (
                  <EmailPreview
                    html={fillPreview(template.html, { business: business?.name, location: activeLocations.find((l) => String(l.id) === form.location_id)?.name })}
                    subject={fillPreview(form.subject || template.subject, { business: business?.name })}
                    fromName={business?.name}
                  />
                )}
              </div>
            )}
            {!useTemplate && (
            <div>
              <Textarea label="Message" rows={form.channel === "email" ? 9 : 5} maxLength={LIMITS[form.channel]} value={form.body} onChange={set("body")} />
              <div className="mt-1.5 flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-1.5">
                  {TOKENS.map((t) => (
                    <button key={t} type="button" onClick={() => insertToken(t)} className="rounded-full bg-[var(--color-panel-alt)] px-2.5 py-1 text-[11px] text-[var(--color-muted)] hover:text-[var(--color-accent)]">
                      {t}
                    </button>
                  ))}
                </div>
                <span className="text-[11px] text-[var(--color-faint)]">
                  {form.body.length}/{LIMITS[form.channel]}{segments ? ` · ${segments} SMS part${segments > 1 ? "s" : ""}` : ""}
                </span>
              </div>
            </div>
            )}
            {!useTemplate && form.body && (
              <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-panel-alt)] p-3">
                <p className="mb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">Preview</p>
                <p className="whitespace-pre-wrap text-[13px]">{preview}</p>
              </div>
            )}
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="p-5 space-y-4">
            <SectionTitle title="Audience" />
            <Select label="Who" value={form.audience_type} onChange={set("audience_type")}>
              {[
                { value: "all", label: "All clients" },
                { value: "inactive", label: "Haven't visited recently" },
                { value: "active", label: "Visited recently" },
              ]}
            </Select>
            {form.audience_type !== "all" && (
              <Input label="Within the last (days)" type="number" min="1" max="3650" value={form.audience_days} onChange={set("audience_days")} />
            )}
            <Select label="Location (optional)" value={form.location_id} onChange={set("location_id")}>
              {activeLocations.map((l) => ({ value: String(l.id), label: `Clients of ${l.name}` }))}
            </Select>
            <div className="flex items-center gap-2.5 rounded-xl bg-[var(--color-accent-soft)] p-3">
              <Users size={18} className="text-[var(--color-accent)]" />
              <div>
                <p className="text-[15px] font-semibold">{audience ? audience.count.toLocaleString() : "…"} clients</p>
                <p className="text-[11.5px] text-[var(--color-muted)]">
                  {audience?.sample?.length ? `e.g. ${audience.sample.slice(0, 3).join(", ")}` : "Opted-out clients are excluded"}
                </p>
              </div>
            </div>
          </Card>

          <Card className="p-5 space-y-3">
            <SectionTitle title="Send" />
            {!ready && channelInfo && (
              <p className="text-[12px] text-[var(--color-red)]">{form.channel === "email" ? <>Email isn&apos;t set up yet. <Link to="/settings" state={{ section: "email" }} className="underline">Connect your email</Link> to send.</> : <>{CHANNELS[form.channel].label} isn&apos;t set up yet. Add your Twilio settings to send.</>}</p>
            )}
            <div className="flex gap-2">
              <Input
                label={form.channel === "email" ? "Send a test to (email)" : "Send a test to (phone)"}
                placeholder={form.channel === "email" ? "you@example.com" : phoneHint()}
                value={testTo}
                onChange={(e) => setTestTo(e.target.value)}
              />
            </div>
            <Button variant="ghost" type="button" className="w-full" disabled={!testTo || !hasContent || !ready} onClick={testSend}>
              Send test
            </Button>
            <hr className="border-[var(--color-border-soft)]" />
            <Button type="button" className="w-full" disabled={!ready || !form.name || !hasContent || !audience?.count} onClick={() => send(false)}>
              <Send size={14} /> Send now to {audience?.count ?? 0} clients
            </Button>
            <Input label="Or schedule for" type="datetime-local" min={`${todayISO()}T00:00`} value={scheduleAt} onChange={(e) => setScheduleAt(e.target.value)} />
            <Button variant="ghost" type="button" className="w-full" disabled={!ready || !scheduleAt || !form.name || !hasContent} onClick={() => send(true)}>
              <CalendarClock size={14} /> Schedule
            </Button>
            <Button variant="subtle" type="button" className="w-full" disabled={!form.name || !hasContent} onClick={saveDraft}>
              Save as draft
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}
