import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { ArrowLeft, CalendarCheck, CalendarPlus, Check, Clock, MapPin, Minus, Phone, Plus, UserRound, Users } from "lucide-react";
import Mark from "../components/Mark";
import { dateLocale, formatMoney, phoneHint, setRegion } from "../components/format";
import { clockTime } from "../components/timeSlots";
import { addDays, dayLabel, longDate, minutes, PERIODS } from "../components/bookingDays";
import constanst from "../config/constants";
import { accentStyle, headerStyle } from "../components/brandColors";

/** Most people one online booking can be for (the client and up to five guests). */
const MAX_PEOPLE = 6;
const NEW_PERSON = { serviceIds: [], staffId: 0, name: "" };

const duration = (m) => (m >= 60 ? `${Math.floor(m / 60)} h${m % 60 ? ` ${m % 60} min` : ""}` : `${m} min`);

async function api(path, options) {
  const res = await fetch(`${constanst.API_URL}/public/book/${path}`, options);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.message || "Something went wrong. Please try again.");
  return body;
}

/** A calendar file so the client can add the visit to their phone's calendar. */
function calendarFile(done, business) {
  const stamp = (date, time) => `${date.replace(/-/g, "")}T${time.replace(":", "")}00`;
  const end = (() => {
    const m = minutes(done.time) + done.duration;
    return `${String(Math.floor(m / 60) % 24).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
  })();
  const text = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Salonifix//Online booking//EN",
    "BEGIN:VEVENT",
    `UID:booking-${done.id}@salonifix`,
    `DTSTART:${stamp(done.date, done.time)}`,
    `DTEND:${stamp(done.date, end)}`,
    `SUMMARY:${done.services.join(", ")} at ${business.name}`,
    `LOCATION:${[done.location?.name, done.location?.address].filter(Boolean).join(", ")}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");
  return URL.createObjectURL(new Blob([text], { type: "text/calendar" }));
}

/** Public page where clients book themselves: /book/<business>. No sign-in. */
export default function BookOnline() {
  const { slug } = useParams();
  const [info, setInfo] = useState(null);
  const [error, setError] = useState(null);
  const [step, setStep] = useState(0);
  const [locationId, setLocationId] = useState(null);
  // Everyone being booked: the client first, then their guests. staffId 0 = anyone.
  const [people, setPeople] = useState([{ ...NEW_PERSON }]);
  const [active, setActive] = useState(0);
  const [date, setDate] = useState(null);
  const [time, setTime] = useState(null);
  const [times, setTimes] = useState(null);
  // Every start time of the day with whether it is free; booked ones are shown greyed out.
  const [slots, setSlots] = useState(null);
  // Services, or the packages / memberships tabs (Settings → Online booking → Booking page).
  const [tab, setTab] = useState("services");
  // Set (to the reason, or "") when the branch is closed on the chosen day.
  const [closedNote, setClosedNote] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", notes: "", website: "" });
  const [problem, setProblem] = useState(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);

  useEffect(() => {
    api(slug)
      .then(({ data }) => {
        setRegion(data.business);
        setInfo(data);
        setTab(data.page.show_services ? "services" : data.page.show_packages ? "packages" : "memberships");
        if (data.locations.length === 1) setLocationId(data.locations[0].id);
        setDate(data.booking.today);
        document.title = `Book · ${data.page.display_name || data.business.name}`;
      })
      .catch((e) => setError(e.message));
  }, [slug]);

  // Prices are null when the business hides them on its page.
  const money = (v) => (v === null || v === undefined ? "" : formatMoney(v, info?.business.currency || "PKR"));
  const servicesOf = (p) => (info ? info.services.filter((s) => p.serviceIds.includes(s.id)) : []);
  const chosen = useMemo(() => (info ? info.services.filter((s) => people[0].serviceIds.includes(s.id)) : []), [info, people]);
  const allChosen = people.flatMap(servicesOf);
  const total = allChosen.reduce((s, x) => s + x.price, 0);
  // Everyone starts together; the visit lasts as long as the longest person's services.
  const length = Math.max(0, ...people.map((p) => servicesOf(p).reduce((s, x) => s + x.duration_minutes, 0)));
  const staffHere = info ? info.staff.filter((s) => s.location_id === locationId) : [];
  const location = info?.locations.find((l) => l.id === locationId);
  const nameOf = (id) => (id ? staffHere.find((s) => s.id === id)?.name : "Anyone available");
  const group = people.length > 1;
  const person = people[active] ?? people[0];
  const who = (i) => (i === 0 ? "You" : people[i].name.trim() || `Person ${i + 1}`);
  const setPerson = (i, patch) => {
    setPeople((all) => all.map((p, j) => (j === i ? { ...p, ...patch } : p)));
    setTime(null);
  };
  const setCount = (n) => {
    setPeople((all) => (n > all.length ? [...all, ...Array.from({ length: n - all.length }, () => ({ ...NEW_PERSON }))] : all.slice(0, n)));
    setActive((a) => Math.min(a, n - 1));
    setTime(null);
  };
  // A key for the slots request: changes when anyone's services or staff change.
  const partyKey = people.map((p) => `${p.serviceIds.join(",")}:${p.staffId || ""}`).join(";");

  // Free times for the chosen day.
  useEffect(() => {
    if (step !== 2 || !date || !locationId || !partyKey || partyKey.startsWith(":")) return;
    let cancelled = false;
    setTimes(null);
    setSlots(null);
    const [me, ...guests] = partyKey.split(";");
    const [ids, staff] = me.split(":");
    const q = new URLSearchParams({ location_id: locationId, date, service_ids: ids });
    if (staff) q.set("staff_id", staff);
    if (guests.length) q.set("guests", guests.join(";"));
    api(`${slug}/slots?${q}`)
      .then(({ data }) => {
        if (cancelled) return;
        setTimes(data.times);
        setSlots(data.slots ?? data.times.map((t) => ({ time: t, available: true })));
        setClosedNote(data.closed ? data.note || "" : null);
      })
      .catch(() => {
        if (cancelled) return;
        setTimes([]);
        setSlots([]);
      });
    return () => {
      cancelled = true;
    };
  }, [step, date, locationId, partyKey, slug]);

  if (error) {
    return (
      <Shell>
        <div className="py-16 text-center">
          <p className="font-display text-[22px]">Booking page not found</p>
          <p className="mt-2 text-[14px] text-[var(--color-muted)]">{error}</p>
        </div>
      </Shell>
    );
  }
  if (!info) return <Shell />;
  const { business } = info;
  const terms = business.terms;
  const page = info.page;
  // Without a staff choice the "Who" step is skipped.
  const next = (s) => (s === 0 && !page.choose_staff ? 2 : s + 1);
  const prev = (s) => (s === 2 && !page.choose_staff ? 0 : s - 1);

  const submit = async (e) => {
    e.preventDefault();
    setProblem(null);
    if (!form.name.trim() || !form.phone.trim()) return setProblem("Please enter your name and phone number.");
    if (info.page.ask_email === "required" && !form.email.trim()) return setProblem("Please enter your email address.");
    setSending(true);
    try {
      const { data } = await api(slug, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          location_id: locationId,
          date,
          time,
          service_ids: people[0].serviceIds,
          ...(people[0].staffId ? { staff_id: people[0].staffId } : {}),
          ...(group && {
            guests: people.slice(1).map((p) => ({
              name: p.name.trim() || undefined,
              service_ids: p.serviceIds,
              ...(p.staffId ? { staff_id: p.staffId } : {}),
            })),
          }),
          name: form.name,
          phone: form.phone,
          email: form.email || undefined,
          notes: form.notes || undefined,
          website: form.website,
        }),
      });
      setDone(data);
    } catch (err) {
      setProblem(err.message);
      if (/no longer free|just been taken/.test(err.message)) {
        setTime(null);
        setStep(2);
      }
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <Shell business={business} page={info.page}>
        <div className="py-8 text-center">
          <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-green)]/15 text-[var(--color-green)]">
            <Check size={28} />
          </span>
          <h1 className="mt-4 font-display text-[26px] font-medium">{done.status === "confirmed" ? "You're booked!" : "Request sent"}</h1>
          <p className="mt-1 text-[14px] text-[var(--color-muted)]">
            {done.status === "confirmed"
              ? "We look forward to seeing you."
              : `${business.name} will confirm your ${terms.booking.toLowerCase()} shortly.`}
          </p>
        </div>
        <div className="space-y-2 rounded-2xl bg-[var(--color-panel-alt)] p-4 text-[14px]">
          <p className="flex items-center gap-2"><CalendarCheck size={16} className="text-[var(--color-accent)]" /> {longDate(done.date)}, {clockTime(done.time)}</p>
          {done.people?.length > 1 ? (
            <>
              <p className="flex items-center gap-2"><Users size={16} className="text-[var(--color-accent)]" /> {done.people.length} people · {duration(done.duration)}</p>
              <ul className="space-y-1 pl-6 text-[13px]">
                {done.people.map((p, i) => (
                  <li key={i}>
                    <b>{i === 0 ? "You" : p.name}</b>: {p.services.join(", ")}
                    {p.staff && <span className="text-[var(--color-muted)]"> with {p.staff}</span>}
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <p className="flex items-center gap-2"><Clock size={16} className="text-[var(--color-accent)]" /> {done.services.join(", ")} · {duration(done.duration)}</p>
              {done.staff && <p className="flex items-center gap-2"><UserRound size={16} className="text-[var(--color-accent)]" /> {done.staff}</p>}
            </>
          )}
          {done.location && <p className="flex items-center gap-2"><MapPin size={16} className="text-[var(--color-accent)]" /> {[done.location.name, done.location.address].filter(Boolean).join(", ")}</p>}
          {info.page.show_prices && <p className="pt-1 font-semibold">{money(done.total)}</p>}
        </div>
        <a href={calendarFile(done, business)} download="booking.ics" className="mt-4 flex items-center justify-center gap-2 rounded-full border border-[var(--color-border)] py-3 text-[14px] font-medium hover:border-[var(--color-accent)]">
          <CalendarPlus size={16} /> Add to my calendar
        </a>
        {(done.location?.phone || business.phone) && (
          <p className="mt-4 text-center text-[13px] text-[var(--color-muted)]">Need to change it? Call {done.location?.phone || business.phone}.</p>
        )}
      </Shell>
    );
  }

  const steps = ["Services", "Who", "When", "Your details"];
  const everyoneChose = people.every((p) => p.serviceIds.length > 0);
  const canNext = [locationId && everyoneChose, true, Boolean(time), true][step];
  const days = Array.from({ length: Math.min(info.booking.max_days_ahead + 1, 21) }, (_, i) => addDays(info.booking.today, i));
  const toggle = (id) => setPerson(active, { serviceIds: person.serviceIds.includes(id) ? person.serviceIds.filter((x) => x !== id) : [...person.serviceIds, id] });
  // Everyone needs their own staff member, so a group can't be bigger than the team here.
  const maxPeople = Math.max(1, Math.min(MAX_PEOPLE, page.max_group_size, staffHere.length || MAX_PEOPLE));
  const tabs = group && (
    <PeopleTabs
      people={people}
      active={active}
      onChange={setActive}
      label={who}
      ready={(p) => (step === 0 ? p.serviceIds.length > 0 : true)}
      detail={(p) => (step === 0 ? `${p.serviceIds.length || "No"} service${p.serviceIds.length === 1 ? "" : "s"}` : nameOf(p.staffId))}
    />
  );
  const categories = [...new Set(info.services.map((s) => s.category || "Services"))];

  return (
    <Shell business={business} page={info.page}>
      {step === 0 && <Hero page={page} />}
      {step === 0 && (
        <OfferTabs
          tabs={[page.show_services && ["services", "Book a visit"], page.show_packages && info.packages.length > 0 && ["packages", "Packages"], page.show_memberships && info.plans.length > 0 && ["memberships", "Memberships"]].filter(Boolean)}
          value={tab}
          onChange={setTab}
        />
      )}
      {tab !== "services" ? (
        <Offers kind={tab === "packages" ? "package" : "membership"} items={tab === "packages" ? info.packages : info.plans} page={page} money={money} slug={slug} />
      ) : (
      <>
      <div className="mb-5 flex items-center gap-3">
        {step > 0 && (
          <button type="button" onClick={() => setStep(prev(step))} aria-label="Back" className="rounded-full border border-[var(--color-border)] p-2 hover:border-[var(--color-accent)]">
            <ArrowLeft size={16} />
          </button>
        )}
        <div className="flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-accent)]">Step {step + 1} of {steps.length}</p>
          <h1 className="font-display text-[22px] font-medium">{["Choose your services", "Who would you like?", "Pick a time", "Your details"][step]}</h1>
        </div>
      </div>

      {step === 0 && (
        <div className="space-y-5">
          {info.locations.length > 1 && (
            <div>
              <p className="mb-2 text-[13px] font-semibold">Branch</p>
              <div className="grid gap-2 sm:grid-cols-2">
                {info.locations.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => {
                      setLocationId(l.id);
                      setPeople((all) => all.map((p) => ({ ...p, staffId: 0 })));
                      setTime(null);
                    }}
                    className={`rounded-2xl border p-3 text-left text-[13px] transition-colors ${locationId === l.id ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"}`}
                  >
                    <span className="block font-semibold">{l.name}</span>
                    {l.address && <span className="block text-[12px] text-[var(--color-muted)]">{l.address}</span>}
                    <span className="block text-[12px] text-[var(--color-faint)]">Open {clockTime(l.opening_time)} – {clockTime(l.closing_time)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {page.allow_groups && (
          <div className="flex items-center justify-between gap-3 rounded-2xl border border-[var(--color-border)] p-3">
            <span className="flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
                <Users size={17} />
              </span>
              <span>
                <span className="block text-[14px] font-medium">How many people?</span>
                <span className="block text-[12px] text-[var(--color-muted)]">
                  {/* Each person needs their own staff member at the same time. */}
                  {maxPeople === 1
                    ? "One person at a time here. For a group, please call us."
                    : group
                      ? people.length >= maxPeople
                        ? `Up to ${maxPeople} people at once here`
                        : "Everyone starts at the same time"
                      : "Bringing a friend? Book together"}
                </span>
              </span>
            </span>
            <span className="flex items-center gap-2">
              <button type="button" aria-label="One person fewer" disabled={people.length <= 1} onClick={() => setCount(people.length - 1)} className="rounded-full border border-[var(--color-border)] p-2 hover:border-[var(--color-accent)] disabled:opacity-30">
                <Minus size={14} />
              </button>
              <span aria-live="polite" className="w-6 text-center text-[16px] font-semibold tabular-nums">{people.length}</span>
              <button type="button" aria-label="One more person" disabled={people.length >= maxPeople} onClick={() => setCount(people.length + 1)} className="rounded-full border border-[var(--color-border)] p-2 hover:border-[var(--color-accent)] disabled:opacity-30">
                <Plus size={14} />
              </button>
            </span>
          </div>
          )}
          {tabs}
          {categories.map((cat) => (
            <div key={cat}>
              <p className="mb-2 text-[13px] font-semibold">{cat}</p>
              <ul className="space-y-2">
                {info.services
                  .filter((s) => (s.category || "Services") === cat)
                  .map((s) => {
                    const on = person.serviceIds.includes(s.id);
                    return (
                      <li key={s.id}>
                        <button
                          type="button"
                          aria-pressed={on}
                          onClick={() => toggle(s.id)}
                          className={`flex w-full items-center gap-3 rounded-2xl border p-3 text-left transition-colors ${on ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"}`}
                        >
                          <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-md border ${on ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white" : "border-[var(--color-border)]"}`}>
                            {on && <Check size={13} />}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block text-[14px] font-medium">{s.name}</span>
                            <span className="block text-[12px] text-[var(--color-muted)]">{duration(s.duration_minutes)}{s.description ? ` · ${s.description}` : ""}</span>
                          </span>
                          <span className="text-[14px] font-semibold tabular-nums">{money(s.price)}</span>
                        </button>
                      </li>
                    );
                  })}
              </ul>
            </div>
          ))}
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4">
          {tabs}
          <div className="grid gap-2 sm:grid-cols-2">
            {[{ id: 0, name: "Anyone available", role: "The first free person" }, ...staffHere].map((s) => {
              // Everyone starts together, so someone chosen for another person isn't free for this one.
              const takenBy = s.id ? people.findIndex((p, i) => i !== active && p.staffId === s.id) : -1;
              return (
                <button
                  key={s.id}
                  type="button"
                  disabled={takenBy >= 0}
                  onClick={() => setPerson(active, { staffId: s.id })}
                  className={`flex items-center gap-3 rounded-2xl border p-3 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-45 ${person.staffId === s.id ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"}`}
                >
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent)] text-[13px] font-semibold text-white">
                    {s.id ? s.name.split(" ").map((n) => n[0]).join("").slice(0, 2) : <UserRound size={18} />}
                  </span>
                  <span>
                    <span className="block text-[14px] font-medium">{s.name}</span>
                    {takenBy >= 0 ? (
                      <span className="block text-[12px] text-[var(--color-muted)]">Chosen for {who(takenBy)}</span>
                    ) : (
                      s.role && <span className="block text-[12px] text-[var(--color-muted)]">{s.role}</span>
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <div className="-mx-4 mb-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
            {days.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDate(d);
                  setTime(null);
                }}
                className={`flex w-16 shrink-0 flex-col items-center rounded-2xl border py-2 transition-colors ${date === d ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"}`}
              >
                <span className="text-[11px]">{dayLabel(d, info.booking.today)}</span>
                <span className="text-[18px] font-semibold">{Number(d.slice(8))}</span>
                <span className="text-[10.5px] opacity-80">{new Date(`${d}T00:00:00Z`).toLocaleDateString(dateLocale(), { month: "short", timeZone: "UTC" })}</span>
              </button>
            ))}
          </div>
          {times === null || slots === null ? (
            <p className="py-8 text-center text-[13px] text-[var(--color-muted)]">Finding free times…</p>
          ) : (
            <>
              {times.length === 0 && (
                <p className="mb-4 rounded-2xl bg-[var(--color-panel-alt)] p-5 text-center text-[13px] text-[var(--color-muted)]">
                  {closedNote !== null
                    ? `We're closed on ${longDate(date)}${closedNote ? ` (${closedNote})` : ""}. Please choose another day.`
                    : `${slots.length ? "Fully booked" : "No free times"} on ${longDate(date)}${group ? ` for ${people.length} people together` : ""}. Try another day${people.some((p) => p.staffId) ? " or “Anyone available”" : ""}.`}
                </p>
              )}
              {slots.some((s) => !s.available) && times.length > 0 && (
                <p className="mb-3 flex items-center gap-2 text-[12px] text-[var(--color-muted)]">
                  <span className="inline-block h-3 w-3 rounded border border-dashed border-[var(--color-border)] bg-[var(--color-panel-alt)]" /> Booked
                  {people.some((p) => p.staffId) ? ` with ${[...new Set(people.filter((p) => p.staffId).map((p) => nameOf(p.staffId)))].join(" and ")}` : ""}
                </p>
              )}
              {PERIODS.map(([label, from, to]) => {
                const inPeriod = slots.filter((s) => minutes(s.time) >= from && minutes(s.time) < to);
                if (!inPeriod.length) return null;
                return (
                  <div key={label} className="mb-4">
                    <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">{label}</p>
                    <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                      {inPeriod.map((s) => (
                        <button
                          key={s.time}
                          type="button"
                          disabled={!s.available}
                          aria-pressed={time === s.time}
                          aria-label={s.available ? clockTime(s.time) : `${clockTime(s.time)}, already booked`}
                          onClick={() => setTime(s.time)}
                          className={`flex flex-col items-center rounded-xl border py-2 text-[13px] tabular-nums transition-colors ${
                            !s.available
                              ? "cursor-not-allowed border-dashed border-[var(--color-border)] bg-[var(--color-panel-alt)] text-[var(--color-faint)]"
                              : time === s.time
                                ? "border-[var(--color-accent)] bg-[var(--color-accent)] font-semibold text-white"
                                : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
                          }`}
                        >
                          <span className={s.available ? "" : "line-through"}>{clockTime(s.time)}</span>
                          {!s.available && <span className="text-[10px] font-medium uppercase tracking-wide">Booked</span>}
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {step === 3 && (
        <form id="details" onSubmit={submit} className="space-y-4">
          <div className="rounded-2xl bg-[var(--color-panel-alt)] p-4 text-[13px]">
            <p className="font-semibold">{longDate(date)}, {clockTime(time)}</p>
            {group ? (
              <>
                <p className="text-[var(--color-muted)]">{people.length} people · {duration(length)} · {location?.name}</p>
                <ul className="mt-1.5 space-y-0.5">
                  {people.map((p, i) => (
                    <li key={i}>
                      <b>{who(i)}</b>: {servicesOf(p).map((s) => s.name).join(", ")} <span className="text-[var(--color-muted)]">· {nameOf(p.staffId)}</span>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <p className="text-[var(--color-muted)]">{chosen.map((s) => s.name).join(", ")} · {duration(length)}</p>
                <p className="text-[var(--color-muted)]">{nameOf(people[0].staffId)} · {location?.name}</p>
              </>
            )}
          </div>
          <Field label="Your name" autoComplete="name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
          <Field label="Phone (WhatsApp)" type="tel" autoComplete="tel" placeholder={phoneHint()} value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
          {page.ask_email !== "hidden" && (
            <Field label={page.ask_email === "required" ? "Email (for your confirmation)" : "Email (optional, for your confirmation)"} type="email" autoComplete="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
          )}
          {people.slice(1).map((p, i) => (
            <Field key={i} label={`Person ${i + 2}'s name (optional)`} autoComplete="off" value={p.name} onChange={(v) => setPeople((all) => all.map((x, j) => (j === i + 1 ? { ...x, name: v } : x)))} />
          ))}
          {page.ask_notes && (
          <label className="block">
            <span className="mb-1.5 block text-[12.5px] font-medium">Anything we should know? (optional)</span>
            <textarea rows={2} value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--color-accent)]" />
          </label>
          )}
          {/* Left empty by people; bots fill it in. */}
          <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className="hidden" aria-hidden="true" />
        </form>
      )}

      {problem && <p role="alert" className="mt-4 rounded-xl bg-[var(--color-red)]/10 px-3 py-2 text-[13px] text-[var(--color-red)]">{problem}</p>}

      {/* Summary and next step, always in reach on a phone. */}
      <div className="sticky bottom-0 -mx-4 mt-6 border-t border-[var(--color-border)] bg-[var(--color-card)]/95 px-4 py-3 backdrop-blur">
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1 text-[12.5px]">
            {allChosen.length ? (
              <>
                {page.show_prices && <p className="font-semibold">{money(total)}</p>}
                <p className="truncate text-[var(--color-muted)]">
                  {group ? `${people.length} people · ` : ""}
                  {allChosen.length} service{allChosen.length > 1 ? "s" : ""} · {duration(length)}
                  {time ? ` · ${clockTime(time)}` : ""}
                </p>
              </>
            ) : (
              <p className="text-[var(--color-muted)]">{info.locations.length > 1 && !locationId ? "Choose a branch and services" : "Choose one or more services"}</p>
            )}
          </div>
          {step < 3 ? (
            <button type="button" disabled={!canNext} onClick={() => setStep(next(step))} className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-[14px] font-semibold text-white disabled:opacity-40">
              Continue
            </button>
          ) : (
            <button type="submit" form="details" disabled={sending} className="rounded-full bg-[var(--color-accent)] px-6 py-3 text-[14px] font-semibold text-white disabled:opacity-60">
              {sending ? "Booking…" : info.booking.auto_confirm ? "Book now" : "Request booking"}
            </button>
          )}
        </div>
      </div>
      </>
      )}
    </Shell>
  );
}

/** "You · Person 2 · Person 3": whose services or staff are being chosen. */
function PeopleTabs({ people, active, onChange, label, ready, detail }) {
  return (
    <div role="tablist" aria-label="People" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 scrollbar-none">
      {people.map((p, i) => (
        <button
          key={i}
          type="button"
          role="tab"
          aria-selected={active === i}
          onClick={() => onChange(i)}
          className={`flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-left transition-colors ${
            active === i ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-white" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
          }`}
        >
          <span className={`flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ${active === i ? "bg-white/20" : "bg-[var(--color-accent-soft)] text-[var(--color-accent)]"}`}>
            {ready(p) ? <Check size={12} /> : i + 1}
          </span>
          <span>
            <span className="block text-[13px] font-semibold leading-tight">{label(i)}</span>
            <span className={`block text-[11px] leading-tight ${active === i ? "text-white/80" : "text-[var(--color-muted)]"}`}>{detail(p)}</span>
          </span>
        </button>
      ))}
    </div>
  );
}

function Field({ label, onChange, ...props }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[12.5px] font-medium">{label}</span>
      <input {...props} onChange={(e) => onChange(e.target.value)} className="w-full rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5 text-[14px] outline-none focus:border-[var(--color-accent)]" />
    </label>
  );
}

/** The business's banner, headline and welcome text (Settings → Online booking → Booking page). */
function Hero({ page }) {
  if (!page.banner_url && !page.headline && !page.intro) return null;
  const text = (page.headline || page.intro) && (
    <>
      {page.headline && <h1 className="font-display text-[24px] font-medium leading-tight">{page.headline}</h1>}
      {page.intro && <p className="mt-1.5 whitespace-pre-line text-[13.5px] leading-relaxed opacity-90">{page.intro}</p>}
    </>
  );
  if (!page.banner_url) return <div className="card-in mb-6">{text}</div>;
  return (
    <div className="card-in relative -mx-4 -mt-6 mb-6 overflow-hidden sm:mx-0 sm:mt-0 sm:rounded-3xl">
      <img src={`${constanst.API_URL}${page.banner_url}`} alt="" className="h-48 w-full object-cover sm:h-56" />
      {text && <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent px-5 pb-4 pt-14 text-white">{text}</div>}
    </div>
  );
}

/** "Book a visit · Packages · Memberships", when the page offers more than one. */
function OfferTabs({ tabs, value, onChange }) {
  if (tabs.length < 2) return null;
  return (
    <div role="tablist" aria-label="What would you like?" className="mb-5 flex gap-1 rounded-full bg-[var(--color-panel-alt)] p-1">
      {tabs.map(([key, label]) => (
        <button
          key={key}
          type="button"
          role="tab"
          aria-selected={value === key}
          onClick={() => onChange(key)}
          className={`flex-1 rounded-full px-3 py-2 text-[13px] font-semibold transition-colors ${value === key ? "bg-[var(--color-accent)] text-white shadow-sm" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"}`}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

/**
 * Packages or memberships on the public page. There's no online payment, so choosing one sends
 * a request; the business gets in touch and the client pays at the salon.
 */
function Offers({ kind, items, page, money, slug }) {
  const [chosen, setChosen] = useState(null);
  const [form, setForm] = useState({ name: "", phone: "", email: "", note: "", website: "" });
  const [problem, setProblem] = useState(null);
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(null);
  const word = kind === "package" ? "package" : "membership";

  const send = async (e) => {
    e.preventDefault();
    setProblem(null);
    if (!form.name.trim() || !form.phone.trim()) return setProblem("Please enter your name and phone number.");
    if (page.ask_email === "required" && !form.email.trim()) return setProblem("Please enter your email address.");
    setSending(true);
    try {
      const { data } = await api(`${slug}/request`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind, item_id: chosen.id, name: form.name, phone: form.phone, email: form.email || undefined, note: form.note || undefined, website: form.website }),
      });
      setDone(data);
    } catch (err) {
      setProblem(err.message);
    } finally {
      setSending(false);
    }
  };

  if (done) {
    return (
      <div className="pop-in py-8 text-center">
        <span className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--color-green)]/15 text-[var(--color-green)]">
          <Check size={28} />
        </span>
        <h2 className="mt-4 font-display text-[22px] font-medium">Request sent</h2>
        <p className="mt-1 text-[14px] text-[var(--color-muted)]">
          Thanks, {done.client_name.split(" ")[0]}! We'll be in touch to set up your {word} “{done.name}”. You pay at the salon.
        </p>
      </div>
    );
  }
  if (!items.length) return <p className="py-8 text-center text-[13px] text-[var(--color-muted)]">Nothing here yet.</p>;
  return (
    <div className="space-y-3">
      {items.map((x) => {
        const on = chosen?.id === x.id;
        return (
          <div key={x.id} className={`card-in rounded-2xl border p-4 transition-colors ${on ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)]"}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[15px] font-semibold">{x.name}</p>
                {x.description && <p className="text-[12.5px] text-[var(--color-muted)]">{x.description}</p>}
              </div>
              {x.price !== null && (
                <p className="shrink-0 text-right">
                  <span className="block text-[16px] font-semibold tabular-nums">{money(x.price)}</span>
                  {kind === "membership" && <span className="block text-[11.5px] text-[var(--color-muted)]">a {x.billing_period}</span>}
                </p>
              )}
            </div>
            <ul className="mt-2 space-y-1 text-[13px]">
              {kind === "membership" && x.discount_percent > 0 && <li className="flex gap-2"><Check size={14} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />{x.discount_percent}% off every service</li>}
              {x.items.map((i, n) => (
                <li key={n} className="flex gap-2">
                  <Check size={14} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
                  {i.quantity}× {i.service_name}
                  {kind === "membership" ? ` each ${x.billing_period}` : ""}
                </li>
              ))}
            </ul>
            {kind === "package" && x.saving > 0 && <p className="mt-2 text-[12.5px] font-medium text-[var(--color-green)]">You save {money(x.saving)}</p>}
            {kind === "package" && x.valid_days && <p className="mt-1 text-[11.5px] text-[var(--color-faint)]">Use within {x.valid_days} days</p>}
            {!on ? (
              <button type="button" onClick={() => setChosen(x)} className="mt-3 rounded-full bg-[var(--color-accent)] px-5 py-2 text-[13px] font-semibold text-white">
                I'd like this
              </button>
            ) : (
              <form onSubmit={send} className="pop-in mt-4 space-y-3 border-t border-[var(--color-border)] pt-4">
                <p className="text-[12.5px] text-[var(--color-muted)]">Leave your details and we'll get in touch to set it up. You pay at the salon.</p>
                <Field label="Your name" autoComplete="name" value={form.name} onChange={(v) => setForm((f) => ({ ...f, name: v }))} />
                <Field label="Phone (WhatsApp)" type="tel" autoComplete="tel" placeholder={phoneHint()} value={form.phone} onChange={(v) => setForm((f) => ({ ...f, phone: v }))} />
                {page.ask_email !== "hidden" && (
                  <Field label={page.ask_email === "required" ? "Email" : "Email (optional)"} type="email" autoComplete="email" value={form.email} onChange={(v) => setForm((f) => ({ ...f, email: v }))} />
                )}
                {page.ask_notes && <Field label="Anything we should know? (optional)" value={form.note} onChange={(v) => setForm((f) => ({ ...f, note: v }))} />}
                <input type="text" name="website" tabIndex={-1} autoComplete="off" value={form.website} onChange={(e) => setForm((f) => ({ ...f, website: e.target.value }))} className="hidden" aria-hidden="true" />
                {problem && <p role="alert" className="rounded-xl bg-[var(--color-red)]/10 px-3 py-2 text-[13px] text-[var(--color-red)]">{problem}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={sending} className="rounded-full bg-[var(--color-accent)] px-5 py-2.5 text-[13px] font-semibold text-white disabled:opacity-60">
                    {sending ? "Sending…" : "Send request"}
                  </button>
                  <button type="button" onClick={() => setChosen(null)} className="rounded-full border border-[var(--color-border)] px-4 py-2.5 text-[13px] font-medium">
                    Cancel
                  </button>
                </div>
              </form>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function Shell({ business, page, children }) {
  return (
    <div className="min-h-screen bg-[var(--color-bg)]" style={accentStyle(page?.accent_color)}>
      <header className="bg-[var(--color-navy)] text-[var(--color-navy-ink)]" style={headerStyle(page?.header_color)}>
        <div className="mx-auto flex max-w-xl items-center justify-between gap-3 px-4 py-4">
          <div className="min-w-0">
            <p className="truncate font-display text-[18px] font-medium">{page?.display_name || business?.name || " "}</p>
            {business?.address && <p className="truncate text-[12px] text-[var(--color-navy-ink-2)]">{business.address}</p>}
          </div>
          {business?.phone && (
            <a href={`tel:${business.phone}`} className="flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--header-line,rgba(255,255,255,0.2))] px-3 py-1.5 text-[12.5px]">
              <Phone size={13} /> Call
            </a>
          )}
        </div>
      </header>
      <main className="mx-auto max-w-xl px-4 pt-6">{children}</main>
      <footer className="flex items-center justify-center gap-1.5 py-6 text-[11px] text-[var(--color-faint)]">
        <Mark size={12} /> Online booking by Salonifix
      </footer>
    </div>
  );
}
