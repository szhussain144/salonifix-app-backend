import { useState } from "react";
import { KeyRound, LogOut, UserRound } from "lucide-react";
import { Avatar, Badge, Button, Card, Input } from "../components/ui";
import { initialsOf } from "../components/format";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import { getSession, saveSession } from "../context/sessionStore";
import constanst from "../config/constants";

const EMPTY = { current_password: "", new_password: "", confirm: "" };

/** Keeps this device signed in with the token the server just issued. */
function keepToken(token) {
  const session = getSession();
  if (session && token) saveSession({ ...session, token });
}

/** My account: everyone can open it, whatever screens their role has. */
export default function Account() {
  const { user, business } = useSession();
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const [form, setForm] = useState(EMPTY);
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const changePassword = async (e) => {
    e.preventDefault();
    if (form.new_password.length < 8) return addToast({ message: "Use at least 8 characters for the new password.", type: "error" });
    if (form.new_password !== form.confirm) return addToast({ message: "The two new passwords don't match.", type: "error" });
    const res = await fetchWithLoading(`${constanst.API_URL}/auth/change-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ current_password: form.current_password, new_password: form.new_password }),
    });
    if (!res.ok) return;
    const body = await res.json();
    keepToken(body.data.token);
    setForm(EMPTY);
    addToast({ message: body.message, type: "success" });
  };

  const signOutEverywhere = async () => {
    if (!window.confirm("Sign out on every other phone and computer? You stay signed in here.")) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/auth/sign-out-everywhere`, { method: "POST" });
    if (!res.ok) return;
    const body = await res.json();
    keepToken(body.data.token);
    addToast({ message: body.message, type: "success" });
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <Card className="p-6">
        <div className="flex flex-col items-center text-center">
          <Avatar initials={initialsOf(user?.name || user?.email || "")} size={64} />
          <p className="mt-3 text-[16px] font-semibold">{user?.name}</p>
          <p className="text-[13px] text-[var(--color-muted)]">{user?.email}</p>
          <div className="mt-3"><Badge>{user?.role}</Badge></div>
          <p className="mt-3 text-[12.5px] text-[var(--color-faint)]">{business?.name}</p>
        </div>
        <p className="mt-6 flex items-start gap-2 text-[12.5px] text-[var(--color-muted)]">
          <UserRound size={14} className="mt-0.5 shrink-0" /> To change your name, email or role, ask an owner or admin (Settings → Team).
        </p>
      </Card>

      <Card className="p-6 lg:col-span-2">
        <h2 className="flex items-center gap-2 font-display text-[17px] font-medium tracking-tight"><KeyRound size={17} /> Change password</h2>
        <p className="mt-1 text-[13px] text-[var(--color-muted)]">Other phones and computers are signed out; this one stays signed in.</p>
        <form onSubmit={changePassword} className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Input label="Current password" type="password" autoComplete="current-password" value={form.current_password} onChange={set("current_password")} />
          </div>
          <Input label="New password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={form.new_password} onChange={set("new_password")} />
          <Input label="Type it again" type="password" autoComplete="new-password" value={form.confirm} onChange={set("confirm")} />
          <div className="sm:col-span-2">
            <Button type="submit" disabled={!form.current_password || !form.new_password}>Change password</Button>
          </div>
        </form>

        <div className="mt-8 border-t border-[var(--color-border)] pt-6">
          <h2 className="flex items-center gap-2 font-display text-[17px] font-medium tracking-tight"><LogOut size={17} /> Signed in somewhere else?</h2>
          <p className="mt-1 text-[13px] text-[var(--color-muted)]">
            Lost a phone, or signed in on a shared computer? Sign out everywhere else. You stay signed in on this device.
          </p>
          <Button variant="ghost" className="mt-4" onClick={signOutEverywhere}>Sign out on other devices</Button>
        </div>
      </Card>
    </div>
  );
}
