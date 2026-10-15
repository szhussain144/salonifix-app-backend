import { useCallback, useEffect, useState } from "react";
import { Building2, Bell, Earth, Globe, Copy, ExternalLink, CreditCard, Mail, MapPin, Plus, ShieldCheck, Star, UsersRound } from "lucide-react";
import { useLocation } from "react-router-dom";
import LoyaltyPanel from "../components/LoyaltyPanel";
import RolePermissionsPanel from "../components/RolePermissionsPanel";
import EmailSettingsPanel from "../components/EmailSettingsPanel";
import BillingPanel, { useBilling } from "../components/BillingPanel";
import { PlanChip, UpgradeNote } from "../components/Upgrade";
import { phoneHint } from "../components/format";
import { useRegions, zoneOptions } from "../components/regions";
import CurrencyChangeDialog from "../components/CurrencyChangeDialog";
import SpecialHoursDialog from "../components/SpecialHoursDialog";
import BookingPageSettings from "../components/BookingPageSettings";
import { Card, SectionTitle, Input, Select, Button, Badge } from "../components/ui";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";
import { formatBookingDate } from "../context/functions";

const sections = [
  { key: "business", label: "Business", icon: Building2 },
  { key: "locations", label: "Locations", icon: MapPin },
  { key: "users", label: "Team", icon: UsersRound },
  { key: "permissions", label: "Roles & permissions", icon: ShieldCheck, ownerOnly: true },
  { key: "loyalty", label: "Loyalty & rewards", icon: Star, feature: "loyalty" },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "online", label: "Online booking", icon: Globe, managersOnly: true, feature: "online_booking" },
  { key: "email", label: "Email sending", icon: Mail, managersOnly: true },
  { key: "prefs", label: "Region & currency", icon: Earth },
  { key: "billing", label: "Plan & billing", icon: CreditCard, managersOnly: true },
];

const NOTIFICATIONS = [
  ["booking_confirmations", "Booking confirmations (emailed to the client when a booking is confirmed)"],
  ["reminder_day_before", "Appointment reminder the day before"],
  ["reminders_1hr_before", "Appointment reminder about 1 hour before"],
  ["low_stock_alerts", "Low stock alerts"],
  ["daily_summary_email", "Daily summary email"],
];

const REMINDER_CHANNELS = [
  ["email", "Email"],
  ["sms", "SMS"],
  ["whatsapp", "WhatsApp"],
];

const ROLES = [
  { value: "admin", label: "Admin: manages settings, team and locations" },
  { value: "staff", label: "Staff: front desk, screens set in Roles & permissions" },
  { value: "owner", label: "Owner: full access" },
];

const EMPTY_LOCATION = { name: "", address: "", phone: "", opening_time: "10:00", closing_time: "21:00" };
const EMPTY_USER = { name: "", email: "", password: "", role: "staff" };

const hhmm = (t) => (t ? String(t).slice(0, 5) : "");

export default function Settings() {
  // Other screens can open a section directly: <Link to="/settings" state={{ section: "email" }}>.
  const { state: navState } = useLocation();
  const [active, setActive] = useState(navState?.section || "business");
  // Also when already on Settings (e.g. "See plans" on an upgrade message).
  useEffect(() => {
    if (navState?.section) setActive(navState.section);
  }, [navState]);
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { business, isManager, isOwner, signIn, user: me, plan, has } = useSession();

  const [draft, setDraft] = useState(business);
  const [isEditing, setIsEditing] = useState(false);
  const [currencyTo, setCurrencyTo] = useState(null);
  const [locations, setLocations] = useState([]);
  const [locationForm, setLocationForm] = useState(null); // null = closed; with id = editing
  const [specialFor, setSpecialFor] = useState(null); // location whose special hours are open
  const [users, setUsers] = useState([]);
  const { billing, setBilling, reload: reloadBilling } = useBilling();
  // The plan's limits: Starter is one location and just the owner, Growth three locations.
  const locationLimit = plan?.limits?.locations ?? null;
  const locationsFull = locationLimit !== null && locations.filter((l) => l.is_active).length >= locationLimit;
  const soloPlan = plan?.limits?.team === 1;
  const [userForm, setUserForm] = useState(null);
  const [phoneEdit, setPhoneEdit] = useState(null);

  /** Re-reads the session so the top bar and location switcher reflect changes. */
  const refreshSession = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/auth/me`);
    if (res.ok) signIn((await res.json()).data);
  }, [fetchWithLoading, signIn]);

  const loadBusiness = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/business`);
    if (res.ok) setDraft((await res.json()).data);
  }, [fetchWithLoading]);

  const loadLocations = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/locations`);
    if (res.ok) setLocations((await res.json()).data);
  }, [fetchWithLoading]);

  const loadUsers = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/users`);
    if (res.ok) setUsers((await res.json()).data);
  }, [fetchWithLoading]);

  useEffect(() => {
    loadBusiness();
    if (active === "locations") loadLocations();
    if (active === "users" && isManager) loadUsers();
    setIsEditing(false);
  }, [active, isManager, loadBusiness, loadLocations, loadUsers]);

  // A new currency goes through CurrencyChangeDialog (convert prices or not) before the rest is saved.
  const saveBusiness = async ({ currencyDone = false } = {}) => {
    if (!currencyDone && draft?.currency && business?.currency && draft.currency !== business.currency) {
      setCurrencyTo(draft.currency);
      return;
    }
    const fields = [
      "name", "phone", "email", "address", "country", ...(currencyDone ? [] : ["currency"]), "timezone", "time_format", "reminder_channels",
      "online_booking", "online_auto_confirm", "online_min_notice_minutes", "online_max_days_ahead", "client_changes", "client_change_notice_hours",
      ...NOTIFICATIONS.map(([k]) => k),
    ];
    const payload = Object.fromEntries(
      fields
        .map((k) => [k, draft?.[k]])
        // An empty channel list is a real choice (no reminders); other empty fields are left as they are.
        .filter(([k, v]) => v !== undefined && v !== null && (v !== "" || k === "reminder_channels")),
    );
    const res = await fetchWithLoading(`${constanst.API_URL}/business`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    setDraft((await res.json()).data);
    setIsEditing(false);
    addToast({ message: "Settings saved", type: "success" });
    refreshSession();
  };

  const saveLocation = async (e) => {
    e.preventDefault();
    const { id, name, address, phone, opening_time, closing_time } = locationForm;
    const payload = Object.fromEntries(
      Object.entries({ name, address, phone, opening_time: hhmm(opening_time), closing_time: hhmm(closing_time) })
        .filter(([, v]) => v !== "" && v !== null && v !== undefined),
    );
    const res = await fetchWithLoading(`${constanst.API_URL}/locations${id ? `/${id}` : ""}`, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) return;
    addToast({ message: id ? "Location updated" : "Location added", type: "success" });
    setLocationForm(null);
    loadLocations();
    reloadBilling();
    refreshSession();
  };

  const toggleLocation = async (loc) => {
    const res = await fetchWithLoading(`${constanst.API_URL}/locations/${loc.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ is_active: !loc.is_active }),
    });
    if (!res.ok) return;
    loadLocations();
    reloadBilling();
    refreshSession();
  };

  const saveUser = async (e) => {
    e.preventDefault();
    const res = await fetchWithLoading(`${constanst.API_URL}/users`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(userForm),
    });
    if (!res.ok) return;
    addToast({ message: `${userForm.name} can now sign in`, type: "success" });
    setUserForm(null);
    loadUsers();
  };

  const savePhone = async (e) => {
    e.preventDefault();
    const res = await fetchWithLoading(`${constanst.API_URL}/users/${phoneEdit.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: phoneEdit.value.trim() }),
    });
    if (!res.ok) return;
    setPhoneEdit(null);
    loadUsers();
  };

  const removeUser = async (u) => {
    if (!window.confirm(`Remove ${u.name} from the team?`)) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/users/${u.id}`, { method: "DELETE" });
    if (res.ok) loadUsers();
  };

  const field = (key) => ({
    value: draft?.[key] ?? "",
    onChange: (e) => setDraft((prev) => ({ ...prev, [key]: e.target.value })),
    readOnly: !isEditing,
  });

  const editAction = isManager && (
    <Button
      variant="ghost"
      type="button"
      onClick={() => {
        if (isEditing) loadBusiness();
        setIsEditing((v) => !v);
      }}
    >
      {isEditing ? "Cancel" : "Edit"}
    </Button>
  );

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      <Card className="p-3 lg:col-span-1 h-fit">
        {sections.filter((s) => (!s.managersOnly || isManager) && (!s.ownerOnly || isOwner)).map((s) => (
          <button
            key={s.key}
            onClick={() => setActive(s.key)}
            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] text-left transition-colors ${active === s.key
              ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)] font-semibold"
              : "text-[var(--color-muted)] hover:bg-[var(--color-panel-alt)] hover:text-[var(--color-ink)]"
              }`}
          >
            <s.icon size={16} />
            <span className="flex-1">{s.label}</span>
            {s.feature && active !== s.key && <PlanChip feature={s.feature} />}
          </button>
        ))}
      </Card>

      <Card className="p-5 lg:col-span-2">
        {active === "business" && (
          <div className="space-y-4">
            <SectionTitle title="Business" action={editAction} />
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Business name" {...field("name")} />
              <Input
                label="Industry"
                value={draft?.industry ? draft.industry[0].toUpperCase() + draft.industry.slice(1) : ""}
                readOnly
              />
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Input label="Contact number" {...field("phone")} />
              <Input label="Email" {...field("email")} />
            </div>
            <Input label="Head office address" {...field("address")} />
            {draft?.slug && (
              <p className="text-[12px] text-[var(--color-faint)]">Business ID: <code>{draft.slug}</code></p>
            )}
          </div>
        )}

        {active === "locations" && (
          <div className="space-y-4">
            <SectionTitle
              title="Locations"
              action={isManager && !locationForm && (
                <Button type="button" disabled={locationsFull} onClick={() => setLocationForm({ ...EMPTY_LOCATION })}>
                  <Plus size={14} /> Add location
                </Button>
              )}
            />
            {isManager && locationsFull && (
              <UpgradeNote plan={locationLimit === 1 ? "growth" : "popular"}>
                {plan.name} includes {locationLimit} location{locationLimit === 1 ? "" : "s"}.{" "}
                {locationLimit === 1 ? "Growth has up to 3, Popular as many as you like." : "Popular has as many as you like."}
              </UpgradeNote>
            )}
            {locationForm && (
              <form onSubmit={saveLocation} className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="Name" required value={locationForm.name} onChange={(e) => setLocationForm((f) => ({ ...f, name: e.target.value }))} />
                  <Input label="Phone" value={locationForm.phone || ""} onChange={(e) => setLocationForm((f) => ({ ...f, phone: e.target.value }))} />
                </div>
                <Input label="Address" value={locationForm.address || ""} onChange={(e) => setLocationForm((f) => ({ ...f, address: e.target.value }))} />
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Opens" type="time" value={hhmm(locationForm.opening_time)} onChange={(e) => setLocationForm((f) => ({ ...f, opening_time: e.target.value }))} />
                  <Input label="Closes" type="time" value={hhmm(locationForm.closing_time)} onChange={(e) => setLocationForm((f) => ({ ...f, closing_time: e.target.value }))} />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" type="button" onClick={() => setLocationForm(null)}>Cancel</Button>
                  <Button type="submit">{locationForm.id ? "Save location" : "Add location"}</Button>
                </div>
              </form>
            )}
            {specialFor && <SpecialHoursDialog location={specialFor} onClose={() => setSpecialFor(null)} />}
            {locations.map((loc) => (
              <div key={loc.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-lg bg-[var(--color-panel-alt)] border border-[var(--color-border-soft)]">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold">
                    {loc.name}
                    {!loc.is_active && <span className="ml-1 text-[11px] font-normal text-[var(--color-faint)]">(inactive)</span>}
                  </p>
                  <p className="text-[12px] text-[var(--color-muted)]">
                    {[loc.address, loc.phone, `${hhmm(loc.opening_time)}–${hhmm(loc.closing_time)}`].filter(Boolean).join(" · ")}
                  </p>
                </div>
                {isManager && (
                  <div className="flex gap-2">
                    <Button variant="ghost" type="button" onClick={() => setLocationForm({ ...loc })}>Edit</Button>
                    <Button variant="ghost" type="button" onClick={() => setSpecialFor(loc)}>Special hours</Button>
                    <Button variant="ghost" type="button" onClick={() => toggleLocation(loc)}>
                      {loc.is_active ? "Deactivate" : "Activate"}
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {active === "users" && (
          <div className="space-y-4">
            <SectionTitle
              title="Team"
              action={isManager && !userForm && (
                <Button type="button" disabled={soloPlan} onClick={() => setUserForm({ ...EMPTY_USER })}>
                  <Plus size={14} /> Invite user
                </Button>
              )}
            />
            {!isManager && <p className="text-[13px] text-[var(--color-muted)]">Only owners and admins can manage the team.</p>}
            {isManager && soloPlan && (
              <UpgradeNote plan="growth">{plan.name} is for one person, so only you sign in. Growth adds your team.</UpgradeNote>
            )}
            {userForm && (
              <form onSubmit={saveUser} className="space-y-3 rounded-xl border border-[var(--color-border)] p-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <Input label="Name" required value={userForm.name} onChange={(e) => setUserForm((f) => ({ ...f, name: e.target.value }))} />
                  <Input label="Email" type="email" required value={userForm.email} onChange={(e) => setUserForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Input label="Temporary password" type="password" required minLength={8} value={userForm.password} onChange={(e) => setUserForm((f) => ({ ...f, password: e.target.value }))} />
                  <Input label="Phone (for click-to-call)" placeholder={phoneHint()} value={userForm.phone || ""} onChange={(e) => setUserForm((f) => ({ ...f, phone: e.target.value }))} />
                  <Select label="Role" value={userForm.role} onChange={(e) => setUserForm((f) => ({ ...f, role: e.target.value }))}>
                    {ROLES.filter((r) => r.value !== "owner" || me?.role === "owner")}
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" type="button" onClick={() => setUserForm(null)}>Cancel</Button>
                  <Button type="submit">Invite</Button>
                </div>
              </form>
            )}
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between gap-3 p-3 rounded-lg bg-[var(--color-panel-alt)] border border-[var(--color-border-soft)]">
                <div className="min-w-0">
                  <p className="text-[13px] font-semibold">{u.name}{u.id === me?.id && " (you)"}</p>
                  <p className="text-[12px] text-[var(--color-muted)]">{u.email}</p>
                  {phoneEdit?.id === u.id ? (
                    <form onSubmit={savePhone} className="mt-1.5 flex items-center gap-2">
                      <input
                        autoFocus
                        aria-label={`${u.name} phone`}
                        className="w-40 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2.5 py-1 text-[12px]"
                        placeholder={phoneHint()}
                        value={phoneEdit.value}
                        onChange={(e) => setPhoneEdit((p) => ({ ...p, value: e.target.value }))}
                      />
                      <button type="submit" className="text-[12px] font-medium text-[var(--color-accent)]">Save</button>
                      <button type="button" className="text-[12px] text-[var(--color-muted)]" onClick={() => setPhoneEdit(null)}>Cancel</button>
                    </form>
                  ) : (
                    <button type="button" className="mt-0.5 text-[12px] text-[var(--color-muted)] hover:text-[var(--color-accent)]" onClick={() => setPhoneEdit({ id: u.id, value: u.phone || "" })}>
                      {u.phone ? `📞 ${u.phone}` : "+ Add phone (needed for click-to-call)"}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <Badge>{u.role}</Badge>
                  {u.id !== me?.id && (
                    <Button variant="ghost" type="button" onClick={() => removeUser(u)}>Remove</Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {active === "permissions" && isOwner && <RolePermissionsPanel />}

        {active === "email" && isManager && <EmailSettingsPanel />}

        {active === "loyalty" && (
          <div className="space-y-4">
            <UpgradeNote feature="loyalty" />
            <fieldset disabled={!has("loyalty")} className={`min-w-0 ${!has("loyalty") ? "pointer-events-none opacity-55" : ""}`}>
              <LoyaltyPanel />
            </fieldset>
          </div>
        )}

        {active === "billing" && isManager && <BillingPanel billing={billing} setBilling={setBilling} />}

        {active === "notifications" && (
          <div className="space-y-4">
            <SectionTitle title="Notifications" action={editAction} />
            {NOTIFICATIONS.map(([key, label]) => (
              <label key={key} className="flex items-center justify-between p-3 rounded-lg bg-[var(--color-panel-alt)] border border-[var(--color-border-soft)]">
                <span className="text-[13px]">{label}</span>
                <input
                  type="checkbox"
                  checked={Boolean(Number(draft?.[key]))}
                  onChange={() => setDraft((prev) => ({ ...prev, [key]: Number(prev?.[key]) ? 0 : 1 }))}
                  disabled={!isEditing}
                  className="accent-[var(--color-accent)]"
                />
              </label>
            ))}
            <div className="p-3 rounded-lg bg-[var(--color-panel-alt)] border border-[var(--color-border-soft)]">
              <p className="text-[13px]">Send reminders by</p>
              <div className="mt-2 flex flex-wrap gap-4">
                {REMINDER_CHANNELS.map(([key, label]) => {
                  const chosen = (draft?.reminder_channels ?? "").split(",").filter(Boolean);
                  // SMS and WhatsApp reminders come with Popular; on a smaller plan they show unticked and locked.
                  const locked = key !== "email" && !has("sms_whatsapp");
                  const on = chosen.includes(key) && !locked;
                  const toggle = () => {
                    const next = on ? chosen.filter((c) => c !== key) : [...chosen, key];
                    setDraft((prev) => ({ ...prev, reminder_channels: REMINDER_CHANNELS.map(([k]) => k).filter((k) => next.includes(k)).join(",") }));
                  };
                  return (
                    <label key={key} className={`flex items-center gap-2 text-[13px] ${locked ? "text-[var(--color-faint)]" : ""}`}>
                      <input type="checkbox" checked={on} onChange={toggle} disabled={!isEditing || locked} className="accent-[var(--color-accent)]" />
                      {label}
                      {locked && <PlanChip feature="sms_whatsapp" />}
                    </label>
                  );
                })}
              </div>
              <p className="mt-2 text-[12px] text-[var(--color-faint)]">
                Each reminder goes by every ticked channel the client has an email or phone number for. Email uses Settings → Email sending; SMS and WhatsApp need the messaging service set up on the server. Every message shows on the booking page.
              </p>
            </div>
          </div>
        )}

        {active === "online" && (
          <>
            <OnlineBookingSection draft={draft} setDraft={setDraft} isEditing={isEditing} editAction={editAction} locked={!has("online_booking")} />
            <BookingPageSettings slug={draft?.slug} locked={!has("online_booking") || !has("booking_page_design")} />
          </>
        )}

        {active === "prefs" && <RegionSection draft={draft} setDraft={setDraft} isEditing={isEditing} editAction={editAction} />}

        {["business", "notifications", "prefs", "online"].includes(active) && isEditing && (
          <div className="flex justify-end mt-6 pt-5 border-t border-[var(--color-border-soft)]">
            <Button type="button" onClick={() => saveBusiness()}>Save changes</Button>
          </div>
        )}
      </Card>
      {currencyTo && (
        <CurrencyChangeDialog
          to={currencyTo}
          onClose={() => setCurrencyTo(null)}
          onDone={() => {
            setCurrencyTo(null);
            saveBusiness({ currencyDone: true });
          }}
        />
      )}
    </div>
  );
}

const NOTICE = [
  [0, "Any time (even right now)"],
  [30, "30 minutes"],
  [60, "1 hour"],
  [120, "2 hours"],
  [240, "4 hours"],
  [1440, "1 day"],
];
const AHEAD = [7, 14, 30, 60, 90, 180];

/** Settings → Online booking: the public page's link and its rules. */
function OnlineBookingSection({ draft, setDraft, isEditing, editAction, locked }) {
  const { addToast } = useToast();
  const link = draft?.slug ? `${window.location.origin}/book/${draft.slug}` : "";
  const on = Boolean(Number(draft?.online_booking)) && !locked;
  const set = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      addToast({ message: "Link copied. Share it on WhatsApp, Instagram or Google.", type: "success" });
    } catch {
      addToast({ message: link, type: "info", duration: 8000 });
    }
  };
  const row = "flex items-center justify-between gap-4 p-3 rounded-lg bg-[var(--color-panel-alt)] border border-[var(--color-border-soft)]";
  return (
    <div className="space-y-4">
      <SectionTitle title="Online booking" action={editAction} />
      <UpgradeNote feature="online_booking">
        <b className="font-semibold text-[var(--color-ink)]">Online booking</b> comes with Growth: clients book themselves from your link, day or night.
      </UpgradeNote>
      <fieldset disabled={locked} className={`min-w-0 space-y-4 ${locked ? "pointer-events-none opacity-55" : ""}`}>
      <div className="rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] p-4">
        <p className="text-[13px] font-semibold">Your booking page</p>
        <p className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">Clients choose services, who they'd like and a free time, any time of day. Put it in your Instagram bio, Google profile and WhatsApp status.</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <code className="min-w-0 flex-1 truncate rounded-lg bg-[var(--color-panel)] px-3 py-2 text-[12.5px]">{link}</code>
          <Button type="button" variant="ghost" onClick={copy}><Copy size={14} /> Copy</Button>
          <a href={link} target="_blank" rel="noreferrer"><Button type="button" variant="ghost"><ExternalLink size={14} /> Open</Button></a>
        </div>
        {!on && <p className="mt-2 text-[12px] font-medium text-[var(--color-red)]">The page is switched off: visitors see “not available”.</p>}
      </div>
      <label className={row}>
        <span className="text-[13px]">Online booking is on</span>
        <input type="checkbox" checked={on} disabled={!isEditing} onChange={() => set("online_booking", on ? 0 : 1)} className="accent-[var(--color-accent)]" />
      </label>
      <label className={row}>
        <span className="text-[13px]">
          Confirm online bookings straight away
          <span className="block text-[12px] text-[var(--color-faint)]">Off: they arrive as “Upcoming” for the front desk to confirm.</span>
        </span>
        <input type="checkbox" checked={Boolean(Number(draft?.online_auto_confirm))} disabled={!isEditing} onChange={() => set("online_auto_confirm", Number(draft?.online_auto_confirm) ? 0 : 1)} className="accent-[var(--color-accent)]" />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Earliest booking" value={String(draft?.online_min_notice_minutes ?? 60)} disabled={!isEditing} onChange={(e) => set("online_min_notice_minutes", Number(e.target.value))}>
          {NOTICE.map(([v, l]) => ({ value: String(v), label: v ? `At least ${l} ahead` : l }))}
        </Select>
        <Select label="How far ahead" value={String(draft?.online_max_days_ahead ?? 60)} disabled={!isEditing} onChange={(e) => set("online_max_days_ahead", Number(e.target.value))}>
          {AHEAD.map((d) => ({ value: String(d), label: `Up to ${d} days` }))}
        </Select>
      </div>
      <p className="text-[12px] text-[var(--color-faint)]">Online bookings follow opening hours, each staff member's working hours and time off, and never double-book. You get a bell notification for each one.</p>
      </fieldset>

      <div className="border-t border-[var(--color-border-soft)] pt-4">
        <SectionTitle title="Clients change or cancel themselves" />
        <label className={row}>
          <span className="text-[13px]">
            Add a “Change or cancel” link to confirmations and reminders
            <span className="block text-[12px] text-[var(--color-faint)]">
              Clients pick a new free time with the same staff, or cancel. You get a bell notification, and paid bookings stay with the front desk.
            </span>
          </span>
          <input type="checkbox" checked={Boolean(Number(draft?.client_changes ?? 1))} disabled={!isEditing} onChange={() => set("client_changes", Number(draft?.client_changes ?? 1) ? 0 : 1)} className="accent-[var(--color-accent)]" />
        </label>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <Select label="Allowed until" value={String(draft?.client_change_notice_hours ?? 24)} disabled={!isEditing || !Number(draft?.client_changes ?? 1)} onChange={(e) => set("client_change_notice_hours", Number(e.target.value))}>
            {CHANGE_NOTICE.map(([v, l]) => ({ value: String(v), label: l }))}
          </Select>
        </div>
      </div>
    </div>
  );
}

const CHANGE_NOTICE = [
  [0, "Right up to the start"],
  [2, "2 hours before"],
  [6, "6 hours before"],
  [12, "12 hours before"],
  [24, "24 hours before"],
  [48, "2 days before"],
  [72, "3 days before"],
];

/* "PKR 2,500 · now Mon 12 Oct, 2:30 pm" for the choices on screen (blank while a choice is invalid). */
function regionExample(draft) {
  try {
    const amount = new Intl.NumberFormat("en", { style: "currency", currency: draft.currency || "PKR", minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(2500);
    const when = new Date().toLocaleString(draft.country === "US" ? "en-US" : "en-GB", {
      timeZone: draft.timezone || "UTC",
      weekday: "short",
      day: "numeric",
      month: "short",
      hour: "numeric",
      minute: "2-digit",
      hour12: draft.time_format !== "24h",
    });
    return `${amount} · now ${when}`;
  } catch {
    return "";
  }
}

/** Settings → Region & currency: country (phone numbers, payment methods), currency, time zone, clock. */
function RegionSection({ draft, setDraft, isEditing, editAction }) {
  const regions = useRegions();
  const { fetchWithLoading } = useApi();
  const { isManager } = useSession();
  const [note, setNote] = useState("");
  const [changes, setChanges] = useState([]);
  const currency = draft?.currency;

  useEffect(() => {
    if (!isManager || isEditing) return;
    fetchWithLoading(`${constanst.API_URL}/business/currency/history`, { silent: true }).then(async (res) => {
      if (res.ok) setChanges((await res.json()).data);
    });
  }, [isManager, isEditing, currency, fetchWithLoading]);
  const set = (key, value) => setDraft((prev) => ({ ...prev, [key]: value }));
  const country = regions?.countries.find((c) => c.code === draft?.country);

  // A new country brings its currency and time zone; both can still be changed.
  const pickCountry = (code) => {
    const next = regions.countries.find((c) => c.code === code);
    if (!next) return;
    const zone = next.time_zones.includes(draft.timezone) ? draft.timezone : next.time_zones[0] || draft.timezone;
    setDraft((prev) => ({ ...prev, country: code, currency: next.currency, timezone: zone }));
    setNote(`Currency set to ${next.currency} and time zone to ${zone.replace(/_/g, " ")}. Change them below if you need to.`);
  };

  if (!regions || !draft) return <SectionTitle title="Region & currency" action={editAction} />;
  const currencies = [...regions.currencies].sort((a, b) =>
    a.code === country?.currency ? -1 : b.code === country?.currency ? 1 : a.code.localeCompare(b.code),
  );
  return (
    <div className="space-y-4">
      <SectionTitle title="Region & currency" action={editAction} />
      <p className="text-[13px] text-[var(--color-muted)]">
        Used for prices and bills, phone numbers (the country code is added to local numbers), payment methods, and every date and time in the app, reminders and reports.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="Country" value={draft.country || ""} disabled={!isEditing} onChange={(e) => pickCountry(e.target.value)}>
          {regions.countries.map((c) => ({ value: c.code, label: `${c.name} (+${c.dial_code})` }))}
        </Select>
        <Select label="Currency" value={draft.currency || ""} disabled={!isEditing} onChange={(e) => set("currency", e.target.value)}>
          {currencies.map((c) => ({ value: c.code, label: `${c.code} · ${c.name}` }))}
        </Select>
        <Select label="Time zone" value={draft.timezone || ""} disabled={!isEditing} onChange={(e) => set("timezone", e.target.value)}>
          {zoneOptions(regions, draft.country)}
        </Select>
        <Select label="Clock" value={draft.time_format || "12h"} disabled={!isEditing} onChange={(e) => set("time_format", e.target.value)}>
          {[
            { value: "12h", label: "12-hour (2:30 pm)" },
            { value: "24h", label: "24-hour (14:30)" },
          ]}
        </Select>
      </div>
      {isEditing && note && <p className="text-[12px] text-[var(--color-accent)]">{note}</p>}
      <div className="rounded-xl bg-[var(--color-panel-alt)] px-3 py-2.5 text-[12.5px] text-[var(--color-muted)]">
        <span className="font-semibold text-[var(--color-ink)]">Looks like: </span>
        {regionExample(draft)}
      </div>
      {isEditing && (
        <p className="text-[12px] text-[var(--color-faint)]">
          The time zone sets what &quot;today&quot; is and when reminders and campaigns go out. Booking dates and times stay as they were entered.
          Changing the currency asks whether to convert your prices.
        </p>
      )}
      {changes.length > 0 && (
        <div>
          <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-faint)]">Currency changes</p>
          <ul className="divide-y divide-[var(--color-border-soft)] text-[12.5px]">
            {changes.map((c) => (
              <li key={c.created_at + c.to_currency} className="py-2">
                <span className="font-medium">
                  {c.from_currency} → {c.to_currency}
                </span>
                <span className="text-[var(--color-muted)]">
                  {" "}
                  · {formatBookingDate(c.created_at)}
                  {c.changed_by_name ? ` by ${c.changed_by_name}` : ""} ·{" "}
                  {c.rate ? `converted at 1 ${c.from_currency} = ${Number(c.rate)} ${c.to_currency}${c.converted ? ` (${c.converted})` : ""}` : "prices kept as they were"}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1 text-[11.5px] text-[var(--color-faint)]">Bills and expenses from before a change are in the currency used at the time.</p>
        </div>
      )}
    </div>
  );
}
