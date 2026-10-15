import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Card, Button, Input } from "../components/ui";
import { useToast } from "../context/ToastContext";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import constanst from "../config/constants";
import Mark from "../components/Mark";
import { Calendar, Users, MessageCircle, BarChart3 } from "lucide-react";

/* The four feature groups from the Salonifix site (features-data.ts). */
const HIGHLIGHTS = [
  { icon: Calendar, name: "Scheduling & payments", intro: "Fill the book and keep the front desk calm." },
  { icon: Users, name: "Client relationships", intro: "Remember everyone, make every visit personal." },
  { icon: MessageCircle, name: "Marketing & automation", intro: "Bring clients back without lifting a finger." },
  { icon: BarChart3, name: "Management", intro: "Numbers you can trust." },
];

export default function Login() {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const { addToast } = useToast();
  const navigate = useNavigate()

  const { fetchWithLoading } = useApi();
  const { signIn } = useSession();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      addToast({ message: "Please enter both phone/email and password.", type: "error" });
      return;
    }
    const payload = {
      email: identifier,
      password: password,
    };
    try {
      const response = await fetchWithLoading(`${constanst.API_URL}/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify(payload),
        silent: true,
      });
      const data = await response.json();
      if (data.success) {
        signIn(data);
        addToast({ message: "Welcome back! Redirecting to dashboard...", type: "success" });
        navigate('/')
      } else if (response.status === 429 || response.status === 403) {
        // Too many attempts (how long to wait), or a suspended account.
        addToast({ message: data.message || "Too many attempts. Try again in a few minutes.", type: "error", duration: 8000 });
      } else {
        addToast({ message: "Email or password is incorrect.", type: "error" });
      }
    } catch {
      addToast({ message: "Email or password is incorrect.", type: "error" });
    }

  };


  return (
    <div className="wash min-h-screen bg-[var(--color-bg)] flex items-center justify-center px-4 py-10">
      <div className="page-enter grid w-full max-w-5xl gap-5 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="banner relative hidden overflow-hidden rounded-[var(--radius-card)] p-10 lg:flex lg:flex-col lg:justify-between">
          <div className="flex items-center gap-2 text-[var(--color-navy-accent)]">
            <Mark size={24} />
            <span className="font-display text-[16px] font-semibold text-[var(--color-navy-ink)]">Salonifix</span>
          </div>
          <div className="my-10">
            <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-navy-accent)]">Bookings for every branch</p>
            <h1 className="font-display text-[40px] font-medium leading-[1.06] tracking-tight">One system, every part of the day.</h1>
            <p className="mt-4 max-w-sm text-[15px] text-[var(--color-navy-ink-2)]">
              From the first booking to the rebooking text, it all runs from the same screen.
            </p>
          </div>
          <ul className="grid grid-cols-2 gap-3">
            {HIGHLIGHTS.map(({ icon: Icon, name, intro }) => (
              <li key={name} className="rounded-xl border border-white/12 bg-white/8 p-3.5 backdrop-blur">
                <Icon size={16} className="mb-2 text-[var(--color-navy-accent)]" />
                <p className="text-[13px] font-semibold">{name}</p>
                <p className="mt-0.5 text-[12px] leading-snug text-[var(--color-navy-ink-2)]">{intro}</p>
              </li>
            ))}
          </ul>
        </div>

        <Card className="p-8 sm:p-10 self-center">
          <div className="mb-8">
            <div className="mb-6 flex items-center gap-2 text-[var(--color-accent)] lg:hidden">
              <Mark size={22} />
              <span className="font-display text-[15px] font-semibold text-[var(--color-ink)]">Salonifix</span>
            </div>
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">Sign in</p>
            <h2 className="font-display text-[30px] font-medium leading-tight">Welcome back</h2>
            <p className="mt-2 text-[14px] text-[var(--color-muted)]">Enter your details to open your business dashboard.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-5">
            <Input
              label="Email"
              placeholder="you@yourbusiness.com"
              value={identifier}
              onChange={(e) => setIdentifier(e.target.value)}
            />
            <div>
              <Input
                label="Password"
                type="password"
                autoComplete="current-password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <Link to="/forgot-password" className="mt-2 inline-block text-[12.5px] font-medium text-[var(--color-accent)] hover:underline">
                Forgot password?
              </Link>
            </div>
            <Button type="submit" className="w-full py-3 text-[14px]">Sign in</Button>
          </form>

          <div className="mt-6 text-[13px] text-[var(--color-muted)]">
            Don&apos;t have an account? <Link to="/register" className="font-medium text-[var(--color-accent)] hover:underline">Create your business</Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
