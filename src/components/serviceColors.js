/* One colour per service, used by the calendar.

   12 hues; the order passes the dataviz validator's adjacent checks (lightness
   band, chroma floor, CVD and normal-vision separation) on the #FFFEFC surface.
   With more services than hues, or for colour-blind viewers, some colours will
   look alike, so colour is never the only cue: every event also shows the
   service name, and the legend can isolate one service. */
export const SERVICE_PALETTE = [
  "#7429C3", // purple
  "#E0662F", // orange
  "#159E73", // green
  "#2A78D6", // blue
  "#D9548A", // pink
  "#C99400", // gold
  "#0E9AA7", // teal
  "#B23A3A", // red
  "#6F8F1F", // olive
  "#9B59D0", // lilac
  "#B86E2C", // copper
  "#3D5BB8", // indigo
];

const FALLBACK = "#6E7683";

const key = (name) => String(name || "").trim().toLowerCase();

/* Colour follows the service (sorted by id), never its position on screen, so
   filtering or a new month never repaints a service. */
export function buildServiceColors(services = []) {
  const map = new Map();
  [...services]
    .sort((a, b) => Number(a.id) - Number(b.id))
    .forEach((s) => {
      // Two services with the same name share one colour.
      if (!map.has(key(s.name))) map.set(key(s.name), SERVICE_PALETTE[map.size % SERVICE_PALETTE.length]);
    });
  return map;
}

/* Unknown names (e.g. a deleted service) get a stable hashed hue. */
export function serviceColor(name, map) {
  const k = key(name);
  if (!k) return FALLBACK;
  if (map?.has(k)) return map.get(k);
  const hash = [...k].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7);
  return SERVICE_PALETTE[hash % SERVICE_PALETTE.length];
}

export const splitServices = (names) =>
  String(names || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

/* Tinted fill for an event block: the hue mixed into the surface. */
export const tint = (hex, amount = 0.14) => `color-mix(in srgb, ${hex} ${Math.round(amount * 100)}%, #FFFEFC)`;
