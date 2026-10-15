import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

/*
 * The platform portal keeps its own sign-in, separate from a salon's session, so an admin
 * can be signed in to both in one browser.
 */
const KEY = "platformSession";

export function getPlatformSession() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || null;
  } catch {
    return null;
  }
}

export function savePlatformSession(session) {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearPlatformSession() {
  localStorage.removeItem(KEY);
}

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * `api(path, { method, body })` for /api/platform/*: adds the admin's token, signs out on
 * 401, and shows the server's message when a change fails. Resolves to `{ ok, data, message }`.
 */
export function usePlatformApi() {
  const navigate = useNavigate();
  const { addToast } = useToast();
  return useCallback(
    async (path, { method = "GET", body, silent = false } = {}) => {
      const token = getPlatformSession()?.token;
      const res = await fetch(`${constanst.API_URL}/platform${path}`, {
        method,
        headers: { "Content-Type": "application/json", ...(token && { Authorization: `Bearer ${token}` }) },
        body: body === undefined ? undefined : JSON.stringify(body),
      });
      const json = await res.json().catch(() => null);
      if (res.status === 401 && token) {
        clearPlatformSession();
        navigate("/platform/login", { replace: true });
        return { ok: false, message: json?.message };
      }
      if (!res.ok && !silent && MUTATING.has(method)) {
        addToast({ message: json?.message || "Something went wrong. Please try again.", type: "error", duration: 5000 });
      }
      return { ok: res.ok, data: json?.data, message: json?.message };
    },
    [navigate, addToast],
  );
}

/** "PKR 3,500" from whole units. */
export function money(amount, currency) {
  try {
    return new Intl.NumberFormat("en", { style: "currency", currency, maximumFractionDigits: Number.isInteger(Number(amount)) ? 0 : 2 }).format(Number(amount));
  } catch {
    return `${currency} ${amount}`;
  }
}

export const PLAN_LABEL = { trial: "Free trial", starter: "Starter", growth: "Growth", popular: "Popular" };

/** What a business's plan column says: "Popular", "Trial · 12 days", "Trial ended". */
export function planText(b) {
  if (b.plan === "trial") return b.trial_days_left >= 0 ? `Trial · ${b.trial_days_left} day${b.trial_days_left === 1 ? "" : "s"}` : "Trial ended";
  return PLAN_LABEL[b.plan] || b.plan || "No plan";
}

/** "3 Oct 2026" */
export function shortDate(iso) {
  if (!iso) return "";
  const d = new Date(String(iso).replace(" ", "T"));
  return Number.isNaN(d.getTime()) ? String(iso) : d.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
}

/** "2 hours ago", "3 days ago", "never" */
export function ago(iso) {
  if (!iso) return "Never";
  const minutes = Math.round((Date.now() - new Date(String(iso).replace(" ", "T")).getTime()) / 60000);
  if (minutes < 60) return minutes <= 1 ? "Just now" : `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.round(hours / 24);
  if (days < 45) return `${days} day${days === 1 ? "" : "s"} ago`;
  return shortDate(iso);
}
