import { useState, useEffect, useCallback } from "react";

import { Search } from "lucide-react";
import { Card, SectionTitle, StatCard, Table, Tr, Td, Badge } from "../components/ui";
import { Button } from "../components/ui";
import constanst from "../config/constants";
import { useApi } from "../context/ApiContext";
import useDebounce from "../context/debounce";
import { formatBookingDate } from "../context/functions";
import { BackLink } from "../components/DetailLink";

const ITEMS_PER_PAGE = 10;
const DATE_FILTERS = ["Today", "Weekly", "Monthly"];

export default function MessageLog() {
  const [logs, setLogs] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("today");
  const debouncedQuery = useDebounce(search, 500);
  const { fetchWithLoading } = useApi();
  const [totalCount, setTotalCount] = useState(0);
  const [successCount, setSuccessCount] = useState(0);
  const [failedCount, setFailedCount] = useState(0);

  const fetchLogs = useCallback(async () => {
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/message-logs?filter=${filter.toLowerCase()}&page=${currentPage}&limit=${ITEMS_PER_PAGE}`);
      const data = await response.json();
      setLogs(data.data);
      setTotalCount(data.count);
      setSuccessCount(data.successCount ?? 0);
      setFailedCount(data.failedCount ?? 0);
    } catch (error) {
      console.error("Error fetching message logs:", error);
    }
  }, [fetchWithLoading, filter, currentPage]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  // Reset to the first page whenever the debounced search changes
  // (a no-op when already on page 1).
  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedQuery]);

  const handleFilterChange = (nextFilter) => {
    setFilter(nextFilter);
    setCurrentPage(1);
  };

  const totalPages = Math.max(1, Math.ceil(totalCount / ITEMS_PER_PAGE));

  const handlePageChange = (newPage) => {
    if (newPage < 1 || newPage > totalPages) return;
    setCurrentPage(newPage);
  };

  return (
    <div className="space-y-5">
      <BackLink to="/messages">Back to Messages</BackLink>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        <StatCard label="Total Messages" value={totalCount?.toLocaleString()} accent />
        <StatCard label="Sent Successfully" value={successCount?.toLocaleString()} />
        <StatCard label="Failed" value={failedCount?.toLocaleString()} />
      </div>

      <Card className="p-5">
        <SectionTitle eyebrow={`${totalCount} Total`} title="Message Log" />

        <div className="flex flex-wrap items-center gap-2 mb-5">
          <div className="flex items-center gap-2 bg-[var(--color-panel)] border border-[var(--color-border)] rounded-full px-3.5 py-2 w-full sm:w-72 transition-shadow focus-within:border-[var(--color-accent)] focus-within:shadow-[0_0_0_3px_rgba(116,41,195,0.14)]">
            <Search size={14} className="text-[var(--color-faint)]" />
            <input
              placeholder="Search logs..."
              className="bg-transparent text-[13px] outline-none w-full placeholder:text-[var(--color-faint)]"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          {DATE_FILTERS.map((t) => (
            <button
              key={t}
              onClick={() => handleFilterChange(t)}
              className={`px-4 py-1.5 rounded-full text-[12px] font-medium transition-colors ${filter === t ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "bg-[var(--color-panel-alt)] text-[var(--color-muted)]"
                }`}
            >
              {t}
            </button>
          ))}
        </div>

        <Table columns={["Recipient", "Message", "Type", "Status", "Sent At"]}>
          {logs.map((l) => (
            <Tr key={l.id}>
              <Td>
                <p className="font-medium">{l.recipient_name || l.recipient}</p>
                {l.recipient_phone && <p className="text-[11px] text-[var(--color-faint)]">{l.recipient_phone}</p>}
              </Td>
              <Td className="max-w-xs truncate">{l.message}</Td>
              <Td>{l.message_type?.toLocaleUpperCase()}</Td>
              <Td><Badge>{l.status === "sent" ? "Sent" : "Failed"}</Badge></Td>
              <Td className="text-[var(--color-muted)]">{formatBookingDate(l.sent_at || l.created_at)}</Td>
            </Tr>
          ))}
        </Table>

        <div className="flex items-center justify-between gap-3 mt-5 flex-wrap">
          <p className="text-[13px] text-[var(--color-muted)]">
            Showing {logs.length} of {totalCount} logs
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
    </div>
  );
}
