import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CalendarDays, Check, Clock, MapPin, Minus, Plus, Sparkles, Trash2, UserRound, Users } from "lucide-react";
import { Card, SectionTitle, Input, Select, Button } from "../components/ui";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import { ClientLoyaltyCard, DiscountLines } from "../components/Loyalty";
import { MonthCalendar, SlotPicker, StaffTimeline } from "../components/BookingScheduler";
import ExtendHours from "../components/ExtendHours";
import { addDaysISO, fromMinutes, clockTime, toMinutes } from "../components/timeSlots";
import { dateLocale, formatAmount, phoneHint, todayISO } from "../components/format";

const STEPS = ["Client", "Services & staff", "Date & time", "Confirm"];
const EMPTY_LINE = { service_id: "", staff_id: "" };
/* Most people one group booking can hold (the server allows the same). */
const MAX_PEOPLE = 6;
/* Bookings shorter than this still block this much time (the server uses the same minimum). */
const MIN_DURATION = 15;
/* How far ahead "Find next free day" looks. */
const SEARCH_DAYS = 21;

/** "5 h", "1 h 30 min", "45 min". */
const formatLength = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);

const formatLongDate = (iso) =>
  iso ? new Date(`${iso}T00:00:00`).toLocaleDateString(dateLocale(), { weekday: "long", day: "numeric", month: "long" }) : "";

export default function NewBooking() {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { activeLocations, activeLocation, isAllLocations, terms, isManager } = useSession();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [type, setType] = useState("Appoinment");

  // Client
  const [phoneNumber, setPhoneNumber] = useState("");
  const [clientExists, setClientExists] = useState(false);
  const [clientId, setClientId] = useState(null);
  const [clientName, setClientName] = useState("");
  const [lookedUpPhone, setLookedUpPhone] = useState("");
  const [clientEmail, setClientEmail] = useState(null);
  const [errors, setErrors] = useState({});

  // Services & staff
  const [servicesList, setServicesList] = useState([]);
  const [staff, setStaff] = useState([]);
  const [locationId, setLocationId] = useState(() =>
    activeLocation ? String(activeLocation.id) : activeLocations.length === 1 ? String(activeLocations[0].id) : "",
  );
  const [lines, setLines] = useState([{ ...EMPTY_LINE }]);
  // Group booking: other people at the same time, each with their own services and staff.
  const [guests, setGuests] = useState([]);

  // Date & time
  const [date, setDate] = useState(todayISO());
  const [time, setTime] = useState("");
  const [availability, setAvailability] = useState(null);
  const [showUnavailable, setShowUnavailable] = useState(false);
  // Bumped after the day's hours change (extended, back to usual), to reload free times.
  const [hoursVersion, setHoursVersion] = useState(0);
  const [searching, setSearching] = useState(false);

  // Confirm
  const [applyDiscount, setApplyDiscount] = useState(true);
  const [preview, setPreview] = useState(null);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetchWithLoading(`${constanst.API_URL}/services?limit=500`).then((r) => r.json()),
      fetchWithLoading(`${constanst.API_URL}/staff`).then((r) => r.json()),
    ])
      .then(([services, people]) => {
        if (cancelled) return;
        setServicesList((services.data || []).filter((s) => Number(s.is_active) !== 0));
        setStaff((people.data || []).filter((s) => Number(s.is_active) !== 0));
      })
      .catch(() => addToast({ message: "Could not load services and staff", type: "error" }));
    return () => {
      cancelled = true;
    };
  }, [fetchWithLoading, addToast]);

  const serviceById = useMemo(() => new Map(servicesList.map((s) => [String(s.id), s])), [servicesList]);
  const staffById = useMemo(() => new Map(staff.map((s) => [String(s.id), s])), [staff]);
  const locationStaff = useMemo(
    () => staff.filter((s) => !locationId || String(s.location_id) === String(locationId)),
    [staff, locationId],
  );
  const location = activeLocations.find((l) => String(l.id) === String(locationId));

  const filledLines = lines.filter((l) => l.service_id && l.staff_id);
  const subtotal = filledLines.reduce((sum, l) => sum + Number(serviceById.get(String(l.service_id))?.price || 0), 0);
  const serviceMinutes = filledLines.reduce(
    (sum, l) => sum + Number(serviceById.get(String(l.service_id))?.duration_minutes || 0),
    0,
  );
  const duration = Math.max(serviceMinutes, MIN_DURATION);
  const staffIds = [...new Set(filledLines.map((l) => String(l.staff_id)))].sort().join(",");

  // Each person in a group: their lines, how long they take, and who serves them.
  const filledOf = (ls) => ls.filter((l) => l.service_id && l.staff_id);
  const priceOf = (ls) => filledOf(ls).reduce((sum, l) => sum + Number(serviceById.get(String(l.service_id))?.price || 0), 0);
  const minutesOf = (ls) => Math.max(filledOf(ls).reduce((sum, l) => sum + Number(serviceById.get(String(l.service_id))?.duration_minutes || 0), 0), MIN_DURATION);
  const isGroup = guests.length > 0;
  const guestLabel = (i) => guests[i]?.name.trim() || `Guest ${i + 1}`;
  const guestsTotal = guests.reduce((sum, g) => sum + priceOf(g.lines), 0);
  // Everyone starts together; the group is done when the longest person is.
  const groupDuration = Math.max(duration, ...guests.map((g) => minutesOf(g.lines)));
  const requests = useMemo(
    () => [
      { duration, staffIds },
      ...guests.map((g) => ({
        duration: minutesOf(g.lines),
        staffIds: [...new Set(filledOf(g.lines).map((l) => String(l.staff_id)))].sort().join(","),
      })),
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [duration, staffIds, guests, serviceById],
  );
  const requestsKey = requests.map((r) => `${r.duration}:${r.staffIds}`).join("|");
  const endTime = time ? fromMinutes(toMinutes(time) + groupDuration) : "";

  /* ---------- Client ---------- */

  const checkClientExists = async () => {
    const phone = phoneNumber.trim();
    if (!phone || phone === lookedUpPhone) return;
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/clients/phone/${encodeURIComponent(phone)}`);
      const data = await response.json();
      setLookedUpPhone(phone);
      if (data?.data) {
        setClientExists(true);
        setClientId(data.data.id || null);
        setClientEmail(data.data.email || null);
        setClientName(data.data?.name || "");
      } else {
        setClientExists(false);
        setClientId(null);
      }
    } catch {
      setClientExists(false);
      setClientEmail(null);
    }
  };

  /* ---------- Availability ---------- */

  /* Free times for everyone: each person's staff must be free for that person's length of time,
     all starting together. One request per person, merged: a time is free only if it's free for all. */
  const fetchAvailability = useCallback(
    (day, { silent = false } = {}) => {
      const one = (r) => {
        const params = new URLSearchParams({ date: day, duration: String(r.duration), location_id: String(locationId) });
        if (r.staffIds) params.set("staff_ids", r.staffIds);
        return fetchWithLoading(`${constanst.API_URL}/bookings/availability?${params}`, silent ? { silent: true } : {})
          .then((res) => (res.ok ? res.json() : null))
          .then((json) => json?.data ?? null);
      };
      return Promise.all(requests.map(one)).then(mergeAvailability);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [fetchWithLoading, locationId, requestsKey],
  );

  useEffect(() => {
    if (step < 2 || !locationId || !staffIds) return;
    let cancelled = false;
    fetchAvailability(date).then((data) => {
      if (cancelled) return;
      setAvailability(data);
      // Keep the chosen time only while it is still free.
      setTime((current) => (current && data?.slots.some((s) => s.time === current && s.available) ? current : ""));
    });
    return () => {
      cancelled = true;
    };
  }, [step, date, locationId, staffIds, fetchAvailability, hoursVersion]);

  const findNextFreeDay = async () => {
    setSearching(true);
    try {
      for (let i = 1; i <= SEARCH_DAYS; i++) {
        const day = addDaysISO(date, i);
        const data = await fetchAvailability(day, { silent: true });
        if (data?.first_available) {
          setDate(day);
          addToast({ message: `Next free: ${formatLongDate(day)} at ${clockTime(data.first_available)}`, type: "info" });
          return;
        }
      }
      addToast({ message: `No free time in the next ${SEARCH_DAYS} days for this staff`, type: "info" });
    } finally {
      setSearching(false);
    }
  };

  /* ---------- Loyalty preview ---------- */

  useEffect(() => {
    if (step !== 3) return;
    const params = new URLSearchParams({ subtotal: String(subtotal), booking_date: date });
    if (time) params.set("start_time", time);
    if (clientId) params.set("client_id", String(clientId));
    else if (phoneNumber.trim()) params.set("phone", phoneNumber.trim());

    let cancelled = false;
    fetchWithLoading(`${constanst.API_URL}/loyalty/preview?${params}`)
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => !cancelled && setPreview(json?.data ?? null))
      .catch(() => !cancelled && setPreview(null));
    return () => {
      cancelled = true;
    };
  }, [step, subtotal, date, time, clientId, phoneNumber, fetchWithLoading]);

  const earned = applyDiscount && preview ? preview.amount : 0;

  /* ---------- Steps ---------- */

  const stepErrors = (index) => {
    const next = {};
    if (index === 0) {
      if (!clientName.trim()) next.clientName = "Full name is required.";
      if (!phoneNumber.trim()) next.phoneNumber = "Phone number is required.";
    }
    if (index === 1) {
      if (!locationId) next.location = "Choose a location.";
      if (filledLines.length === 0) next.services = "Add at least one service with a staff member.";
      else if (filledLines.length !== lines.filter((l) => l.service_id || l.staff_id).length)
        next.services = "Each service needs a staff member.";
      guests.forEach((g, i) => {
        const filled = filledOf(g.lines);
        if (!filled.length) next.services = `Add a service with a staff member for ${guestLabel(i)}.`;
        else if (filled.length !== g.lines.filter((l) => l.service_id || l.staff_id).length) next.services = `Each service for ${guestLabel(i)} needs a staff member.`;
      });
      // Everyone starts together, so one staff member can't serve two people.
      const owner = new Map();
      [lines, ...guests.map((g) => g.lines)].forEach((ls, person) =>
        filledOf(ls).forEach((l) => {
          const id = String(l.staff_id);
          if (owner.has(id) && owner.get(id) !== person) {
            next.services = `${staffById.get(id)?.name ?? "A staff member"} is chosen for two people. Everyone in a group starts together, so each person needs someone different.`;
          }
          owner.set(id, person);
        }),
      );
    }
    if (index === 2 && !time) next.time = "Pick a free time.";
    return next;
  };

  const canOpen = (index) => [...Array(index).keys()].every((i) => Object.keys(stepErrors(i)).length === 0);

  const goNext = () => {
    const next = stepErrors(step);
    setErrors(next);
    if (Object.keys(next).length === 0) setStep((s) => Math.min(STEPS.length - 1, s + 1));
  };

  const changeLocation = (id) => {
    setLocationId(id);
    // Staff work at one location, so picks from another location no longer apply.
    const keep = (ls) => ls.map((l) => (String(staffById.get(String(l.staff_id))?.location_id) === String(id) ? l : { ...l, staff_id: "" }));
    setLines(keep);
    setGuests((prev) => prev.map((g) => ({ ...g, lines: keep(g.lines) })));
    setErrors((prev) => ({ ...prev, location: undefined }));
  };

  const pickWalkInNow = async () => {
    const today = todayISO();
    setDate(today);
    const data = await fetchAvailability(today);
    if (data?.first_available) setTime(data.first_available);
  };

  const submitBooking = async () => {
    setSaving(true);
    const bookingData = {
      location_id: Number(locationId),
      booking_type: type,
      ...(clientId
        ? { client_id: clientId }
        : {
            client: {
              name: clientName.trim(),
              phone: phoneNumber.trim(),
              ...(clientEmail ? { email: clientEmail.trim() } : {}),
            },
          }),
      apply_discount: applyDiscount,
      services: filledLines.map((l) => ({
        service_id: Number(l.service_id),
        staff_id: Number(l.staff_id),
        price_at_time: Number(serviceById.get(String(l.service_id))?.price || 0),
      })),
      booking_date: date,
      start_time: time,
      notes: notes.trim() || undefined,
      payment_method: "pay later",
      status: "Upcoming",
      ...(isGroup && {
        guests: guests.map((g) => ({
          name: g.name.trim() || undefined,
          services: filledOf(g.lines).map((l) => ({
            service_id: Number(l.service_id),
            staff_id: Number(l.staff_id),
            price_at_time: Number(serviceById.get(String(l.service_id))?.price || 0),
          })),
        })),
      }),
    };

    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/bookings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(bookingData),
      });

      if (!response.ok) {
        // Someone took the slot meanwhile (the API layer shows who): pick another time.
        if (response.status === 409) {
          setTime("");
          setStep(2);
        }
        return;
      }

      const { data } = await response.json();
      const parts = [isGroup ? `Group ${terms.booking.toLowerCase()} added for ${guests.length + 1} people` : `${terms.booking} added`];
      if (data?.client_created) parts.push(`new ${terms.client.toLowerCase()} saved`);
      if (Number(data?.discount_amount) > 0) parts.push(`${data.discount_note} applied`);
      addToast({ message: parts.join(" · "), type: "success" });
      // The list confirms the new booking at the top, wherever it falls in the pages.
      navigate("/bookings", { state: { created: { id: data.id, client: clientName.trim(), date, time } } });
    } catch {
      addToast({ message: "Could not reach the server. Please try again.", type: "error" });
    } finally {
      setSaving(false);
    }
  };

  /* ---------- Render ---------- */

  const requiredStaff = availability?.staff.filter((s) => s.required) ?? [];
  const freeCount = availability?.slots.filter((s) => s.available).length ?? 0;
  // Why nothing is free: staff are booked, or there isn't enough opening time left.
  const anyBusy = availability?.slots.some((s) => s.reason === "busy");
  const hours = availability?.location;
  const dayWord = date === todayISO() ? "today" : date === addDaysISO(todayISO(), 1) ? "tomorrow" : `on ${formatLongDate(date)}`;
  const noTimeMessage = hours?.closed
    ? `${hours.name} is closed ${dayWord}${hours.note ? ` (${hours.note})` : ""}.`
    : anyBusy
      ? `${requiredStaff.map((s) => s.name).join(" and ")} ${requiredStaff.length > 1 ? "are" : "is"} fully booked.`
      : availability?.slots.some((s) => s.reason === "closing")
        ? availability.last_start
          ? `Not enough time left before closing for a ${formatLength(groupDuration)} ${terms.booking.toLowerCase()}.`
          : `A ${formatLength(groupDuration)} ${terms.booking.toLowerCase()} is longer than the opening hours (${clockTime(hours.opening_time)}–${clockTime(hours.closing_time)}).`
        : "Opening hours are over for this day.";

  return (
    <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
      <Card className="p-5">
        {/* Stepper */}
        <ol className="mb-6 grid grid-cols-4 gap-2">
          {STEPS.map((label, i) => {
            const done = i < step;
            const enabled = i <= step || canOpen(i);
            return (
              <li key={label}>
                <button
                  type="button"
                  disabled={!enabled}
                  onClick={() => setStep(i)}
                  className="group w-full text-left disabled:cursor-not-allowed"
                  aria-current={i === step ? "step" : undefined}
                >
                  <span
                    className={`block h-1 rounded-full transition-colors ${i <= step ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"}`}
                  />
                  <span
                    className={`mt-2 flex items-center gap-1.5 text-[12px] ${i === step ? "font-semibold text-[var(--color-ink)]" : done ? "text-[var(--color-accent)]" : "text-[var(--color-muted)]"}`}
                  >
                    {done ? <Check size={13} /> : <span className="tabular-nums">{i + 1}.</span>}
                    <span className="truncate">{label}</span>
                  </span>
                </button>
              </li>
            );
          })}
        </ol>

        <div className="mb-5 flex items-center gap-2">
          {["Walk-in", "Appoinment"].map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`rounded-full px-4 py-1.5 text-[12px] font-medium transition-colors ${type === t ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "bg-[var(--color-panel-alt)] text-[var(--color-muted)]"}`}
            >
              {t === "Appoinment" ? "Appointment" : t}
            </button>
          ))}
        </div>

        {step === 0 && (
          <div className="space-y-4">
            <SectionTitle title={`${terms.client} details`} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Input
                  label="Phone number"
                  placeholder={phoneHint()}
                  value={phoneNumber}
                  autoFocus
                  onChange={(e) => {
                    setPhoneNumber(e.target.value);
                    if (clientExists) {
                      // A different number is a different client.
                      setClientExists(false);
                      setClientId(null);
                      setClientEmail(null);
                    }
                    if (lookedUpPhone) setLookedUpPhone("");
                    if (errors.phoneNumber) setErrors((prev) => ({ ...prev, phoneNumber: undefined }));
                  }}
                  onBlur={checkClientExists}
                />
                {errors.phoneNumber && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.phoneNumber}</p>}
              </div>
              <div>
                <Input
                  label="Full name"
                  placeholder="Enter full name"
                  value={clientName}
                  onChange={(e) => {
                    setClientName(e.target.value);
                    if (errors.clientName) setErrors((prev) => ({ ...prev, clientName: undefined }));
                  }}
                />
                {errors.clientName && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.clientName}</p>}
              </div>
            </div>
            {clientExists && clientId ? (
              <>
                <p className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-green)]">
                  <Check size={14} /> Returning {terms.client.toLowerCase()} found
                </p>
                <ClientLoyaltyCard clientId={clientId} compact />
              </>
            ) : lookedUpPhone ? (
              <p className="text-[12.5px] text-[var(--color-muted)]">
                New client. They will be saved with this booking, and their visits will count towards loyalty rewards.
              </p>
            ) : (
              <p className="text-[12.5px] text-[var(--color-muted)]">Enter the phone number first to find a returning client.</p>
            )}
            <Input
              label="Email (optional)"
              value={clientEmail || ""}
              onChange={(e) => setClientEmail(e.target.value)}
              placeholder="abc@example.com"
              readOnly={clientExists}
            />
          </div>
        )}

        {step === 1 && (
          <div className="space-y-4">
            <SectionTitle title="Services & staff" />
            {(isAllLocations || !activeLocation) && activeLocations.length > 1 && (
              <div>
                <Select label="Location" value={locationId} onChange={(e) => changeLocation(e.target.value)}>
                  {activeLocations.map((l) => ({ value: String(l.id), label: l.name }))}
                </Select>
                {errors.location && <p className="mt-1.5 text-[12px] text-[var(--color-red)]">{errors.location}</p>}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[var(--color-border-soft)] p-3">
              <span className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                  <Users size={17} />
                </span>
                <span>
                  <span className="block text-[13.5px] font-semibold">Number of people</span>
                  <span className="block text-[12px] text-[var(--color-muted)]">
                    {isGroup ? "Everyone starts together, each with their own staff." : `Booking for a group? Add the people coming with this ${terms.client.toLowerCase()}.`}
                  </span>
                </span>
              </span>
              <span className="flex items-center gap-2">
                <button
                  type="button"
                  aria-label="One person fewer"
                  disabled={!isGroup}
                  onClick={() => setGuests((prev) => prev.slice(0, -1))}
                  className="rounded-full border border-[var(--color-border)] p-1.5 hover:border-[var(--color-accent)] disabled:opacity-30"
                >
                  <Minus size={14} />
                </button>
                <span aria-live="polite" className="w-6 text-center text-[16px] font-semibold tabular-nums">{guests.length + 1}</span>
                <button
                  type="button"
                  aria-label="One more person"
                  disabled={guests.length + 1 >= MAX_PEOPLE}
                  onClick={() => setGuests((prev) => [...prev, { name: "", lines: [{ ...EMPTY_LINE }] }])}
                  className="rounded-full border border-[var(--color-border)] p-1.5 hover:border-[var(--color-accent)] disabled:opacity-30"
                >
                  <Plus size={14} />
                </button>
              </span>
            </div>
            {errors.services && <p className="text-[12px] text-[var(--color-red)]">{errors.services}</p>}
            <PersonBlock show={isGroup} title={clientName.trim() || terms.client} badge={terms.client}>
              <LinesEditor lines={lines} setLines={setLines} onEdit={() => errors.services && setErrors((prev) => ({ ...prev, services: undefined }))} servicesList={servicesList} serviceById={serviceById} staff={locationStaff} disabled={!locationId} />
            </PersonBlock>
            {guests.map((g, gi) => (
              <PersonBlock
                key={gi}
                show
                title={guestLabel(gi)}
                badge={`Guest ${gi + 1}`}
                onRemove={() => setGuests((prev) => prev.filter((_, i) => i !== gi))}
                name={
                  <Input
                    label="Name (optional)"
                    placeholder={`Guest ${gi + 1}`}
                    value={g.name}
                    onChange={(e) => setGuests((prev) => prev.map((x, i) => (i === gi ? { ...x, name: e.target.value } : x)))}
                  />
                }
              >
                <LinesEditor
                  lines={g.lines}
                  setLines={(update) => setGuests((prev) => prev.map((x, i) => (i === gi ? { ...x, lines: typeof update === "function" ? update(x.lines) : update } : x)))}
                  onEdit={() => errors.services && setErrors((prev) => ({ ...prev, services: undefined }))}
                  servicesList={servicesList}
                  serviceById={serviceById}
                  staff={locationStaff}
                  disabled={!locationId}
                />
              </PersonBlock>
            ))}
          </div>
        )}

        {step === 2 && (
          <div className="space-y-5">
            <SectionTitle title="Date & time" />
            <div className="grid gap-5 lg:grid-cols-[280px_minmax(0,1fr)]">
              <div className="space-y-3">
                <div className="rounded-xl border border-[var(--color-border-soft)] p-3">
                  <MonthCalendar
                    value={date}
                    minDate={todayISO()}
                    onChange={(d) => {
                      setDate(d);
                      setErrors((prev) => ({ ...prev, time: undefined }));
                    }}
                  />
                </div>
                <div className="flex flex-wrap gap-2">
                  {[
                    ["Today", todayISO()],
                    ["Tomorrow", addDaysISO(todayISO(), 1)],
                  ].map(([label, d]) => (
                    <Button key={label} type="button" variant={date === d ? "primary" : "ghost"} className="px-3 py-1.5" onClick={() => setDate(d)}>
                      {label}
                    </Button>
                  ))}
                  {type === "Walk-in" && (
                    <Button type="button" variant="ghost" className="px-3 py-1.5" onClick={pickWalkInNow}>
                      <Clock size={13} /> Next free now
                    </Button>
                  )}
                </div>
              </div>

              <div className="min-w-0">
                <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
                  <p className="text-[14px] font-semibold">{formatLongDate(date)}</p>
                  {availability && (
                    <p className="text-[12px] text-[var(--color-muted)]">
                      {hours.name} ·{" "}
                      {hours.closed ? (
                        <b className="font-semibold text-[var(--color-red)]">closed</b>
                      ) : (
                        <>
                          open {clockTime(hours.opening_time)}–{clockTime(hours.closing_time)}
                          {hours.special && <b className="ml-1 font-semibold text-[var(--color-accent)]">(special hours)</b>}
                        </>
                      )}{" "}
                      · {formatLength(groupDuration)}
                    </p>
                  )}
                </div>
                {availability && !hours.closed && availability.last_start && groupDuration >= 60 && (
                  <p className="mb-3 rounded-lg bg-[var(--color-accent-soft)] px-3 py-2 text-[12.5px] text-[var(--color-accent-dark)]">
                    A {formatLength(groupDuration)} {terms.booking.toLowerCase()} must start by <b>{clockTime(availability.last_start)}</b> to finish by closing ({clockTime(hours.closing_time)}).
                  </p>
                )}

                {!availability ? (
                  <p className="text-[13px] text-[var(--color-muted)]">Loading free times…</p>
                ) : freeCount === 0 ? (
                  <div className="rounded-xl border border-dashed border-[var(--color-border)] p-5 text-center">
                    <p className="text-[13.5px] font-medium">{noTimeMessage}</p>
                    <p className="mt-1 text-[12.5px] text-[var(--color-muted)]">
                      {anyBusy ? "Try another day, or pick a different staff member." : "Try another day."}
                    </p>
                    <Button type="button" className="mt-3" onClick={findNextFreeDay} disabled={searching}>
                      <Sparkles size={14} /> {searching ? "Searching…" : "Find next free day"}
                    </Button>
                  </div>
                ) : (
                  <>
                    <div className="mb-3 flex flex-wrap items-center justify-between gap-2 text-[12px] text-[var(--color-muted)]">
                      <span>
                        {freeCount} free start time{freeCount === 1 ? "" : "s"} · first at{" "}
                        <button type="button" className="font-semibold text-[var(--color-accent)] hover:underline" onClick={() => setTime(availability.first_available)}>
                          {clockTime(availability.first_available)}
                        </button>
                      </span>
                      <label className="flex cursor-pointer items-center gap-1.5">
                        <input type="checkbox" checked={showUnavailable} onChange={(e) => setShowUnavailable(e.target.checked)} />
                        Show booked times
                      </label>
                    </div>
                    <SlotPicker
                      slots={availability.slots}
                      value={time}
                      showUnavailable={showUnavailable}
                      onChange={(t) => {
                        setTime(t);
                        setErrors((prev) => ({ ...prev, time: undefined }));
                      }}
                    />
                  </>
                )}
                {errors.time && <p className="mt-3 text-[12px] text-[var(--color-red)]">{errors.time}</p>}
                {availability && isManager && (
                  <ExtendHours key={`${hours.id}-${date}-${hours.closing_time}-${hours.closed}`} date={date} hours={hours} dayLabel={dayWord} onChanged={() => setHoursVersion((v) => v + 1)} />
                )}
              </div>
            </div>

            {availability && requiredStaff.length > 0 && (
              <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-panel-alt)] p-4">
                <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">Staff schedule</p>
                <StaffTimeline
                  staff={requiredStaff}
                  open={availability.location.opening_time}
                  close={availability.location.closing_time}
                  selection={time ? { start: toMinutes(time), end: toMinutes(time) + groupDuration } : null}
                />
              </div>
            )}
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <SectionTitle title="Confirm" />
            <div className="rounded-xl border border-[var(--color-accent)]/30 bg-[var(--color-accent-soft)] p-4">
              <p className="text-[15px] font-semibold">
                {formatLongDate(date)}, {clockTime(time)}–{clockTime(endTime)}
              </p>
              <p className="mt-0.5 text-[12.5px] text-[var(--color-muted)]">
                {location?.name} · {groupDuration} min{isGroup ? ` · ${guests.length + 1} people` : ""} · {type === "Appoinment" ? "Appointment" : type}
              </p>
            </div>
            {[{ title: clientName.trim() || terms.client, lines: filledLines }, ...guests.map((g, i) => ({ title: guestLabel(i), lines: filledOf(g.lines) }))].map((p, pi) => (
              <div key={pi}>
                {isGroup && <p className="mb-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--color-faint)]">{p.title}</p>}
                <div className="divide-y divide-[var(--color-border-soft)] rounded-xl border border-[var(--color-border-soft)]">
                  {p.lines.map((l, i) => {
                    const service = serviceById.get(String(l.service_id));
                    return (
                      <div key={i} className="flex items-center justify-between gap-3 px-4 py-2.5 text-[13px]">
                        <span>
                          {service?.name}
                          <span className="text-[var(--color-muted)]"> · {staffById.get(String(l.staff_id))?.name}</span>
                        </span>
                        <span className="tabular-nums">{formatAmount(service?.price)}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
            <div className="ml-auto max-w-sm">
              <DiscountLines
                subtotal={subtotal}
                discount={earned}
                note={preview?.note}
                total={subtotal - earned}
                waived={!applyDiscount && preview?.amount > 0}
              />
              {isGroup && (
                <div className="mb-2 space-y-1 border-t border-[var(--color-border-soft)] pt-2 text-[13px]">
                  <p className="flex justify-between text-[var(--color-muted)]">
                    <span>Guests ({guests.length})</span>
                    <span className="tabular-nums">{formatAmount(guestsTotal)}</span>
                  </p>
                  <p className="flex justify-between font-semibold">
                    <span>Total for everyone</span>
                    <span className="tabular-nums">{formatAmount(subtotal - earned + guestsTotal)}</span>
                  </p>
                  <p className="text-[11.5px] text-[var(--color-faint)]">Discounts apply to the {terms.client.toLowerCase()} only; guests pay menu prices.</p>
                </div>
              )}
              {preview && (
                <p className="mb-2 text-[11.5px] text-[var(--color-muted)]">
                  {preview.client_id ? `Visit #${preview.visit_number} for this client` : "First visit"}
                  {preview.monthly_streak > 0 &&
                    ` · came ${preview.monthly_streak} month${preview.monthly_streak > 1 ? "s" : ""} in a row`}
                </p>
              )}
              {preview?.amount > 0 && (
                <label className="mb-3 flex cursor-pointer items-center gap-2 text-[12.5px]">
                  <input type="checkbox" checked={applyDiscount} onChange={(e) => setApplyDiscount(e.target.checked)} />
                  Apply loyalty discount
                </label>
              )}
            </div>
            <label className="block">
              <span className="mb-1.5 block text-[12px] text-[var(--color-muted)]">Notes (optional)</span>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="e.g. prefers the senior stylist"
                className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--color-accent)]/60"
              />
            </label>
          </div>
        )}

        <div className="mt-6 flex items-center justify-between border-t border-[var(--color-border-soft)] pt-5">
          <Button variant="ghost" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            Back
          </Button>
          {step < STEPS.length - 1 ? (
            <Button onClick={goNext}>Continue</Button>
          ) : (
            <Button onClick={submitBooking} disabled={saving}>
              {saving ? "Booking…" : `Confirm ${terms.booking.toLowerCase()}`}
            </Button>
          )}
        </div>
      </Card>

      {/* Live summary */}
      <Card className="h-fit p-5 xl:sticky xl:top-24">
        <SectionTitle title="Summary" />
        <dl className="space-y-3 text-[13px]">
          <SummaryRow icon={UserRound} label={terms.client}>
            {clientName || <span className="text-[var(--color-faint)]">Not set</span>}
            {phoneNumber && <span className="block text-[12px] text-[var(--color-muted)]">{phoneNumber}</span>}
          </SummaryRow>
          <SummaryRow icon={MapPin} label="Location">
            {location?.name || <span className="text-[var(--color-faint)]">Not set</span>}
          </SummaryRow>
          <SummaryRow icon={Sparkles} label="Services">
            {filledLines.length === 0 ? (
              <span className="text-[var(--color-faint)]">None yet</span>
            ) : (
              filledLines.map((l, i) => (
                <span key={i} className="block">
                  {serviceById.get(String(l.service_id))?.name}
                  <span className="text-[12px] text-[var(--color-muted)]"> · {staffById.get(String(l.staff_id))?.name}</span>
                </span>
              ))
            )}
          </SummaryRow>
          {isGroup && (
            <SummaryRow icon={Users} label={`Guests (${guests.length})`}>
              {guests.map((g, i) => (
                <span key={i} className="block">
                  <b className="font-medium">{guestLabel(i)}</b>
                  <span className="text-[12px] text-[var(--color-muted)]">
                    {" "}· {filledOf(g.lines).map((l) => serviceById.get(String(l.service_id))?.name).join(", ") || "no services yet"}
                  </span>
                </span>
              ))}
            </SummaryRow>
          )}
          <SummaryRow icon={CalendarDays} label="When">
            {time ? (
              <>
                {formatLongDate(date)}
                <span className="block text-[12px] text-[var(--color-muted)]">
                  {clockTime(time)}–{clockTime(endTime)} · {formatLength(groupDuration)}
                </span>
              </>
            ) : (
              <span className="text-[var(--color-faint)]">{filledLines.length ? `${formatLength(groupDuration)}, time not picked` : "Not set"}</span>
            )}
          </SummaryRow>
        </dl>
        <div className="mt-4 flex items-center justify-between border-t border-[var(--color-border-soft)] pt-4 text-[14px] font-semibold">
          <span>Total</span>
          <span className="tabular-nums">{formatAmount(subtotal - (step === 3 ? earned : 0) + guestsTotal)}</span>
        </div>
      </Card>
    </div>
  );
}

/** Merges one availability per person into one: a start time is free only when it is free for everyone. */
function mergeAvailability(list) {
  if (list.some((x) => !x)) return null;
  if (list.length === 1) return list[0];
  const [first] = list;
  const slots = first.slots.map((slot, i) => {
    const blocked = list.map((x) => x.slots[i]).find((s) => !s?.available);
    return blocked ? { ...slot, available: false, reason: blocked?.reason ?? "busy", busy_staff: list.flatMap((x) => x.slots[i]?.busy_staff ?? []) } : slot;
  });
  const staff = [...new Map(list.flatMap((x) => x.staff.filter((s) => s.required)).map((s) => [s.id, s])).values()];
  // Everyone must finish by closing: the earliest of their last start times.
  const lastStarts = list.map((x) => x.last_start);
  const last_start = lastStarts.includes(null) ? null : lastStarts.sort()[0];
  return { ...first, duration: Math.max(...list.map((x) => x.duration)), staff, slots, last_start, first_available: slots.find((s) => s.available)?.time ?? null };
}

/** One person's part of a group booking (just its contents when it isn't a group). */
function PersonBlock({ show, title, badge, name, onRemove, children }) {
  if (!show) return <div className="space-y-3">{children}</div>;
  return (
    <div className="pop-in space-y-3 rounded-2xl border border-[var(--color-border)] p-4">
      <div className="flex items-center justify-between gap-2">
        <p className="flex items-center gap-2 text-[14px] font-semibold">
          <UserRound size={15} className="text-[var(--color-accent)]" /> {title}
          <span className="rounded-full bg-[var(--color-accent-soft)] px-2 py-0.5 text-[10.5px] font-semibold text-[var(--color-accent)]">{badge}</span>
        </p>
        {onRemove && (
          <button type="button" onClick={onRemove} className="text-[12px] font-medium text-[var(--color-red)] hover:underline">
            Remove
          </button>
        )}
      </div>
      {name}
      {children}
    </div>
  );
}

/** Service + staff rows for one person. */
function LinesEditor({ lines, setLines, onEdit, servicesList, serviceById, staff, disabled }) {
  const setLine = (index, patch) => {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
    onEdit?.();
  };
  return (
    <>
      <div className="space-y-3">
        {lines.map((line, index) => {
          const service = serviceById.get(String(line.service_id));
          return (
            <div key={index} className="grid items-end gap-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-panel-alt)] p-3 sm:grid-cols-[1fr_1fr_auto]">
              <Select label={`Service ${lines.length > 1 ? index + 1 : ""}`} value={line.service_id} onChange={(e) => setLine(index, { service_id: e.target.value })}>
                {servicesList.map((s) => ({ value: String(s.id), label: `${s.name} · ${s.duration_minutes} min · ${formatAmount(s.price)}` }))}
              </Select>
              <Select label="Staff" value={line.staff_id} onChange={(e) => setLine(index, { staff_id: e.target.value })} disabled={disabled}>
                {staff.map((s) => ({ value: String(s.id), label: s.role ? `${s.name} (${s.role})` : s.name }))}
              </Select>
              <div className="flex items-center gap-3 pb-2 text-[12px] text-[var(--color-muted)]">
                {service && <span className="whitespace-nowrap tabular-nums">{service.duration_minutes} min</span>}
                <button
                  type="button"
                  onClick={() => setLines((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : [{ ...EMPTY_LINE }]))}
                  className="rounded-full p-1.5 text-[var(--color-red)] hover:bg-[var(--color-red)]/10"
                  aria-label="Remove service"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          );
        })}
      </div>
      <Button type="button" variant="subtle" onClick={() => setLines((prev) => [...prev, { ...EMPTY_LINE }])}>
        <Plus size={14} /> Add another service
      </Button>
    </>
  );
}

function SummaryRow({ icon: Icon, label, children }) {
  return (
    <div className="flex gap-3">
      <Icon size={15} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
      <div className="min-w-0">
        <dt className="text-[11px] uppercase tracking-[0.1em] text-[var(--color-faint)]">{label}</dt>
        <dd className="mt-0.5">{children}</dd>
      </div>
    </div>
  );
}
