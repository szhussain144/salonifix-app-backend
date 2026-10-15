import { useCallback, useEffect, useState } from "react";
import { Layers } from "lucide-react";
import SellPackageDialog from "./SellPackageDialog";
import { formatBookingDate } from "../context/functions";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import constanst from "../config/constants";

/** A client's packages with sessions left, and "Sell a package" (client page). */
export default function ClientPackages({ client }) {
  const { fetchWithLoading } = useApi();
  const { canOpen } = useSession();
  const [packages, setPackages] = useState(null);
  const [selling, setSelling] = useState(false);

  const load = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/packages/client/${client.id}`, { silent: true });
    setPackages(res.ok ? (await res.json()).data : []);
  }, [client.id, fetchWithLoading]);

  useEffect(() => {
    load();
  }, [load]);

  if (packages === null) return null;
  return (
    <div className="mt-6 border-t border-[var(--color-border-soft)] pt-4">
      <div className="mb-2 flex items-center justify-between">
        <p className="flex items-center gap-1.5 text-[12px] font-semibold uppercase tracking-[0.1em] text-[var(--color-faint)]">
          <Layers size={13} /> Packages
        </p>
        {canOpen("packages") && (
          <button type="button" onClick={() => setSelling(true)} className="text-[12.5px] font-medium text-[var(--color-accent)] hover:underline">
            + Sell a package
          </button>
        )}
      </div>
      {packages.length === 0 ? (
        <p className="text-[12.5px] text-[var(--color-faint)]">No sessions to use.</p>
      ) : (
        <ul className="space-y-3">
          {packages.map((p) => (
            <li key={p.id} className="rounded-xl bg-[var(--color-panel-alt)] p-3 text-[12.5px]">
              <p className="font-semibold">{p.name}</p>
              {p.items.map((i) => (
                <p key={i.id} className="flex justify-between">
                  <span>{i.service_name}</span>
                  <span className="font-medium">{i.quantity - i.used} of {i.quantity} left</span>
                </p>
              ))}
              {p.expires_on && <p className="mt-1 text-[11.5px] text-[var(--color-faint)]">Use by {formatBookingDate(p.expires_on)}</p>}
            </li>
          ))}
        </ul>
      )}
      {selling && (
        <SellPackageDialog
          client={client}
          onClose={() => setSelling(false)}
          onSold={() => {
            setSelling(false);
            load();
          }}
        />
      )}
    </div>
  );
}
