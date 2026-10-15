import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Search, Pencil } from "lucide-react";
import { Card, SectionTitle, Table, Tr, Td, Badge, Button } from "../components/ui";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import useDebounce from "../context/debounce";
import { formatAmount } from "../components/format";

const ITEMS_PER_PAGE = 10;

export default function Services() {
  const [services, setServices] = useState([]);
  const { fetchWithLoading } = useApi();
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const [totalCount, setTotalCount] = useState(0);
  const debouncedQuery = useDebounce(search, 500);

  const fetchService = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/services?search=${debouncedQuery}&page=${currentPage}&limit=${ITEMS_PER_PAGE}`);
      const data = await response.json();
      console.log('Fetched Services:', data.data);
      setServices(data.data);
      setTotalCount(data.count)
    } catch (error) {
      console.error("Error fetching services:", error);
    }
  }, [fetchWithLoading, debouncedQuery, currentPage]);

  useEffect(() => {
    console.log('Debounced Query out:', debouncedQuery);
    fetchService();
  }, [fetchService, debouncedQuery]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const pageProducts = services.slice(
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
        title="Services"
        action={<Link to="/services/new"><Button style={{ cursor: "pointer" }}><Plus size={14} /> Add Service</Button></Link>}
      />

      <div className="flex items-center gap-2 bg-[var(--color-panel)] border border-[var(--color-border)] rounded-full px-3.5 py-2 w-full sm:w-72 transition-shadow focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_3px_rgba(116,41,195,0.14)] mb-5">
        <Search size={14} className="text-[var(--color-faint)]" />
        <input placeholder="Search services..." className="bg-transparent text-[13px] outline-none w-full placeholder:text-[var(--color-faint)]" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Table columns={["Service", "Category", "Price", "Duration", "Status", ""]}>
        {services.map((s) => (
          <Tr key={s.id}>
            <Td className="font-medium">{s.name}</Td>
            <Td className="text-[var(--color-muted)]">{s.category_name}</Td>
            <Td className="font-medium">{formatAmount(s.price)}</Td>
            <Td className="text-[var(--color-muted)]">{s.duration_minutes + ' mins'}</Td>
            <Td><Badge>{s.is_active ? "Active" : "Inactive"}</Badge></Td>
            <Td>
              <Link to={`/services/update/${s.id}`}>
                <button className="text-[var(--color-muted)] hover:text-[var(--color-accent)]">
                  <Pencil size={14} />
                </button>
              </Link>
            </Td>
          </Tr>
        ))}
      </Table>
      <div className="flex items-center justify-between gap-3 mt-5 flex-wrap">
        <p className="text-[13px] text-[var(--color-muted)]">
          Showing {pageProducts.length} of {totalCount} services
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
