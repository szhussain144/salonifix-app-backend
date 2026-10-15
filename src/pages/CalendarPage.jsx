import { useRef, useState, useCallback, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronLeft, ChevronRight, Clock, Plus, User } from 'lucide-react'
import { Card, Button } from "../components/ui";
import FullCalendar from '@fullcalendar/react'
import dayGridPlugin from '@fullcalendar/daygrid'
import timeGridPlugin from '@fullcalendar/timegrid'
import interactionPlugin from '@fullcalendar/interaction';
import { useApi } from '../context/ApiContext';
import constanst from '../config/constants';
import { buildServiceColors, serviceColor, splitServices, tint } from '../components/serviceColors';
import { initialsOf } from '../components/format';
import { useOpenDetail } from "../components/DetailLink";
import { dateLocale } from "../components/format";

const VIEWS = [
  { label: 'Month', view: 'dayGridMonth' },
  { label: 'Week', view: 'timeGridWeek' },
  { label: 'Day', view: 'timeGridDay' },
]

const PX_PER_MIN = 1.1
const HOUR_H = 60 * PX_PER_MIN

/* Local YYYY-MM-DD (toISOString would give the UTC date, a day early before 5am in PKT). */
const localISO = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

const hhmm = (t) => String(t || '').slice(0, 5)
// A guest in a group booking shows as "Sara (with Hina)".
const whoFor = (b) => (b.guest_name ? `${b.guest_name} (with ${b.client_name})` : b.client_name)

const formatDayTitle = (date) =>
  date.toLocaleDateString(dateLocale(), { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })

/* Event chip: service-tinted fill, solid service-colour edge, ink text. Extra
   services on the same booking show as coloured dots. */
function EventChip({ ev, colors, compact }) {
  const services = ev.services
  const main = serviceColor(services[0], colors)
  const cancelled = String(ev.status).toLowerCase() === 'cancelled'
  return (
    <div
      className={`h-full w-full overflow-hidden rounded-lg px-2 py-1 text-left leading-tight ${cancelled ? 'opacity-55' : ''}`}
      style={{ background: tint(main), borderLeft: `3px solid ${main}` }}
      title={`${ev.client} · ${services.join(', ')}${ev.staff ? ` · ${ev.staff}` : ''}${ev.status ? ` · ${ev.status}` : ''}`}
    >
      <div className="flex items-center gap-1.5 text-[11.5px] font-semibold text-[var(--color-ink)]">
        {ev.time && <span className="shrink-0 tabular-nums text-[var(--color-ink-2)]">{ev.time}</span>}
        <span className={`truncate ${cancelled ? 'line-through' : ''}`}>
          {ev.client}
          {compact && <span className="font-normal text-[var(--color-ink-2)]"> · {services.join(', ')}</span>}
        </span>
      </div>
      {!compact && (
        <div className="mt-0.5 flex items-center gap-1 text-[11px] text-[var(--color-ink-2)]">
          {services.slice(1).map((s) => (
            <span key={s} className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ background: serviceColor(s, colors) }} aria-hidden="true" />
          ))}
          <span className="truncate">{services.join(', ')}</span>
        </div>
      )}
    </div>
  )
}

export default function CalendarPage() {
  const navigate = useNavigate()
  const openDetail = useOpenDetail();
  const calendarRef = useRef(null)
  const dayScrollRef = useRef(null)
  const [viewTitle, setViewTitle] = useState('')
  const [dayViewTitle, setDayViewTitle] = useState('')
  const [currentView, setCurrentView] = useState('dayGridMonth')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [events, setEvents] = useState([]);
  const [staff, setStaff] = useState([]);
  const [services, setServices] = useState([]);
  const [dayViewEvents, setDayViewEvents] = useState([]);
  const [focus, setFocus] = useState(null);
  const { fetchWithLoading } = useApi();

  const colors = useMemo(() => buildServiceColors(services), [services])

  const fetchEvents = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/bookings`);
      const data = await response.json();
      setEvents(
        data.data.map((element) => {
          // default duration 60 minutes when there is no end time
          const startDate = new Date(element.booking_date + 'T' + element.start_time)
          const endDate = element.end_time
            ? new Date(element.booking_date + 'T' + element.end_time)
            : new Date(startDate.getTime() + 60 * 60000)
          return {
            id: String(element.id),
            title: `${whoFor(element)} · ${element.service_names}`,
            start: startDate.toISOString(),
            end: endDate.toISOString(),
            extendedProps: {
              client: whoFor(element),
              services: splitServices(element.service_names),
              staff: element.staff_name,
              status: element.status,
              time: hhmm(element.start_time),
            },
          }
        })
      )
    } catch (error) {
      console.log(error)
    }
  }, [fetchWithLoading])

  const fetchStaff = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/staff`);
      const data = await response.json();
      setStaff(data.data);
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  }, [fetchWithLoading]);

  const fetchServices = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/services?search=&page=1&limit=200`);
      const data = await response.json();
      setServices(data.data || []);
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  }, [fetchWithLoading]);

  const fetchDayEvents = useCallback(async (date) => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/bookings/by-date?date=${date}`);
      const data = await response.json();
      setDayViewEvents(data.data || []);
    } catch (error) {
      console.error("Error fetching day bookings:", error);
    }
  }, [fetchWithLoading]);

  useEffect(() => {
    fetchEvents();
    fetchStaff();
    fetchServices();
  }, [fetchEvents, fetchStaff, fetchServices]);

  useEffect(() => {
    if (currentView === 'timeGridDay') {
      fetchDayEvents(localISO(currentDate));
    }
  }, [currentDate, currentView, fetchDayEvents]);

  // Open the day view scrolled to the start of the working day.
  useEffect(() => {
    if (currentView === 'timeGridDay' && dayScrollRef.current) {
      dayScrollRef.current.scrollTop = 8 * HOUR_H - 16
    }
  }, [currentView]);

  const openDay = useCallback((date) => {
    const selectedDate = new Date(date)
    setCurrentDate(selectedDate)
    setDayViewTitle(formatDayTitle(selectedDate))
    setCurrentView('timeGridDay')
  }, [])

  const handleDateSelect = useCallback((selectInfo) => {
    selectInfo.view.calendar.gotoDate(selectInfo.start)
    openDay(selectInfo.start)
  }, [openDay])

  const handleEventClick = useCallback((clickInfo) => {
    clickInfo.view.calendar.gotoDate(clickInfo.event.start)
    openDay(clickInfo.event.start)
  }, [openDay])

  const handleMoreLinkClick = useCallback((arg) => {
    arg.jsEvent.preventDefault()
    openDay(arg.date)
  }, [openDay])

  const shiftDay = (delta) => {
    setCurrentDate((prev) => {
      const next = new Date(prev)
      next.setDate(next.getDate() + delta)
      setDayViewTitle(formatDayTitle(next))
      return next
    })
  }

  const goToday = () => {
    if (currentView === 'timeGridDay') {
      const today = new Date()
      setCurrentDate(today)
      setDayViewTitle(formatDayTitle(today))
      return
    }
    calendarRef.current?.getApi().today()
  }

  const goPrev = () => (currentView === 'timeGridDay' ? shiftDay(-1) : calendarRef.current?.getApi().prev())
  const goNext = () => (currentView === 'timeGridDay' ? shiftDay(1) : calendarRef.current?.getApi().next())

  const changeView = (view) => {
    const api = calendarRef.current?.getApi()
    if (view === 'timeGridDay') {
      openDay(api ? api.getDate() : currentDate)
      return
    }
    // From the custom day view the calendar is unmounted; it remounts on this view and date.
    api?.changeView(view)
    setCurrentView(view)
  }

  // Services present in the loaded bookings, in palette (id) order, for the legend.
  const legend = useMemo(() => {
    const seen = new Set()
    events.forEach((e) => e.extendedProps.services.forEach((s) => seen.add(s)))
    dayViewEvents.forEach((e) => splitServices(e.service_names).forEach((s) => seen.add(s)))
    const byId = [...services].sort((a, b) => Number(a.id) - Number(b.id)).map((s) => s.name)
    const known = byId.filter((n) => [...seen].some((s) => s.toLowerCase() === n.toLowerCase()))
    const unknown = [...seen].filter((s) => !byId.some((n) => n.toLowerCase() === s.toLowerCase()))
    // Two services can share a name; list each name once.
    const unique = new Map()
    for (const n of [...known, ...unknown]) {
      if (!unique.has(n.toLowerCase())) unique.set(n.toLowerCase(), n)
    }
    return [...unique.values()]
  }, [events, dayViewEvents, services])

  const isDimmed = useCallback(
    (names) => focus && !names.some((n) => n.toLowerCase() === focus.toLowerCase()),
    [focus]
  )

  const renderEvent = useCallback(
    (arg) => <EventChip ev={arg.event.extendedProps} colors={colors} compact={arg.view.type === 'dayGridMonth'} />,
    [colors]
  )

  const isToday = localISO(currentDate) === localISO(new Date())
  const now = new Date()
  const nowTop = (now.getHours() * 60 + now.getMinutes()) * PX_PER_MIN

  return (
    <Card className='p-5'>
      <div className='space-y-5'>
        <div className='flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between'>
          <div className='flex flex-wrap items-center gap-3'>
            <Button variant='ghost' onClick={goToday}>Today</Button>
            <div className='flex items-center gap-1'>
              <button type='button' onClick={goPrev} aria-label='Previous' className='flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-2)] hover:bg-[var(--color-panel-alt)]'>
                <ChevronLeft size={18} />
              </button>
              <button type='button' onClick={goNext} aria-label='Next' className='flex h-9 w-9 items-center justify-center rounded-full text-[var(--color-ink-2)] hover:bg-[var(--color-panel-alt)]'>
                <ChevronRight size={18} />
              </button>
            </div>
            <h2 className='font-display text-[22px] font-medium tracking-tight text-[var(--color-ink)]'>
              {currentView === 'timeGridDay' ? dayViewTitle : viewTitle}
            </h2>
          </div>

          <div className='flex flex-wrap items-center gap-2'>
            <div className='inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-panel-alt)] p-1' role='tablist'>
              {VIEWS.map(({ label, view }) => (
                <button
                  key={view}
                  type='button'
                  role='tab'
                  aria-selected={currentView === view}
                  onClick={() => changeView(view)}
                  className={`rounded-full px-4 py-1.5 text-[13px] font-medium transition-colors ${
                    currentView === view
                      ? 'bg-[var(--color-panel)] text-[var(--color-ink)] shadow-[0_1px_2px_rgba(32,34,53,0.12)]'
                      : 'text-[var(--color-muted)] hover:text-[var(--color-ink)]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            <Button onClick={() => navigate('/new-booking')}>
              <Plus size={14} /> New booking
            </Button>
          </div>
        </div>

        {legend.length > 0 && (
          <div className='flex flex-wrap items-center gap-1.5' aria-label='Services'>
            <span className='mr-1 text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]'>Services</span>
            {legend.map((name) => {
              const c = serviceColor(name, colors)
              const active = focus && focus.toLowerCase() === name.toLowerCase()
              return (
                <button
                  key={name}
                  type='button'
                  aria-pressed={!!active}
                  onClick={() => setFocus(active ? null : name)}
                  className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[12px] font-medium transition-all ${
                    active
                      ? 'border-transparent text-[var(--color-ink)] shadow-[0_1px_2px_rgba(32,34,53,0.12)]'
                      : 'border-[var(--color-border)] bg-[var(--color-panel)] text-[var(--color-ink-2)] hover:border-[var(--color-faint)]'
                  } ${focus && !active ? 'opacity-50' : ''}`}
                  style={active ? { background: tint(c, 0.2), borderColor: c } : undefined}
                >
                  <span className='h-2.5 w-2.5 rounded-full' style={{ background: c }} aria-hidden='true' />
                  {name}
                </button>
              )
            })}
            {focus && (
              <button type='button' onClick={() => setFocus(null)} className='ml-1 text-[12px] font-medium text-[var(--color-accent)] hover:underline'>
                Show all
              </button>
            )}
          </div>
        )}

        <div className='overflow-hidden rounded-[var(--radius-card)] border border-[var(--color-border)] bg-[var(--color-panel)]'>
          {currentView === 'timeGridDay' ? (
            // Custom staff-oriented day view
            <div className='overflow-x-auto'>
              <div style={{ minWidth: 72 + staff.length * 170 }}>
                <div className='grid border-b border-[var(--color-border)] bg-[var(--color-panel-alt)]/60' style={{ gridTemplateColumns: `72px repeat(${staff.length}, minmax(170px, 1fr))` }}>
                  <div />
                  {staff.map((s) => {
                    const count = dayViewEvents.filter((ev) => ev.staff_name === s.name).length
                    return (
                      <div key={s.id} className='flex items-center gap-2.5 border-l border-[var(--color-border-soft)] px-3 py-2.5'>
                        <span className='flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--color-accent-soft)] text-[10px] font-semibold text-[var(--color-accent)]'>
                          {initialsOf(s.name)}
                        </span>
                        <div className='min-w-0'>
                          <p className='truncate text-[13px] font-semibold text-[var(--color-ink)]'>{s.name}</p>
                          <p className='text-[11px] text-[var(--color-muted)]'>{count} {count === 1 ? 'booking' : 'bookings'}</p>
                        </div>
                      </div>
                    )
                  })}
                </div>

                <div ref={dayScrollRef} className='max-h-[640px] overflow-y-auto'>
                  <div className='relative grid' style={{ gridTemplateColumns: `72px repeat(${staff.length}, minmax(170px, 1fr))`, height: 24 * HOUR_H }}>
                    {/* Hour rows span every column so their top border is the hour line. */}
                    {Array.from({ length: 24 }, (_, h) => (
                      <div
                        key={h}
                        className='pointer-events-none absolute inset-x-0 border-t border-[var(--color-border-soft)]'
                        style={{ top: h * HOUR_H }}
                      >
                        <span className='absolute left-0 w-[64px] -translate-y-1/2 bg-[var(--color-panel)] pr-2 text-right text-[11px] tabular-nums text-[var(--color-faint)]'>
                          {h === 0 ? '' : `${String(h).padStart(2, '0')}:00`}
                        </span>
                      </div>
                    ))}

                    {isToday && (
                      <div className='pointer-events-none absolute inset-x-0 z-20' style={{ top: nowTop, left: 72 }}>
                        <div className='relative h-[2px] bg-[#C9302F]'>
                          <span className='absolute -left-1 -top-[3px] h-2 w-2 rounded-full bg-[#C9302F]' />
                        </div>
                      </div>
                    )}

                    <div />
                    {staff.map((s) => (
                      <div key={s.id} className='relative border-l border-[var(--color-border-soft)]'>
                        {dayViewEvents
                          .filter((ev) => ev.staff_name === s.name)
                          .map((ev, evIndex) => {
                            const [h = 0, m = 0] = hhmm(ev.start_time).split(':').map(Number)
                            const top = (h * 60 + m) * PX_PER_MIN
                            const height = Math.max(26, (Number(ev.duration_minutes) || 60) * PX_PER_MIN - 2)
                            const names = splitServices(ev.service_names)
                            return (
                              <button
                                key={`${ev.id}-${evIndex}`}
                                type='button'
                                onClick={() => openDetail(`/bookings/${ev.id}`)}
                                className={`absolute left-1.5 right-1.5 z-10 cursor-pointer transition-all hover:z-30 hover:-translate-y-px hover:shadow-[0_8px_20px_-8px_rgba(32,34,53,0.35)] ${
                                  isDimmed(names) ? 'opacity-25' : ''
                                }`}
                                style={{ top: top + 1, height }}
                              >
                                <EventChip
                                  colors={colors}
                                  compact={height < 40}
                                  ev={{ client: whoFor(ev) || 'Walk-in', services: names, status: ev.status, time: hhmm(ev.start_time), staff: ev.staff_name }}
                                />
                              </button>
                            )
                          })}
                      </div>
                    ))}
                  </div>
                </div>

                {staff.length === 0 && (
                  <div className='flex items-center justify-center gap-2 py-16 text-[13px] text-[var(--color-muted)]'>
                    <User size={15} /> Add staff to see their columns here.
                  </div>
                )}
              </div>
            </div>
          ) : (
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView={currentView}
              initialDate={currentDate}
              headerToolbar={false}
              height='auto'
              selectable={true}
              editable={true}
              events={events}
              eventDisplay='block'
              eventContent={renderEvent}
              eventClassNames={(arg) => ['svc-event', ...(isDimmed(arg.event.extendedProps.services) ? ['is-dimmed'] : [])]}
              dayMaxEvents={3}
              moreLinkContent={(arg) => `+${arg.num} more`}
              moreLinkClick={handleMoreLinkClick}
              select={handleDateSelect}
              eventClick={handleEventClick}
              slotMinTime='07:00:00'
              slotMaxTime='23:00:00'
              allDaySlot={false}
              nowIndicator={true}
              datesSet={(arg) => {
                setCurrentView(arg.view.type)
                setViewTitle(arg.view.title)
              }}
            />
          )}
        </div>

        <p className='flex items-center gap-1.5 text-[12px] text-[var(--color-faint)]'>
          <Clock size={13} /> Colours follow the service. Tap a service above to highlight its bookings; cancelled bookings are faded and struck through.
        </p>
      </div>
    </Card>
  );
}
