import { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { Button, Input } from "../components/ui";
import { AuthCard } from "./ForgotPassword";
import { useApi } from "../context/ApiContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

/** Opened from the "Reset your password" email: /reset-password?token=... */
export default function ResetPassword() {
  const [params] = useSearchParams();
  const token = params.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [expired, setExpired] = useState(false);
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const submit = async (e) => {
    e.preventDefault();
    if (password.length < 8) return addToast({ message: "Use at least 8 characters.", type: "error" });
    if (password !== confirm) return addToast({ message: "The two passwords don't match.", type: "error" });
    const res = await fetchWithLoading(`${constanst.API_URL}/auth/reset-password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token, password }),
      silent: true,
    });
    const body = await res.json().catch(() => ({}));
    if (res.ok) {
      addToast({ message: body.message, type: "success" });
      navigate("/login");
    } else if (res.status === 410 || res.status === 400) {
      setExpired(true);
    } else {
      addToast({ message: body.message || "Something went wrong. Please try again.", type: "error" });
    }
  };

  if (!token || expired) {
    return (
      <AuthCard eyebrow="Reset password" title="This link has expired" intro="Reset links work once, for 1 hour. Ask for a new one and use the newest email.">
        <Link to="/forgot-password">
          <Button className="w-full justify-center py-3 text-[14px]">Send a new link</Button>
        </Link>
      </AuthCard>
    );
  }

  return (
    <AuthCard eyebrow="Reset password" title="Choose a new password" intro="You'll be signed out on every device, then sign in with the new password.">
      <form onSubmit={submit} className="space-y-5">
        <Input label="New password" type="password" autoComplete="new-password" placeholder="At least 8 characters" value={password} onChange={(e) => setPassword(e.target.value)} />
        <Input label="Type it again" type="password" autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        <Button type="submit" className="w-full py-3 text-[14px]">Save new password</Button>
      </form>
    </AuthCard>
  );
}
