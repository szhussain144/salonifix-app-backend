import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Card, SectionTitle, Table, Tr, Td, Button, Avatar } from "../components/ui";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import useDebounce from "../context/debounce";
import { DetailLink } from "../components/DetailLink";
import { StarBadge } from "../components/Loyalty";
import { formatAmount } from "../components/format";

const ITEMS_PER_PAGE = 10;

export default function Clients() {
  const [clients, setClients] = useState([]);
  const { fetchWithLoading } = useApi();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const debouncedQuery = useDebounce(search, 500);

  const fetchClients = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/clients?search=${debouncedQuery}&page=${currentPage}&limit=${ITEMS_PER_PAGE}`);
      const data = await response.json();
      console.log('Fetched Clients:', data.data);
      setClients(data.data);
      setTotalCount(data.count)
    } catch (error) {
      console.error("Error fetching clients:", error);
    }
  }, [fetchWithLoading, debouncedQuery, currentPage]);

  useEffect(() => {
    if (debouncedQuery) {
      console.log('Debounced Query:', debouncedQuery);
    }
    fetchClients();
  }, [fetchClients, debouncedQuery]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const pageProducts = clients.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };
  return (
    <Card className="p-5">
      <SectionTitle
        eyebrow={`${clients.length} Total`}
        title="Clients"
        action={
          <Link to="/clients/new">
            <Button><Plus size={14} /> Add Client</Button>
          </Link>
        }
      />

      <div className="flex items-center gap-2 bg-[var(--color-panel)] border border-[var(--color-border)] rounded-full px-3.5 py-2 w-full sm:w-72 transition-shadow focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_3px_rgba(116,41,195,0.14)] mb-5">
        <Search size={14} className="text-[var(--color-faint)]" />
        <input placeholder="Search clients..." className="bg-transparent text-[13px] outline-none w-full placeholder:text-[var(--color-faint)]" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Table columns={["Client", "Phone", "Visits", "Total Spend", "Loyalty Points", "Discount", ""]}>
        {clients.map((c) => (
          <Tr key={c.id}>
            <Td>
              <div className="flex items-center gap-2.5">
                <Avatar initials={c.name.split(" ").map((n) => n[0]).join("").slice(0, 2)} size={32} />
                <p className="font-medium">{c.name}</p>
                {c.is_star && <StarBadge compact reasons={c.star_reasons} />}
              </div>
            </Td>
            <Td className="text-[var(--color-muted)]">{c.phone}</Td>
            <Td className="text-[var(--color-muted)]">{c.total_visits}</Td>
            <Td className="font-medium text-[var(--color-muted)]">{formatAmount(c.total_spent)}</Td>
            <Td className="text-[var(--color-muted)]">{c.loyalty_points}</Td>
            <Td className="text-[var(--color-muted)]">{c.discount}</Td>
            <Td>
              <DetailLink to={`/clients/${c.id}`} className="text-[12px] text-[var(--color-accent)] font-medium hover:underline">
                View Profile
              </DetailLink>
            </Td>
          </Tr>
        ))}
      </Table>
      <div className="flex items-center justify-between gap-3 mt-5 flex-wrap">
        <p className="text-[13px] text-[var(--color-muted)]">
          Showing {pageProducts.length} of {clients.length} clients
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
