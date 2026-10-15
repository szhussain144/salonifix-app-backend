import { useEffect, useRef, useState } from "react";

const NUMBER = /-?\d[\d,]*(\.\d+)?/;
const lessMotion = () => typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/**
 * Counts the number inside a value up to its new value: "PKR 12,450" rolls from the last value
 * shown (0 at first). Prefixes, suffixes, commas and decimals are kept; anything that isn't text
 * with a number in it is shown as it is.
 */
export default function AnimatedNumber({ value, duration = 900 }) {
  const text = typeof value === "number" ? String(value) : value;
  const match = typeof text === "string" ? NUMBER.exec(text) : null;
  const target = match ? Number(match[0].replace(/,/g, "")) : null;
  const [shown, setShown] = useState(() => (target === null || lessMotion() ? target : 0));
  const current = useRef(shown ?? 0);

  useEffect(() => {
    if (target === null) return undefined;
    if (lessMotion()) {
      current.current = target;
      setShown(target);
      return undefined;
    }
    const from = current.current;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const next = from + (target - from) * (1 - (1 - t) ** 3);
      current.current = next;
      setShown(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [target, duration]);

  if (!match) return value ?? null;
  const decimals = match[1] ? match[1].length - 1 : 0;
  const number = (shown ?? target).toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
    useGrouping: match[0].includes(","),
  });
  return (
    <span className="tabular-nums">
      {text.slice(0, match.index)}
      {number}
      {text.slice(match.index + match[0].length)}
    </span>
  );
}
