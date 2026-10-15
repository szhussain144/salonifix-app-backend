import { useEffect, useRef, useState } from "react";
import { Monitor, Smartphone } from "lucide-react";
import { Segmented } from "./ui";

/**
 * Shows rendered email HTML in a sandboxed frame (no scripts) at desktop or phone width.
 * The frame grows to the email's height so the page scrolls, not the frame.
 */
export default function EmailPreview({ html, subject, fromName, toggle = true, error }) {
  const frame = useRef(null);
  const [device, setDevice] = useState("desktop");
  const [height, setHeight] = useState(480);

  useEffect(() => setHeight(480), [html]);

  const fit = () => {
    const doc = frame.current?.contentDocument;
    if (doc?.body) setHeight(Math.max(320, doc.documentElement.scrollHeight));
  };

  return (
    <div className="space-y-3">
      {toggle && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[10.5px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]">Preview</p>
          <Segmented
            value={device}
            onChange={setDevice}
            options={[
              { key: "desktop", label: "Desktop", icon: Monitor },
              { key: "mobile", label: "Phone", icon: Smartphone },
            ]}
          />
        </div>
      )}
      {(subject || fromName) && (
        <div className="rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-panel)] px-3.5 py-2.5 text-[12.5px]">
          {fromName && <p className="truncate text-[var(--color-muted)]">From: <b className="font-semibold text-[var(--color-ink)]">{fromName}</b></p>}
          {subject && <p className="truncate text-[var(--color-muted)]">Subject: <b className="font-semibold text-[var(--color-ink)]">{subject}</b></p>}
        </div>
      )}
      {error && <p role="alert" className="rounded-lg bg-[var(--color-red)]/8 px-3 py-2 text-[12px] text-[var(--color-red)]">{error}</p>}
      <div className="overflow-hidden rounded-xl border border-[var(--color-border)] bg-[var(--color-panel-alt)]">
        <iframe
          ref={frame}
          title="Email preview"
          sandbox="allow-same-origin"
          srcDoc={html || "<p style='font-family:sans-serif;color:#6e7683;padding:24px'>Add a block to see your email.</p>"}
          onLoad={fit}
          className="mx-auto block border-0 bg-white transition-[width] duration-200"
          style={{ width: device === "mobile" ? 375 : "100%", maxWidth: "100%", height }}
        />
      </div>
    </div>
  );
}
