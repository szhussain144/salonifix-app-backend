import { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { Plus, Search } from "lucide-react";
import { Card, SectionTitle, Table, Tr, Td, Badge, Button } from "../components/ui";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import useDebounce from "../context/debounce";
import { DetailLink } from "../components/DetailLink";

const ITEMS_PER_PAGE = 10;

export default function MessageReminders() {
  const [messages, setMessages] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedQuery = useDebounce(search, 500);
  const { fetchWithLoading } = useApi();
  const [totalCount, setTotalCount] = useState(0);

  const fetchMessages = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/messages?search=${debouncedQuery}&page=${currentPage}&limit=${ITEMS_PER_PAGE}`);
      const data = await response.json();
      console.log('Fetched messages:', data.data);
      setMessages(data.data);
      setTotalCount(data.count)
    } catch (error) {
      console.error("Error fetching messages:", error);
    }
  }, [fetchWithLoading, debouncedQuery, currentPage]);

  useEffect(() => {
    fetchMessages();
  }, [fetchMessages]);

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));
  const pageProducts = messages.slice(
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
        eyebrow={`${messages.length} Total`}
        title="Messages"
        action={
          <div className="flex items-center gap-2">
            <Link to="/messages/new"><Button><Plus size={14} /> Add Message</Button></Link>
          </div>
        }
      />

      <div className="flex items-center gap-2 bg-[var(--color-panel)] border border-[var(--color-border)] rounded-full px-3.5 py-2 w-full sm:w-72 transition-shadow focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_3px_rgba(116,41,195,0.14)] mb-5">
        <Search size={14} className="text-[var(--color-faint)]" />
        <input placeholder="Search messages..." className="bg-transparent text-[13px] outline-none w-full placeholder:text-[var(--color-faint)]" value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <Table columns={["Message", "Type", "Status", ""]}>
        {messages.map((s) => (
          <Tr key={s.id}>
            <Td>
                <p className="font-medium">{s.message}</p>
            </Td>
            <Td>{s.message_type.toLocaleUpperCase()}</Td>
            <Td><Badge>{s.status === 'active' ? "Active" : "Inactive"}</Badge></Td>
            <Td>
              <DetailLink to={`/messages/${s.id}`} className="text-[12px] text-[var(--color-accent)] font-medium hover:underline">
                View
              </DetailLink>
            </Td>
          </Tr>
        ))}
      </Table>
      <div className="flex items-center justify-between gap-3 mt-5 flex-wrap">
        <p className="text-[13px] text-[var(--color-muted)]">
          Showing {pageProducts.length} of {messages.length} messages
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
