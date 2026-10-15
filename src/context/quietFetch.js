import constanst from "../config/constants";
import { getActiveLocationId, getToken } from "./sessionStore";

/**
 * Authenticated API call that doesn't show the page-wide loading bar. For background
 * checks (the bell polling) and live previews, where a flashing loading bar would be noise.
 * Returns the parsed body, or null when the request fails.
 */
export async function quietFetch(path, { method = "GET", body, signal } = {}) {
  try {
    const res = await fetch(`${constanst.API_URL}${path}`, {
      method,
      signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${getToken()}`,
        "X-Location-Id": getActiveLocationId() || "all",
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}
