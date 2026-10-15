/* The Salonifix mark: two open arcs on a 48-unit grid, drawn in currentColor
   (same path as the marketing site's Mark component). */
export default function Mark({ size = 24, className }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" className={className} aria-hidden="true" focusable="false">
      <path d="M32 16 A 8 8 0 1 0 24 24 A 8 8 0 1 1 16 32" stroke="currentColor" strokeWidth="6" strokeLinecap="round" />
    </svg>
  );
}
