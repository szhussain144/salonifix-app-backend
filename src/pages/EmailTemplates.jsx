import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Copy, LayoutTemplate, Pencil, Plus, Send, Trash2 } from "lucide-react";
import { Button, Card, EmptyState, SectionTitle } from "../components/ui";
import { formatDay } from "../components/format";
import { useApi } from "../context/ApiContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

/** Saved email designs; each can be edited, copied or used in a campaign. */
export default function EmailTemplates() {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const navigate = useNavigate();
  const [templates, setTemplates] = useState(null);

  const load = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/marketing/email-templates`);
    if (res.ok) setTemplates((await res.json()).data);
  }, [fetchWithLoading]);

  useEffect(() => {
    load();
  }, [load]);

  const duplicate = async (t) => {
    const res = await fetchWithLoading(`${constanst.API_URL}/marketing/email-templates/${t.id}/duplicate`, { method: "POST" });
    if (!res.ok) return;
    addToast({ message: `Copied “${t.name}”`, type: "success" });
    load();
  };

  const remove = async (t) => {
    if (!window.confirm(`Delete “${t.name}”? Campaigns already made with it keep their copy.`)) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/marketing/email-templates/${t.id}`, { method: "DELETE" });
    if (res.ok) load();
  };

  const newButton = (
    <Link to="/marketing/email-templates/new">
      <Button type="button"><Plus size={14} /> New template</Button>
    </Link>
  );

  if (!templates) return null;

  return (
    <div className="space-y-5">
      <Card className="p-5">
        <SectionTitle title={`Email templates (${templates.length})`} action={templates.length > 0 && newButton} />
        {templates.length === 0 ? (
          <EmptyState icon={LayoutTemplate} title="Design your first email" action={newButton}>
            Build a branded email once, with your colours, pictures and a booking button, then send it to clients from any campaign.
          </EmptyState>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {templates.map((t) => (
              <div key={t.id} className="flex flex-col overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)]">
                <div className="h-1.5" style={{ background: t.brand_color }} />
                <Link to={`/marketing/email-templates/${t.id}`} className="block flex-1 p-4 hover:bg-[var(--color-panel-alt)]/50">
                  <p className="truncate text-[14px] font-semibold">{t.name}</p>
                  <p className="mt-0.5 truncate text-[12.5px] text-[var(--color-ink-2)]">{t.subject}</p>
                  <p className="mt-2 line-clamp-2 text-[12px] text-[var(--color-muted)]">{t.preview_text}</p>
                  <p className="mt-3 text-[11px] text-[var(--color-faint)]">
                    {t.blocks} blocks · edited {formatDay(String(t.updated_at).slice(0, 10))}
                    {t.created_by_name ? ` · by ${t.created_by_name}` : ""}
                  </p>
                </Link>
                <div className="flex items-center gap-1 border-t border-[var(--color-border-soft)] px-2 py-1.5">
                  <Button variant="ghost" type="button" onClick={() => navigate(`/marketing/new?template=${t.id}`)}>
                    <Send size={13} /> Use in campaign
                  </Button>
                  <span className="ml-auto flex text-[var(--color-muted)]">
                    <Link to={`/marketing/email-templates/${t.id}`} aria-label={`Edit ${t.name}`} className="rounded p-1.5 hover:text-[var(--color-ink)]"><Pencil size={14} /></Link>
                    <button type="button" aria-label={`Copy ${t.name}`} onClick={() => duplicate(t)} className="rounded p-1.5 hover:text-[var(--color-ink)]"><Copy size={14} /></button>
                    <button type="button" aria-label={`Delete ${t.name}`} onClick={() => remove(t)} className="rounded p-1.5 hover:text-[var(--color-red)]"><Trash2 size={14} /></button>
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
