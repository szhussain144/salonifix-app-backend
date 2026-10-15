import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Send } from "lucide-react";
import { Badge, Button, Card, EmptyState, SectionTitle, Segmented, Table, Td, Tr } from "../components/ui";
import { formatDay } from "../components/format";
import { DetailLink } from "../components/DetailLink";
import { useApi } from "../context/ApiContext";
import constanst from "../config/constants";
import { audienceLabel, CAMPAIGN_STATUS, CHANNELS } from "../components/labels";

/** Marketing home: channel status and campaigns. */
export default function Marketing() {
  const { fetchWithLoading } = useApi();
  const [overview, setOverview] = useState(null);
  const [campaigns, setCampaigns] = useState([]);
  const [channel, setChannel] = useState("all");

  const load = useCallback(async () => {
    const [ov, list] = await Promise.all([
      fetchWithLoading(`${constanst.API_URL}/marketing/overview`),
      fetchWithLoading(`${constanst.API_URL}/marketing/campaigns?limit=100${channel !== "all" ? `&channel=${channel}` : ""}`),
    ]);
    if (ov.ok) setOverview((await ov.json()).data);
    if (list.ok) setCampaigns((await list.json()).data);
  }, [fetchWithLoading, channel]);

  useEffect(() => {
    load();
  }, [load]);

  // Keep progress live while something is sending.
  useEffect(() => {
    if (!campaigns.some((c) => c.status === "sending")) return undefined;
    const timer = setInterval(load, 3000);
    return () => clearInterval(timer);
  }, [campaigns, load]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {overview?.channels.map((c) => {
          const Icon = CHANNELS[c.channel].icon;
          return (
            <Card key={c.channel} className="p-4">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-[13px] font-semibold">
                  <Icon size={16} className="text-[var(--color-accent)]" /> {c.label}
                </span>
                <span className={`text-[11px] font-medium ${c.configured ? "text-[var(--color-green)]" : "text-[var(--color-faint)]"}`}>
                  {c.configured ? "Ready" : "Not set up"}
                </span>
              </div>
              <p className="mt-3 font-display text-[22px] font-medium">{c.sent_30d.toLocaleString()}</p>
              <p className="text-[12px] text-[var(--color-muted)]">
                sent in 30 days{c.failed_30d ? ` · ${c.failed_30d} failed` : ""}
              </p>
            </Card>
          );
        })}
      </div>

      {overview?.provider === "test" && (
        <p className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-panel-alt)] px-4 py-3 text-[12.5px] text-[var(--color-muted)]">
          Test mode: messages are recorded but not actually sent. Add your Twilio and SendGrid keys to start sending.
        </p>
      )}

      <Card className="p-5">
        <SectionTitle
          eyebrow="Campaigns"
          title="Bring clients back"
          action={
            <Link to="/marketing/new">
              <Button><Plus size={14} /> New campaign</Button>
            </Link>
          }
        />
        <div className="mb-4">
          <Segmented
            value={channel}
            onChange={setChannel}
            options={[{ key: "all", label: "All" }, ...Object.entries(CHANNELS).map(([key, c]) => ({ key, label: c.label, icon: c.icon }))]}
          />
        </div>

        {campaigns.length === 0 ? (
          <EmptyState icon={Send} title="No campaigns yet">
            Send an offer by SMS, WhatsApp, email or an automated call to the clients you choose.
          </EmptyState>
        ) : (
          <Table columns={["Campaign", "Channel", "Audience", "Status", "Delivered", "When", ""]}>
            {campaigns.map((c) => {
              const Icon = CHANNELS[c.channel].icon;
              const done = c.sent_count + c.failed_count;
              return (
                <Tr key={c.id}>
                  <Td className="font-medium">{c.name}</Td>
                  <Td>
                    <span className="inline-flex items-center gap-1.5 text-[var(--color-muted)]">
                      <Icon size={14} /> {CHANNELS[c.channel].label}
                    </span>
                  </Td>
                  <Td className="text-[var(--color-muted)]">{audienceLabel(c)}</Td>
                  <Td><Badge>{CAMPAIGN_STATUS[c.status]}</Badge></Td>
                  <Td>
                    {c.total_count > 0 ? (
                      <span>
                        {c.sent_count.toLocaleString()} / {c.total_count.toLocaleString()}
                        {c.status === "sending" && <span className="text-[var(--color-faint)]"> ({Math.round((done / c.total_count) * 100)}%)</span>}
                      </span>
                    ) : (
                      <span className="text-[var(--color-faint)]">—</span>
                    )}
                  </Td>
                  <Td className="text-[var(--color-muted)]">
                    {c.completed_at ? formatDay(c.completed_at, { long: true }) : c.scheduled_at ? formatDay(c.scheduled_at, { long: true }) : "—"}
                  </Td>
                  <Td>
                    <DetailLink to={`/marketing/campaigns/${c.id}`} className="text-[12px] font-medium text-[var(--color-accent)] hover:underline">
                      View
                    </DetailLink>
                  </Td>
                </Tr>
              );
            })}
          </Table>
        )}
      </Card>
    </div>
  );
}
