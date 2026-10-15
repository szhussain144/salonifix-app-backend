/** Colours a business picks for its booking page (Settings → Online booking → Booking page). */

const HEX = /^#[0-9a-fA-F]{6}$/;

/** The page's accent colour for buttons and highlights. */
export const accentStyle = (color) =>
  HEX.test(color || "")
    ? { "--color-accent": color, "--color-accent-dark": `color-mix(in srgb, ${color} 80%, black)`, "--color-accent-soft": `color-mix(in srgb, ${color} 12%, white)` }
    : undefined;

/** True when dark text reads better than white on this colour. */
export function isLight(color) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(color.slice(i, i + 2), 16) / 255);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.6;
}

/** The top bar's own colour, with light or dark text, whichever reads better on it. */
export function headerStyle(color) {
  if (!HEX.test(color || "")) return undefined;
  const light = isLight(color);
  return {
    background: color,
    "--color-navy-ink": light ? "#1f2030" : "#ffffff",
    "--color-navy-ink-2": light ? "rgba(31,32,48,0.65)" : "rgba(255,255,255,0.75)",
    "--header-line": light ? "rgba(31,32,48,0.2)" : "rgba(255,255,255,0.2)",
  };
}
