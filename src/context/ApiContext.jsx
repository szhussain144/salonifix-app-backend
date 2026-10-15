import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { clearSession, getActiveLocationId, getToken } from "./sessionStore";
import { useToast } from "./ToastContext";

const ApiContext = createContext(null);

const MUTATING = new Set(["POST", "PUT", "PATCH", "DELETE"]);

/**
 * Wraps fetch for every API call:
 *  - adds the bearer token and the active location (X-Location-Id)
 *  - signs the user out when the session has expired (401)
 *  - shows the server's error message when a create/update/delete fails, with "See plans"
 *    when the plan doesn't include it (pass `{ silent: true }` in options to handle errors yourself)
 */
export function ApiProvider({ children }) {
  const [activeRequests, setActiveRequests] = useState(0);
  const { addToast } = useToast();
  const navigate = useNavigate();

  // Stable identity so pages can safely list it in effect/callback deps.
  const fetchWithLoading = useCallback(
    async (url, options = {}) => {
      const { silent, ...init } = options;
      const headers = new Headers(init.headers);
      const token = getToken();
      if (token && !headers.has("Authorization")) headers.set("Authorization", `Bearer ${token}`);
      const location = getActiveLocationId();
      if (location && !headers.has("X-Location-Id")) headers.set("X-Location-Id", location);

      setActiveRequests((prev) => prev + 1);
      try {
        const response = await fetch(url, { ...init, headers });

        if (response.status === 401 && token) {
          clearSession();
          window.location.assign("/login");
          return response;
        }

        const method = (init.method || "GET").toUpperCase();
        if (!response.ok && !silent && MUTATING.has(method)) {
          const body = await response.clone().json().catch(() => null);
          addToast({
            message: body?.message || "Something went wrong. Please try again.",
            type: "error",
            duration: response.status === 402 ? 8000 : 5000,
            // 402: the plan doesn't include this; offer the way to upgrade.
            ...(response.status === 402 && {
              action: { label: "See plans", onClick: () => navigate("/settings", { state: { section: "billing" } }) },
            }),
          });
        }
        return response;
      } finally {
        setActiveRequests((prev) => Math.max(prev - 1, 0));
      }
    },
    [addToast, navigate],
  );

  const value = useMemo(
    () => ({ loading: activeRequests > 0, fetchWithLoading }),
    [activeRequests, fetchWithLoading]
  );

  return <ApiContext.Provider value={value}>{children}</ApiContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components -- hook is colocated with its provider
export function useApi() {
  const context = useContext(ApiContext);
  if (!context) {
    throw new Error("useApi must be used within ApiProvider");
  }
  return context;
}
