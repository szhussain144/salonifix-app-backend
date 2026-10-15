import { createContext, useCallback, useContext, useMemo, useState } from "react";
import {
  ALL_LOCATIONS,
  clearSession,
  getSession,
  resolveActiveLocation,
  saveActiveLocationId,
  saveSession,
} from "./sessionStore";
import { fallbackScreens } from "../config/screens";
import { setRegion } from "../components/format";

const SessionContext = createContext(null);

const DEFAULT_TERMS = {
  staff: "Staff member",
  staffPlural: "Staff",
  client: "Client",
  clientPlural: "Clients",
  booking: "Booking",
  bookingPlural: "Bookings",
};

/** Signed-in user, their business, its locations and the active location. */
export function SessionProvider({ children }) {
  const [session, setSession] = useState(() => getSession());
  const [activeLocationId, setActiveLocationIdState] = useState(() =>
    resolveActiveLocation(getSession()?.locations),
  );

  /** Stores a session returned by login/register (or a refreshed one from /auth/me). */
  const signIn = useCallback((data) => {
    const next = {
      token: data.token ?? getSession()?.token,
      user: data.user,
      business: data.business,
      locations: data.locations,
      screens: data.screens,
      plan: data.plan,
      // A support session (a platform admin opened this business as its owner).
      // /auth/me keeps a support session's token (and sends none); a real sign-in sends one.
      support: Boolean(data.support ?? (data.token ? false : getSession()?.support)),
    };
    saveSession(next);
    setSession(next);
    const location = resolveActiveLocation(next.locations);
    saveActiveLocationId(location);
    setActiveLocationIdState(location);
  }, []);

  const signOut = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  const setActiveLocationId = useCallback((id) => {
    saveActiveLocationId(id);
    setActiveLocationIdState(String(id));
  }, []);

  const value = useMemo(() => {
    // Currency, clock and phone hints for every screen (Settings → Region).
    setRegion(session?.business);
    const locations = session?.locations || [];
    const screens = new Set(session?.screens || fallbackScreens(session?.user?.role));
    const plan = session?.plan || null;
    const locked = plan?.locked || {};
    return {
      session,
      user: session?.user || null,
      business: session?.business || null,
      locations,
      activeLocations: locations.filter((l) => l.is_active),
      activeLocationId,
      activeLocation: locations.find((l) => String(l.id) === activeLocationId) || null,
      isAllLocations: activeLocationId === ALL_LOCATIONS,
      terms: { ...DEFAULT_TERMS, ...(session?.business?.terminology || {}) },
      isManager: ["owner", "admin"].includes(session?.user?.role),
      isOwner: session?.user?.role === "owner",
      isSupport: Boolean(session?.support),
      /** Whether a screen is switched on for this user's role (Settings → Roles & permissions). */
      canOpen: (screen) => !screen || screens.has(screen),
      /** The plan, its trial and limits (Settings → Plan). */
      plan,
      /** Whether the plan includes a feature. Locked features stay visible with an upgrade prompt. */
      has: (feature) => !feature || !locked[feature],
      /** The plan that unlocks a feature, or null when it's already included. */
      upgradeFor: (feature) => locked[feature] || null,
      signIn,
      signOut,
      setActiveLocationId,
    };
  }, [session, activeLocationId, signIn, signOut, setActiveLocationId]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

// oxlint-disable-next-line react/only-export-components -- hook is colocated with its provider
export function useSession() {
  const context = useContext(SessionContext);
  if (!context) throw new Error("useSession must be used within SessionProvider");
  return context;
}
