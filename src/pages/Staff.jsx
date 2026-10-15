import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Star } from "lucide-react";
import { Card, SectionTitle, Table, Tr, Td, Badge, Button, Avatar } from "../components/ui";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import useDebounce from "../context/debounce";
import { DetailLink } from "../components/DetailLink";
import { useSession } from "../context/SessionContext";
import { formatMoney } from "../components/format";
import { UpgradeNote } from "../components/Upgrade";

const ITEMS_PER_PAGE = 10;

export default function Staff() {
  const [staff, setStaff] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedQuery = useDebounce(search, 500);
  const { fetchWithLoading } = useApi();
  const [totalCount, setTotalCount] = useState(0);
  const { isManager, business, plan } = useSession();

  const fetchStaff = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/staff?search=${debouncedQuery}&page=${currentPage}&limit=${ITEMS_PER_PAGE}`);
      const data = await response.json();
      console.log('Fetched Staff:', data.data);
      setStaff(data.data);
      setTotalCount(data.count)
    } catch (error) {
      console.error("Error fetching staff:", error);
    }
  }, [fetchWithLoading, debouncedQuery, currentPage]);

  useEffect(() => {
    fetchStaff();
  }, [fetchStaff]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const pageProducts = staff.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };
  // Starter is for one person: once they're added, more team members need Growth.
  const teamLimit = plan?.limits?.team ?? null;
  const teamFull = teamLimit !== null && staff.filter((s) => Number(s.is_active)).length >= teamLimit;
  return (
    <Card className="p-5">
      <SectionTitle
        eyebrow={`${staff.length} Total`}
        title="Staff"
        action={isManager && (teamFull ? <Button disabled><Plus size={14} /> Add Staff</Button> : <Link to="/staff/new"><Button><Plus size={14} /> Add Staff</Button></Link>)}
      />
      {isManager && teamFull && (
        <div className="mb-5">
          <UpgradeNote plan="growth">{plan.name} is for one person. Upgrade to Growth to add your team.</UpgradeNote>
        </div>
      )}

      <div className="flex items-center gap-2 bg-[var(--color-panel)] border border-[var(--color-border)] rounded-full px-3.5 py-2 w-full sm:w-72 transition-shadow focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_3px_rgba(116,41,195,0.14)] mb-5">
        <Search size={14} className="text-[var(--color-faint)]" />
        <input placeholder="Search staff..." className="bg-transparent text-[13px] outline-none w-full placeholder:text-[var(--color-faint)]" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Table columns={["Staff", "Role", "Location", ...(isManager ? ["Salary"] : []), "Base Price", "Rating", "Status", ""]}>
        {staff.map((s) => (
          <Tr key={s.id}>
            <Td>
              <div className="flex items-center gap-2.5">
                <Avatar initials={s.name[0]} size={32} />
                <p className="font-medium">{s.name}</p>
              </div>
            </Td>
            <Td className="text-[var(--color-muted)]">{s.role}</Td>
            <Td className="text-[var(--color-muted)]">{s.location_name}</Td>
            {isManager && (
              <Td>{s.monthly_salary != null ? formatMoney(s.monthly_salary, business?.currency) : "—"}</Td>
            )}
            <Td>{s.base_price}</Td>
            <Td>
              <span className="inline-flex items-center gap-1">
                <Star size={12} className="text-[var(--color-accent)] fill-[var(--color-accent)]" /> {s.rating}
              </span>
            </Td>
            <Td><Badge>{s.is_active ? "Active" : "Inactive"}</Badge></Td>
            <Td>
              <DetailLink to={`/staff/${s.id}`} className="text-[12px] text-[var(--color-accent)] font-medium hover:underline">
                Profile
              </DetailLink>
            </Td>
          </Tr>
        ))}
      </Table>
      <div className="flex items-center justify-between gap-3 mt-5 flex-wrap">
        <p className="text-[13px] text-[var(--color-muted)]">
          Showing {pageProducts.length} of {staff.length} staff
        </p>
        <div className="inline-flex items-center gap-2">
          <Button
            variant="ghost"
            className="px-3"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            Previous
          </Button>

          <div className="inline-flex items-center gap-1">
            {[...Array(totalPages)].map((_, index) => {
              const page = index + 1;
              return (
                <button
                  key={page}
                  type="button"
                  onClick={() => handlePageChange(page)}
                  className={`px-3 py-2 rounded-lg text-[13px] ${page === currentPage
                    ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]"
                    : "bg-[var(--color-panel-alt)] text-[var(--color-muted)] hover:bg-[var(--color-card)]"
                    }`}
                >
                  {page}
                </button>
              );
            })}
          </div>

          <Button
            variant="ghost"
            className="px-3"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            Next
          </Button>
        </div>
      </div>
    </Card>
  );
}
