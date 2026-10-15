import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, ExternalLink, ImagePlus, PanelTop, Palette, Trash2 } from "lucide-react";
import { headerStyle } from "./brandColors";
import { Button, Input } from "./ui";
import { UpgradeNote } from "./Upgrade";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

/* Top bar colours: the app's navy (default), black, white, and a few brand-friendly tones. */
const HEADER_SWATCHES = [["", "#18324A", "Navy (default)"], ["#111111", "#111111", "Black"], ["#FFFFFF", "#FFFFFF", "White"], ["#4A1D6E", "#4A1D6E", "Plum"], ["#7A2350", "#7A2350", "Berry"], ["#1F4D45", "#1F4D45", "Forest"]];
const SWATCHES = ["#7429C3", "#B0407A", "#2F7D6B", "#47769D", "#C2410C", "#18324A"];
const FLAGS = [
  ["show_prices", "Show prices", "Turn off if you'd rather discuss prices in person."],
  ["choose_staff", "Let clients choose who they'd like", "Off: every booking goes to the first free team member."],
  ["allow_groups", "Allow group bookings", "Clients can book for friends at the same time. Each person needs their own team member, so a branch with one person on the team takes one booking at a time."],
  ["ask_notes", "Ask “Anything we should know?”", "A free-text note with each booking."],
];
const TABS = [
  ["show_services", "Book a visit", "Services, team member and time."],
  ["show_packages", "Packages", "Prepaid bundles. Clients send a request and pay at the salon."],
  ["show_memberships", "Memberships", "Monthly or annual plans. Clients send a request and pay at the salon."],
];

/** Shrinks a photo in the browser so the banner stays small: at most 1600 px wide, JPEG. */
function shrink(file) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 1600 / img.width);
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = () => reject(new Error("That file isn't an image we can read"));
    img.src = URL.createObjectURL(file);
  });
}

/**
 * Settings → Online booking → Booking page: the page's name, headline, welcome text, banner and
 * colour; what the form asks; and which tabs it shows. Saved on its own, with a live preview.
 */
/** `locked`: the plan has no booking page design (Popular), so it shows read-only with an upgrade note. */
export default function BookingPageSettings({ slug, locked = false }) {
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { business, isManager } = useSession();
  const [page, setPage] = useState(null);
  const [saved, setSaved] = useState(null);
  // How many packages / plans are for sale: an empty tab is hidden on the page.
  const [forSale, setForSale] = useState({ packages: null, memberships: null });
  const fileRef = useRef(null);
  const url = `${constanst.API_URL}/business/booking-page`;

  useEffect(() => {
    fetchWithLoading(url, { silent: true }).then(async (res) => {
      if (!res.ok) return;
      const data = (await res.json()).data;
      setPage(data);
      setSaved(data);
    });
  }, [fetchWithLoading, url]);

  useEffect(() => {
    const count = async (path) => {
      const res = await fetchWithLoading(`${constanst.API_URL}${path}`, { silent: true });
      return res.ok ? (await res.json()).data.filter((x) => x.is_active).length : null;
    };
    Promise.all([count("/packages"), count("/memberships/plans")]).then(([packages, memberships]) => setForSale({ packages, memberships }));
  }, [fetchWithLoading]);

  if (!page) return null;
  const set = (patch) => setPage((p) => ({ ...p, ...patch }));
  const dirty = JSON.stringify(page) !== JSON.stringify(saved);
  const accent = page.accent_color || "#7429C3";
  const banner = page.has_banner && slug ? `${constanst.API_URL}/public/book/${slug}/banner?v=${page.banner_version}` : null;

  const save = async () => {
    const { banner_version: _v, has_banner: _h, ...body } = page;
    const res = await fetchWithLoading(url, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...body, accent_color: body.accent_color || "" }) });
    if (!res.ok) return;
    const data = (await res.json()).data;
    setPage(data);
    setSaved(data);
    addToast({ message: "Booking page saved", type: "success" });
  };

  const upload = async (file) => {
    if (!file) return;
    try {
      const image = await shrink(file);
      const res = await fetchWithLoading(`${url}/banner`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ image }) });
      if (!res.ok) return;
      const data = (await res.json()).data;
      setPage((p) => ({ ...p, has_banner: data.has_banner, banner_version: data.banner_version }));
      setSaved((p) => ({ ...p, has_banner: data.has_banner, banner_version: data.banner_version }));
      addToast({ message: "Banner updated", type: "success" });
    } catch (e) {
      addToast({ message: e.message, type: "error" });
    }
  };

  const removeBanner = async () => {
    const res = await fetchWithLoading(`${url}/banner`, { method: "DELETE" });
    if (!res.ok) return;
    setPage((p) => ({ ...p, has_banner: false }));
    setSaved((p) => ({ ...p, has_banner: false }));
  };

  // A tab switched on with nothing in it is hidden on the page; say so here.
  const emptyTab = (key) =>
    (key === "show_packages" && page.show_packages && forSale.packages === 0) || (key === "show_memberships" && page.show_memberships && forSale.memberships === 0);
  const toggle = (key) => (
    <input type="checkbox" checked={Boolean(page[key])} disabled={!isManager} onChange={(e) => set({ [key]: e.target.checked })} className="mt-0.5 accent-[var(--color-accent)]" />
  );
  const card = "rounded-xl border border-[var(--color-border-soft)] bg-[var(--color-panel-alt)] p-4";
  const heading = "mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-[var(--color-faint)]";

  return (
    <div className="mt-8 space-y-4 border-t border-[var(--color-border-soft)] pt-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h3 className="font-display text-[18px] font-medium">Booking page</h3>
          <p className="text-[12.5px] text-[var(--color-muted)]">Your branding, what the form asks, and what clients can choose.</p>
        </div>
        <div className="flex gap-2">
          {slug && (
            <a href={`/book/${slug}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-border)] px-3.5 py-2 text-[12.5px] font-medium hover:border-[var(--color-accent)]">
              <ExternalLink size={13} /> Open page
            </a>
          )}
          {isManager && !locked && (
            <Button type="button" onClick={save} disabled={!dirty}>
              {dirty ? "Save booking page" : "Saved"}
            </Button>
          )}
        </div>
      </div>

      <UpgradeNote feature="booking_page_design">
        <b className="font-semibold text-[var(--color-ink)]">Your banner, colours, tabs and form options</b> come with Popular. Until then the page uses the standard design.
      </UpgradeNote>
      <fieldset disabled={locked} className={`grid min-w-0 gap-5 lg:grid-cols-[minmax(0,1fr)_300px] ${locked ? "pointer-events-none opacity-55" : ""}`}>
        <div className="space-y-4">
          <section className={card}>
            <p className={heading}>Branding</p>
            <div className="space-y-3">
              <Input label="Name on the page" placeholder={business?.name} value={page.display_name || ""} disabled={!isManager} onChange={(e) => set({ display_name: e.target.value })} maxLength={120} />
              <Input label="Headline" placeholder="e.g. Book your next look" value={page.headline || ""} disabled={!isManager} onChange={(e) => set({ headline: e.target.value })} maxLength={160} />
              <label className="block">
                <span className="mb-1.5 block text-[12px] text-[var(--color-muted)]">Welcome text</span>
                <textarea rows={2} maxLength={600} placeholder="e.g. Walk-ins welcome. Free parking behind the building." value={page.intro || ""} disabled={!isManager} onChange={(e) => set({ intro: e.target.value })} className="w-full rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2.5 text-[13px] outline-none focus:border-[var(--color-accent)]/60" />
              </label>
              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-[12px] text-[var(--color-muted)]"><Palette size={13} /> Colour</span>
                <div className="flex flex-wrap items-center gap-2">
                  {SWATCHES.map((c) => (
                    <button
                      key={c}
                      type="button"
                      aria-label={`Colour ${c}`}
                      aria-pressed={accent.toLowerCase() === c.toLowerCase()}
                      disabled={!isManager}
                      onClick={() => set({ accent_color: c })}
                      className={`h-7 w-7 rounded-full transition-transform hover:scale-110 ${accent.toLowerCase() === c.toLowerCase() ? "ring-2 ring-offset-2 ring-[var(--color-ink)]" : ""}`}
                      style={{ background: c }}
                    />
                  ))}
                  <input type="color" aria-label="Custom colour" value={accent} disabled={!isManager} onChange={(e) => set({ accent_color: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-[var(--color-border)] bg-transparent" />
                </div>
              </div>
              <div>
                <span className="mb-1.5 flex items-center gap-1.5 text-[12px] text-[var(--color-muted)]"><PanelTop size={13} /> Top bar</span>
                <div className="flex flex-wrap items-center gap-2">
                  {HEADER_SWATCHES.map(([value, shown, label]) => {
                    const on = (page.header_color || "").toLowerCase() === value.toLowerCase();
                    return (
                      <button
                        key={label}
                        type="button"
                        title={label}
                        aria-label={`Top bar ${label}`}
                        aria-pressed={on}
                        disabled={!isManager}
                        onClick={() => set({ header_color: value || null })}
                        className={`h-7 w-7 rounded-full border border-[var(--color-border)] transition-transform hover:scale-110 ${on ? "ring-2 ring-offset-2 ring-[var(--color-ink)]" : ""}`}
                        style={{ background: shown }}
                      />
                    );
                  })}
                  <input type="color" aria-label="Custom top bar colour" value={page.header_color || "#18324A"} disabled={!isManager} onChange={(e) => set({ header_color: e.target.value })} className="h-7 w-9 cursor-pointer rounded border border-[var(--color-border)] bg-transparent" />
                  <button type="button" disabled={!isManager} onClick={() => set({ header_color: accent })} className="text-[12px] font-medium text-[var(--color-accent)] hover:underline">
                    Same as colour
                  </button>
                </div>
              </div>
              <div>
                <span className="mb-1.5 block text-[12px] text-[var(--color-muted)]">Banner</span>
                <div className="flex flex-wrap items-center gap-3">
                  {banner ? <img src={banner} alt="Banner" className="h-16 w-40 rounded-lg object-cover" /> : <span className="flex h-16 w-40 items-center justify-center rounded-lg border border-dashed border-[var(--color-border)] text-[11.5px] text-[var(--color-faint)]">No banner</span>}
                  {isManager && (
                    <>
                      <input ref={fileRef} type="file" accept="image/*" className="hidden" aria-label="Banner image" onChange={(e) => upload(e.target.files?.[0])} />
                      <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()}>
                        <ImagePlus size={14} /> {banner ? "Change" : "Upload"}
                      </Button>
                      {banner && (
                        <Button type="button" variant="ghost" onClick={removeBanner}>
                          <Trash2 size={14} /> Remove
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <p className="mt-1 text-[11.5px] text-[var(--color-faint)]">A wide photo of your salon works best. It's resized for you.</p>
              </div>
            </div>
          </section>

          <section className={card}>
            <p className={heading}>Tabs on the page</p>
            <div className="space-y-2.5">
              {TABS.map(([key, label, hint]) => (
                <label key={key} className="flex items-start gap-2.5 text-[13px]">
                  {toggle(key)}
                  <span>
                    <span className="font-medium">{label}</span>
                    <span className="block text-[12px] text-[var(--color-muted)]">{hint}</span>
                    {emptyTab(key) && (
                      <span className="mt-1 flex items-center gap-1.5 text-[12px] font-medium text-[var(--color-orange)]">
                        <AlertTriangle size={13} /> Nothing for sale yet, so this tab stays hidden.
                        <Link to={key === "show_packages" ? "/packages" : "/memberships"} className="text-[var(--color-accent)] hover:underline">
                          Add {key === "show_packages" ? "a package" : "a plan"}
                        </Link>
                      </span>
                    )}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <section className={card}>
            <p className={heading}>The form</p>
            <div className="space-y-2.5">
              {FLAGS.map(([key, label, hint]) => (
                <label key={key} className="flex items-start gap-2.5 text-[13px]">
                  {toggle(key)}
                  <span>
                    <span className="font-medium">{label}</span>
                    <span className="block text-[12px] text-[var(--color-muted)]">{hint}</span>
                  </span>
                </label>
              ))}
              {page.allow_groups && (
                <label className="flex items-center gap-2.5 pl-6 text-[13px]">
                  Up to
                  <select aria-label="Largest group" value={page.max_group_size} disabled={!isManager} onChange={(e) => set({ max_group_size: Number(e.target.value) })} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5">
                    {[2, 3, 4, 5, 6].map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                  people per booking
                </label>
              )}
              <label className="flex items-center gap-2.5 text-[13px]">
                <span className="font-medium">Email address</span>
                <select aria-label="Email address" value={page.ask_email} disabled={!isManager} onChange={(e) => set({ ask_email: e.target.value })} className="rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-1.5">
                  <option value="optional">Optional</option>
                  <option value="required">Required</option>
                  <option value="hidden">Don't ask</option>
                </select>
              </label>
            </div>
          </section>
        </div>

        {/* Live preview: roughly how the top of the page looks on a phone. */}
        <div className="lg:sticky lg:top-24 lg:self-start">
          <p className={heading}>Preview</p>
          <div className="overflow-hidden rounded-[28px] border-[6px] border-[var(--color-ink)] bg-[var(--color-bg)] shadow-[0_20px_50px_-20px_rgba(32,34,53,0.45)]">
            <div className="bg-[var(--color-navy)] px-4 py-3 font-display text-[14px] text-[var(--color-navy-ink)]" style={headerStyle(page.header_color)}>{page.display_name || business?.name}</div>
            {banner ? (
              <div className="relative">
                <img src={banner} alt="" className="h-28 w-full object-cover" />
                {(page.headline || page.intro) && (
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 to-transparent px-3 pb-2 pt-6 text-white">
                    {page.headline && <p className="font-display text-[14px] leading-tight">{page.headline}</p>}
                    {page.intro && <p className="line-clamp-2 text-[10.5px] opacity-90">{page.intro}</p>}
                  </div>
                )}
              </div>
            ) : (
              (page.headline || page.intro) && (
                <div className="px-4 pt-3">
                  {page.headline && <p className="font-display text-[15px] leading-tight">{page.headline}</p>}
                  {page.intro && <p className="line-clamp-2 text-[11px] text-[var(--color-muted)]">{page.intro}</p>}
                </div>
              )
            )}
            <div className="space-y-2 p-4">
              {TABS.filter(([k]) => page[k] && !emptyTab(k)).length > 1 && (
                <div className="flex gap-1 rounded-full bg-[var(--color-panel-alt)] p-0.5 text-[10.5px] font-semibold">
                  {TABS.filter(([k]) => page[k] && !emptyTab(k)).map(([k, label], i) => (
                    <span key={k} className="flex-1 rounded-full px-2 py-1 text-center" style={i === 0 ? { background: accent, color: "white" } : { color: "var(--color-muted)" }}>
                      {label}
                    </span>
                  ))}
                </div>
              )}
              {["Haircut", "Facial"].map((s, i) => (
                <div key={s} className="flex items-center justify-between rounded-xl border px-3 py-2 text-[11.5px]" style={i === 0 ? { borderColor: accent, background: `color-mix(in srgb, ${accent} 12%, white)` } : {}}>
                  <span className="font-medium">{s}</span>
                  {page.show_prices && <span className="font-semibold">PKR {i ? "2,500" : "800"}</span>}
                </div>
              ))}
              <div className="pt-1 text-right">
                <span className="inline-block rounded-full px-4 py-1.5 text-[11px] font-semibold text-white" style={{ background: accent }}>Continue</span>
              </div>
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  );
}
