import { useEffect, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { ShieldCheck } from "lucide-react";
import Mark from "../components/Mark";
import { Button, Card, Input } from "../components/ui";
import { getPlatformSession, savePlatformSession, usePlatformApi } from "./platformApi";

/** Sign-in for the people running the service. Salon owners sign in at /login. */
export default function PlatformLogin() {
  const api = usePlatformApi();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    document.title = "Platform admin";
  }, []);

  if (getPlatformSession()?.token) return <Navigate to="/platform" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    const res = await api("/auth/login", { method: "POST", body: { email, password }, silent: true });
    setBusy(false);
    if (!res.ok) return setError(res.message || "Invalid email or password");
    savePlatformSession(res.data);
    navigate("/platform", { replace: true });
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--color-navy)] px-4 py-10">
      <div className="page-enter w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2 text-[var(--color-navy-accent)]">
          <Mark size={24} />
          <span className="font-display text-[16px] font-semibold text-[var(--color-navy-ink)]">Salonifix</span>
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-[11px] font-semibold text-[var(--color-navy-accent)]">Platform</span>
        </div>
        <Card className="p-8">
          <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-2xl bg-[var(--color-accent-soft)] text-[var(--color-accent)]">
            <ShieldCheck size={20} />
          </span>
          <h1 className="font-display text-[26px] font-medium leading-tight">Platform admin</h1>
          <p className="mt-1 text-[13.5px] text-[var(--color-muted)]">Manage every salon, plan and invoice.</p>
          <form onSubmit={submit} className="mt-6 space-y-4">
            <Input label="Email" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <Input label="Password" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {error && <p role="alert" className="text-[13px] text-[var(--color-red)]">{error}</p>}
            <Button type="submit" className="w-full py-3 text-[14px]" disabled={busy}>Sign in</Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
