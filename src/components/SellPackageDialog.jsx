import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import Modal from "./Modal";
import { Button } from "./ui";
import { formatAmount } from "./format";
import { CHECKOUT_METHODS, forRegion } from "./labels";
import { useApi } from "../context/ApiContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

/* How a client can pay for a package: not with a gift card or another package. */
const SALE_METHODS = CHECKOUT_METHODS.filter(([key]) => key !== "gift_card");
const chip = (on) =>
  `rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition-colors ${
    on ? "border-[var(--color-accent)] bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"
  }`;

/** Sell a package to a client. `client` fixes the client (from their page); otherwise search. */
export default function SellPackageDialog({ client: fixedClient, onClose, onSold }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const [packages, setPackages] = useState(null);
  const [packageId, setPackageId] = useState(null);
  const [client, setClient] = useState(fixedClient || null);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [method, setMethod] = useState("cash");

  useEffect(() => {
    fetchWithLoading(`${constanst.API_URL}/packages`, { silent: true }).then(async (res) => {
      if (!res.ok) return setPackages([]);
      const list = (await res.json()).data.filter((p) => p.is_active);
      setPackages(list);
      if (list.length === 1) setPackageId(list[0].id);
    });
  }, [fetchWithLoading]);

  useEffect(() => {
    if (client || query.trim().length < 2) return setResults([]);
    const timer = setTimeout(async () => {
      const res = await fetchWithLoading(`${constanst.API_URL}/clients/search?q=${encodeURIComponent(query.trim())}`, { silent: true });
      if (res.ok) setResults((await res.json()).data.slice(0, 6));
    }, 250);
    return () => clearTimeout(timer);
  }, [query, client, fetchWithLoading]);

  const chosen = packages?.find((p) => p.id === packageId);

  const sell = async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/packages/sell`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ package_id: packageId, client_id: client.id, payment_method: method }),
    });
    if (!res.ok) return;
    const body = await res.json();
    addToast({ message: body.message, type: "success" });
    onSold(body.data);
  };

  return (
    <Modal
      title="Sell a package"
      subtitle="The client pays now and uses the sessions on later visits."
      onClose={onClose}
      footer={
        <div className="flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={onClose}>Cancel</Button>
          <Button type="button" onClick={sell} disabled={!chosen || !client}>
            {chosen ? `Sell for ${formatAmount(chosen.price)}` : "Sell"}
          </Button>
        </div>
      }
    >
      <div className="space-y-5 text-[13px]">
        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">Client</p>
          {client ? (
            <div className="flex items-center justify-between rounded-xl border border-[var(--color-border)] px-3 py-2.5">
              <span>
                <b>{client.name}</b> <span className="text-[var(--color-muted)]">{client.phone}</span>
              </span>
              {!fixedClient && (
                <button type="button" onClick={() => setClient(null)} className="text-[12.5px] font-medium text-[var(--color-accent)]">Change</button>
              )}
            </div>
          ) : (
            <div>
              <label className="flex items-center gap-2 rounded-xl border border-[var(--color-border)] px-3 py-2.5 focus-within:border-[var(--color-accent)]">
                <Search size={15} className="text-[var(--color-faint)]" />
                <input autoFocus value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by name or phone" className="flex-1 bg-transparent outline-none" />
              </label>
              {results.length > 0 && (
                <ul className="menu-in mt-1 overflow-hidden rounded-xl border border-[var(--color-border)]">
                  {results.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => setClient(c)} className="flex w-full justify-between px-3 py-2 text-left hover:bg-[var(--color-panel-alt)]">
                        <span className="font-medium">{c.name}</span>
                        <span className="text-[var(--color-muted)]">{c.phone}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </section>

        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">Package</p>
          {packages === null ? (
            <p className="text-[var(--color-muted)]">Loading…</p>
          ) : packages.length === 0 ? (
            <p className="text-[var(--color-muted)]">No packages for sale yet. A manager can set them up under Manage → Packages.</p>
          ) : (
            <div className="grid gap-2 sm:grid-cols-2">
              {packages.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setPackageId(p.id)}
                  className={`rounded-xl border p-3 text-left transition-colors ${packageId === p.id ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]" : "border-[var(--color-border)] hover:border-[var(--color-accent)]"}`}
                >
                  <span className="block font-semibold">{p.name}</span>
                  <span className="block text-[12px] text-[var(--color-muted)]">{p.items.map((i) => `${i.quantity}× ${i.service_name}`).join(", ")}</span>
                  <span className="mt-1 block">
                    <b>{formatAmount(p.price)}</b>
                    {p.saving > 0 && <span className="ml-1.5 text-[12px] text-[var(--color-green)]">saves {formatAmount(p.saving)}</span>}
                  </span>
                </button>
              ))}
            </div>
          )}
        </section>

        <section>
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">Paid by</p>
          <div className="flex flex-wrap gap-1.5">
            {forRegion(SALE_METHODS).map(([key, label]) => (
              <button key={key} type="button" className={chip(method === key)} onClick={() => setMethod(key)}>
                {label}
              </button>
            ))}
          </div>
          {chosen?.valid_days && <p className="mt-2 text-[12px] text-[var(--color-faint)]">Sessions must be used within {chosen.valid_days} days.</p>}
        </section>
      </div>
    </Modal>
  );
}
