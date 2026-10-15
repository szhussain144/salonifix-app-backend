import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Phone, Mail, Cake } from "lucide-react";
import { Card, SectionTitle, Table, Tr, Td, Badge, Button, Avatar } from "../components/ui";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import { formatBookingDate } from "../context/functions";
import ClientNotes from "../components/ClientNotes";
import ClientMembership from "../components/ClientMembership";
import ClientPackages from "../components/ClientPackages";
import { BackLink } from "../components/DetailLink";
import { ClientLoyaltyCard, StarBadge, useClientLoyalty } from "../components/Loyalty";
import { dateLocale, formatAmount } from "../components/format";

const OPT_OUTS = [
  ["sms_opt_out", "SMS"],
  ["whatsapp_opt_out", "WhatsApp"],
  ["email_opt_out", "Email"],
  ["call_opt_out", "Calls"],
];

export default function ClientDetails() {
  const { id } = useParams();

  const [clientDetail, setClientDetail] = useState(null);
  const [clientBookingDetail, setClientBookingDetail] = useState(null);
  const { fetchWithLoading } = useApi();
  const loyalty = useClientLoyalty(Number(id));

  const fetchClientDetails = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/clients/${id}`);
      const data = await response.json();
      console.log('Fetched Client Details:', data.data);
      setClientDetail(data.data);
    } catch (error) {
      console.error("Error fetching client details:", error);
    }
  }, [fetchWithLoading, id]);

  const fetchClientHistory = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/bookings/client/${id}`);
      const data = await response.json();
      console.log('Fetched Client History:', data.data);
      setClientBookingDetail(data.data);
    } catch (error) {
      console.error("Error fetching client history:", error);
    }
  }, [fetchWithLoading, id]);

  useEffect(() => {
    fetchClientDetails();
    fetchClientHistory();
  }, [fetchClientDetails, fetchClientHistory]);

  /** Flips a per-channel marketing opt-out and saves it. */
  const toggleOptOut = async (field) => {
    const value = Number(clientDetail[field]) ? 0 : 1;
    const response = await fetchWithLoading(`${constanst.API_URL}/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [field]: value }),
    });
    if (response.ok) setClientDetail((c) => ({ ...c, [field]: value }));
  };

  return (
    <div className="space-y-5">
      <BackLink to="/clients">Back to Clients</BackLink>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card className="p-5 lg:col-span-1 h-fit">
          <div className="flex flex-col items-center text-center">
            <Avatar initials={clientDetail?.name.split(" ").map((n) => n[0]).join("").slice(0, 2)} size={64} />
            <p className="text-[16px] font-semibold mt-3">{clientDetail?.name}</p>
            {loyalty?.is_star && (
              <div className="mt-1.5">
                <StarBadge reasons={loyalty.reasons} />
              </div>
            )}
          </div>
          <div className="mt-5 space-y-2.5 text-[13px]">
            <div className="flex items-center gap-2.5 text-[var(--color-muted)]">
              <Phone size={14} /> {clientDetail?.phone ?? '-'}
            </div>
            <div className="flex items-center gap-2.5 text-[var(--color-muted)]">
              <Mail size={14} /> {clientDetail?.email ?? '-'}
            </div>
            {clientDetail?.birthday && (
              <div className="flex items-center gap-2.5 text-[var(--color-muted)]">
                <Cake size={14} /> {new Date(`${clientDetail.birthday}T00:00:00`).toLocaleDateString(dateLocale(), { day: "numeric", month: "long" })}
              </div>
            )}
          </div>
          {clientDetail?.notes && <div className="mt-4"><ClientNotes notes={clientDetail.notes} /></div>}
          <dl className="mt-4 grid grid-cols-2 gap-x-3 gap-y-1.5 text-[12.5px]">
            <dt className="text-[var(--color-faint)]">Last visit</dt>
            <dd className="text-right">{clientDetail?.last_visit ? formatBookingDate(clientDetail.last_visit) : "—"}</dd>
            <dt className="text-[var(--color-faint)]">Next visit</dt>
            <dd className="text-right">{clientDetail?.next_visit ? formatBookingDate(clientDetail.next_visit) : "—"}</dd>
            <dt className="text-[var(--color-faint)]">Cancelled</dt>
            <dd className="text-right">{clientDetail?.cancellations ?? 0}</dd>
            <dt className="text-[var(--color-faint)]">Didn&apos;t show up</dt>
            <dd className={`text-right ${Number(clientDetail?.no_shows) > 0 ? "font-semibold text-[var(--color-red)]" : ""}`}>{clientDetail?.no_shows ?? 0}</dd>
          </dl>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <div className="bg-[var(--color-panel-alt)] rounded-lg p-3 text-center">
              <p className="text-[18px] font-bold">{clientDetail?.total_visits}</p>
              <p className="text-[11px] text-[var(--color-faint)]">Visits</p>
            </div>
            <div className="bg-[var(--color-panel-alt)] rounded-lg p-3 text-center">
              <p className="text-[18px] font-bold">{formatAmount(clientDetail?.total_spent)}</p>
              <p className="text-[11px] text-[var(--color-faint)]">Total Spend</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 mt-5">
            <Link to={`/clients/update/${id}`}>
              <Button variant="subtle" className="w-full justify-center mt-5">Edit</Button>
            </Link>
            <Link to="/new-booking">
              <Button className="w-full justify-center mt-5">Book Appointment</Button>
            </Link>
          </div>
          {clientDetail && <ClientMembership client={clientDetail} />}
          {clientDetail && <ClientPackages client={clientDetail} />}

          {clientDetail && (
            <div className="mt-6 border-t border-[var(--color-border-soft)] pt-4">
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">Marketing</p>
              {OPT_OUTS.map(([field, label]) => (
                <label key={field} className="flex items-center justify-between py-1.5 text-[13px]">
                  <span>{label}</span>
                  <input
                    type="checkbox"
                    className="accent-[var(--color-accent)]"
                    checked={!Number(clientDetail[field])}
                    onChange={() => toggleOptOut(field)}
                    aria-label={`${label} marketing`}
                  />
                </label>
              ))}
              <p className="mt-1 text-[11px] text-[var(--color-faint)]">Unticked channels are skipped by campaigns. Booking messages still go out.</p>
            </div>
          )}
        </Card>

        <div className="lg:col-span-2 space-y-5">
        <ClientLoyaltyCard clientId={Number(id)} />
        <Card className="p-5">
          <SectionTitle title="Booking History" />
          <Table columns={["Date", "Service", "Staff", "Amount", "Status"]}>
            {clientBookingDetail?.map((h, i) => (
              <Tr key={i}>
                <Td className="text-[var(--color-muted)]">{formatBookingDate(h.booking_date, h.start_time)}</Td>
                <Td>{h.service_names}</Td>
                <Td className="text-[var(--color-muted)]">{h.staff_name}</Td>
                <Td className="font-medium">
                  {formatAmount(h.total_amount)}
                  {Number(h.discount_amount) > 0 && (
                    <span className="block text-[11px] font-normal text-[var(--color-green)]" title={h.discount_note || ""}>
                      {formatAmount(h.discount_amount)} off
                    </span>
                  )}
                </Td>
                <Td><Badge>{h.status}</Badge></Td>
              </Tr>
            ))}
          </Table>
        </Card>
        </div>
      </div>
    </div>
  );
}
