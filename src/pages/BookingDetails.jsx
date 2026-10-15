import { useState, useEffect, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { Phone, Mail, Calendar, CalendarClock, CalendarX2, Users } from "lucide-react";
import { Card, SectionTitle, Table, Tr, Td, Badge, Button, Avatar } from "../components/ui";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import { formatBookingDate } from "../context/functions";
import { BackLink } from "../components/DetailLink";
import { DiscountLines } from "../components/Loyalty";
import { formatAmount } from "../components/format";
import { clockTime } from "../components/timeSlots";
import ConfirmationEmailStatus from "../components/ConfirmationEmailStatus";
import BookingReminders from "../components/BookingReminders";
import CheckoutDialog from "../components/CheckoutDialog";
import BillCard from "../components/BillCard";
import ClientNotes from "../components/ClientNotes";

export default function BookingDetails() {
  const { id } = useParams();
  const [bookingDetail, setBookingDetail] = useState(null);
  const [servicesList, setServicesList] = useState([]);
  const [staffList, setStaffList] = useState([]);
  const { fetchWithLoading } = useApi();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);
  const [billVersion, setBillVersion] = useState(0);
  const [clientNotes, setClientNotes] = useState(null);

  // Allergies and preferences from the client's profile, so they're seen before the visit.
  useEffect(() => {
    if (!bookingDetail?.client_id) return;
    fetchWithLoading(`${constanst.API_URL}/clients/${bookingDetail.client_id}`, { silent: true }).then(async (res) => {
      if (res.ok) setClientNotes((await res.json()).data?.notes || null);
    });
  }, [bookingDetail?.client_id, fetchWithLoading]);
  const [pendingStatus, setPendingStatus] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editDraft, setEditDraft] = useState(null);
  const [serviceDraft, setServiceDraft] = useState([]);

  const fetchReferenceData = useCallback(async () => {
    try {
      const [servicesRes, staffRes] = await Promise.all([
        fetchWithLoading(`${constanst.API_URL}/services?limit=500`),
        fetchWithLoading(`${constanst.API_URL}/staff`),
      ]);

      const servicesData = await servicesRes.json();
      const staffData = await staffRes.json();
      setServicesList(servicesData?.data || []);
      setStaffList(staffData?.data || []);
    } catch (error) {
      console.error("Error fetching reference data:", error);
    }
  }, [fetchWithLoading]);

  const fetchBookingDetails = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/bookings/${id}`);
      const data = await response.json();
      setBookingDetail(data.data);
    } catch (error) {
      console.error("Error fetching bookings:", error);
    }
  }, [fetchWithLoading, id]);

  useEffect(() => {
    fetchBookingDetails();
    fetchReferenceData();
  }, [fetchBookingDetails, fetchReferenceData]);

  const openEditStudio = () => {
    if (!bookingDetail) return;

    setEditDraft({
      booking_date: bookingDetail.booking_date || "",
      start_time: bookingDetail.start_time || "",
      end_time: bookingDetail.end_time || "",
      status: bookingDetail.status || "Upcoming",
      notes: bookingDetail.notes || "",
      booking_type: bookingDetail.booking_type || "Appointment",
      payment_method: bookingDetail.payment_method || "cash",
    });

    setServiceDraft(
      (bookingDetail.services || []).map((service, index) => ({
        id: service.id || index,
        service_id: service.service_id ?? service.id ?? "",
        staff_id: service.staff_id ?? service.staffId ?? "",
        price: service.price_at_time ?? service.price ?? 0,
      }))
    );

    setIsEditing(true);
  };

  const closeEditStudio = () => {
    setIsEditing(false);
    setEditDraft(null);
    setServiceDraft([]);
  };

  const handleGeneralEditSave = async () => {
    if (!bookingDetail || !editDraft) return;

    if (!bookingDetail || serviceDraft.length === 0) return;

    const services = serviceDraft
      .filter((item) => item.service_id && item.staff_id)
      .map((item) => ({
        service_id: Number(item.service_id),
        staff_id: Number(item.staff_id),
        price: Number(item.price),
      }));

    const totalBookingAmount = serviceDraft.reduce((sum, pair) => sum + (Number(pair.price) || 0), 0);
    const payload = {
      client_id: bookingDetail.client_id,
      booking_date: editDraft.booking_date,
      start_time: editDraft.start_time,
      end_time: editDraft.end_time,
      status: editDraft.status,
      notes: editDraft.notes,
      booking_type: editDraft.booking_type,
      totalAmount: totalBookingAmount,
      payment_method: editDraft.payment_method,
      services: services,
    };

    try {
      await fetchWithLoading(`${constanst.API_URL}/bookings/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      // setBookingDetail((prev) => prev ? { ...prev, ...payload } : prev);
      fetchBookingDetails();
      closeEditStudio();
    } catch (error) {
      console.error("Error updating booking details:", error);
    }
  };


  const handleSaveAll = async () => {
    await handleGeneralEditSave();
    // await handleServiceEditSave();
  };

  const updateBookingStatus = async (newStatus) => {
    setPendingStatus(newStatus);
    setPaymentMethod("");
    setShowConfirmModal(true);
  };

  const handleConfirmUpdate = async () => {
    if (!bookingDetail || !pendingStatus) return;

    if (pendingStatus === "Completed" && !paymentMethod) {
      return;
    }

    setShowConfirmModal(false);

    try {
      const payload = { status: pendingStatus };
      if (pendingStatus === "Completed") {
        payload.payment_method = paymentMethod;
      }

      const response = await fetchWithLoading(`${constanst.API_URL}/bookings/${id}/status`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        console.error("Failed to update booking status");
        return;
      }

      setBookingDetail((prev) => prev ? { ...prev, status: pendingStatus, payment_method: pendingStatus === "Completed" ? paymentMethod : prev.payment_method } : prev);
    } catch (error) {
      console.error("Error updating booking status:", error);
    }

    setPendingStatus(null);
    setPaymentMethod("");
  };

  const handleCancelUpdate = () => {
    setShowConfirmModal(false);
    setPendingStatus(null);
    setPaymentMethod("");
  };

  const normalizedStatus = bookingDetail?.status?.toLowerCase();
  const isUpcoming = normalizedStatus === "upcoming" || normalizedStatus === "upcomming";
  const isConfirmed = normalizedStatus === "confirmed";
  const isCancelled = normalizedStatus === "cancelled";
  const isCompleted = normalizedStatus === "completed";
  const isNoShow = normalizedStatus === "no-show";
  // The start time has passed: the client can be marked as a no-show.
  const hasStarted =
    bookingDetail?.booking_date &&
    new Date(`${String(bookingDetail.booking_date).slice(0, 10)}T${bookingDetail.start_time || "00:00"}`) <= new Date();

  // Amounts are worked out and stored by the server, including any loyalty discount.
  const amounts = {
    subtotal: Number(bookingDetail?.subtotal_amount) || 0,
    discount: Number(bookingDetail?.discount_amount) || 0,
    note: bookingDetail?.discount_note,
    total: Number(bookingDetail?.total_amount) || 0,
    waived: Boolean(Number(bookingDetail?.discount_waived)),
  };
  const isPaid = bookingDetail?.payment_status === "Paid";
  const canChangeDiscount = !isPaid && !isCancelled && (amounts.discount > 0 || amounts.waived);

  const setDiscountApplied = async (apply) => {
    const response = await fetchWithLoading(`${constanst.API_URL}/bookings/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ apply_discount: apply }),
    });
    if (response.ok) fetchBookingDetails();
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <BackLink to="/bookings">Back to Bookings</BackLink>
        <div className="flex items-center gap-2">
          {!isCompleted && <Button type="button" onClick={openEditStudio}>Edit</Button>}
          {(isUpcoming || isConfirmed) && (
            <Button variant="ghost" type="button" onClick={() => updateBookingStatus("Cancelled")}>Cancel Booking</Button>
          )}
          {(isUpcoming || isConfirmed) && hasStarted && (
            <Button variant="ghost" type="button" onClick={() => updateBookingStatus("No-show")}>Didn&apos;t show up</Button>
          )}
          {isUpcoming && (
            <Button type="button" onClick={() => updateBookingStatus("Confirmed")}>Confirm Booking</Button>
          )}
          {(isConfirmed || isUpcoming) && (
            <Button type="button" onClick={() => setCheckingOut(true)}>Checkout</Button>
          )}
          {(isCancelled || isNoShow) && (
            <Button type="button" onClick={() => updateBookingStatus("Confirmed")}>Confirm Booking</Button>
          )}
          {!isUpcoming && !isConfirmed && !isCancelled && !isCompleted && !isNoShow && (
            <Button type="button" onClick={() => updateBookingStatus("Confirmed")}>Confirm Booking</Button>
          )}
        </div>
      </div>

      {bookingDetail && <ConfirmationEmailStatus key={bookingDetail.status} bookingId={id} bookingStatus={bookingDetail.status} />}
      {bookingDetail && <BookingReminders bookingId={id} />}
      {clientNotes && <ClientNotes notes={clientNotes} />}
      {bookingDetail?.client_change && (
        <div className="card-in flex items-start gap-2.5 rounded-2xl border border-[var(--color-orange)]/30 bg-[var(--color-orange)]/10 px-4 py-3 text-[13px]">
          {bookingDetail.client_change === "cancelled" ? <CalendarX2 size={16} className="mt-0.5 shrink-0 text-[var(--color-orange)]" /> : <CalendarClock size={16} className="mt-0.5 shrink-0 text-[var(--color-orange)]" />}
          <p>
            <b>{bookingDetail.client_change === "cancelled" ? "Cancelled by the client" : "Moved by the client"}</b> from their link
            {bookingDetail.client_changed_at ? `, ${formatBookingDate(bookingDetail.client_changed_at)}` : ""}.
            {bookingDetail.client_cancel_reason && <span className="text-[var(--color-muted)]"> Reason: “{bookingDetail.client_cancel_reason}”</span>}
          </p>
        </div>
      )}

      {bookingDetail?.group?.length > 1 && (
        <Card className="p-5">
          <p className="mb-3 flex items-center gap-2 text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">
            <Users size={14} className="text-[var(--color-accent)]" /> Group of {bookingDetail.group.length} · everyone at {clockTime(bookingDetail.start_time)}
          </p>
          <ul className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            {bookingDetail.group.map((p) => {
              const here = Number(p.id) === Number(id);
              return (
                <li key={p.id}>
                  <Link
                    to={`/bookings/${p.id}`}
                    aria-current={here ? "page" : undefined}
                    className={`row-in flex items-start justify-between gap-2 rounded-xl border px-3 py-2.5 text-[13px] transition-colors ${
                      here ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
                    }`}
                  >
                    <span className="min-w-0">
                      <span className="block font-semibold">
                        {p.name}
                        {!Number(p.is_guest) && <span className="ml-1.5 text-[11px] font-normal text-[var(--color-muted)]">booked</span>}
                      </span>
                      <span className="block truncate text-[12px] text-[var(--color-muted)]">
                        {p.services || "No services"}
                        {p.staff ? ` · ${p.staff}` : ""}
                      </span>
                    </span>
                    <Badge>{p.status}</Badge>
                  </Link>
                </li>
              );
            })}
          </ul>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="relative p-5 lg:col-span-1 h-fit">
          <div className="absolute top-4 right-4">
            <Badge>{bookingDetail?.status}</Badge>
          </div>
          <div className="flex flex-col items-center text-center">
            <Avatar initials={(bookingDetail?.guest_name || bookingDetail?.client_name || "").split(" ").map((n) => n[0]).join("").slice(0, 2)} size={64} />
            <p className="text-[16px] font-semibold mt-3">{bookingDetail?.guest_name || bookingDetail?.client_name}</p>
            {bookingDetail?.guest_name && (
              <p className="text-[12.5px] text-[var(--color-muted)]">
                Guest of <b className="font-medium text-[var(--color-ink)]">{bookingDetail.client_name}</b>, who booked and is contacted
              </p>
            )}
          </div>
          <div className="mt-5 space-y-2.5 text-[13px]">
            <div className="flex items-center gap-2.5 text-[var(--color-muted)]">
              <Phone size={14} /> {bookingDetail?.client_phone}
            </div>
            <div className="flex items-center gap-2.5 text-[var(--color-muted)]">
              <Mail size={14} /> {bookingDetail?.client_email}
            </div>
            <div className="flex items-center gap-2.5 text-[var(--color-muted)]">
              <Calendar size={14} /> Visit Date {formatBookingDate(bookingDetail?.booking_date, bookingDetail?.start_time)}
            </div>
          </div>
          <div className="grid gap-3 mt-5">
            {/* <div className="bg-[var(--color-panel-alt)] rounded-lg p-3 text-center">
              <p className="text-[18px] font-bold">{base.visits}</p>
              <p className="text-[11px] text-[var(--color-faint)]">Visits</p>
            </div> */}
            <div className="bg-[var(--color-panel-alt)] rounded-lg p-3 text-center">
              <p className="text-[18px] font-bold">{formatAmount(amounts.total)}</p>
              <p className="text-[11px] text-[var(--color-faint)]">Booking Amount</p>
              {amounts.discount > 0 && (
                <p className="mt-1 text-[11.5px] text-[var(--color-green)]">
                  Includes {formatAmount(amounts.discount)} off · {amounts.note}
                </p>
              )}
            </div>
            {canChangeDiscount && (
              <Button variant="ghost" type="button" onClick={() => setDiscountApplied(amounts.waived)}>
                {amounts.waived ? "Apply loyalty discount" : "Remove discount"}
              </Button>
            )}
          </div>
          {/* <Link to="/new-booking">
            <Button className="w-full justify-center mt-5">Book Appointment</Button>
          </Link> */}
        </Card>

        <Card className="p-5 lg:col-span-2">
          <SectionTitle title="Booking Details" />
          <Table columns={["Date", "Service", "Staff", "Amount"]}>
            {(bookingDetail?.services || []).map((h, i) => (
              <Tr key={i}>
                <Td className="text-[var(--color-muted)]">{formatBookingDate(bookingDetail?.booking_date, bookingDetail?.start_time)}</Td>
                <Td>{h.name}</Td>
                <Td className="text-[var(--color-muted)]">{h?.staff_name}</Td>
                <Td className="font-medium">{formatAmount(h.price_at_time)}</Td>
              </Tr>
            ))}
          </Table>
          <div className="mt-4 ml-auto max-w-sm">
            <DiscountLines {...amounts} />
          </div>
        </Card>
      </div>

      {isCompleted && bookingDetail && <BillCard booking={{ ...bookingDetail, id: Number(id) }} refreshKey={billVersion} onChanged={fetchBookingDetails} />}

      {checkingOut && bookingDetail && (
        <CheckoutDialog
          booking={{ ...bookingDetail, id: Number(id) }}
          onClose={() => setCheckingOut(false)}
          onDone={() => {
            setCheckingOut(false);
            setBillVersion((v) => v + 1);
            fetchBookingDetails();
          }}
        />
      )}

      {isEditing && editDraft && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={closeEditStudio}>
          <div className="w-full max-w-4xl rounded-[28px] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-3 mb-5">
              <div>
                <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-faint)]">Edit</p>
                <h3 className="text-[20px] font-semibold text-[var(--color-ink)]">Refine this booking</h3>
              </div>
              <Button variant="ghost" type="button" onClick={closeEditStudio}>Close</Button>
            </div>

            <div className="grid gap-5 lg:grid-cols-[1.1fr_1.2fr]">
              <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-alt)] p-4">
                <p className="text-[12px] uppercase tracking-[0.15em] text-[var(--color-faint)]">General Info</p>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[12px] text-[var(--color-muted)]">
                    Booking Date
                    <input
                      type="date"
                      value={editDraft.booking_date || ""}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, booking_date: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]/60"
                    />
                  </label>

                  <label className="block text-[12px] text-[var(--color-muted)]">
                    Booking Type
                    <select
                      value={editDraft.booking_type}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, booking_type: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]/60"
                    >
                      <option value="Appointment">Appointment</option>
                      <option value="Walk-in">Walk-in</option>
                    </select>
                  </label>

                  <label className="block text-[12px] text-[var(--color-muted)]">
                    Start Time
                    <input
                      type="time"
                      value={editDraft.start_time || ""}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, start_time: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]/60"
                    />
                  </label>

                  <label className="block text-[12px] text-[var(--color-muted)]">
                    End Time
                    <input
                      type="time"
                      value={editDraft.end_time || ""}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, end_time: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]/60"
                    />
                  </label>

                  <label className="block text-[12px] text-[var(--color-muted)]">
                    Status
                    <select
                      value={editDraft.status}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, status: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]/60"
                    >
                      <option value="Upcoming">Upcoming</option>
                      <option value="Confirmed">Confirmed</option>
                      <option value="Completed">Completed</option>
                      <option value="Cancelled">Cancelled</option>
                    </select>
                  </label>

                  <label className="block text-[12px] text-[var(--color-muted)]">
                    Payment Method
                    <select
                      value={editDraft.payment_method}
                      onChange={(e) => setEditDraft((prev) => ({ ...prev, payment_method: e.target.value }))}
                      className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]/60"
                    >
                      <option value="cash">Cash</option>
                      <option value="pos">POS</option>
                      <option value="pay later">Pay Later</option>
                    </select>
                  </label>
                </div>

                <label className="block text-[12px] text-[var(--color-muted)]">
                  Notes
                  <textarea
                    rows={4}
                    value={editDraft.notes || ""}
                    onChange={(e) => setEditDraft((prev) => ({ ...prev, notes: e.target.value }))}
                    placeholder="Add special notes or reminders"
                    className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-card)] px-3 py-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]/60"
                  />
                </label>
              </div>

              <div className="space-y-4 rounded-2xl border border-[var(--color-border)] bg-[var(--color-panel-alt)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-[12px] uppercase tracking-[0.15em] text-[var(--color-faint)]">Service Mix</p>
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setServiceDraft((prev) => [...prev, { id: Date.now(), service_id: "", staff_id: "", price: 0 }])}
                  >
                    Add Service
                  </Button>
                </div>

                <div className="space-y-3">
                  {serviceDraft.length === 0 ? (
                    <div className="rounded-xl border border-dashed border-[var(--color-border)] p-4 text-[12px] text-[var(--color-muted)]">
                      No services attached yet.
                    </div>
                  ) : (
                    serviceDraft.map((item, index) => (
                      <div key={item.id || index} className="grid gap-3 rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] p-3 sm:grid-cols-2">
                        <label className="block text-[12px] text-[var(--color-muted)]">
                          Service
                          <select
                            value={item.service_id || ""}
                            onChange={(e) => {
                              const serviceId = e.target.value;
                              const service = servicesList.find((s) => String(s.id) === serviceId);
                              setServiceDraft((prev) => prev.map((entry, idx) => idx === index ? { ...entry, service_id: e.target.value, price: service ? +service.price : 0 } : entry));
                              // if (errors.services) {
                              //   setErrors((prev) => ({ ...prev, services: undefined }));
                              // }
                            }}
                            className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-alt)] px-3 py-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]/60"
                          >
                            <option value="">Select service</option>
                            {servicesList.map((service) => (
                              <option key={service.id} value={service.id}>{service.name}</option>
                            ))}
                          </select>
                        </label>

                        <label className="block text-[12px] text-[var(--color-muted)]">
                          Staff
                          <select
                            value={item.staff_id || ""}
                            onChange={(e) => setServiceDraft((prev) => prev.map((entry, idx) => idx === index ? { ...entry, staff_id: e.target.value } : entry))}
                            className="mt-1.5 w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel-alt)] px-3 py-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]/60"
                          >
                            <option value="">Select staff</option>
                            {staffList.map((member) => (
                              <option key={member.id} value={member.id}>{member.name}</option>
                            ))}
                          </select>
                        </label>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={closeEditStudio}>Cancel</Button>
              <Button type="button" onClick={handleSaveAll}>Save Changes</Button>
            </div>
          </div>
        </div>
      )}

      {showConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={handleCancelUpdate}>
          <div className="w-full max-w-md rounded-3xl bg-[var(--color-card)] border border-[var(--color-border)] p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <p className="text-[16px] font-semibold mb-4">Confirm Action</p>
            <p className="text-[13px] text-[var(--color-muted)] mb-4">
              Are you sure you want to
              {pendingStatus === "Confirmed"
                ? " confirm this booking?"
                : pendingStatus === "Completed"
                  ? " mark this booking as completed?"
                  : pendingStatus === "No-show"
                    ? " mark that the client didn't show up? It's counted on their profile."
                    : " cancel this booking?"}
            </p>
            {pendingStatus === "Completed" && (
              <div className="mb-6">
                <label className="block text-[12px] text-[var(--color-muted)] mb-1.5">Payment Method</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-[var(--color-panel-alt)] border border-[var(--color-border)] rounded-lg px-3 py-2.5 text-[13px] text-[var(--color-ink)] outline-none focus:border-[var(--color-accent)]/60"
                >
                  <option value="">Select payment method</option>
                  <option value="POS">POS</option>
                  <option value="Cash">Cash</option>
                  <option value="Pay Later">Pay Later</option>
                </select>
                <div className="mt-3 rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-panel-alt)] p-3">
                  <DiscountLines {...amounts} />
                </div>
              </div>
            )}
            <div className="flex justify-end gap-2">
              <Button variant="ghost" type="button" onClick={handleCancelUpdate}>
                Close
              </Button>
              <Button type="button" onClick={handleConfirmUpdate} disabled={pendingStatus === "Completed" && !paymentMethod}>
                Confirm
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
