import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Phone, Mail, Calendar } from "lucide-react";
import { Card, SectionTitle, StatCard, Avatar, Table, Tr, Td, Badge } from "../components/ui";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import StaffPlacementCard from "../components/StaffPlacementCard";
import StaffSchedulePanel from "../components/StaffSchedulePanel";
import { formatBookingDate } from "../context/functions";
import { BackLink, DetailLink } from "../components/DetailLink";
import { formatAmount } from "../components/format";

export default function StaffDetails() {
  const { id } = useParams();
  const [staffDetail, setStaffDetail] = useState(null);
  const [staffPerformance, setStaffPerformance] = useState(null);
  const [staffBookings, setStaffBookings] = useState([]);
  const [filter, setFilter] = useState("Today");
  const { fetchWithLoading } = useApi();

  const fetchStaffDetails = useCallback(async () => {
    try {
      // Replace this with your actual API call to fetch staff details
      const response = await fetchWithLoading(`${constanst.API_URL}/staff/${id}`);
      const data = await response.json();
      setStaffDetail(data.data);
    } catch (error) {
      console.error("Error fetching staff details:", error);
    }
  }, [id, fetchWithLoading]);

  const fetchStaffPerformance = useCallback(async () => {
    try {
      // Replace this with your actual API call to fetch staff details
      const response = await fetchWithLoading(`${constanst.API_URL}/staff/completion-rate/${id}?filter=${filter.toLowerCase()}`);
      const data = await response.json();
      setStaffPerformance(data.data);
      console.log(data.data);
    } catch (error) {
      console.error("Error fetching staff details:", error);
    }
  }, [id, filter, fetchWithLoading]);

  const fetchStaffBookings = useCallback(async () => {
    try {
      // Replace this with your actual API call to fetch staff details
      const response = await fetchWithLoading(`${constanst.API_URL}/bookings/staff/${id}`);
      const data = await response.json();
      setStaffBookings(data.data);
      console.log(data.data);
    } catch (error) {
      console.error("Error fetching staff details:", error);
    }
  }, [id, fetchWithLoading]);

  useEffect(() => {
    // Fetch staff details based on the ID from the URL
    fetchStaffDetails();
    fetchStaffPerformance();
    fetchStaffBookings();
  }, [fetchStaffDetails, fetchStaffPerformance, fetchStaffBookings]);


  return (
    <div className="space-y-5">
      <div className="grid sm:grid-cols-[1fr_1fr_auto] items-end rounded-xl">
        <BackLink to="/staff">Back to Staff</BackLink>
        <div style={{ marginLeft: 'auto' }}>
          {["Today", "Weekly","Monthly"].map((t) => (
            <button
              key={t}
              onClick={() => setFilter(t)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${filter === t ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "bg-[var(--color-panel-alt)] text-[var(--color-muted)]"
                }`}
            >
              {t}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-1 space-y-5">
        <Card className="p-5 h-fit">
          <div className="flex flex-col items-center text-center">
            <Avatar initials={staffDetail?.name.split(" ").map((n) => n[0]).join("").slice(0, 2)} size={64} />
            <p className="text-[16px] font-semibold mt-3">{staffDetail?.name}</p>
            <p className="text-[12px] text-[var(--color-faint)]">{staffDetail?.role}</p>
          </div>
          <div className="mt-5 space-y-2.5 text-[13px]">
            <div className="flex items-center gap-2.5 text-[var(--color-muted)]">
              <Phone size={14} /> {staffDetail?.phone}
            </div>
            <div className="flex items-center gap-2.5 text-[var(--color-muted)]">
              <Mail size={14} /> {staffDetail?.email}
            </div>
            <div className="flex items-center gap-2.5 text-[var(--color-muted)]">
              <Calendar size={14} /> Joined {staffDetail?.joined}
            </div>
          </div>
          {/* <Button variant="subtle" className="w-full justify-center mt-5">View Schedule</Button> */}
        </Card>

        <StaffPlacementCard staff={staffDetail} onChanged={fetchStaffDetails} />
        </div>

        <div className="lg:col-span-2 space-y-5">
          <div className="grid grid-cols-3 gap-4">
            <StatCard label="Total Bookings" value={staffPerformance?.total_bookings || 0} />
            <StatCard label="Completed" value={staffPerformance?.completed_bookings || 0} />
            <StatCard label="Completion Rate" value={staffPerformance?.completion_rate || 0.00} accent />
          </div>

          <StaffSchedulePanel staff={staffDetail} />

          <Card className="p-5">
            <SectionTitle title="Schedule" />
            <div className="space-y-4">
              <Table columns={["Client", "Date & Time", "Service", "Amount", "Status", ""]}>
                {staffBookings?.map((b) => (
                  <Tr key={b?.id}>
                    <Td>
                      <div className="flex items-center gap-2.5">
                        <Avatar initials={b?.client_name.split(" ").map((n) => n[0]).join("").slice(0, 2)} size={30} />
                        <div>
                          <p className="font-medium">{b?.client_name}</p>
                          <p className="text-[11px] text-[var(--color-faint)]">{b?.client_phone}</p>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-[var(--color-muted)]">{formatBookingDate(b?.booking_date, b?.start_time)}</Td>
                    <Td>{b?.service_names}</Td>
                    <Td className="font-medium">{formatAmount(b?.total_amount)}</Td>
                    <Td><Badge>{b?.status}</Badge></Td>
                    <Td>
                      {/* <button className="text-[12px] text-[var(--color-accent)] font-medium hover:underline">View</button> */}
                      <DetailLink to={`/bookings/${b?.id}`} className="text-[12px] text-[var(--color-accent)] font-medium hover:underline">
                        View
                      </DetailLink>
                    </Td>
                  </Tr>
                ))}
              </Table>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
