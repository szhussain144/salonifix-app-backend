import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Badge, Button, Card, SectionTitle, Segmented, StatCard, Table, Td, Tr } from "../components/ui";
import { formatDay } from "../components/format";
import { BackLink } from "../components/DetailLink";
import { useApi } from "../context/ApiContext";
import EmailPreview from "../components/EmailPreview";
import { fillPreview } from "../components/emailStarters";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";
import { audienceLabel, CAMPAIGN_STATUS, CHANNELS } from "../components/labels";

const DELIVERY_STATUS = { queued: "Queued", sending: "Sending", sent: "Sent", failed: "Failed" };

/** A campaign's message, progress and per-client delivery log. */
export default function CampaignDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { business } = useSession();
  const [campaign, setCampaign] = useState(null);
  const [deliveries, setDeliveries] = useState([]);
  const [filter, setFilter] = useState("all");

  const load = useCallback(async () => {
    const [c, d] = await Promise.all([
      fetchWithLoading(`${constanst.API_URL}/marketing/campaigns/${id}`),
      fetchWithLoading(`${constanst.API_URL}/marketing/campaigns/${id}/deliveries?limit=200${filter !== "all" ? `&status=${filter}` : ""}`),
    ]);
    if (c.ok) setCampaign((await c.json()).data);
    if (d.ok) setDeliveries((await d.json()).data);
  }, [fetchWithLoading, id, filter]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (campaign?.status !== "sending") return undefined;
    const timer = setInterval(load, 2500);
    return () => clearInterval(timer);
  }, [campaign?.status, load]);

  const action = async (path, method = "POST") => {
    const res = await fetchWithLoading(`${constanst.API_URL}/marketing/campaigns/${id}${path}`, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(method === "POST" && { body: "{}" }),
    });
    if (!res.ok) return null;
    const json = await res.json();
    addToast({ message: json.message, type: "success" });
    return json;
  };

  if (!campaign) return null;
  const Icon = CHANNELS[campaign.channel].icon;
  const progress = campaign.total_count ? Math.round(((campaign.sent_count + campaign.failed_count) / campaign.total_count) * 100) : 0;

  return (
    <div className="space-y-5">
      <BackLink to="/marketing">Back to Marketing</BackLink>

      <Card className="p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-[12px] text-[var(--color-muted)]">
              <Icon size={14} /> {CHANNELS[campaign.channel].label} · {audienceLabel(campaign)}
            </p>
            <h2 className="mt-1 font-display text-[22px] font-medium">{campaign.name}</h2>
            <p className="text-[12px] text-[var(--color-faint)]">
              {campaign.status === "scheduled" && `Scheduled for ${campaign.scheduled_at?.slice(0, 16).replace("T", " ")}`}
              {campaign.completed_at && `Sent ${formatDay(campaign.completed_at, { long: true })}`}
              {campaign.created_by_name && ` · by ${campaign.created_by_name}`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge>{CAMPAIGN_STATUS[campaign.status]}</Badge>
            {["draft", "scheduled"].includes(campaign.status) && (
              <Link to={`/marketing/campaigns/${id}/edit`}><Button variant="ghost">Edit</Button></Link>
            )}
            {["scheduled", "sending"].includes(campaign.status) && (
              <Button variant="ghost" type="button" onClick={async () => (await action("/cancel")) && load()}>Cancel</Button>
            )}
            {["draft", "canceled"].includes(campaign.status) && (
              <Button variant="ghost" type="button" onClick={async () => window.confirm("Delete this campaign?") && (await action("", "DELETE")) && navigate("/marketing")}>
                Delete
              </Button>
            )}
          </div>
        </div>

        {campaign.status === "sending" && (
          <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-[var(--color-border)]" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full bg-[var(--color-accent)] transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        {campaign.subject && <p className="mt-4 text-[13px] font-semibold">{campaign.subject}</p>}
        {campaign.body_html ? (
          <div className="mt-3">
            {campaign.email_template_name && (
              <p className="mb-2 text-[12px] text-[var(--color-muted)]">Email template: <b className="font-semibold text-[var(--color-ink)]">{campaign.email_template_name}</b></p>
            )}
            <EmailPreview html={fillPreview(campaign.body_html, { business: business?.name, location: campaign.location_name })} />
          </div>
        ) : (
          <p className="mt-2 whitespace-pre-wrap rounded-xl bg-[var(--color-panel-alt)] p-3 text-[13px]">{campaign.body}</p>
        )}
      </Card>

      <div className="grid grid-cols-3 gap-4">
        <StatCard label="Recipients" value={campaign.total_count.toLocaleString()} />
        <StatCard label="Sent" value={campaign.sent_count.toLocaleString()} accent />
        <StatCard label="Failed" value={campaign.failed_count.toLocaleString()} />
      </div>

      {campaign.total_count > 0 && (
        <Card className="p-5">
          <SectionTitle title="Delivery log" />
          <div className="mb-4">
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[{ key: "all", label: "All" }, { key: "sent", label: "Sent" }, { key: "failed", label: "Failed" }, { key: "queued", label: "Queued" }]}
            />
          </div>
          <Table columns={["Client", "To", "Status", "Detail", "Time"]}>
            {deliveries.map((d) => (
              <Tr key={d.id}>
                <Td className="font-medium">{d.client_name}</Td>
                <Td className="text-[var(--color-muted)]">{d.to_address}</Td>
                <Td><Badge>{DELIVERY_STATUS[d.status]}</Badge></Td>
                <Td className="max-w-[260px] truncate text-[12px] text-[var(--color-faint)]">{d.error || d.provider_ref || "—"}</Td>
                <Td className="text-[var(--color-muted)]">{d.sent_at ? d.sent_at.slice(11, 16) : "—"}</Td>
              </Tr>
            ))}
          </Table>
        </Card>
      )}
    </div>
  );
}
