import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  Copy,
  Eye,
  GripVertical,
  Heading,
  Image as ImageIcon,
  Minus,
  MousePointerClick,
  MoveVertical,
  Pilcrow,
  Send,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import { Button, Card, Input, SectionTitle, Segmented } from "../components/ui";
import EmailPreview from "../components/EmailPreview";
import { DEFAULT_SETTINGS, fillPreview, NEW_BLOCK, STARTERS, withKey } from "../components/emailStarters";
import { useApi } from "../context/ApiContext";
import { useSession } from "../context/SessionContext";
import { useToast } from "../context/ToastContext";
import constanst from "../config/constants";

const BLOCKS = [
  { type: "heading", label: "Heading", icon: Heading },
  { type: "text", label: "Text", icon: Pilcrow },
  { type: "button", label: "Button", icon: MousePointerClick },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "divider", label: "Line", icon: Minus },
  { type: "spacer", label: "Space", icon: MoveVertical },
];
const BLOCK_LABEL = Object.fromEntries(BLOCKS.map((b) => [b.type, b]));

/** Personal details filled in for each client when the email is sent. */
const PERSONALIZE = [
  { token: "{first_name}", label: "First name" },
  { token: "{name}", label: "Full name" },
  { token: "{business}", label: "Business name" },
  { token: "{location}", label: "Branch" },
];

const SWATCHES = ["#7429c3", "#9b2c6f", "#c9302f", "#d9622b", "#b8860b", "#2f7d5b", "#127a7a", "#18324a", "#202235"];
const FONTS = { sans: "Helvetica, Arial, sans-serif", serif: "Georgia, 'Times New Roman', serif" };
const FULL_URL = /^https?:\/\/[^\s"'<>]+\.[^\s"'<>]+$/i;
const LINK = /^(https?:\/\/[^\s"'<>]+\.[^\s"'<>]+|mailto:\S+@\S+|tel:[+\d\s()-]+)$/i;
const DRAG_TYPE = "application/x-email-block";

/** What a block still needs before the email can be saved, or null. */
function blockProblem(b) {
  if (b.type === "heading" && !b.text.trim()) return "Type a heading";
  if (b.type === "text" && !b.text.trim()) return "Type some text";
  if (b.type === "button" && !b.label.trim()) return "Add the button text";
  if (b.type === "button" && !LINK.test(b.url.trim())) return "Add the link this button opens";
  if (b.type === "image" && !FULL_URL.test(b.src.trim())) return "Add the image link";
  if (b.type === "image" && b.link && !LINK.test(b.link.trim())) return "Check the link the image opens";
  return null;
}

/** Strips builder-only fields and empty optional values before saving. */
function toDesign(settings, blocks) {
  return {
    settings: { ...settings, logo_url: settings.logo_url?.trim() || null },
    blocks: blocks.map(({ _key, ...b }) => (b.type === "image" ? { ...b, link: b.link?.trim() || null } : b)),
  };
}

/** For the preview, unfinished blocks are skipped or given stand-in links. */
function previewDesign(settings, blocks) {
  return {
    settings: { ...settings, logo_url: FULL_URL.test(settings.logo_url?.trim() || "") ? settings.logo_url.trim() : null },
    blocks: blocks
      .filter((b) => !((b.type === "heading" || b.type === "text") && !b.text.trim()))
      .filter((b) => !(b.type === "image" && !FULL_URL.test(b.src.trim())))
      .map(({ _key, ...b }) => {
        if (b.type === "button") return { ...b, label: b.label.trim() || "Button", url: LINK.test(b.url.trim()) ? b.url.trim() : "https://example.com" };
        if (b.type === "image") return { ...b, link: b.link && LINK.test(b.link.trim()) ? b.link.trim() : null };
        return b;
      }),
  };
}

/** Readable text colour (white or dark) on a background colour. */
function inkOn(hex) {
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
  return 0.299 * r + 0.587 * g + 0.114 * b > 160 ? "#202235" : "#ffffff";
}

// ------------------------------------------------------------------ small controls

function AlignPicker({ value, onChange }) {
  const options = [
    ["left", AlignLeft],
    ["center", AlignCenter],
    ["right", AlignRight],
  ];
  return (
    <div role="radiogroup" aria-label="Alignment" className="inline-flex rounded-full border border-[var(--color-border)] bg-[var(--color-panel)] p-1">
      {options.map(([key, Icon]) => (
        <button
          key={key}
          type="button"
          role="radio"
          aria-checked={value === key}
          aria-label={`Align ${key}`}
          onClick={() => onChange(key)}
          className={`rounded-full px-3 py-1.5 ${value === key ? "bg-[var(--color-accent)] text-[var(--color-accent-ink)]" : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"}`}
        >
          <Icon size={15} />
        </button>
      ))}
    </div>
  );
}

function Field({ label, hint, children }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[12px] font-medium text-[var(--color-ink-2)]">{label}</p>
      {children}
      {hint && <p className="text-[11.5px] text-[var(--color-faint)]">{hint}</p>}
    </div>
  );
}

/** A textarea that grows with its text and looks like the email text it edits. */
function InlineText({ value, onChange, onFocus, style, placeholder, label, fieldRef }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, style.fontSize]);
  return (
    <textarea
      ref={(el) => {
        ref.current = el;
        if (fieldRef) fieldRef(el);
      }}
      rows={1}
      aria-label={label}
      value={value}
      placeholder={placeholder}
      onChange={(e) => onChange(e.target.value)}
      onFocus={onFocus}
      className="block w-full resize-none overflow-hidden border-0 bg-transparent p-0 outline-none placeholder:text-[#b3b0bd]"
      style={style}
    />
  );
}

// ------------------------------------------------------------------ canvas

/** One block drawn the way it will look in the email; headings and text are typed in place. */
function CanvasBlock({ block, settings, update, onFocusText }) {
  const font = FONTS[settings.font];
  const pad = { padding: "8px 32px", textAlign: block.align || "left" };
  switch (block.type) {
    case "heading":
      return (
        <div style={{ ...pad, padding: "16px 32px 4px" }}>
          <InlineText
            label="Heading"
            value={block.text}
            placeholder="Type a heading"
            onChange={(text) => update({ text })}
            onFocus={(e) => onFocusText(e.target, "text")}
            style={{ fontFamily: font, fontSize: block.size === "lg" ? 26 : 20, lineHeight: 1.25, fontWeight: 700, color: settings.text_color, textAlign: block.align }}
          />
        </div>
      );
    case "text":
      return (
        <div style={pad}>
          <InlineText
            label="Text"
            value={block.text}
            placeholder="Type your message"
            onChange={(text) => update({ text })}
            onFocus={(e) => onFocusText(e.target, "text")}
            style={{ fontFamily: font, fontSize: 15, lineHeight: 1.6, color: settings.text_color, textAlign: block.align }}
          />
        </div>
      );
    case "button":
      return (
        <div style={{ ...pad, padding: "16px 32px" }}>
          <span
            data-role="email-button"
            className="inline-block rounded-lg px-[26px] py-[13px] text-[15px] font-bold"
            style={{ background: settings.brand_color, color: inkOn(settings.brand_color), fontFamily: font }}
          >
            {block.label || "Button"}
          </span>
        </div>
      );
    case "image":
      return (
        <div style={{ padding: "12px 32px" }}>
          {FULL_URL.test(block.src.trim()) ? (
            <img src={block.src.trim()} alt={block.alt} className="block h-auto w-full rounded-lg" />
          ) : (
            <div className="flex h-36 flex-col items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-[#d9d4e4] bg-[#faf9fc] text-[12.5px] text-[#8a8796]">
              <ImageIcon size={22} />
              Paste an image link in the panel
            </div>
          )}
        </div>
      );
    case "divider":
      return (
        <div style={{ padding: "16px 32px" }}>
          <div className="h-px bg-[#e2dfe9]" />
        </div>
      );
    case "spacer":
      return <div style={{ height: block.height }} />;
    default:
      return null;
  }
}

// ------------------------------------------------------------------ side panel

function AddPanel({ onAdd, settings, setSetting, business }) {
  const [more, setMore] = useState(false);
  return (
    <div className="space-y-6">
      <div>
        <p className="text-[13px] font-semibold">Add content</p>
        <p className="mb-3 text-[12px] text-[var(--color-muted)]">Drag into your email, or click to add.</p>
        <div className="grid grid-cols-2 gap-2">
          {BLOCKS.map((b) => (
            <button
              key={b.type}
              type="button"
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(DRAG_TYPE, `new:${b.type}`);
                e.dataTransfer.effectAllowed = "copy";
              }}
              onClick={() => onAdd(b.type)}
              className="flex cursor-grab flex-col items-center gap-1.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-2 py-3.5 text-[12.5px] font-medium transition-colors hover:border-[var(--color-accent)] hover:bg-[var(--color-accent-soft)]/50 active:cursor-grabbing"
            >
              <b.icon size={18} className="text-[var(--color-accent)]" />
              {b.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 border-t border-[var(--color-border-soft)] pt-5">
        <p className="text-[13px] font-semibold">Style</p>
        <Field label="Brand colour">
          <div className="flex flex-wrap gap-2">
            {SWATCHES.map((c) => (
              <button
                key={c}
                type="button"
                aria-label={`Brand colour ${c}`}
                aria-pressed={settings.brand_color === c}
                onClick={() => setSetting("brand_color", c)}
                className={`h-7 w-7 rounded-full border-2 ${settings.brand_color === c ? "border-[var(--color-ink)] ring-2 ring-white ring-inset" : "border-transparent"}`}
                style={{ background: c }}
              />
            ))}
            <label className="relative h-7 w-7 cursor-pointer overflow-hidden rounded-full border border-dashed border-[var(--color-border)]" title="Custom colour">
              <span className="absolute inset-0 flex items-center justify-center text-[14px] text-[var(--color-muted)]">+</span>
              <input type="color" aria-label="Custom brand colour" value={settings.brand_color} onChange={(e) => setSetting("brand_color", e.target.value)} className="absolute inset-0 cursor-pointer opacity-0" />
            </label>
          </div>
        </Field>
        <Field label="Font">
          <Segmented value={settings.font} onChange={(v) => setSetting("font", v)} options={[{ key: "sans", label: "Modern" }, { key: "serif", label: "Classic" }]} />
        </Field>
        <Field label="Logo" hint={`Leave empty to show “${business}” in your brand colour.`}>
          <Input placeholder="Paste a link to your logo (https://…)" value={settings.logo_url} onChange={(e) => setSetting("logo_url", e.target.value)} />
        </Field>

        <button type="button" onClick={() => setMore((v) => !v)} aria-expanded={more} className="flex items-center gap-1 text-[12.5px] font-medium text-[var(--color-accent)]">
          More options <ChevronDown size={14} className={`transition-transform ${more ? "rotate-180" : ""}`} />
        </button>
        {more && (
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-[13px]">
              <input type="checkbox" checked={settings.show_header} onChange={(e) => setSetting("show_header", e.target.checked)} className="accent-[var(--color-accent)]" />
              Show logo / name at the top
            </label>
            {[
              ["background", "Page background"],
              ["content_background", "Email background"],
              ["text_color", "Text colour"],
            ].map(([key, label]) => (
              <label key={key} className="flex items-center justify-between text-[13px]">
                {label}
                <input type="color" aria-label={label} value={settings[key]} onChange={(e) => setSetting(key, e.target.value)} className="h-7 w-10 cursor-pointer rounded border border-[var(--color-border)] bg-transparent p-0.5" />
              </label>
            ))}
            <Field label="Inbox preview text" hint="The grey line shown after the subject in the inbox.">
              <Input maxLength={200} value={settings.preheader} onChange={(e) => setSetting("preheader", e.target.value)} />
            </Field>
          </div>
        )}
      </div>
    </div>
  );
}

function EditPanel({ block, update, onDone, onDuplicate, onDelete, onPersonalize }) {
  const meta = BLOCK_LABEL[block.type];
  const problem = blockProblem(block);
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <button type="button" onClick={onDone} className="flex items-center gap-1.5 text-[12.5px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
          <ArrowLeft size={14} /> Add content
        </button>
        <Button type="button" onClick={onDone}>Done</Button>
      </div>
      <p className="flex items-center gap-2 text-[15px] font-semibold">
        <meta.icon size={17} className="text-[var(--color-accent)]" /> {meta.label}
      </p>

      {(block.type === "heading" || block.type === "text") && (
        <>
          <p className="rounded-lg bg-[var(--color-accent-soft)] px-3 py-2 text-[12.5px] text-[var(--color-accent-dark)]">Type straight into the email to change the words.</p>
          {block.type === "heading" && (
            <Field label="Size">
              <Segmented value={block.size} onChange={(size) => update({ size })} options={[{ key: "lg", label: "Large" }, { key: "md", label: "Medium" }]} />
            </Field>
          )}
          <Field label="Alignment">
            <AlignPicker value={block.align} onChange={(align) => update({ align })} />
          </Field>
          <Field label="Personalise" hint="Each client sees their own details.">
            <div className="flex flex-wrap gap-1.5">
              {PERSONALIZE.map((p) => (
                <button key={p.token} type="button" onMouseDown={(e) => e.preventDefault()} onClick={() => onPersonalize(p.token)} className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-[12px] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]">
                  <UserRound size={12} /> {p.label}
                </button>
              ))}
            </div>
          </Field>
        </>
      )}

      {block.type === "button" && (
        <>
          <Input label="Button text" value={block.label} maxLength={80} onChange={(e) => update({ label: e.target.value })} />
          <Input label="When clicked, open" placeholder="https://your-booking-page.com" value={block.url === "https://" ? "" : block.url} onChange={(e) => update({ url: e.target.value })} />
          <Field label="Alignment">
            <AlignPicker value={block.align} onChange={(align) => update({ align })} />
          </Field>
        </>
      )}

      {block.type === "image" && (
        <>
          <Field label="Image link" hint="Right-click any online picture → “Copy image address”, then paste it here.">
            <Input placeholder="https://…/photo.jpg" value={block.src} onChange={(e) => update({ src: e.target.value })} />
          </Field>
          <Input label="Describe the image (optional)" value={block.alt} maxLength={200} onChange={(e) => update({ alt: e.target.value })} />
          <Input label="When clicked, open (optional)" placeholder="https://…" value={block.link || ""} onChange={(e) => update({ link: e.target.value })} />
        </>
      )}

      {block.type === "spacer" && (
        <Field label={`Height: ${block.height}px`}>
          <input type="range" min="8" max="80" step="4" value={block.height} onChange={(e) => update({ height: Number(e.target.value) })} className="block w-full accent-[var(--color-accent)]" />
        </Field>
      )}

      {block.type === "divider" && <p className="text-[12.5px] text-[var(--color-muted)]">A thin line that separates sections.</p>}

      {problem && <p className="rounded-lg bg-[var(--color-orange)]/10 px-3 py-2 text-[12.5px] text-[var(--color-orange)]">{problem}</p>}

      <div className="flex gap-2 border-t border-[var(--color-border-soft)] pt-4">
        <Button variant="ghost" type="button" onClick={onDuplicate}><Copy size={14} /> Duplicate</Button>
        <Button variant="ghost" type="button" onClick={onDelete} className="text-[var(--color-red)]"><Trash2 size={14} /> Delete</Button>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ preview dialog

function PreviewDialog({ html, error, subject, fromName, onClose, testTo, setTestTo, onSendTest }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-[var(--color-ink)]/45 p-4 sm:p-8" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div role="dialog" aria-modal="true" aria-label="Email preview" className="pop-in w-full max-w-[760px] rounded-[var(--radius-card)] bg-[var(--color-panel)] p-5 shadow-[0_30px_70px_rgba(32,34,53,0.3)]">
        <div className="mb-3 flex items-center justify-between">
          <p className="font-display text-[18px] font-medium">Preview</p>
          <button type="button" aria-label="Close preview" onClick={onClose} className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-panel-alt)]"><X size={18} /></button>
        </div>
        <EmailPreview html={html} error={error} subject={subject} fromName={fromName} />
        <p className="mt-2 text-[11.5px] text-[var(--color-faint)]">Shown for an example client, Ayesha Khan.</p>
        <form
          className="mt-4 flex flex-wrap items-end gap-2 border-t border-[var(--color-border-soft)] pt-4"
          onSubmit={(e) => {
            e.preventDefault();
            onSendTest();
          }}
        >
          <div className="min-w-[220px] flex-1">
            <Input label="Send a test to" type="email" required placeholder="you@example.com" value={testTo} onChange={(e) => setTestTo(e.target.value)} />
          </div>
          <Button type="submit" variant="ghost"><Send size={14} /> Send test</Button>
        </form>
      </div>
    </div>
  );
}

// ------------------------------------------------------------------ starter picker

function StarterPicker({ onPick }) {
  return (
    <Card className="p-6">
      <SectionTitle title="How would you like to start?" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STARTERS.map((s) => {
          const d = s.design();
          return (
            <button key={s.key} type="button" onClick={() => onPick(s)} className="group overflow-hidden rounded-xl border border-[var(--color-border)] text-left transition-all hover:-translate-y-0.5 hover:border-[var(--color-accent)] hover:shadow-[0_12px_30px_-12px_rgba(32,34,53,0.25)]">
              <div className="space-y-1.5 p-4" style={{ background: d.settings.background }}>
                <div className="space-y-1.5 rounded-lg bg-white p-3" style={{ borderTop: `3px solid ${d.settings.brand_color}` }}>
                  <div className="h-2 w-2/3 rounded bg-[#d9d4e4]" />
                  <div className="h-1.5 w-full rounded bg-[#ece9f0]" />
                  <div className="h-1.5 w-5/6 rounded bg-[#ece9f0]" />
                  {s.key !== "blank" && <div className="mt-2 h-3 w-1/3 rounded" style={{ background: d.settings.brand_color }} />}
                </div>
              </div>
              <div className="p-4">
                <p className="text-[14px] font-semibold">{s.name}</p>
                <p className="mt-1 text-[12px] text-[var(--color-muted)]">{s.description}</p>
              </div>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

// ------------------------------------------------------------------ page

/** Drag-and-drop email builder: the email is the canvas, the side panel follows the selection. */
export default function EmailTemplateBuilder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { fetchWithLoading } = useApi();
  const { addToast } = useToast();
  const { business, user } = useSession();

  const [loaded, setLoaded] = useState(!id);
  const [started, setStarted] = useState(Boolean(id));
  const [name, setName] = useState("");
  const [subject, setSubject] = useState("");
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [blocks, setBlocks] = useState([]);
  const [selected, setSelected] = useState(null);
  const [dropAt, setDropAt] = useState(null); // index where a dragged block would land
  const [dragging, setDragging] = useState(null); // key of the block being moved
  const [preview, setPreview] = useState(null); // { html, error } while the dialog is open
  const [testTo, setTestTo] = useState(user?.email || "");
  const [dirty, setDirty] = useState(false);
  const [showProblems, setShowProblems] = useState(false);
  const nameRef = useRef(null);
  const subjectRef = useRef(null);
  const focused = useRef(null); // { el, key, field } of the text box being typed in

  useEffect(() => {
    if (!id) return;
    fetchWithLoading(`${constanst.API_URL}/marketing/email-templates/${id}`).then(async (res) => {
      if (!res.ok) return navigate("/marketing/email-templates", { replace: true });
      const { data } = await res.json();
      setName(data.name);
      setSubject(data.subject);
      setSettings({ ...DEFAULT_SETTINGS, ...data.design.settings, logo_url: data.design.settings.logo_url || "" });
      setBlocks(data.design.blocks.map(withKey));
      setLoaded(true);
    });
  }, [fetchWithLoading, id, navigate]);

  // Warn before closing the tab with unsaved changes.
  useEffect(() => {
    if (!dirty) return undefined;
    const warn = (e) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  const pick = (starter) => {
    const d = starter.design();
    setName(starter.key === "blank" ? "Untitled email" : starter.name);
    setSubject(starter.subject);
    setSettings(d.settings);
    setBlocks(d.blocks);
    setStarted(true);
  };

  const edit = (next) => {
    setBlocks(next);
    setDirty(true);
  };
  const updateBlock = (key, patch) => edit(blocks.map((b) => (b._key === key ? { ...b, ...patch } : b)));
  const setSetting = (field, value) => {
    setSettings((s) => ({ ...s, [field]: value }));
    setDirty(true);
  };

  const insertAt = (index, type) => {
    const block = withKey(NEW_BLOCK[type]);
    edit([...blocks.slice(0, index), block, ...blocks.slice(index)]);
    setSelected(block._key);
  };
  /** Click on a tile: add below the selected block, or at the end. */
  const addBlock = (type) => {
    const at = blocks.findIndex((b) => b._key === selected);
    insertAt(at === -1 ? blocks.length : at + 1, type);
  };
  const moveTo = (key, index) => {
    const from = blocks.findIndex((b) => b._key === key);
    const next = blocks.filter((b) => b._key !== key);
    next.splice(index > from ? index - 1 : index, 0, blocks[from]);
    edit(next);
  };
  const duplicate = (key) => {
    const i = blocks.findIndex((b) => b._key === key);
    const copy = withKey(blocks[i]);
    edit([...blocks.slice(0, i + 1), copy, ...blocks.slice(i + 1)]);
    setSelected(copy._key);
  };
  const remove = (key) => {
    edit(blocks.filter((b) => b._key !== key));
    if (selected === key) setSelected(null);
  };

  /** Inserts a personal detail where the cursor is (in the email text or the subject). */
  const personalize = (token) => {
    const f = focused.current;
    if (!f?.el) return;
    const { el } = f;
    const start = el.selectionStart ?? el.value.length;
    const end = el.selectionEnd ?? start;
    const before = el.value.slice(0, start);
    const value = `${before}${before && !/\s$/.test(before) ? " " : ""}${token}${el.value.slice(end)}`;
    if (f.key === "subject") {
      setSubject(value);
      setDirty(true);
    } else {
      updateBlock(f.key, { [f.field]: value });
    }
    const caret = value.length - el.value.slice(end).length;
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(caret, caret);
    });
  };

  // ---- drag and drop (tiles from the panel, or blocks by their handle)
  const onDragOverBlock = (e, index) => {
    if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
    e.preventDefault();
    e.stopPropagation();
    const rect = e.currentTarget.getBoundingClientRect();
    setDropAt(e.clientY < rect.top + rect.height / 2 ? index : index + 1);
  };
  const onDrop = (e) => {
    const data = e.dataTransfer.getData(DRAG_TYPE);
    if (!data) return;
    e.preventDefault();
    const index = dropAt ?? blocks.length;
    const [kind, value] = data.split(":");
    if (kind === "new") insertAt(index, value);
    else moveTo(value, index);
    setDropAt(null);
    setDragging(null);
  };

  const problems = blocks.filter((b) => blockProblem(b));

  const save = useCallback(async () => {
    if (!name.trim()) {
      nameRef.current?.focus();
      addToast({ message: "Give your email a name first", type: "error" });
      return null;
    }
    if (!subject.trim()) {
      subjectRef.current?.focus();
      addToast({ message: "Add a subject line", type: "error" });
      return null;
    }
    if (blocks.length === 0) {
      addToast({ message: "Add something to your email first", type: "error" });
      return null;
    }
    const firstProblem = blocks.find((b) => blockProblem(b));
    if (firstProblem) {
      setShowProblems(true);
      setSelected(firstProblem._key);
      addToast({ message: `${blockProblem(firstProblem)} (highlighted in orange)`, type: "error" });
      return null;
    }
    const res = await fetchWithLoading(`${constanst.API_URL}/marketing/email-templates${id ? `/${id}` : ""}`, {
      method: id ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), subject: subject.trim(), design: toDesign(settings, blocks) }),
    });
    if (!res.ok) return null;
    const body = await res.json();
    setDirty(false);
    addToast({ message: body.message, type: "success" });
    if (!id) navigate(`/marketing/email-templates/${body.data.id}`, { replace: true });
    return body.data.id;
  }, [addToast, blocks, fetchWithLoading, id, name, navigate, settings, subject]);

  const openPreview = async () => {
    setPreview({ html: "", error: "" });
    const res = await fetchWithLoading(`${constanst.API_URL}/marketing/email-templates/preview`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subject, design: previewDesign(settings, blocks) }),
      silent: true,
    });
    const body = await res.json();
    setPreview(res.ok ? { html: body.data.html, error: "" } : { html: "", error: body.message });
  };

  const sendTest = async () => {
    const templateId = dirty || !id ? await save() : Number(id);
    if (!templateId) return;
    const res = await fetchWithLoading(`${constanst.API_URL}/marketing/test-send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channel: "email", to: testTo.trim(), email_template_id: templateId }),
    });
    if (res.ok) addToast({ message: (await res.json()).message, type: "success" });
  };

  const useInCampaign = async () => {
    const templateId = dirty || !id ? await save() : Number(id);
    if (templateId) navigate(`/marketing/new?template=${templateId}`);
  };

  const back = (
    <Link to="/marketing/email-templates" className="inline-flex items-center gap-1.5 text-[12px] text-[var(--color-muted)] hover:text-[var(--color-ink)]">
      <ArrowLeft size={14} /> All emails
    </Link>
  );

  if (!loaded) return back;
  if (!started) {
    return (
      <div className="space-y-5">
        {back}
        <StarterPicker onPick={pick} />
      </div>
    );
  }

  const selectedBlock = blocks.find((b) => b._key === selected);
  const font = FONTS[settings.font];
  const dropLine = <div className="pointer-events-none absolute inset-x-6 z-10 h-[3px] rounded-full bg-[var(--color-accent)] shadow-[0_0_0_3px_rgba(116,41,195,0.18)]" />;

  return (
    <div className="space-y-4">
      {/* Top bar: name, subject, and the two things people do most */}
      <Card className="p-3 sm:p-4">
        <div className="flex flex-wrap items-center gap-3">
          <Link to="/marketing/email-templates" aria-label="All emails" className="rounded-lg p-1.5 text-[var(--color-muted)] hover:bg-[var(--color-panel-alt)] hover:text-[var(--color-ink)]">
            <ArrowLeft size={18} />
          </Link>
          <input
            ref={nameRef}
            aria-label="Email name"
            value={name}
            maxLength={150}
            placeholder="Name this email"
            onChange={(e) => {
              setName(e.target.value);
              setDirty(true);
            }}
            className="min-w-[160px] flex-1 rounded-lg border border-transparent bg-transparent px-2 py-1.5 font-display text-[18px] font-medium outline-none hover:border-[var(--color-border)] focus:border-[var(--color-accent)]"
          />
          <div className="ml-auto flex items-center gap-2">
            {dirty ? <span className="hidden text-[12px] text-[var(--color-faint)] sm:inline">Unsaved changes</span> : id && <span className="hidden text-[12px] text-[var(--color-green)] sm:inline">Saved</span>}
            <Button variant="ghost" type="button" onClick={openPreview}><Eye size={14} /> Preview</Button>
            {id && !dirty && <Button variant="ghost" type="button" onClick={useInCampaign}><Send size={14} /> Use in a campaign</Button>}
            <Button type="button" onClick={save}>Save</Button>
          </div>
        </div>
        <div className="mt-3 flex items-center gap-2 border-t border-[var(--color-border-soft)] pt-3">
          <span className="w-16 shrink-0 text-[12.5px] text-[var(--color-muted)]">Subject</span>
          <input
            ref={subjectRef}
            aria-label="Subject"
            value={subject}
            maxLength={200}
            placeholder="What clients see in their inbox"
            onFocus={(e) => (focused.current = { el: e.target, key: "subject" })}
            onChange={(e) => {
              setSubject(e.target.value);
              setDirty(true);
            }}
            className="min-w-0 flex-1 rounded-lg border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 text-[13.5px] outline-none focus:border-[var(--color-accent)]"
          />
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => {
              if (focused.current?.key !== "subject") focused.current = { el: subjectRef.current, key: "subject" };
              personalize("{first_name}");
            }}
            className="hidden shrink-0 items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1.5 text-[12px] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)] sm:inline-flex"
          >
            <UserRound size={12} /> First name
          </button>
        </div>
      </Card>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[280px_minmax(0,1fr)]">
        {/* Side panel: add content + style, or the selected block's settings */}
        <Card className="order-2 h-fit p-5 lg:order-1 lg:sticky lg:top-20">
          {selectedBlock ? (
            <EditPanel
              block={selectedBlock}
              update={(patch) => updateBlock(selectedBlock._key, patch)}
              onDone={() => setSelected(null)}
              onDuplicate={() => duplicate(selectedBlock._key)}
              onDelete={() => remove(selectedBlock._key)}
              onPersonalize={personalize}
            />
          ) : (
            <AddPanel onAdd={addBlock} settings={settings} setSetting={setSetting} business={business?.name || "your business"} />
          )}
        </Card>

        {/* Canvas: the email itself */}
        <div
          className="order-1 rounded-[var(--radius-card)] px-3 py-6 sm:px-6 lg:order-2"
          style={{ background: settings.background }}
          onClick={(e) => e.target === e.currentTarget && setSelected(null)}
        >
          <div
            className="mx-auto w-full max-w-[600px] overflow-hidden rounded-xl shadow-[0_1px_3px_rgba(32,34,53,0.08),0_12px_32px_-16px_rgba(32,34,53,0.25)]"
            style={{ background: settings.content_background }}
            onDragOver={(e) => {
              if (!e.dataTransfer.types.includes(DRAG_TYPE)) return;
              e.preventDefault();
              if (e.target === e.currentTarget) setDropAt(blocks.length);
            }}
            onDragLeave={(e) => !e.currentTarget.contains(e.relatedTarget) && setDropAt(null)}
            onDrop={onDrop}
          >
            {settings.show_header && (
              <div className="px-8 pt-7 pb-3 text-center" style={{ borderTop: `4px solid ${settings.brand_color}` }}>
                {FULL_URL.test(settings.logo_url?.trim() || "") ? (
                  <img src={settings.logo_url.trim()} alt={business?.name} className="mx-auto h-12 w-auto" />
                ) : (
                  <span className="text-[20px] font-bold tracking-[0.3px]" style={{ color: settings.brand_color, fontFamily: font }}>{business?.name}</span>
                )}
              </div>
            )}

            {blocks.length === 0 && (
              <div className="m-6 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-[#d9d4e4] px-6 py-14 text-center text-[13px] text-[#8a8796]">
                <p className="font-semibold text-[#5d5a69]">Your email is empty</p>
                <p className="mt-1">Drag a block here from the left, or click one to add it.</p>
              </div>
            )}

            {blocks.map((b, i) => {
              const isSelected = selected === b._key;
              const problem = showProblems && blockProblem(b);
              return (
                <div
                  key={b._key}
                  data-testid="canvas-block"
                  data-type={b.type}
                  className={`group relative transition-shadow ${dragging === b._key ? "opacity-40" : ""} ${
                    isSelected
                      ? "z-[1] shadow-[inset_0_0_0_2px_var(--color-accent)]"
                      : problem
                        ? "shadow-[inset_0_0_0_2px_var(--color-orange)]"
                        : "hover:shadow-[inset_0_0_0_1px_rgba(116,41,195,0.35)]"
                  }`}
                  onClick={() => setSelected(b._key)}
                  onDragOver={(e) => onDragOverBlock(e, i)}
                >
                  {dropAt === i && <div className="absolute -top-[2px] inset-x-0">{dropLine}</div>}

                  {/* Handle and quick actions */}
                  <div className={`absolute top-1.5 right-1.5 z-20 flex items-center gap-0.5 rounded-lg border border-[var(--color-border)] bg-white p-0.5 text-[var(--color-muted)] shadow-sm ${isSelected ? "flex" : "hidden group-hover:flex"}`}>
                    <span
                      draggable
                      role="button"
                      tabIndex={-1}
                      aria-label="Drag to move"
                      title="Drag to move"
                      onDragStart={(e) => {
                        e.dataTransfer.setData(DRAG_TYPE, `move:${b._key}`);
                        e.dataTransfer.effectAllowed = "move";
                        e.dataTransfer.setDragImage(e.currentTarget.closest(".group"), 24, 16);
                        setDragging(b._key);
                      }}
                      onDragEnd={() => {
                        setDragging(null);
                        setDropAt(null);
                      }}
                      className="cursor-grab rounded p-1 hover:bg-[var(--color-panel-alt)] active:cursor-grabbing"
                    >
                      <GripVertical size={14} />
                    </span>
                    <button type="button" aria-label="Move up" disabled={i === 0} onClick={(e) => { e.stopPropagation(); moveTo(b._key, i - 1); }} className="rounded p-1 hover:bg-[var(--color-panel-alt)] disabled:opacity-30"><ArrowUp size={14} /></button>
                    <button type="button" aria-label="Move down" disabled={i === blocks.length - 1} onClick={(e) => { e.stopPropagation(); moveTo(b._key, i + 2); }} className="rounded p-1 hover:bg-[var(--color-panel-alt)] disabled:opacity-30"><ArrowDown size={14} /></button>
                    <button type="button" aria-label="Duplicate" onClick={(e) => { e.stopPropagation(); duplicate(b._key); }} className="rounded p-1 hover:bg-[var(--color-panel-alt)]"><Copy size={14} /></button>
                    <button type="button" aria-label="Delete" onClick={(e) => { e.stopPropagation(); remove(b._key); }} className="rounded p-1 hover:bg-[var(--color-panel-alt)] hover:text-[var(--color-red)]"><Trash2 size={14} /></button>
                  </div>

                  <CanvasBlock
                    block={b}
                    settings={settings}
                    update={(patch) => updateBlock(b._key, patch)}
                    onFocusText={(el, field) => {
                      focused.current = { el, key: b._key, field };
                      setSelected(b._key);
                    }}
                  />
                  {problem && <p className="px-8 pb-2 text-[11.5px] font-medium text-[var(--color-orange)]">{problem}</p>}
                </div>
              );
            })}
            {dropAt === blocks.length && blocks.length > 0 && <div className="relative h-2">{dropLine}</div>}
            <div className="h-4" />
          </div>

          <p className="mx-auto mt-4 max-w-[600px] text-center text-[11.5px] leading-relaxed" style={{ color: inkOn(settings.background) === "#ffffff" ? "#e7e4ee" : "#6e7683", fontFamily: font }}>
            {business?.name} · You are receiving this because you are a client. <u>Unsubscribe</u>
            <br />
            <span className="opacity-80">(Added to every email automatically)</span>
          </p>
          {problems.length > 0 && !showProblems && (
            <p className="mx-auto mt-2 max-w-[600px] text-center text-[12px] text-[var(--color-muted)]">
              {problems.length} block{problems.length > 1 ? "s" : ""} still need{problems.length > 1 ? "" : "s"} a link before saving.
            </p>
          )}
        </div>
      </div>

      {preview && (
        <PreviewDialog
          html={fillPreview(preview.html, { business: business?.name })}
          error={preview.error}
          subject={fillPreview(subject, { business: business?.name })}
          fromName={business?.name}
          onClose={() => setPreview(null)}
          testTo={testTo}
          setTestTo={setTestTo}
          onSendTest={sendTest}
        />
      )}
    </div>
  );
}
