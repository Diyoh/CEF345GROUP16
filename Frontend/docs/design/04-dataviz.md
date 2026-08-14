# BuildRight Cameroon — Data Visualization (Phase 4)

Depends on: `01-foundations.md` (chart palette), `02-ia-ux.md` (Option C scatter), `03-components.md` (Chart shell).
Stack constraint: Recharts 2.12, already installed. No new charting dependency.

---

## 1. Governing principle

In an accountability product the chart is evidence, so its job is to be **checkable**, not
impressive. Three consequences that override any aesthetic preference:

1. **Never encode what the data does not contain.** The data model has no time series of spend: `spent` is a single current figure. Any "budget burn over time" line chart would be fabricated, and fabricating a trend in a transparency product is the worst thing this interface could do. If it is not in the data, it is not on the screen.
2. **Every chart is reproducible by hand.** Exact figures are always available (tooltip, hidden table, copyable). A reader who wants to check our arithmetic must be able to.
3. **The chart never rounds in a direction that flatters.** Over-budget values render past the axis end rather than being clipped to 100%.

---

## 2. Money formatting (the single largest source of drift)

### 2.1 Current state

| Source | Output for 85 000 000 000 |
|---|---|
| `utils/helpers.js` `formatCurrency` (`Intl` fr-CM XAF) | `85 000 000 000 FCFA` (19 chars) |
| `ContractorAnalyticsModal.jsx:4-8` local duplicate | `85.0B FCFA` |
| Recharts tooltip in `FinancialChart.jsx:21` | `85 000 000 000 FCFA` again, third call site |

Two formatters, two answers, and the local one uses "B" for billion, which reads as *billion* in
English and is ambiguous against French *milliard* in a country where both languages are official.

### 2.2 Amendment to Phase 1: the unit is FCFA, not XAF

Phase 1 specified the ISO code `XAF`. I am reversing that. The audience is Cameroonian citizens and
national auditors, `FCFA` is what the currency is called in daily written use, and Node's own `fr-CM`
locale data emits `FCFA`. `XAF` is retained for machine contexts only: CSV export headers and any
future API contract. One display unit everywhere, no per-surface variation.

### 2.3 Three contexts, three rules, one helper

`formatMoney(value, style)` replaces both existing formatters.

| Style | Output | Used in |
|---|---|---|
| `full` | `85 000 000 000 FCFA` | Tooltips, project detail financial panel, form values, confirmation copy, every `title` attribute |
| `compact` | `85.0bn FCFA` / `4.5m FCFA` / `85k FCFA` | Stat tiles, card lines, table cells, contractor analytics tiles |
| `bare` | `85.0` | Axis ticks and chart labels, where the unit is declared once in the axis title |

Rules baked into the helper:

- **Suffixes are `k`, `m`, `bn`, lowercase.** Not `B`, which is ambiguous across the two official languages; `bn` is unambiguous in both.
- **Group separator is a narrow no-break space** (U+202F), decimal separator is a period. Space grouping is correct in French and in SI, and a period decimal matches the English interface. This deliberately diverges from raw `Intl` fr-CM output, which uses a comma decimal, because mixing a comma decimal into an English UI is how `4,5` gets read as forty-five.
- **`compact` always carries the exact value in `title`.** Abbreviation is a display convenience and must never be the only representation available.
- **One decimal place maximum** in `compact`, and `.0` is kept, so a column of tiles has a uniform width.
- Zero renders `0 FCFA`, never `-` or blank. Null renders "Not set", never `0`.

The `bare` style is the publication-standard move: instead of repeating "FCFA" 40 times down a
column or across an axis, state the unit once in the header ("Budget, FCFA billions") and let the
numbers be numbers. It also removes the single largest source of tick-label collision on a 360px screen.

---

## 3. Recharts reset

Recharts defaults are the visual signature of a template. Every chart in the app applies this reset;
none of it is optional.

| Element | Default | Specification |
|---|---|---|
| `CartesianGrid` | dashed, both axes | **Horizontal only**, 1px solid `border-subtle`, no vertical lines. Vertical gridlines compete with bars; horizontal ones assist value reading, which is their only justification. |
| `XAxis` / `YAxis` line | visible | `axisLine={false}` `tickLine={false}`. The gridline system already implies the frame. |
| Tick labels | 12px, default fill | `caption` 13px, `text-tertiary`, tabular figures. Axis labels are reference material and must recede. |
| Y domain | `[0, dataMax]` | `[0, niceMax]` where `niceMax` rounds up to 1, 2, or 5 × 10ⁿ, so ticks land on readable values. Never a non-zero baseline on a bar chart. |
| `Legend` | rendered below, dot markers | **Removed.** Series are labelled directly at their marks. A legend forces a round trip between key and mark for every read. |
| `Tooltip` | white box, default typography | Custom component, see 3.1 |
| Bar `radius` | 0 | `[3, 3, 0, 0]` vertical, `[0, 3, 3, 0]` horizontal. Just enough to match the radius scale. |
| Bar gap | default | `barCategoryGap="28%"`, `barGap={2}` |
| Animation | 1500ms on every render | 400ms on mount only, `isAnimationActive={false}` on data updates so a socket update does not re-animate the whole chart. Disabled entirely under `prefers-reduced-motion`. |
| Colours | arbitrary hex | Phase 1 chart palette only, read from CSS variables so dark mode works |

### 3.1 Tooltip

A `bg-raised` card at `e3`, radius `md`, 12px padding, 240px max width. Title is the category name at
`caption` 550. Each row is a 8px colour swatch, series name in `text-secondary`, value right-aligned
in tabular `full` money. A final divider-separated row carries the derived figure when one exists
("62% of budget spent"). `cursor={{ fill: 'var(--bg-sunken)' }}` replaces the default grey block.

Never show more than 5 rows. Never show a percentage without its absolute value.

### 3.2 Layout bug to fix

[FinancialChart.jsx:13-15](../../src/components/dashboard/FinancialChart.jsx#L13-L15) puts a fixed
`h-80` on the card, adds `p-6` and an `h3`, then gives `ResponsiveContainer` `height="100%"`. The
percentage resolves against the padded box, not the space left after the heading, so the plot is
about 50px taller than its container and is clipped at the bottom. The Chart shell from Phase 3 fixes
this structurally: the header is outside the plot region, and the plot gets an explicit aspect ratio
rather than a percentage height.

---

## 4. Chart inventory

### 4.1 Budget against spend, by project (replaces `FinancialChart`)

**Current:** vertical grouped bars, one pair per project, names truncated to 15 characters, `#0ea5e9`
and `#f59e0b`, unsorted, unbounded category count.

Three problems. Grouped bars present budget and spend as **sibling categories**, when spend is a
*part of* budget, which is a relationship the encoding should show rather than hide. Vertical bars
give long project names no room, hence the truncation to "Yaoundé-Douala..." which makes the axis
unreadable. And with more than about eight projects the chart becomes unusable, with no sort, so the
projects that need attention are wherever they happen to fall.

**Redesign: horizontal overlay bars, sorted by variance.**

```
Yaoundé-Douala Highway Ph.2   ████████████████████████░░░░░░░░░░  53%   −2
Regional Hospital Maroua      ████████████████████████████████░░  96%  −44
Rural Electrification East    ██████████░░░░░░░░░░░░░░░░░░░░░░░░  31%   +6
                              0                                100
                              Share of budget spent
```

- One row per project. The full-width track is the budget (`bg-sunken`), the filled bar is spend, in the variance band colour from Phase 2. Overlay, not adjacency, because spend is a proportion of budget.
- **Sorted by variance ascending, so the worst project is the top row.** An admin overview should open on the thing that needs a decision.
- Row height 32px, top 8 rows, with "Show all 24 projects" opening the full table rather than a taller chart. A chart is a summary; the table is the complete record.
- Direct labels: burn percentage at the end of each bar, variance chip to its right. No legend.
- Over 100% burn: the bar caps at the axis end with a 4px `red-700` overflow marker and the true figure in the label.
- Project names get 40% of the width and truncate with the full name in `title`, but at 32px rows a name has room to be legible, which is the point of the rotation.

### 4.2 Portfolio scatter, built against spent (new, admin overview)

Option C from Phase 2, adopted here where it belongs.

- X axis: budget spent %, 0 to 120. Y axis: work completed %, 0 to 100.
- A 45° reference line in `border-strong`, dashed 4 2, labelled "on balance" at its end. Points **below** the line are spending faster than building.
- Point colour is the variance band, radius encodes budget on a **square-root scale** (area proportional to value, since radius-proportional sizing exaggerates large projects by the square), 4 to 14px.
- A `red-600` reference band from x=100 to 120 marks over-budget territory.
- Points are focusable in DOM order with the same tooltip content, and clicking navigates to the project.
- Below 768px the scatter is replaced by the 4.1 bar list. A scatter needs about 400px of both dimensions before the position channel means anything, and a cramped scatter is worse than no scatter.

This is the one chart that answers "which 5 of these 200 projects are in trouble" in a single glance,
which is the admin's actual job.

### 4.3 Contractor analytics (inside `ContractorAnalyticsModal`)

**Current:** four stat tiles in blue, green, orange and purple, then a table.

The four hues carry no meaning: they are four tiles, so they got four colours. That is decoration
occupying the channel the system reserves for encoding, and purple and orange are outside the palette
entirely. Redesign per the Phase 3 Stat tile: neutral tiles, `overline` labels, `display` figures in
tabular numerals, and **one accent, on the tile that carries a judgement** (Avg progress), with the
variance chip supplying the only other colour.

Add one chart below the tiles: the 4.1 horizontal bar list scoped to that contractor's projects, which
turns the modal from a summary of a contractor into an assessment of one. The table stays, with the
compact `ProgressMeter` replacing the ad hoc progress bar at
[ContractorAnalyticsModal.jsx:99-104](../../src/components/dashboard/ContractorAnalyticsModal.jsx#L99-L104),
and the ad hoc status spans at
[lines 90-96](../../src/components/dashboard/ContractorAnalyticsModal.jsx#L90-L96) replaced by `StatusBadge`.

### 4.4 Status distribution (admin overview, small)

A single horizontal 100% stacked bar, 12px tall, segments in the six status hues, with a direct
label under each segment reading "12 in progress". Not a pie, and not a donut: comparing angles is
measurably less accurate than comparing lengths, and at six categories a pie needs a legend, which
reintroduces the round trip we just removed.

### 4.5 Public project detail

No chart. The `ProgressMeter` plus the financial panel is the correct density for a citizen on 3G,
and a chart of two numbers is decoration. Stated explicitly so that nobody adds one later.

---

## 5. Palette application

Ordered categorical palette from Phase 1 section 6, capped at 4 series. Assignments are fixed
app-wide, so a colour means the same thing in every chart:

| Meaning | Light | Dark |
|---|---|---|
| Budget / track | `neutral-200` | `neutral-400` at 20% |
| Spend, on balance | `neutral-500` `#899691` | `neutral-500` |
| Spend, watch | `amber-600` `#9C7300` | `amber-300` |
| Spend, critical / over budget | `red-600` `#DD2826` | `red-400` |
| Completed work | `green-800` `#006345` | `green-300` |
| Reference lines, axes | `border-strong` | `border-strong` |

Grayscale check from Phase 1 holds: consecutive luminances differ by at least 1.4×, so these survive
a monochrome print or a phone in greyscale mode. `amber-400` is never used as a bare line, only as a
fill with an `amber-600` stroke, because at 2.28:1 it fails 1.4.11 on its own.

---

## 6. States

| State | Treatment |
|---|---|
| Loading | Skeleton at the exact plot dimensions, no axis frame, no spinner. |
| Empty | One `body` sentence in `text-tertiary` centred in the plot area: "No projects to chart yet." An empty axis frame reads as a rendering failure, so we do not draw one. |
| Single datapoint | No chart. Render the value as a Stat tile with a `caption` note: "Based on 1 project." A one-bar bar chart implies a comparison that does not exist. |
| Two to three points | Chart renders, but the axis keeps its full domain so three projects do not look like a full portfolio. |
| Error | Retry button inside the frame, chart title retained, so the page structure does not jump. |
| Live update | Values transition over 400ms, the changed bar flashes per the Phase 1 rule, and the chart does not re-sort until the user leaves and returns. Re-sorting under a reading cursor moves the row someone is looking at. |

---

## 7. Accessibility

- Every chart is a `<figure>` with a `<figcaption>` that states the finding, not the chart type: "Three of eight projects have spent more than 80% of budget", not "Bar chart of budget and spend".
- Every chart ships a **visually hidden `<table>`** with the same data, exposed by a "View as table" toggle that unhides it for everyone. This is the accessible alternative and simultaneously the copy path, so it is not accessibility overhead, it is a feature both audiences use.
- Recharts tooltips are pointer-only. We do not fake keyboard tooltips; the data table is the keyboard and screen reader path, and the toggle is in the tab order immediately before the plot.
- Colour is never the sole encoding: bands are always accompanied by the numeric variance label.
- `prefers-reduced-motion` disables all chart animation, including the mount transition.
- Plot area minimum touch target for interactive points is 44px, achieved with an invisible hit area, not by enlarging the mark.

---

## 8. Performance

- Recharts is already a dependency and is tree-shaken by Vite; import only the components used per chart file, never the barrel.
- Charts render below the fold on the admin overview, so they mount lazily with `React.lazy` behind the Chart shell skeleton. This keeps Recharts out of the public portal bundle entirely, which matters because the public portal is the surface with the 3G users and it needs no charts at all.
- Data transforms (sort, variance, aggregate) are memoized with `useMemo` keyed on the projects array, not recomputed per render, since the socket updates the array frequently.
- Hard cap of 8 rendered rows or 200 scatter points; beyond that the chart states what it is showing ("Showing 8 of 24 projects, sorted by variance") rather than silently truncating.
