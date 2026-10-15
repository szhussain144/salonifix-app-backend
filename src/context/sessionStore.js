/**
 * Persisted session (token, user, business, locations) and the active location.
 * Plain functions so the API layer can read the latest values at request time.
 */
const SESSION_KEY = "session";
const LOCATION_KEY = "activeLocationId";

/** Sentinel for "All locations" (sent to the API as X-Location-Id: all). */
export const ALL_LOCATIONS = "all";

export function getSession() {
  try {
    return JSON.parse(localStorage.getItem(SESSION_KEY)) || null;
  } catch {
    return null;
  }
}

export function saveSession(session) {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
  // Older screens read the signed-in user from "user".
  localStorage.setItem("user", JSON.stringify(session.user));
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
  localStorage.removeItem(LOCATION_KEY);
  localStorage.removeItem("user");
}

export function getToken() {
  return getSession()?.token || null;
}

export function getActiveLocationId() {
  return localStorage.getItem(LOCATION_KEY) || null;
}

export function saveActiveLocationId(id) {
  localStorage.setItem(LOCATION_KEY, String(id));
}

/** Picks a sensible default: the stored choice if still valid, else the first active location. */
export function resolveActiveLocation(locations, stored = getActiveLocationId()) {
  const active = (locations || []).filter((l) => l.is_active);
  if (stored === ALL_LOCATIONS && active.length > 1) return ALL_LOCATIONS;
  if (stored && active.some((l) => String(l.id) === String(stored))) return String(stored);
  return active[0] ? String(active[0].id) : ALL_LOCATIONS;
}
