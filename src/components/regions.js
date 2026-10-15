import { useEffect, useState } from "react";
import constanst from "../config/constants";

/* Countries, currencies and time zones from the API (loaded once per visit). */
let pending = null;

export function loadRegions() {
  if (!pending) {
    pending = fetch(`${constanst.API_URL}/public/regions`)
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error("Could not load countries"))))
      .then((body) => body.data)
      .catch((error) => {
        pending = null;
        throw error;
      });
  }
  return pending;
}

export function useRegions() {
  const [regions, setRegions] = useState(null);
  useEffect(() => {
    let live = true;
    loadRegions()
      .then((data) => live && setRegions(data))
      .catch(() => live && setRegions({ countries: [], currencies: [], time_zones: [] }));
    return () => {
      live = false;
    };
  }, []);
  return regions;
}

/* "GMT+05:00" for a zone right now. */
export function zoneOffset(zone) {
  try {
    return new Intl.DateTimeFormat("en", { timeZone: zone, timeZoneName: "longOffset" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value || "";
  } catch {
    return "";
  }
}

/* The country this browser is probably in: its time zone, then its language. */
export function guessCountry(countries) {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const byZone = countries.find((c) => c.time_zones[0] === zone) || countries.find((c) => c.time_zones.includes(zone));
  if (byZone) return byZone.code;
  const region = (navigator.language || "").split("-")[1]?.toUpperCase();
  return countries.some((c) => c.code === region) ? region : null;
}

/* Time zone options: the country's own zones first, then every other zone. */
export function zoneOptions(regions, country) {
  if (!regions) return [];
  const own = regions.countries.find((c) => c.code === country)?.time_zones || [];
  const label = (z) => `${z.replace(/_/g, " ")} (${zoneOffset(z)})`;
  return [...own.map((z) => ({ value: z, label: label(z) })), ...regions.time_zones.filter((z) => !own.includes(z)).map((z) => ({ value: z, label: label(z) }))];
}
