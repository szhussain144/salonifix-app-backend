import { StickyNote } from "lucide-react";

/** Staff notes about a client (allergies, preferences), shown where staff will see them. */
export default function ClientNotes({ notes, compact = false }) {
  if (!notes?.trim()) return null;
  return (
    <div className={`flex items-start gap-2.5 rounded-xl border border-[var(--color-orange)]/30 bg-[var(--color-orange)]/10 ${compact ? "px-3 py-2" : "px-3.5 py-3"} text-[13px]`}>
      <StickyNote size={15} className="mt-0.5 shrink-0 text-[var(--color-orange)]" />
      <p className="whitespace-pre-line">
        <span className="font-semibold">Notes: </span>
        {notes}
      </p>
    </div>
  );
}
