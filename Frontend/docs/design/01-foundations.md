# BuildRight Cameroon — Design Foundations (Phase 1)

Status: proposed. Phases 2–5 depend on these tokens; change them here, not downstream.
All colour values derived in OKLCH (perceptually uniform lightness) and gamut-clamped to sRGB.
All contrast ratios below are computed (WCAG 2.x relative luminance), not estimated.

---

## 1. Brand thesis

BuildRight is a public record, not a product. The emotional target is **civic seriousness**: the
feeling of a well-set national newspaper or an audit report that has nothing to hide — calm,
dense, verifiable, and unembarrassed by numbers. A citizen in Bertoua on a 3G phone should feel
the interface is *reporting* to them, not *selling* to them; an auditor should feel the interface
is *accountable* to them. So: quiet surfaces, a single confident accent, typography doing the
hierarchy work, and colour used almost exclusively as data encoding. The Cameroon flag stays as
identity, but demoted from decoration to signature — green anchors the brand and the "healthy"
end of every scale, yellow becomes a caution channel, and **red is spent entirely on risk**
(over-budget, stalled, destructive). A red button that merely means "submit" would devalue the
one colour that must still mean "something is wrong" three screens later.

---

## 2. Colour

### 2.1 Why the flag colours cannot be used raw

| Flag colour | OKLCH | Problem at scale |
|---|---|---|
| `#007A5E` green | L 0.515 C 0.102 H 169.6 | 5.3:1 on white — fine for text, but a single value can't serve fills, borders, tints and dark mode. |
| `#CE1126` red | L 0.541 C 0.213 H 24.8 | Extremely high chroma; vibrates next to green, and reads as *error* wherever it lands. |
| `#FCD116` yellow | L 0.872 C 0.176 H 93.5 | 1.7:1 on white. Structurally incapable of carrying text or a border on a light surface. |

The ramps below are generated on a fixed hue with a smooth chroma curve peaking mid-ramp, over a
constant OKLab lightness ladder — so `green-600 → amber-600 → red-600` are the *same visual
weight* and can be swapped in a chart or badge without re-tuning anything.

**The flag green is preserved exactly as `green-700` (`#007C5A`, ΔE ≈ 1 from `#007A5E`)** — the
brand colour is still literally in the system, it just now has ten relatives.

### 2.2 Tonal ramps

**Green (brand, positive, on-track)** — H 169.5
| | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hex | `#F4F8F6` | `#E3F0EC` | `#C2E6DA` | `#8DDAC1` | `#51C4A2` | `#0BAB85` | `#00916C` | `#007C5A` | `#006345` | `#004C33` | `#002C1A` |
| on white | 1.07 | 1.17 | 1.34 | 1.62 | 2.15 | 2.93 | 3.99 | **5.21** | **7.32** | **10.09** | **15.27** |

**Red (danger only: over-budget, stalled, destructive)** — H 25.5
| | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hex | `#FBF5F5` | `#FFE6E6` | `#FFCDCC` | `#FFADAA` | `#FF7F7B` | `#F74E4C` | `#DD2826` | `#C20F06` | `#A00000` | `#7C0000` | `#4A0000` |
| on white | 1.08 | 1.19 | 1.41 | 1.78 | 2.45 | 3.42 | **4.77** | **6.24** | **8.42** | **11.31** | **16.26** |

**Amber (caution: delayed, awaiting verification, budget warning)** — H 88
| | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hex | `#F9F8E3` | `#F6EFBA` | `#F6DD66` | `#ECC400` | `#D0A700` | `#B58C00` | `#9C7300` | `#875F00` | `#6F4A00` | `#54380A` | `#2F1F0C` |
| on white | 1.07 | 1.17 | 1.36 | 1.69 | 2.28 | 3.13 | 4.32 | **5.73** | **7.91** | **10.79** | **15.88** |

**Blue (informational, "planned", primary chart series)** — H 255
| | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 |
|---|---|---|---|---|---|---|---|---|---|---|---|
| hex | `#F4F7F9` | `#E4EEF7` | `#C7E0F8` | `#9CCCFE` | `#73B0F6` | `#5694E2` | `#3D7ACE` | `#2E64BC` | `#234DA1` | `#193784` | `#0A185B` |
| on white | 1.08 | 1.18 | 1.36 | 1.68 | 2.27 | 3.12 | **4.31** | **5.73** | **7.93** | **10.93** | **16.22** |

**Neutral (green undertone, H 170, C 0.018)** — everything structural
| | 50 | 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 | 950 | 975 | 1000 |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| hex | `#F6F7F7` | `#ECEDEC` | `#D9DDDC` | `#C2C9C6` | `#A4AFAB` | `#899691` | `#717E79` | `#5E6B66` | `#495651` | `#36413D` | `#1C2522` | `#131D19` | `#0E1613` |
| on white | 1.07 | 1.17 | 1.37 | 1.68 | 2.26 | 3.07 | 4.23 | **5.57** | **7.68** | **10.60** | **15.71** | — | — |

Neutrals carry ~2% chroma at H170 so grey never reads cold-blue beside the brand green.
`975`/`1000` exist only for dark mode canvases (a true-black canvas raises halation on cheap
Android LCDs and kills the shadowless elevation model).

### 2.3 Semantic tokens — LIGHT

| Token | Value | Contrast (computed) |
|---|---|---|
| `bg-canvas` | `#FFFFFF` | — |
| `bg-surface` | `neutral-50` `#F6F7F7` | 1.07 vs canvas (perceptible, non-load-bearing) |
| `bg-raised` | `#FFFFFF` + elevation | — |
| `bg-sunken` | `neutral-100` `#ECEDEC` | table zebra / code / inset |
| `bg-overlay` | `neutral-950` @ 55% | scrim |
| `border-subtle` | `neutral-200` `#D9DDDC` | 1.37 vs canvas — decorative dividers only |
| `border-default` | `neutral-300` `#C2C9C6` | 1.68 vs canvas |
| `border-strong` | `neutral-400` `#A4AFAB` | 2.26 vs canvas — dividers/table rules only |
| `border-input` | `neutral-500` `#899691` | **3.07 vs canvas** ✅ the only border that meets 1.4.11, so every input, checkbox and radio boundary uses it (`neutral-400` at 2.26 fails and is banned on controls) |
| `text-primary` | `neutral-950` `#1C2522` | **15.71** ✅ AAA |
| `text-secondary` | `neutral-800` `#495651` | **7.68** ✅ AAA |
| `text-tertiary` | `neutral-700` `#5E6B66` | **5.57** ✅ AA (AAA at ≥18.66px bold) |
| `text-placeholder` | `neutral-700` `#5E6B66` | **5.57** ✅ — placeholders are text; `neutral-600` (4.23) fails and is banned here |
| `text-disabled` | `neutral-500` `#899691` | 3.07 — permitted only on genuinely inactive controls (1.4.3 exception), always paired with a non-colour cue |
| `accent` / `accent-text` | `green-700` `#007C5A` | **5.21** ✅ AA body |
| `accent-hover` | `green-800` `#006345` | **7.32** |
| `accent-fill` | `green-700` + white text | **5.21** ✅ |
| `focus-ring` | `green-600` `#00916C` | **3.99 vs white / 3.72 vs surface** ✅ 1.4.11 (green-500 at 2.93 fails — do not use) |
| `danger` | `red-700` `#C20F06` | **6.24**; fill `red-700` + white = **6.24** ✅ |
| `warning-text` | `amber-800` `#6F4A00` | **7.91** ✅ |
| `info` | `blue-700` `#2E64BC` | **5.73** ✅ |

### 2.4 Semantic tokens — DARK (designed, not inverted)

Dark mode drops the shadow system entirely (shadows are invisible on dark) and rebuilds
elevation from **luminance + border-light**. Text ramps *down* in weight compensation: pure
white on near-black over-glows on cheap panels, so `text-primary` is `neutral-50`, never `#FFF`.

| Token | Value | Contrast |
|---|---|---|
| `bg-canvas` | `neutral-1000` `#0E1613` | — |
| `bg-surface` | `neutral-975` `#131D19` | elevation +1 |
| `bg-raised` | `neutral-950` `#1C2522` | elevation +2 (modals, popovers) |
| `bg-sunken` | `#0A100E` | inputs, table headers |
| `bg-overlay` | `#000` @ 65% | — |
| `border-subtle` | `neutral-400` @ 8% → `#1B2421` | 1.15 vs surface |
| `border-default` | `neutral-400` @ 14% → `#27312D` | 1.28 vs surface |
| `border-strong` | `neutral-400` @ 30% → `#3E4945` | 1.84 vs surface — dividers only |
| `border-input` | `neutral-400` @ 55% → `#636D69` | **3.22 vs surface** ✅ 1.4.11 (@45% measures 2.60 and fails — the obvious value is the wrong one) |
| `text-primary` | `neutral-50` `#F6F7F7` | **17.12** ✅ AAA |
| `text-secondary` | `neutral-200` `#D9DDDC` | **13.41** ✅ AAA |
| `text-tertiary` | `neutral-400` `#A4AFAB` | **8.14** ✅ AAA |
| `text-disabled` | `neutral-500` `#899691` | 5.98 |
| `accent` | `green-400` `#51C4A2` | **8.55** ✅ AAA |
| `accent-fill` | `green-500` `#0BAB85` + `neutral-950` text | **5.37** ✅ |
| `focus-ring` | `green-400` `#51C4A2` | **8.55 vs canvas / 8.02 vs surface** ✅ |
| `danger` | `red-400` `#FF7F7B` | **7.50** ✅ |
| `warning-text` | `amber-300` `#ECC400` | **10.90** ✅ |
| `info` | `blue-400` `#73B0F6` | **8.11** ✅ |

### 2.5 Status tokens

Six statuses, each with a **hue + a shape/icon + a word** — never colour alone (1.4.1).

**Light — text on tint chip:**
| Status | Text | Chip bg | Chip border | Ratio |
|---|---|---|---|---|
| planned | `blue-700` `#2E64BC` | `blue-50` `#F4F7F9` | `blue-200` | **5.33** ✅ |
| in-progress | `green-800` `#006345` | `green-50` `#F4F8F6` | `green-200` | **6.83** ✅ |
| delayed | `amber-800` `#6F4A00` | `amber-50` `#F9F8E3` | `amber-300` | **7.37** ✅ |
| completed | `green-800` `#006345` | `green-100` `#E3F0EC` | `green-300` | **6.25** ✅ |
| over-budget | `red-700` `#C20F06` | `red-50` `#FBF5F5` | `red-300` | **5.79** ✅ |
| stalled | `neutral-800` `#495651` | `neutral-100` `#ECEDEC` | `neutral-300` | **6.55** ✅ |

**Dark — chip = hue-500 @16% composited on surface, border @32%, text = hue-300:**
| Status | Text | Chip bg | Border | Ratio |
|---|---|---|---|---|
| planned | `#9CCCFE` | `#1E3039` | `#284359` | **8.12** ✅ |
| in-progress | `#8DDAC1` | `#12342A` | `#104A3C` | **8.34** ✅ |
| delayed | `#ECC400` | `#2D2F15` | `#474111` | **8.15** ✅ |
| completed | `#C2E6DA` | `#12342A` | `#104A3C` | **10.08** ✅ |
| over-budget | `#FFADAA` | `#372521` | `#5C2D29` | **8.15** ✅ |
| stalled | `#C2C9C6` | `#2A3430` | `#414C48` | **7.64** ✅ |

*`stalled` is deliberately achromatic:* a stalled project is an absence of activity, and greying
it out is the honest encoding. Over-budget is the only red, so red on a screen always means money.

---

## 3. Typography

### 3.1 Family selection

| Role | Family | Why | Budget (woff2, latin subset) |
|---|---|---|---|
| Editorial display (Public Portal only) | **Source Serif 4 Variable** (`opsz` + `wght`) | A serif headline is the fastest non-verbal signal of "public record, not SaaS". Optical-size axis keeps large sizes tight and small sizes open. | ~34 KB, subset to headline glyphs, loaded only on public routes |
| UI everywhere | **Inter Variable** (`opsz` + `wght`) | Highest-legibility neo-grotesque at 13–16px on low-DPI Android; has true `tnum`, `zero`, `cv05`. | ~30 KB (basic latin + punctuation + currency) |
| Numeric / codes | **Inter with `font-variant-numeric: tabular-nums slashed-zero`** | A second mono family for money is 8 KB we don't need to spend — Inter's tabular figures already lock column width. | 0 KB |
| Access codes only | **JetBrains Mono**, subset `[A-Z0-9-]` | Access codes are transcribed by humans over the phone; unambiguous 0/O, 1/l is a correctness requirement, not a style. | ~6 KB |

**Total font budget ≈ 70 KB, of which 36 KB is on the critical path** (Inter + mono).
Self-hosted, `font-display: swap`, with `size-adjust` / `ascent-override` metric overrides on the
system fallback so the swap causes **zero layout shift**.

*Contested:* a serif display costs 34 KB on 3G. **Option B** — drop Source Serif, run Inter at
weight 700 with `-0.03em` tracking for display — saves the bytes but loses the journalism cue and
makes the public portal look like the admin panel. **Recommendation: keep the serif, but only on
the public portal, lazy-loaded after first paint**; the headline renders in the metric-matched
fallback for ~200ms on 3G, which is an acceptable trade for the trust signal.

### 3.2 Scale

Base 16px = 1rem. UI ladder ratio **1.200 (minor third)**; editorial display ratio **1.250**.
Seven sizes; eight roles (`overline` shares `caption`'s size and is differentiated by case,
tracking and weight — a separate size there would be noise).

| Role | Size | Line-height | Tracking | Weight | Family |
|---|---|---|---|---|---|
| `display` | `clamp(2.75rem, 1.9rem + 3.4vw, 4.25rem)` | 1.02 | −0.030em | 620 | Serif (public) / Inter (app) |
| `h1` | `clamp(2rem, 1.65rem + 1.5vw, 2.5rem)` | 1.10 | −0.022em | 600 | Serif (public) / Inter (app) |
| `h2` | `1.5rem` (24px) | 1.25 | −0.016em | 600 | Inter |
| `h3` | `1.25rem` (20px) | 1.35 | −0.011em | 600 | Inter |
| `body-lg` | `1.125rem` (18px) | 1.65 | −0.005em | 400 | Inter |
| `body` | `1rem` (16px) | 1.60 (1.72 in article text) | 0 | 400 | Inter |
| `caption` | `0.8125rem` (13px) | 1.45 | +0.005em | 450 | Inter |
| `overline` | `0.6875rem` (11px) | 1.20 | +0.080em | 600, uppercase | Inter |

Negative tracking scales with size because optical spacing grows with cap height — untracked
48px type reads loose and amateur. Positive tracking on 11–13px counteracts the opposite effect.

### 3.3 Where each role is allowed

- `display` — **once per page maximum**, public portal hero and project detail title only. Never in a dashboard.
- `h1` — page title. Exactly one per route, always the accessible `<h1>`.
- `h2` — section headings, modal titles, card group headers.
- `h3` — card titles, table group headers, stat tile labels when the tile has no overline.
- `body-lg` — public portal lede paragraph and project description only. Never in tables.
- `body` — default. All paragraphs, form values, table cells.
- `caption` — metadata, helper text, timestamps, axis labels, table secondary lines.
- `overline` — stat tile labels, table column headers, section eyebrows. Never a full sentence.

### 3.4 Numerals — non-negotiable

Every currency amount, percentage, date and countable quantity uses
`font-variant-numeric: tabular-nums slashed-zero`. Money is right-aligned in tables and uses the
`XAF` code (not `FCFA`) at `caption` size in `text-tertiary`, set *before* the figure per CFA
convention, with the figure at `body`/`h3` weight 550. Rationale: an auditor scanning a budget
column compares digit positions, and proportional figures make 1 111 111 and 8 888 888 different
widths — the column stops being scannable.

---

## 4. Space, grid, radius, elevation

### 4.1 Spacing — 4pt base

`0 · 2 · 4 · 8 · 12 · 16 · 20 · 24 · 32 · 40 · 48 · 64 · 80 · 96 · 128`
(tokens `0, 0.5, 1, 2, 3, 4, 5, 6, 8, 10, 12, 16, 20, 24, 32`)

2px exists only for hairline optical nudges (icon baseline alignment). Anything not on this scale
is a bug.

### 4.2 Breakpoints & grid

| Name | Min width | Columns | Gutter | Margin | Container max |
|---|---|---|---|---|---|
| `xs` | 320 | 4 | 16 | 16 | fluid |
| `sm` | 480 | 4 | 16 | 24 | fluid |
| `md` | 768 | 8 | 20 | 32 | 720 |
| `lg` | 1024 | 12 | 24 | 40 | 960 |
| `xl` | 1280 | 12 | 24 | 48 | 1200 |
| `2xl` | 1536 | 12 | 32 | 64 | 1360 |
| `3xl` | 1920+ | 12 | 32 | auto | **1440 (public) / 1760 (admin)** |

Two container widths, not one: editorial content caps at 1440 with a **68ch measure** for prose,
while the admin tables get 1760 because column truncation costs an auditor more than long lines
cost them. Above 2560 the canvas gutters grow; content never does.

### 4.3 Section rhythm

Vertical space between major sections: `48` (xs) → `64` (md) → `96` (lg+).
Within a section: heading→content `16`, card grid gap `16`/`20`/`24` by breakpoint,
stacked form fields `20`, related controls `8`.

### 4.4 Radii

`none 0 · xs 4 · sm 6 · md 8 · lg 12 · xl 16 · 2xl 24 · full 9999`

- Inputs, buttons, badges: `sm`/`full` (badges are `full` only at ≤13px text).
- Cards, panels: `lg`. Modals, sheets: `xl`. Charts: `md` on the plot frame.
- **Nested radius rule:** inner radius = outer radius − padding. A 12px card with 8px padding
  gets 4px inner elements, so the curves stay concentric.

### 4.5 Elevation

Light mode — layered shadows (one blur is a smudge; three layers is a light source) plus a
border tint, because on white the *edge* does more work than the shadow:

| Level | Use | Shadow |
|---|---|---|
| `e0` | flush | `none` + `1px border-subtle` |
| `e1` | card | `0 1px 2px -1px rgb(28 37 34 / .10), 0 1px 1px rgb(28 37 34 / .06)` + `1px border-default` |
| `e2` | hovered card, dropdown | `0 2px 4px -2px rgb(28 37 34 / .10), 0 4px 8px -2px rgb(28 37 34 / .08), 0 0 0 1px rgb(28 37 34 / .04)` |
| `e3` | popover, toast | `0 4px 8px -4px rgb(28 37 34 / .10), 0 12px 20px -6px rgb(28 37 34 / .10), 0 0 0 1px rgb(28 37 34 / .05)` |
| `e4` | modal | `0 8px 16px -8px rgb(28 37 34 / .12), 0 24px 40px -12px rgb(28 37 34 / .14), 0 0 0 1px rgb(28 37 34 / .06)` |

Shadow colour is `neutral-950`, not black — a neutral-tinted shadow on a green-tinted grey reads
as *shade*, a black one reads as dirt.

Dark mode — **no shadows.** Elevation = surface luminance step + border-light:

| Level | Surface | Border |
|---|---|---|
| `e0` | `bg-canvas` `#0E1613` | `border-subtle` |
| `e1` | `bg-surface` `#131D19` | `neutral-400` @ 10% |
| `e2` | `#18231F` | `neutral-400` @ 14% |
| `e3` | `bg-raised` `#1C2522` | `neutral-400` @ 18% |
| `e4` | `#212B27` | `neutral-400` @ 22% + `0 0 0 1px rgb(0 0 0 / .6)` outer seat |

Interactive raised surfaces may add a 1px top inner highlight (`inset 0 1px 0 rgb(255 255 255 / .05)`)
— the light source is above, so only the top edge catches. No glows except the focus ring.

---

## 5. Motion

### 5.1 Scales

| Token | Duration | Used for |
|---|---|---|
| `instant` | 100ms | hover/active colour, focus ring |
| `fast` | 150ms | tooltips, checkbox, tab underline, small fades |
| `base` | 250ms | dropdown, popover, toast enter, accordion |
| `slow` | 400ms | modal, sheet, page transition, live-data flash |
| `ambient` | 700ms+ | progress meter fill on first paint, live pulse |

| Easing | Curve | Used for |
|---|---|---|
| `ease-standard` | `cubic-bezier(0.2, 0, 0, 1)` | default; layout and colour |
| `ease-out` (enter) | `cubic-bezier(0.05, 0.7, 0.1, 1)` | anything appearing — fast start, soft settle |
| `ease-in` (exit) | `cubic-bezier(0.3, 0, 0.8, 0.15)` | anything leaving — exits should not linger |
| `ease-emphasis` | `cubic-bezier(0.34, 1.4, 0.64, 1)` | toast + live badge only. Overshoot is a budget, not a default |

### 5.2 Rules

1. **Only `opacity` and `transform` animate.** Height/width/top/left animate via FLIP or not at all — a 3G Android device drops frames on layout animation and a stuttering interface reads as a broken one.
2. **Enter ≠ exit.** Enter 250ms `ease-out` + 4px rise; exit 150ms `ease-in`, no movement. Leaving should feel like it already left.
3. **Distance scales with size.** Small elements travel 4px, sheets travel their own height. Nothing travels more than 24px unless it's a full surface.
4. **Live data (Socket.io) — the "just changed" grammar.** On an inbound update: the changed value's container flashes `accent` @ 12% → transparent over 400ms `ease-out`, and a 2px left rail in `accent` fades over 700ms. **No count-up animation on money** — animating a budget figure through values it never held is a lie in an accountability product, and it delays the reader's access to the real number. New rows insert with 250ms fade + 4px rise; removed rows exit 150ms fade, no collapse animation until the exit completes.
5. **A live indicator, not a live surprise.** A persistent `overline`-sized "Live · updated 12s ago" with a 2s-period breathing dot; the dot is the only looping animation permitted in the app.
6. **`prefers-reduced-motion: reduce`** — all transforms drop to 0 distance, durations clamp to ≤100ms opacity-only, the hero slideshow stops auto-advancing (manual dots remain), the live flash becomes a static 1.5s tint hold, and the breathing dot becomes solid. Motion never carries information that isn't also in text.

---

## 6. Chart palette (feeds Phase 4)

Ordered categorical, colourblind-safe, separated in **grayscale luminance** as well as hue:

| # | Light | Luminance | vs white | Dark | vs canvas |
|---|---|---|---|---|---|
| 1 | `green-800` `#006345` | 0.094 | 7.32 | `green-300` `#8DDAC1` | 11.31 |
| 2 | `blue-600` `#3D7ACE` | 0.194 | 4.31 | `blue-400` `#73B0F6` | 8.11 |
| 3 | `neutral-500` `#899691` | 0.292 | 3.07 | `neutral-500` `#899691` | 5.98 |
| 4 | `amber-400` `#D0A700` | 0.415 | 2.28 ⚠️ | `amber-200` `#F6DD66` | 13.52 |
| — | over-budget only: `red-600` `#DD2826` | 0.257 | 4.77 | `red-400` `#FF7F7B` | 7.50 |

Consecutive luminances differ by ≥1.4×, so the series survive a grayscale print or a
monochrome-mode phone. **Series 4 at 2.28:1 fails 1.4.11 as a bare line** — it is only used as a
fill with an `amber-600` 1px stroke (4.32:1), or promoted to `amber-600` when drawn as a line.
Cap at **4 categorical series**; beyond that, colour stops being the encoding and the chart needs
direct labelling or small multiples.
