/* The Salonifix mark (Brand Guide, 01 Logo): a salon chair reduced to four
   round-capped strokes, back with headrest, seat, post and foot, on a
   48-unit grid. Drawn in currentColor so it takes the lockup colour it sits on.

   Stroke is 7 of 48, thickened at small sizes as the guide specifies
   (8 at 32px, 9 at 16px) so it stays legible. Never thin, rotate or recolour
   it outside the palette. */
const CHAIR_PATHS = [
  "M14.5 26 V 13 A 5 5 0 0 1 19.5 8", // back and headrest
  "M14.5 26 H 33.5", // seat
  "M24.5 26 V 40", // post
  "M17.5 40 H 31.5", // foot
];

const strokeFor = (size) => (size <= 16 ? 9 : size <= 32 ? 8 : 7);

export default function Mark({ size = 24, className }) {
  return (
    <svg viewBox="0 0 48 48" width={size} height={size} fill="none" className={className} aria-hidden="true" focusable="false">
      <g stroke="currentColor" strokeWidth={strokeFor(size)} strokeLinecap="round" strokeLinejoin="round">
        {CHAIR_PATHS.map((d) => (
          <path key={d} d={d} />
        ))}
      </g>
    </svg>
  );
}
