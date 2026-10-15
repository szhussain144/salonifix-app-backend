import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  BellOff,
  Building2,
  CalendarCheck,
  CheckCheck,
  CreditCard,
  LayoutTemplate,
  Mail,
  MapPin,
  Megaphone,
  MessageCircle,
  Package,
  PhoneCall,
  Receipt,
  Scissors,
  ShieldCheck,
  Star,
  UserPlus,
  UserRound,
  Users,
  Volume2,
  VolumeX,
  Wallet,
} from "lucide-react";
import { Segmented } from "./ui";
import { useSession } from "../context/SessionContext";
import { quietFetch } from "../context/quietFetch";
import { isSoundOn, playChime, setSoundOn, unlockSoundOnFirstInteraction } from "./notificationSound";
import { uses12h } from "./format";

const POLL_MS = 15_000;

const ICONS = {
  booking: CalendarCheck,
  client: Users,
  staff: UserRound,
  service: Scissors,
  service_category: Scissors,
  product: Package,
  product_category: Package,
  inventory: Package,
  inventory_product: Package,
  expense: Receipt,
  payroll: Wallet,
  payslip: Wallet,
  payment: Wallet,
  adjustment: Wallet,
  campaign: Megaphone,
  call: PhoneCall,
  message: MessageCircle,
  message_log: MessageCircle,
  email_template: LayoutTemplate,
  loyalty_rule: Star,
  location: MapPin,
  user: UserPlus,
  permissions: ShieldCheck,
  email_settings: Mail,
  billing: CreditCard,
  business: Building2,
};

const TONE = {
  success: "bg-[var(--color-green)]/12 text-[var(--color-green)]",
  warning: "bg-[var(--color-orange)]/12 text-[var(--color-orange)]",
  error: "bg-[var(--color-red)]/10 text-[var(--color-red)]",
  info: "bg-[var(--color-accent-soft)] text-[var(--color-accent)]",
};

const parse = (s) => new Date(String(s).replace(" ", "T"));
const dayKey = (d) => d.toDateString();

function ago(s) {
  const d = parse(s);
  const mins = Math.round((Date.now() - d.getTime()) / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  if (mins < 24 * 60 && dayKey(d) === dayKey(new Date())) return `${Math.round(mins / 60)}h ago`;
  return d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit", hour12: uses12h() });
}

function dayLabel(s) {
  const d = parse(s);
  const today = new Date();
  const yesterday = new Date(Date.now() - 86_400_000);
  if (dayKey(d) === dayKey(today)) return "Today";
  if (dayKey(d) === dayKey(yesterday)) return "Yesterday";
  return d.toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "short" });
}

function Item({ n, onOpen, showBranch }) {
  const Icon = ICONS[n.entity] || Bell;
  const who = n.is_mine ? "You" : n.actor_name || "System";
  return (
    <button
      type="button"
      onClick={() => onOpen(n)}
      className={`flex w-full items-start gap-3 rounded-xl px-3 py-2.5 text-left transition-colors hover:bg-[var(--color-panel-alt)] ${n.read ? "" : "bg-[var(--color-accent-soft)]/45"}`}
    >
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${TONE[n.severity] || TONE.info}`}>
        <Icon size={15} />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-[13px] leading-snug text-[var(--color-ink)] ${n.read ? "font-medium" : "font-semibold"}`}>{n.title}</span>
        {n.body && <span className="mt-0.5 line-clamp-2 block text-[12.5px] leading-snug text-[var(--color-muted)]">{n.body}</span>}
        <span className="mt-1 block text-[11.5px] text-[var(--color-faint)]">
          {who} · {ago(n.created_at)}
          {showBranch && n.location_name ? ` · ${n.location_name}` : ""}
        </span>
      </span>
      {!n.read && <span aria-label="Unread" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[var(--color-accent)]" />}
    </button>
  );
}

/** The bell in the top bar: unread badge, and a panel with everything that happened. */
export default function NotificationBell() {
  const navigate = useNavigate();
  const { activeLocationId, isAllLocations } = useSession();
  const ref = useRef(null);
  const [open, setOpen] = useState(false);
  const [unread, setUnread] = useState(0);
  const [tab, setTab] = useState("all");
  const [items, setItems] = useState(null);
  const [more, setMore] = useState(false);
  const [soundOn, setSoundOnState] = useState(isSoundOn);
  const [ring, setRing] = useState(0); // bumps to replay the bell's shake
  const lastCount = useRef(null); // null until the first check: no chime for what was already there
  const soundRef = useRef(soundOn);
  soundRef.current = soundOn;
  const openRef = useRef(open);
  openRef.current = open;

  useEffect(() => unlockSoundOnFirstInteraction(), []);

  /** New since the last check (someone else did something): chime, shake the bell. */
  const announce = useCallback((count) => {
    const before = lastCount.current;
    lastCount.current = count;
    if (before === null || count <= before) return false;
    if (soundRef.current) playChime();
    setRing((r) => r + 1);
    return true;
  }, []);

  const refreshCount = useCallback(async () => {
    const res = await quietFetch("/notifications/unread-count");
    if (!res) return;
    setUnread(res.data.unread);
    // With the panel open, show the new items straight away.
    if (announce(res.data.unread) && openRef.current) setItems(null);
  }, [announce]);

  const loadList = useCallback(async (before) => {
    const res = await quietFetch(`/notifications?limit=20${tab === "unread" ? "&unread=1" : ""}${before ? `&before=${before}` : ""}`);
    if (!res) return;
    setItems((prev) => (before ? [...(prev || []), ...res.data.items] : res.data.items));
    setUnread(res.data.unread);
    lastCount.current = res.data.unread;
    setMore(res.data.items.length === 20);
  }, [tab]);

  // Badge: now, every 15 s (browsers slow this down in background tabs), when returning to the
  // tab, and on branch change. A branch change starts a new baseline, so it doesn't chime.
  useEffect(() => {
    lastCount.current = null;
    refreshCount();
    const timer = setInterval(refreshCount, POLL_MS);
    const onFocus = () => refreshCount();
    window.addEventListener("focus", onFocus);
    return () => {
      clearInterval(timer);
      window.removeEventListener("focus", onFocus);
    };
  }, [refreshCount, activeLocationId]);

  useEffect(() => {
    if (open && items === null) loadList();
  }, [open, items, loadList, activeLocationId]);

  // Reopening the panel always shows the latest.
  useEffect(() => {
    if (open) setItems(null);
  }, [open]);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && setOpen(false);
    const onKey = (e) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const openItem = (n) => {
    if (!n.read) {
      setItems((list) => list.map((x) => (x.id === n.id ? { ...x, read: true } : x)));
      setUnread((u) => Math.max(0, u - 1));
      quietFetch(`/notifications/${n.id}/read`, { method: "POST" }).then((res) => {
        if (!res) return;
        setUnread(res.data.unread);
        lastCount.current = res.data.unread;
      });
    }
    setOpen(false);
    if (n.link) navigate(n.link);
  };

  const readAll = async () => {
    setItems((list) => (list || []).map((x) => ({ ...x, read: true })));
    setUnread(0);
    lastCount.current = 0;
    await quietFetch("/notifications/read-all", { method: "POST" });
    if (tab === "unread") loadList();
  };

  const badge = unread > 99 ? "99+" : String(unread);
  let lastDay = null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        aria-label={unread ? `Notifications, ${unread} unread` : "Notifications"}
        aria-expanded={open}
        aria-haspopup="dialog"
        onClick={() => setOpen((v) => !v)}
        className="relative rounded-lg p-2 text-[var(--color-navy-ink-2)] hover:bg-white/6 hover:text-[var(--color-navy-ink)]"
      >
        <Bell key={ring} size={17} className={ring ? "origin-top animate-[bell-ring_0.9s_ease-in-out]" : ""} />
        {unread > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex h-[17px] min-w-[17px] items-center justify-center rounded-full bg-[var(--color-red)] px-1 text-[10px] font-bold leading-none text-white ring-2 ring-[var(--color-navy)]">
            {badge}
          </span>
        )}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Notifications"
          className="menu-in fixed inset-x-3 top-[64px] z-50 flex max-h-[min(640px,calc(100vh-80px))] flex-col rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-panel)] shadow-[0_30px_70px_rgba(32,34,53,0.22)] sm:absolute sm:inset-x-auto sm:right-0 sm:top-[calc(100%+10px)] sm:w-[400px]"
        >
          <div className="flex items-center justify-between gap-2 border-b border-[var(--color-border-soft)] px-4 pt-3.5 pb-3">
            <p className="font-display text-[17px] font-medium text-[var(--color-ink)]">Notifications</p>
            <button
              type="button"
              aria-pressed={soundOn}
              title={soundOn ? "Sound on: click to mute" : "Sound off: click to turn on"}
              aria-label={soundOn ? "Mute notification sound" : "Turn on notification sound"}
              onClick={() => {
                const next = !soundOn;
                setSoundOn(next);
                setSoundOnState(next);
                if (next) playChime();
              }}
              className="ml-auto rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-panel-alt)] hover:text-[var(--color-ink)]"
            >
              {soundOn ? <Volume2 size={16} /> : <VolumeX size={16} />}
            </button>
            <button
              type="button"
              onClick={readAll}
              disabled={unread === 0}
              className="flex items-center gap-1 text-[12px] font-medium text-[var(--color-accent)] disabled:text-[var(--color-faint)]"
            >
              <CheckCheck size={14} /> Mark all as read
            </button>
          </div>
          <div className="px-4 pt-3">
            <Segmented
              value={tab}
              onChange={(t) => {
                setItems(null);
                setTab(t);
              }}
              options={[
                { key: "all", label: "All" },
                { key: "unread", label: unread ? `Unread (${badge})` : "Unread" },
              ]}
            />
          </div>

          <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-2 pb-2">
            {items === null && <p className="px-3 py-8 text-center text-[12.5px] text-[var(--color-faint)]">Loading…</p>}
            {items?.length === 0 && (
              <div className="flex flex-col items-center px-6 py-10 text-center">
                <span className="mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                  <BellOff size={18} />
                </span>
                <p className="text-[13.5px] font-semibold text-[var(--color-ink)]">{tab === "unread" ? "You're all caught up" : "Nothing yet"}</p>
                <p className="mt-1 text-[12px] text-[var(--color-muted)]">Bookings, payments, stock and team changes will show up here.</p>
              </div>
            )}
            {items?.map((n) => {
              const day = dayLabel(n.created_at);
              const heading = day !== lastDay ? day : null;
              lastDay = day;
              return (
                <div key={n.id}>
                  {heading && <p className="px-3 pt-3 pb-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">{heading}</p>}
                  <Item n={n} onOpen={openItem} showBranch={isAllLocations} />
                </div>
              );
            })}
            {more && (
              <button type="button" onClick={() => loadList(items[items.length - 1]?.id)} className="mt-1 w-full rounded-xl py-2 text-[12.5px] font-medium text-[var(--color-accent)] hover:bg-[var(--color-panel-alt)]">
                Show older
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
