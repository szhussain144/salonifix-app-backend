import { useState } from "react";
import { Link } from "react-router-dom";
import { MailCheck } from "lucide-react";
import { Button, Card, Input } from "../components/ui";
import Mark from "../components/Mark";
import { useApi } from "../context/ApiContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

/** Centered card used by the sign-in helper pages. */
export function AuthCard({ eyebrow, title, intro, children }) {
  return (
    <div className="wash flex min-h-screen items-center justify-center bg-[var(--color-bg)] px-4 py-10">
      <Card className="page-enter w-full max-w-md p-8 sm:p-10">
        <div className="mb-6 flex items-center gap-2 text-[var(--color-accent)]">
          <Mark size={22} />
          <span className="font-display text-[15px] font-semibold text-[var(--color-ink)]">Salonifix</span>
        </div>
        <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.16em] text-[var(--color-accent)]">{eyebrow}</p>
        <h1 className="font-display text-[28px] font-medium leading-tight">{title}</h1>
        {intro && <p className="mt-2 text-[14px] text-[var(--color-muted)]">{intro}</p>}
        <div className="mt-7">{children}</div>
      </Card>
    </div>
  );
}

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(null);
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim()) return addToast({ message: "Enter the email you sign in with.", type: "error" });
    const res = await fetchWithLoading(`${constanst.API_URL}/auth/forgot-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: email.trim() }),
      silent: true,
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) setSent(body.message);
    else addToast({ message: body.message || "Something went wrong. Please try again.", type: "error" });
  };

  if (sent) {
    return (
      <AuthCard eyebrow="Check your email" title="Link on its way" intro={sent}>
        <div className="flex items-start gap-3 rounded-xl bg-[var(--color-accent-soft)] p-4 text-[13px] text-[var(--color-ink)]">
          <MailCheck size={18} className="mt-0.5 shrink-0 text-[var(--color-accent)]" />
          <span>The link works once, for 1 hour. Nothing arrived after a few minutes? Check spam, or ask your business owner to reset it from Settings → Team.</span>
        </div>
        <Link to="/login" className="mt-6 block text-center text-[13px] font-medium text-[var(--color-accent)] hover:underline">
          Back to sign in
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="Forgot password" title="Reset your password" intro="Enter the email you sign in with. We'll send you a link to choose a new password.">
      <form onSubmit={submit} className="space-y-5">
        <Input label="Email" type="email" autoComplete="email" placeholder="you@yourbusiness.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button type="submit" className="w-full py-3 text-[14px]">Send reset link</Button>
      </form>
      <Link to="/login" className="mt-6 block text-center text-[13px] font-medium text-[var(--color-accent)] hover:underline">
        Back to sign in
      </Link>
    </AuthCard>
  );
}
