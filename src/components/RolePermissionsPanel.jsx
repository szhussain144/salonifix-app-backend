import { useCallback, useEffect, useState } from "react";
import { RotateCcw } from "lucide-react";
import { Button, SectionTitle } from "./ui";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

const ROLES = [
  { key: "admin", label: "Admin" },
  { key: "staff", label: "Staff" },
];

/** Worth knowing before switching these on. */
const NOTES = {
  payroll: "Shows every salary and payment.",
  marketing: "Can send paid SMS, WhatsApp and calls.",
  settings: "Team and billing still need an admin.",
};

function Switch({ checked, label, disabled, onChange }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-accent)] disabled:cursor-not-allowed disabled:opacity-60 ${
        checked ? "bg-[var(--color-accent)]" : "bg-[var(--color-border)]"
      }`}
    >
      <span
        className={`inline-block h-[16px] w-[16px] rounded-full bg-white shadow transition-transform ${
          checked ? "translate-x-[19px]" : "translate-x-[3px]"
        }`}
      />
    </button>
  );
}

/* Owner-only: switch each screen on or off for admins and staff. The API enforces it too. */
export default function RolePermissionsPanel() {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { terms } = useSession();
  const [matrix, setMatrix] = useState(null);
  const [saving, setSaving] = useState(null); // "role:screen" being saved, or "reset"

  const load = useCallback(async () => {
    const res = await fetchWithLoading(`${constanst.API_URL}/permissions`);
    if (res.ok) setMatrix((await res.json()).data);
  }, [fetchWithLoading]);

  useEffect(() => {
    load();
  }, [load]);

  const save = async (changes) => {
    const res = await fetchWithLoading(`${constanst.API_URL}/permissions`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ changes }),
    });
    if (!res.ok) return false;
    setMatrix((await res.json()).data);
    return true;
  };

  const toggle = async (role, screen) => {
    const enabled = !matrix.roles[role][screen.key];
    setSaving(`${role}:${screen.key}`);
    // Show the new position straight away; the server's answer replaces it.
    setMatrix((m) => ({ ...m, roles: { ...m.roles, [role]: { ...m.roles[role], [screen.key]: enabled } } }));
    const ok = await save([{ role, screen: screen.key, enabled }]);
    setSaving(null);
    if (!ok) return load();
    const who = ROLES.find((r) => r.key === role).label;
    addToast({
      message: enabled ? `${who} can now open ${screen.label}` : `${screen.label} switched off for ${who.toLowerCase()}`,
      type: "success",
    });
  };

  if (!matrix) return <SectionTitle title="Roles & permissions" />;

  const changed = matrix.screens.flatMap((s) =>
    ROLES.filter((r) => matrix.roles[r.key][s.key] !== s.defaults[r.key]).map((r) => ({
      role: r.key,
      screen: s.key,
      enabled: s.defaults[r.key],
    })),
  );

  const reset = async () => {
    if (!window.confirm("Put every screen back to its default for admins and staff?")) return;
    setSaving("reset");
    if (await save(changed)) addToast({ message: "Permissions reset to defaults", type: "success" });
    setSaving(null);
  };

  const groups = [...new Set(matrix.screens.map((s) => s.group))];
  // Screen names follow the business's wording (e.g. "Patients" for a clinic).
  const labelOf = (s) => ({ clients: terms.clientPlural, staff: terms.staffPlural })[s.key] || s.label;

  return (
    <div className="space-y-4">
      <SectionTitle
        title="Roles & permissions"
        action={
          <Button variant="ghost" type="button" onClick={reset} disabled={changed.length === 0 || saving !== null}>
            <RotateCcw size={14} /> Reset to defaults
          </Button>
        }
      />
      <p className="text-[13px] text-[var(--color-muted)]">
        Switch screens on or off for each role. A switched-off screen disappears from their menu and the
        server refuses it too. Owners always see everything. Changes apply straight away; open menus update
        the next time the page is loaded.
      </p>

      <div className="overflow-x-auto scrollbar-none">
        <table className="w-full min-w-[420px] border-collapse text-left">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">
              <th className="pb-3 pr-4">Screen</th>
              <th className="pb-3 px-2 text-center w-[72px]">Owner</th>
              {ROLES.map((r) => (
                <th key={r.key} className="pb-3 px-2 text-center w-[72px]">{r.label}</th>
              ))}
            </tr>
          </thead>
          {groups.map((group) => (
            <tbody key={group} className="text-[13px] text-[var(--color-ink)]">
              <tr>
                <th colSpan={2 + ROLES.length} className="pt-4 pb-1.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
                  {group}
                </th>
              </tr>
              {matrix.screens.filter((s) => s.group === group).map((s) => (
                <tr key={s.key} className="border-b border-[var(--color-border-soft)] last:border-none">
                  <td className="py-2.5 pr-4">
                    <span className="font-medium">{labelOf(s)}</span>
                    {NOTES[s.key] && <span className="block text-[11.5px] text-[var(--color-faint)]">{NOTES[s.key]}</span>}
                  </td>
                  <td className="py-2.5 px-2 text-center text-[11.5px] text-[var(--color-faint)]">Always</td>
                  {ROLES.map((r) => (
                    <td key={r.key} className="py-2.5 px-2 text-center">
                      <Switch
                        checked={Boolean(matrix.roles[r.key][s.key])}
                        label={`${labelOf(s)} for ${r.label.toLowerCase()}`}
                        disabled={saving !== null}
                        onChange={() => toggle(r.key, { ...s, label: labelOf(s) })}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          ))}
        </table>
      </div>
    </div>
  );
}
