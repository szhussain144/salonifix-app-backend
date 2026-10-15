import { useId, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  Line,
  ComposedChart,
  CartesianGrid,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { dateLocale, formatAmount, formatCompact, formatDay, toNumber } from "./format";

/* Chart tokens. Hex (not CSS vars) because SVG presentation attributes don't
   resolve var() reliably. Keep in step with index.css. */
const CHART = {
  accent: "#7429C3",
  surface: "#FFFEFC",
  grid: "#ECE9F0",
  axis: "#6E7683",
  ink: "#202235",
  muted: "#586571",
  track: "#EFE6FB",
  other: "#9AA0AC",
  /* Comparison period (last month / last year): a lighter step of the accent, so
     "before" reads as the quieter of the two. Ordinal pair validated (one hue,
     monotone lightness, light end clears the surface). Also drawn dashed. */
  previous: "#B48AF7",
};

/* Categorical order, validated (light surface #FFFEFC): lightness band, chroma
   floor, adjacent CVD separation, normal-vision floor and 3:1 contrast all
   pass. Assign in this order, never cycle; a 6th+ series folds into "Other". */
/* Charts skip their entrance animation for readers who ask for reduced motion. */
const animate = typeof window === "undefined" || !window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const SERIES = ["#7429C3", "#E0662F", "#159E73", "#2A78D6", "#D9548A"];


/* Tooltip: value leads (strong), label follows; series keyed by a short line. */
function ChartTooltip({ active, payload, label, labelFormatter, valueFormatter, color = CHART.accent }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 shadow-[0_10px_30px_rgba(32,34,53,0.14)]">
      <p className="text-[11px] text-[var(--color-muted)]">{labelFormatter ? labelFormatter(label) : label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="mt-0.5 flex items-center gap-2 text-[13px] font-semibold text-[var(--color-ink)] tabular-nums">
          <span className="h-[2px] w-3 rounded-full" style={{ background: p.color || color }} aria-hidden="true" />
          {valueFormatter ? valueFormatter(p.value) : p.value}
        </p>
      ))}
    </div>
  );
}

/* Chart | Table segmented switch. Every chart has a table twin so no value is
   gated behind hover. */
export function ViewToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded-full bg-[var(--color-panel-alt)] p-0.5 text-[12px] font-medium" role="tablist">
      {["chart", "table"].map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={`rounded-full px-3 py-1 capitalize transition-colors ${
            value === v
              ? "bg-[var(--color-panel)] text-[var(--color-ink)] shadow-[0_1px_2px_rgba(32,34,53,0.12)]"
              : "text-[var(--color-muted)] hover:text-[var(--color-ink)]"
          }`}
        >
          {v}
        </button>
      ))}
    </div>
  );
}

export function DataTable({ rows, columns }) {
  return (
    <div className="overflow-x-auto scrollbar-none">
      <table className="w-full text-left text-[13px]">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-[10.5px] font-semibold uppercase tracking-[0.12em] text-[var(--color-faint)]">
            {columns.map((c) => (
              <th key={c.key} className={`pb-2.5 pr-4 ${c.align === "right" ? "text-right" : ""}`}>
                {c.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b border-[var(--color-border-soft)] last:border-none">
              {columns.map((c) => (
                <td key={c.key} className={`py-2 pr-4 tabular-nums ${c.align === "right" ? "text-right font-medium" : ""}`}>
                  {c.format ? c.format(r[c.key]) : r[c.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function ChartEmpty({ children = "No data for this period yet.", height = 200 }) {
  return (
    <div
      className="flex items-center justify-center rounded-xl border border-dashed border-[var(--color-border)] bg-[var(--color-panel-alt)]/50 text-[13px] text-[var(--color-muted)]"
      style={{ height }}
    >
      {children}
    </div>
  );
}

/* Single-series trend: 2px line, ~10% area wash, hairline solid grid, compact
   y ticks, crosshair tooltip. The container height includes the x-axis band. */
export function TrendChart({ data, xKey, yKey, height = 240, valueFormatter = formatAmount, label }) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const hasValues = data?.some((d) => toNumber(d[yKey]) > 0);
  if (!data?.length) return <ChartEmpty height={height} />;

  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`wash-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.accent} stopOpacity={0.16} />
              <stop offset="100%" stopColor={CHART.accent} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.grid} strokeWidth={1} />
          <XAxis
            dataKey={xKey}
            tickFormatter={(v) => formatDay(v)}
            tick={{ fill: CHART.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: CHART.grid }}
            tickMargin={8}
            interval="preserveStartEnd"
          />
          <YAxis
            tickFormatter={(v) => formatCompact(v)}
            tick={{ fill: CHART.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
            domain={hasValues ? [0, "auto"] : [0, 1000]}
          />
          <Tooltip
            cursor={{ stroke: "#C9C2D6", strokeWidth: 1 }}
            content={<ChartTooltip labelFormatter={(v) => formatDay(v, { long: true })} valueFormatter={valueFormatter} />}
          />
          <Area
            type="monotone"
            dataKey={yKey}
            stroke={CHART.accent}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={`url(#wash-${id})`}
            dot={false}
            activeDot={{ r: 5, fill: CHART.accent, stroke: CHART.surface, strokeWidth: 2 }}
            isAnimationActive={animate}
            animationDuration={700}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Single-series ranking: horizontal bars, one hue, sorted high->low, <=24px
   thick, 4px rounded data-end, value at the tip. */
export function RankBars({ data, nameKey, valueKey, valueFormatter = (v) => formatAmount(v, { short: true }), label }) {
  const rows = [...(data || [])]
    .map((d) => ({ ...d, [valueKey]: toNumber(d[valueKey]) }))
    .sort((a, b) => b[valueKey] - a[valueKey]);
  if (!rows.length) return <ChartEmpty />;
  const height = rows.length * 40 + 16;

  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 72, left: 0, bottom: 4 }} barCategoryGap={10}>
          <CartesianGrid horizontal={false} stroke={CHART.grid} strokeWidth={1} />
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis
            type="category"
            dataKey={nameKey}
            width={110}
            tick={{ fill: CHART.ink, fontSize: 12 }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            cursor={{ fill: "rgba(116,41,195,0.06)" }}
            content={<ChartTooltip valueFormatter={(v) => formatAmount(v)} />}
          />
          <Bar dataKey={valueKey} fill={CHART.accent} barSize={18} radius={[0, 4, 4, 0]} isAnimationActive={animate} animationDuration={700}>
            <LabelList dataKey={valueKey} position="right" formatter={valueFormatter} fill={CHART.ink} fontSize={12} fontWeight={600} />
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Part-to-whole as one stacked bar (2px surface gaps, 4px rounded ends) plus a
   legend that carries name, value and share, so colour is never the only key. */
export function ShareBar({ items, valueFormatter = formatAmount }) {
  const [hover, setHover] = useState(null);
  const sorted = [...(items || [])]
    .map((i) => ({ ...i, value: toNumber(i.value) }))
    .filter((i) => i.value > 0)
    .sort((a, b) => b.value - a.value);
  const head = sorted.slice(0, SERIES.length - (sorted.length > SERIES.length ? 1 : 0));
  const tail = sorted.slice(head.length);
  const rows = [
    ...head.map((i, n) => ({ ...i, color: SERIES[n] })),
    ...(tail.length ? [{ name: "Other", value: tail.reduce((s, i) => s + i.value, 0), color: CHART.other }] : []),
  ];
  const total = rows.reduce((s, r) => s + r.value, 0);
  if (!total) return <ChartEmpty height={120}>No payments recorded yet.</ChartEmpty>;
  const pct = (v) => `${Math.round((v / total) * 100)}%`;

  return (
    <div>
      <p className="text-[12px] text-[var(--color-muted)]">Total collected</p>
      <p className="mb-4 text-[24px] font-semibold tracking-tight text-[var(--color-ink)]">{valueFormatter(total)}</p>
      <div className="flex h-3 w-full gap-[2px]" role="img" aria-label="Share of sales by payment method">
        {rows.map((r, i) => (
          <div
            key={r.name}
            onMouseEnter={() => setHover(r.name)}
            onMouseLeave={() => setHover(null)}
            title={`${r.name}: ${valueFormatter(r.value)} (${pct(r.value)})`}
            className={`h-full transition-opacity ${i === 0 ? "rounded-l-[4px]" : ""} ${i === rows.length - 1 ? "rounded-r-[4px]" : ""}`}
            style={{ width: `${(r.value / total) * 100}%`, minWidth: 4, background: r.color, opacity: hover && hover !== r.name ? 0.35 : 1 }}
          />
        ))}
      </div>
      <ul className="mt-4 space-y-2.5">
        {rows.map((r) => (
          <li
            key={r.name}
            onMouseEnter={() => setHover(r.name)}
            onMouseLeave={() => setHover(null)}
            className={`flex items-center justify-between gap-3 text-[13px] transition-opacity ${hover && hover !== r.name ? "opacity-50" : ""}`}
          >
            <span className="flex min-w-0 items-center gap-2 text-[var(--color-ink-2)]">
              <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: r.color }} aria-hidden="true" />
              <span className="truncate capitalize">{r.name}</span>
            </span>
            <span className="flex shrink-0 items-baseline gap-2 tabular-nums">
              <span className="font-semibold text-[var(--color-ink)]">{valueFormatter(r.value)}</span>
              <span className="w-9 text-right text-[12px] text-[var(--color-muted)]">{pct(r.value)}</span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* Ratio against a whole: accent fill on a lighter step of the same hue. */
export function Meter({ value, max, label, tone = CHART.accent, track = CHART.track }) {
  const ratio = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  return (
    <div>
      {label && (
        <div className="mb-1.5 flex items-center justify-between text-[12px]">
          <span className="text-[var(--color-muted)]">{label}</span>
          <span className="font-semibold tabular-nums text-[var(--color-ink)]">{Math.round(ratio * 100)}%</span>
        </div>
      )}
      <div className="h-1.5 w-full overflow-hidden rounded-full" style={{ background: track }}>
        <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${ratio * 100}%`, background: tone }} />
      </div>
    </div>
  );
}

/* 12-ish point trend line for stat tiles, de-emphasised with the latest point marked. */
export function Sparkline({ values, color = CHART.accent, width = 96, height = 32 }) {
  const pts = (values || []).map(toNumber);
  if (pts.length < 2) return null;
  const max = Math.max(...pts, 1);
  const step = width / (pts.length - 1);
  const y = (v) => height - 3 - (v / max) * (height - 6);
  const d = pts.map((v, i) => `${i ? "L" : "M"}${(i * step).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true" className="overflow-visible">
      <path d={d} fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
      <circle cx={width} cy={y(pts[pts.length - 1])} r="3.5" fill={color} stroke={CHART.surface} strokeWidth="2" />
    </svg>
  );
}

/* Legend for "this period vs before": both series named, each with its line style, so the
   difference never rests on colour alone. */
export function CompareLegend({ current, previous }) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-[var(--color-ink-2)]">
      <span className="flex items-center gap-1.5">
        <svg width="18" height="8" aria-hidden="true"><line x1="1" y1="4" x2="17" y2="4" stroke={CHART.accent} strokeWidth="2.5" strokeLinecap="round" /></svg>
        {current}
      </span>
      {previous && (
        <span className="flex items-center gap-1.5">
          <svg width="18" height="8" aria-hidden="true"><line x1="1" y1="4" x2="17" y2="4" stroke={CHART.previous} strokeWidth="2.5" strokeDasharray="4 3" strokeLinecap="round" /></svg>
          {previous}
        </span>
      )}
    </div>
  );
}

/* Tooltip for comparisons: each period's own date and value, and the change between them. */
function CompareTooltip({ active, payload, formatLabel, formatPrevLabel, valueFormatter, currentName, previousName }) {
  if (!active || !payload?.length) return null;
  const row = payload[0].payload;
  const now = toNumber(row.amount);
  const then = row.prev_amount === null || row.prev_amount === undefined ? null : toNumber(row.prev_amount);
  const diff = then ? Math.round(((now - then) / then) * 1000) / 10 : null;
  return (
    <div className="min-w-[180px] rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 shadow-[0_10px_30px_rgba(32,34,53,0.14)]">
      <p className="text-[11px] text-[var(--color-muted)]">{currentName} · {formatLabel(row.key)}</p>
      <p className="flex items-center gap-2 text-[13px] font-semibold tabular-nums text-[var(--color-ink)]">
        <span className="h-[2px] w-3 rounded-full" style={{ background: CHART.accent }} aria-hidden="true" />
        {valueFormatter(now)}
        <span className="font-normal text-[var(--color-muted)]">· {row.count} sales</span>
      </p>
      {then !== null && (
        <>
          <p className="mt-1.5 text-[11px] text-[var(--color-muted)]">{previousName} · {row.prev_key ? formatPrevLabel(row.prev_key) : "—"}</p>
          <p className="flex items-center gap-2 text-[13px] font-semibold tabular-nums text-[var(--color-ink)]">
            <span className="h-0 w-3 border-t-2 border-dashed" style={{ borderColor: CHART.previous }} aria-hidden="true" />
            {valueFormatter(then)}
            <span className="font-normal text-[var(--color-muted)]">· {row.prev_count} sales</span>
          </p>
          {diff !== null && (
            <p className={`mt-1 text-[11.5px] font-medium ${diff >= 0 ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>
              {diff >= 0 ? "▲" : "▼"} {Math.abs(diff)}%
            </p>
          )}
        </>
      )}
    </div>
  );
}

/* This period (solid accent + soft wash) against the comparison (dashed lighter step), on
   one axis. Points line up by position: day 1 with day 1, month 1 with month 1. The last
   point of each line is labelled, so the lines are named where they end. */
export function CompareTrendChart({
  data,
  height = 280,
  formatTick,
  formatLabel,
  formatPrevLabel = formatLabel,
  valueFormatter = formatAmount,
  currentName,
  previousName,
  label,
}) {
  const id = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  if (!data?.length) return <ChartEmpty height={height} />;
  const showPrevious = data.some((d) => d.prev_amount !== null && d.prev_amount !== undefined);
  const hasValues = data.some((d) => toNumber(d.amount) > 0 || toNumber(d.prev_amount) > 0);
  const last = data.length - 1;
  const endLabel = (text, color) => (props) =>
    props.index === last ? (
      <text x={props.x + 6} y={props.y} dy={4} fontSize={11} fontWeight={600} fill={CHART.ink}>
        <tspan fill={color}>●</tspan> {text}
      </text>
    ) : null;

  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={data} margin={{ top: 12, right: 92, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`cmp-${id}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={CHART.accent} stopOpacity={0.14} />
              <stop offset="100%" stopColor={CHART.accent} stopOpacity={0.01} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke={CHART.grid} strokeWidth={1} />
          <XAxis
            dataKey="key"
            tickFormatter={formatTick}
            tick={{ fill: CHART.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={{ stroke: CHART.grid }}
            tickMargin={8}
            interval="preserveStartEnd"
            minTickGap={18}
          />
          <YAxis
            tickFormatter={(v) => formatCompact(v)}
            tick={{ fill: CHART.axis, fontSize: 11 }}
            tickLine={false}
            axisLine={false}
            width={44}
            allowDecimals={false}
            domain={hasValues ? [0, "auto"] : [0, 1000]}
          />
          <Tooltip
            cursor={{ stroke: "#C9C2D6", strokeWidth: 1 }}
            content={
              <CompareTooltip
                formatLabel={formatLabel}
                formatPrevLabel={formatPrevLabel}
                valueFormatter={valueFormatter}
                currentName={currentName}
                previousName={previousName}
              />
            }
          />
          {showPrevious && (
            <Line
              type="monotone"
              dataKey="prev_amount"
              stroke={CHART.previous}
              strokeWidth={2}
              strokeDasharray="5 4"
              strokeLinecap="round"
              dot={false}
              activeDot={{ r: 4, fill: CHART.previous, stroke: CHART.surface, strokeWidth: 2 }}
              isAnimationActive={animate}
              animationDuration={700}
              label={endLabel(previousName, CHART.previous)}
            />
          )}
          <Area
            type="monotone"
            dataKey="amount"
            stroke={CHART.accent}
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill={`url(#cmp-${id})`}
            dot={false}
            activeDot={{ r: 5, fill: CHART.accent, stroke: CHART.surface, strokeWidth: 2 }}
            isAnimationActive={animate}
            animationDuration={700}
            label={endLabel(currentName, CHART.accent)}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Month by month: last year (lighter step) beside this year (accent) in each month, with a
   2px gap between the pair and 4px rounded tops. Months still to come are left empty. */
export function CompareBars({ data, height = 280, currentName, previousName, valueFormatter = formatAmount, label }) {
  if (!data?.length) return <ChartEmpty height={height} />;
  const hasValues = data.some((d) => toNumber(d.amount) > 0 || toNumber(d.prev_amount) > 0);
  if (!hasValues) return <ChartEmpty height={height}>No sales in these years yet.</ChartEmpty>;
  const monthName = (m) => new Date(2000, m - 1, 1).toLocaleDateString(dateLocale(), { month: "short" });
  const rows = data.map((d) => ({ ...d, name: monthName(d.month), amount: d.future ? null : d.amount }));

  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 12, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="22%">
          <CartesianGrid vertical={false} stroke={CHART.grid} strokeWidth={1} />
          <XAxis dataKey="name" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.grid }} tickMargin={8} />
          <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={44} allowDecimals={false} />
          <Tooltip
            cursor={{ fill: "rgba(116,41,195,0.06)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload;
              const diff = r.change;
              return (
                <div className="min-w-[170px] rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 shadow-[0_10px_30px_rgba(32,34,53,0.14)]">
                  <p className="text-[11px] text-[var(--color-muted)]">{new Date(2000, r.month - 1, 1).toLocaleDateString(dateLocale(), { month: "long" })}</p>
                  <p className="flex items-center gap-2 text-[13px] font-semibold tabular-nums">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: CHART.accent }} aria-hidden="true" />
                    {currentName}: {r.future ? "not yet" : valueFormatter(r.amount)}
                  </p>
                  <p className="flex items-center gap-2 text-[13px] font-semibold tabular-nums">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: CHART.previous }} aria-hidden="true" />
                    {previousName}: {valueFormatter(r.prev_amount)}
                  </p>
                  {!r.future && diff !== null && (
                    <p className={`mt-1 text-[11.5px] font-medium ${diff >= 0 ? "text-[var(--color-green)]" : "text-[var(--color-red)]"}`}>
                      {diff >= 0 ? "▲" : "▼"} {Math.abs(diff)}%
                    </p>
                  )}
                </div>
              );
            }}
          />
          <Bar dataKey="prev_amount" name={previousName} fill={CHART.previous} radius={[4, 4, 0, 0]} maxBarSize={22} stroke={CHART.surface} strokeWidth={1} isAnimationActive={animate} animationDuration={700} />
          <Bar dataKey="amount" name={currentName} fill={CHART.accent} radius={[4, 4, 0, 0]} maxBarSize={22} stroke={CHART.surface} strokeWidth={1} isAnimationActive={animate} animationDuration={700} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* Ranking with a comparison: one row per person, this period (accent) above the period
   before (lighter step), 2px apart, sorted by this period. Values sit at the bar tips. */
export function CompareRankBars({ data, nameKey = "name", currentName, previousName, valueFormatter = (v) => formatAmount(v, { short: true }), label }) {
  const rows = [...(data || [])].map((d) => ({ ...d, amount: toNumber(d.amount), prev_amount: d.prev_amount === null || d.prev_amount === undefined ? null : toNumber(d.prev_amount) }));
  if (!rows.some((r) => r.amount > 0 || r.prev_amount > 0)) return <ChartEmpty>No sales in this period yet.</ChartEmpty>;
  const showPrevious = rows.some((r) => r.prev_amount !== null);
  const height = rows.length * (showPrevious ? 46 : 34) + 16;
  return (
    <div style={{ height }} role="img" aria-label={label}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} layout="vertical" margin={{ top: 4, right: 76, left: 0, bottom: 4 }} barGap={2} barCategoryGap={showPrevious ? 10 : 8}>
          <CartesianGrid horizontal={false} stroke={CHART.grid} strokeWidth={1} />
          <XAxis type="number" hide domain={[0, "dataMax"]} />
          <YAxis type="category" dataKey={nameKey} width={120} tick={{ fill: CHART.ink, fontSize: 12 }} tickLine={false} axisLine={false} />
          <Tooltip
            cursor={{ fill: "rgba(116,41,195,0.06)" }}
            content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const r = payload[0].payload;
              return (
                <div className="min-w-[170px] rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 shadow-[0_10px_30px_rgba(32,34,53,0.14)]">
                  <p className="text-[11px] text-[var(--color-muted)]">{r[nameKey]}</p>
                  <p className="flex items-center gap-2 text-[13px] font-semibold tabular-nums">
                    <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: CHART.accent }} aria-hidden="true" />
                    {currentName}: {formatAmount(r.amount)}
                  </p>
                  {r.prev_amount !== null && (
                    <p className="flex items-center gap-2 text-[13px] font-semibold tabular-nums">
                      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: CHART.previous }} aria-hidden="true" />
                      {previousName}: {formatAmount(r.prev_amount)}
                    </p>
                  )}
                </div>
              );
            }}
          />
          <Bar dataKey="amount" fill={CHART.accent} barSize={14} radius={[0, 4, 4, 0]} isAnimationActive={animate} animationDuration={700}>
            <LabelList dataKey="amount" position="right" formatter={valueFormatter} fill={CHART.ink} fontSize={12} fontWeight={600} />
          </Bar>
          {showPrevious && <Bar dataKey="prev_amount" fill={CHART.previous} barSize={10} radius={[0, 4, 4, 0]} isAnimationActive={animate} animationDuration={700} />}
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/* One colour per branch, in the validated categorical order (never cycled; a 6th+ branch
   folds into "Other"). Shared by the chart and its legend so a branch keeps its colour. */
function branchColors(locations) {
  return Object.fromEntries(locations.map((l, i) => [l.id, i < SERIES.length - 1 || locations.length <= SERIES.length ? SERIES[i] : CHART.other]));
}

/* Month by month per branch: grouped bars, one colour per branch, 2px apart, 4px rounded
   tops. The legend names every branch so colour is never the only key. */
export function BranchMonthBars({ months, locations, valueFormatter = formatAmount, height = 260, label }) {
  if (!months?.length || !locations?.length) return <ChartEmpty height={height} />;
  const colors = branchColors(locations);
  const rows = months.map((m) => ({
    name: new Date(`${m.key}-01T00:00:00`).toLocaleDateString(dateLocale(), { month: "short", year: "2-digit" }),
    ...Object.fromEntries(locations.map((l) => [`b${l.id}`, toNumber(m.by_location?.[l.id])])),
  }));
  return (
    <div>
      <div className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[var(--color-ink-2)]">
        {locations.map((l) => (
          <span key={l.id} className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: colors[l.id] }} aria-hidden="true" />
            {l.name}
          </span>
        ))}
      </div>
      <div style={{ height }} role="img" aria-label={label}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 0 }} barGap={2} barCategoryGap="24%">
            <CartesianGrid vertical={false} stroke={CHART.grid} strokeWidth={1} />
            <XAxis dataKey="name" tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={{ stroke: CHART.grid }} tickMargin={8} />
            <YAxis tickFormatter={(v) => formatCompact(v)} tick={{ fill: CHART.axis, fontSize: 11 }} tickLine={false} axisLine={false} width={44} />
            <Tooltip
              cursor={{ fill: "rgba(116,41,195,0.06)" }}
              content={({ active, payload, label: month }) => {
                if (!active || !payload?.length) return null;
                return (
                  <div className="min-w-[170px] rounded-xl border border-[var(--color-border)] bg-[var(--color-panel)] px-3 py-2 shadow-[0_10px_30px_rgba(32,34,53,0.14)]">
                    <p className="text-[11px] text-[var(--color-muted)]">{month}</p>
                    {payload.map((p) => (
                      <p key={p.dataKey} className="flex items-center gap-2 text-[13px] font-semibold tabular-nums">
                        <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: p.color }} aria-hidden="true" />
                        {p.name}: {valueFormatter(p.value)}
                      </p>
                    ))}
                  </div>
                );
              }}
            />
            {locations.map((l) => (
              <Bar key={l.id} dataKey={`b${l.id}`} name={l.name} fill={colors[l.id]} radius={[4, 4, 0, 0]} maxBarSize={26} stroke={CHART.surface} strokeWidth={1} isAnimationActive={animate} animationDuration={700} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
