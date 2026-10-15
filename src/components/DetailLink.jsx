import { useCallback } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { useInDrawer } from "./DetailDrawer";

/**
 * Remembers the page a detail was opened from, so the detail renders in a drawer over it.
 * Links opened from inside a drawer keep the original page underneath.
 */
function useBackgroundState() {
  const location = useLocation();
  return { background: location.state?.background ?? location };
}

/** Link to a detail page that opens in the side drawer. */
export function DetailLink({ to, children, ...props }) {
  const state = useBackgroundState();
  return (
    <Link to={to} state={state} {...props}>
      {children}
    </Link>
  );
}

/** Imperative version of DetailLink, e.g. for calendar events: `openDetail('/bookings/5')`. */
// oxlint-disable-next-line react/only-export-components -- small helper colocated with DetailLink
export function useOpenDetail() {
  const navigate = useNavigate();
  const state = useBackgroundState();
  return useCallback((to) => navigate(to, { state }), [navigate, state]);
}

/** "← Back to …" link shown on full detail pages; hidden inside the drawer (it has a close button). */
export function BackLink({ to, children }) {
  if (useInDrawer()) return null;
  return (
    <Link to={to} className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
      <ArrowLeft size={14} /> {children}
    </Link>
  );
}
