# BuildRight Cameroon — Component Specifications (Phase 3)

Depends on: `01-foundations.md`, `02-ia-ux.md`.
Decisions carried in: sidebar admin IA adopted, command palette deferred, no em dashes in UI copy.

---

## 0. The uniformity contract

Uniformity is not a style preference here, it is the mechanism by which the interface becomes
credible. An interface that renders the same idea two different ways teaches the user that the
difference is meaningless, and once that lesson is learned they stop trusting colour and weight to
mean anything, which is fatal for a product whose only job is to make data legible.

### 0.1 Measured drift in the current app

| Dimension | Distinct values in use | Target |
|---|---|---|
| Border radius | 6 (`rounded`, `-md`, `-lg`, `-xl`, `-full`, `-br`) | 4 |
| Shadow | 6 (`shadow`, `-sm`, `-md`, `-lg`, `-xl`, bare `shadow-`) | 3 in light, 0 in dark |
| Button padding pairs | 12 distinct `px-N py-N` combinations | 4 sizes |
| Focus handling | 26 × `focus:outline-none`, replaced by 4 different ring recipes and sometimes nothing | 1 global rule |
| ARIA attributes | 2 in the entire `src/` tree | per component below |
| Status colour source | Hardcoded Tailwind palette in `StatusBadge.jsx:5-10`, where Ongoing is yellow and Stalled is red | Phase 1 status tokens |
| Icon system | FontAwesome CDN, 31 unique icons used | Local SVG sprite, same 31 |

Two specific bugs this surfaces. `StatusBadge` currently paints **Ongoing yellow and Stalled red**,
which inverts the Phase 1 contract where amber means "delayed" and red means "money problem"; a
healthy ongoing project currently looks like a warning. And `AccessCodeManager.jsx:34` sets
`bg-secondary` with `hover:bg-amber-600`, so the button changes hue family on hover, which is drift
that no one would ever specify on purpose.

### 0.2 The enforcement mechanism

1. **Every interactive element in the app is one of the 20 components below.** No page composes raw Tailwind for a control. A page may compose layout, never chrome.
2. **No component reads a raw palette value.** Only semantic tokens (`bg-surface`, `text-secondary`, `border-input`). This is what makes dark mode and any future palette change a one-file edit.
3. **Variants are closed sets.** Button has exactly five variants and four sizes. If a design needs a sixth, the design is wrong or the system needs an agreed change, never a one-off `className`.
4. `className` is still mergeable on every primitive, but it is for **layout only** (margin, grid placement, width). Chrome overrides are a review failure.

### 0.3 Global control scale

Every control snaps to one of four heights. This alone removes the 12 padding pairs.

| Size | Height | Padding X | Text | Icon | Where |
|---|---|---|---|---|---|
| `xs` | 28px | 8px | caption 13px | 16px | Table inline actions, desktop only |
| `sm` | 36px | 12px | caption 13px | 16px | Toolbars, filter chips, dense admin |
| `md` | 40px | 16px | body 16px | 20px | Default everywhere |
| `lg` | 48px | 20px | body 16px | 20px | Mobile primary actions, contractor field UI |

**Touch rule:** any control rendered on a touch viewport has a tap target of at least 44 × 44px. `xs`
and `sm` reach it with an invisible expanded hit area (`::after` inset −8px), never by growing the
visual box, so density is preserved without failing 2.5.8 Target Size.

### 0.4 Universal state model

Every interactive component implements exactly these states, in this order of precedence:

| State | Treatment | Notes |
|---|---|---|
| default | per variant | |
| hover | background steps one level (`surface → sunken`, fill → `-800`) | 100ms; pointer devices only (`@media (hover: hover)`) |
| focus-visible | `outline: 2px solid var(--focus-ring); outline-offset: 2px` | One global rule. `focus:outline-none` without a replacement is banned. |
| active | background steps two levels, no transform | Transforms on press cause text reflow shimmer on low-DPI Android |
| disabled | `bg-sunken`, `text-disabled`, `border-subtle`, `cursor: not-allowed` | Never opacity alone; opacity on a tinted chip produces unpredictable contrast |
| loading | leading icon slot becomes a spinner, label stays, **width is locked** | `aria-busy="true"`; locking width prevents the button resizing mid-click |
| error | `border-input` becomes `danger`, message below, icon in field | `aria-invalid="true"` + `aria-describedby` |

**Disabled that gates a form uses `aria-disabled="true"` and stays focusable**, so a keyboard user can
land on it and read why it is unavailable. A `disabled` attribute removes it from the tab order and
the user is left guessing.

### 0.5 Icon system

Replace the FontAwesome CDN with a local SVG sprite containing the 31 icons already in use, plus the
6 status icons from Phase 2. Rationale is uniformity and bandwidth in equal measure: the CDN costs a
third-party connection and roughly 70KB before a single glyph renders, against about 4KB for the
sprite, and an icon font renders as text so it inherits font smoothing and baseline quirks that make
identical icons look different across surfaces.

Rules: 16 / 20 / 24px only, 1.5px stroke, `currentColor`, `aria-hidden="true"` when adjacent to a
text label, and an icon-only control always carries `aria-label` plus a tooltip.

---

## 1. Button

**Anatomy:** `[leading icon] label [trailing icon]`, gap 8px, radius `sm` (6px), weight 550, no text wrap.

| Variant | Light | Dark | Rule |
|---|---|---|---|
| `primary` | `green-700` fill, white text (5.21:1) | `green-500` fill, `neutral-950` text (5.37:1) | **One per surface.** |
| `secondary` | `bg-canvas`, `border-input`, `text-primary` | `bg-surface`, border 55% | The default for everything else |
| `ghost` | transparent, `text-secondary`, hover `bg-sunken` | same | Toolbars, table rows, cancel |
| `danger` | `red-700` fill, white text (6.24:1) | `red-400` fill, `neutral-950` text | Destructive only. Never "submit" or "generate". |
| `link` | `accent` text, underline on hover, no box | `accent` | Inline in prose only |

Sizes per 0.3. `iconOnly` renders square at the same height with `aria-label` required.
`fullWidth` allowed only below `md` breakpoint or inside a sheet.

**States:** per 0.4. Loading keeps the label and swaps the leading icon, because replacing the label
with a spinner destroys the user's memory of what they clicked.

**Responsive:** primary actions become `lg` and full width below 768px; button groups stack with 8px
gap; icon-only buttons keep their label as a tooltip and expose it to screen readers.

**A11y:** real `<button type>`, never a styled `<div>` or an `<a>` without `href`. Space and Enter
both activate. Toggle buttons use `aria-pressed`. A button that opens a dialog uses `aria-haspopup="dialog"`
and receives focus back on close.

**Migrates:** the 12 padding pairs and the red "New Project" ([AdminDashboard.jsx:111](../../src/pages/AdminDashboard.jsx#L111)) and red "Post Comment" ([ProjectDetails.jsx:198](../../src/pages/ProjectDetails.jsx#L198)) both become `primary` green.

---

## 2. Input, Textarea, Select, DatePicker

**Shared anatomy:** `label` (caption 500, `text-secondary`, 6px below) → control → `helper or error`
(caption, 6px above). Label is always visible. Placeholder is never the label: it disappears on
input, which destroys the user's ability to check their own work.

| Property | Value |
|---|---|
| Height | control scale, `md` default, `lg` on mobile |
| Border | 1px `border-input` (3.07:1 light / 3.22:1 dark, the only borders that pass 1.4.11) |
| Radius | `sm` 6px |
| Background | `bg-canvas` light, `bg-sunken` dark |
| Text | `body`, `text-primary`; placeholder `text-placeholder` (5.57:1, never `neutral-600`) |
| Focus | 2px `focus-ring` outline, offset 2px, border unchanged |
| Invalid | border `danger`, 16px alert icon inside the right edge, message below in `danger` |
| Required | `required` attribute plus a `caption` "Required" on the label. Never an asterisk alone. |

**Textarea:** min 96px, resize vertical only, optional character counter that appears at 80% of limit
and turns `danger` at 100%.

**Select:** native `<select>` with a custom chevron. A custom listbox is 8KB of JavaScript and a
keyboard-interaction surface to maintain, in exchange for styling the option list, which Android
users will not see because the OS takes over anyway.

**DatePicker: native `<input type="date">`.** This is a deliberate recommendation, not a shortcut.
Native gives OS-level localization, the Android wheel UI, and full keyboard and screen reader
support for free; every custom React date picker is 15 to 25KB and most fail keyboard grid
navigation. We wrap it only to apply `min`/`max` (completion date cannot precede start date), to
normalize the appearance of the indicator, and to render errors. Dates display as `12 Mar 2026` in
tabular figures, never `12/03/2026`, because day-month ambiguity in a public record is a real cost.

**A11y:** `<label for>` on every control, no exceptions. `aria-invalid` and `aria-describedby` wire
the error. On submit failure, focus moves to the first invalid field and the error summary is
announced through a live region.

---

## 3. Card

**Anatomy:** optional media → optional header (title + actions) → body → optional footer.
Padding 16px mobile, 20px `md`, 24px `lg`. Radius `lg` 12px. Light: `e1` plus 1px `border-default`.
Dark: `bg-surface`, 1px border at 10%, no shadow.

**Variants:** `static` (default), `interactive` (whole card is a link: hover raises to `e2` and
`border-strong`, focus ring wraps the card, cursor pointer), `inset` (`bg-sunken`, no shadow, for
nested regions such as the comment form).

**Rules that produce uniformity:** a card never contains another bordered card, only `inset` regions.
Nested radius = 12 − padding per Phase 1. A card has at most one primary action.

**A11y:** `interactive` uses one anchor wrapping the title with a `::after` overlay to make the whole
card clickable, so the accessible name is the title and the link is announced once, not three times.

---

## 4. ProjectCard

Composition of Card `interactive` + StatusBadge + ProgressMeter, laid out to the 4.1 hierarchy
contract from Phase 2.

**Anatomy:** 16:9 cover (lazy, `width`/`height` set, `bg-sunken` placeholder, badge overlaid top-right)
→ title `h3` 2-line clamp → meter with both figures → location and budget row → "Updated 3 days ago".

**Responsive:** 1 column below 640, 2 at `md`, 3 at `lg`, 4 at `2xl` on the admin overview only.
Below 360px the meter drops to its `compact` variant.

**A11y:** `<article>` with `aria-labelledby` pointing at the title. Photo count badge is a real text
node, not an icon with a number. The card carries a single link.

**Fixes:** the current unconditional `project.images.length` ([ProjectCard.jsx:10](../../src/components/ProjectCard.jsx#L10)) throws when the API returns a project without an `images` array; the spec requires a fallback and intrinsic dimensions so the grid never shifts on load.

---

## 5. StatusBadge

**Anatomy:** `[12px status icon] label`, 6px gap, height 24px (`sm` 20px), padding 8px, radius `full`
below 14px text, `overline` type, tinted chip per Phase 1 status tokens.

**Two ranks, per Phase 2:** `lifecycle` (filled tint, exactly one) and `flag` (transparent with a 1px
hue border, zero to two: Delayed, Over budget). The visual difference between fill and outline is
what stops a flag from competing with the lifecycle state.

**Props:** `status` (the stored value), `flags` (derived array), `size`.

**A11y:** plain text inside the chip; colour is decorative. Flags carry a `title` explaining the
derivation, for example "Past its completion date of 12 Mar 2026", because a derived state must be
able to show its reasoning.

**Fixes:** replaces the inverted colour map at [StatusBadge.jsx:5-10](../../src/components/StatusBadge.jsx#L5-L10).

---

## 6. ProgressMeter

The core component, specified in Phase 2 section 5. Restated here as an interface.

**Props:** `progress`, `spent`, `budget`, `variant` (`dual` default, `compact`), `size` (`sm`/`md`/`lg`),
`showLabels` (default true).

**Anatomy, `dual`:** two rails on one 0 to 100 axis, labels "Built" and "Spent" at `caption` on the
left, figures right-aligned in tabular numerals, variance chip below-right, plain-language sentence
under it at `lg` size only.

**Colour:** build rail `accent`; spend rail from the variance band (neutral / amber-600 / red-600);
over 100% burn the spend rail caps at 100% with a 4px `red-700` overflow marker and the true figure
in the label.

**Motion:** first paint fills from 0 over 700ms `ease-out`, rails staggered 60ms. Socket update
transitions over 400ms with the Phase 1 value flash. Both disabled under reduced motion.

**A11y:** the rails are `aria-hidden`. The figures beside them are real text, and that text is the
accessible content. This is deliberate: a `role="meter"` with a summarized `aria-label` would give a
screen reader user our interpretation instead of the two numbers a sighted user reads.

---

## 7. Table

**Anatomy:** toolbar (search, filters, density toggle, primary action) → `<table>` with visually
hidden `<caption>` → sticky `<thead>` → rows → footer (count, load more) → fixed bulk action bar.

Row 52px default / 44px compact, cells 12px vertical padding, 1px `border-subtle` rules, **no zebra
striping**, hover `bg-surface`, selected `bg-sunken` plus a 3px `accent` left bar.

**Column priority, collapse, sticky header, sorting, bulk actions and the full keyboard map** are
specified in Phase 2 section 7 and are not repeated here. Below 768px the table renders as a stacked
list using the ProjectCard hierarchy, never a horizontal scroll.

**States:** loading renders 8 skeleton rows at exact final height; empty distinguishes first-run from
filtered-to-zero; error renders an inline panel with retry inside the table frame, so the toolbar and
filters stay usable.

**A11y:** semantic `<table>`, `<th scope="col">`, `aria-sort` on the sorted header, sort control is a
`<button>` filling the cell, roving tabindex on rows, selection count announced politely.

---

## 8. Modal

**Anatomy:** scrim (`bg-overlay`) → panel (`bg-raised`, radius `xl`, `e4`, max-width 560 `sm` / 720
`md` / 960 `lg`) → header (title `h2` + close) → scrollable body → footer (secondary left, primary right).

**Rules:** modals are for **destructive confirmation and focused creation or editing only**. Success
messages become toasts. This is the change that retires the confirm-on-every-save pattern at
[AdminDashboard.jsx:77-92](../../src/pages/AdminDashboard.jsx#L77-L92) while keeping `StatusModal`
alive for destructive confirms.

**Responsive:** below 640px a modal becomes a full-height bottom sheet with a drag handle, the footer
pinned above the safe area, and body scroll locked.

**Motion:** scrim fades 250ms; panel scales 0.98 to 1 with a 8px rise over 250ms `ease-out`; exit
150ms `ease-in`. Reduced motion gets opacity only.

**A11y:** native `<dialog>` where possible. `role="dialog" aria-modal="true"`, labelled by the title
id. Focus moves to the panel on open and returns to the trigger on close. Focus is trapped, Escape
closes, background is `inert`. A destructive confirm names the object ("Delete Regional Hospital
Maroua?") and its primary is `danger`, positioned right, never focused by default.

---

## 9. Toast

**Anatomy:** icon → message → optional action → dismiss. `bg-raised`, `e3`, radius `md`, 4px leading
bar in the status hue, max width 400.

**Placement:** bottom-centre on mobile above the safe area, bottom-right from `md`. Max 3 stacked,
newest nearest the edge, older ones compress.

**Timing:** success 4s, info 6s, **errors never auto-dismiss**. Timer pauses on hover and on focus
within. Swipe to dismiss on touch.

**A11y:** one persistent container with `role="status"` and `aria-live="polite"` for success and info,
`role="alert"` and `aria-live="assertive"` for errors. The container exists in the DOM from mount, as
live regions inserted at announcement time are unreliable. A toast with an action is also reachable
by keyboard: F6 or Tab from the trigger moves into the region and the timer pauses.

---

## 10. Tabs

**Anatomy:** tablist with a 2px `accent` underline on the active tab, `caption`/`body` labels, 40px
height, 24px gap, 1px `border-subtle` baseline spanning the full width.

Active is marked by underline **and** `text-primary` against `text-tertiary`, so the state does not
rely on colour alone.

**Responsive:** horizontal scroll with edge fade below `md`, active tab scrolled into view on mount.
Never wrap tabs to two lines.

**A11y:** `role="tablist"`, `role="tab"` with `aria-selected` and `aria-controls`, `role="tabpanel"`
with `aria-labelledby` and `tabindex="0"`. Roving tabindex, Left and Right arrows move, Home and End
jump, automatic activation on desktop and manual activation on touch, where an accidental swipe
should not load a panel.

---

## 11. Navbar (public)

**Anatomy:** skip link (first focusable, visible on focus) → wordmark → primary nav → live indicator
→ `Staff sign in` (ghost, caption) → theme toggle → mobile menu button.

Height 56px mobile / 64px `md`. Background `bg-canvas` with 1px `border-subtle`, **not** the current
green fill with a 4px yellow bottom border. Rationale: a saturated bar across the top of every page
spends the brand's loudest colour on chrome, which leaves nothing louder for the data. The green
moves to the wordmark and the accent; the yellow is retired from chrome entirely and kept for the
delayed status.

**Active route:** `aria-current="page"` plus `text-primary` and a 2px underline; inactive is
`text-secondary`.

**Mobile menu:** full-height sheet from the top, focus trapped, `aria-expanded` and `aria-controls`
on the trigger, Escape closes, scroll locked, focus returns to the trigger. The current
implementation ([Navbar.jsx:74-79](../../src/components/Navbar.jsx#L74-L79)) has none of these and
sets `focus:outline-none` with no replacement.

---

## 12. Sidebar (admin, developer)

**Anatomy:** header (wordmark + collapse toggle) → nav sections with `overline` group labels → item
rows (20px icon + label, 40px height) → footer (account menu with the user's name, theme toggle, sign
out, and `Change password`, which is where it belongs rather than as a page-level button).

Width 240px, collapsed 56px icon rail with the label in a tooltip, state persisted to `localStorage`.

**Active item:** 3px `accent` left bar + `bg-surface` + `text-primary` + `aria-current="page"`. Three
channels, so it survives greyscale.

**Responsive:** below `lg` the sidebar becomes an off-canvas drawer opened from a header button, with
the same focus trap contract as the mobile navbar. Below `md` it is a bottom tab bar of the four
admin sections, because a drawer on a phone hides the app's structure behind a gesture.

**A11y:** `<nav aria-label="Admin sections">` containing a real list. Collapse toggle is
`aria-expanded`. Keyboard reachable in DOM order before the main content, after the skip link.

---

## 13. Footer

**Anatomy, 3 columns on `lg`, stacked on mobile:** identity and one-line mission → navigation →
**provenance block**: data source, "Last updated 13 Aug 2026", and the `Staff sign in` link.

The provenance block is the design point. In a transparency product the footer is the natural place
to answer "where does this data come from and how current is it", and answering it in a fixed,
uniform location on every page is worth more to trust than any visual treatment.

`bg-surface`, 1px top `border-subtle`, `caption` text at `text-tertiary`, 48px vertical padding.

---

## 14. Chart shell

The frame every Recharts chart mounts into, so all charts share one geometry. Chart internals are
Phase 4.

**Anatomy:** header (title `h3`, optional `overline` unit such as "XAF, millions", right-aligned
controls) → plot area with a fixed aspect ratio per breakpoint (16:9 mobile, 21:9 desktop) → optional
direct-labelled legend below → footer note in `caption` `text-tertiary`.

**States:** loading is a skeleton with the exact plot dimensions, so no layout shift; empty is a
centred single line with the reason, never an empty axis frame, which reads as a rendering failure;
single datapoint renders as a labelled value with a note rather than a one-bar chart; error renders a
retry inside the frame.

**A11y:** `<figure>` with `<figcaption>`. Every chart ships a visually hidden data table as its
accessible alternative, which is also what makes the data copyable.

---

## 15. Stat tile

**Anatomy:** `overline` label → value in `h1`/`display` tabular figures → optional delta chip →
optional 32px sparkline. Card `static`, padding 20px.

**Rules:** at most one accent per tile, and the delta chip is the only coloured element. Money uses
the Phase 4 abbreviation rules with the full value in `title`. Tiles in a row share one height and
one label length budget of about 24 characters, since ragged tiles are the fastest way to make a
dashboard look assembled rather than designed.

**Responsive:** 1 column below 480, 2 at `sm`, 4 at `lg`.

**A11y:** `<dl>` with `<dt>` label and `<dd>` value, so the pairing is programmatic. The sparkline is
`aria-hidden`.

---

## 16. Photo gallery and lightbox

**Gallery:** 4:3 tiles (construction photography is rarely 16:9), 2 columns mobile, 3 at `md`, 4 at
`lg`, 8px gap, radius `md`. Each tile is a `<button>` opening the lightbox. Lazy loaded with intrinsic
`width`/`height` and a `bg-sunken` placeholder, so a slow connection never shifts the page. First
image is eager and marked "Main cover" as it is today. Capture date renders as a `caption` overlay on
hover and focus, and always on touch, because a photo without a date proves nothing.

**Lightbox:** full-viewport dialog, `bg-overlay`, image contained not cropped, counter "3 of 8",
caption and date, previous and next controls at 48px, close at top-right. Neighbours preloaded.
Pinch and double-tap zoom on touch; swipe to change.

**A11y:** `role="dialog" aria-modal="true"`, focus trapped, Escape closes, Left and Right arrows
navigate, focus returns to the originating tile. Alt text is the project title plus the caption, and
decorative duplicates are `alt=""`.

---

## 17. Comment thread

**Item anatomy:** 32px initial avatar (tinted by author type) → author name (`body` 550) → author type
chip (`overline`) → relative timestamp with the absolute date in `title` → body at 68ch → evidence
thumbnails → actions (report; delete for admins).

The current implementation uses purple for NGO and blue for Citizen
([ProjectDetails.jsx:213-219](../../src/pages/ProjectDetails.jsx#L213-L219)). Purple is outside the
system: NGO becomes `blue` and Citizen becomes `neutral`, which also correctly signals that a citizen
report is the default voice on the platform rather than the exception.

**Form:** name, author type, textarea, up to 4 photos with per-file remove and upload progress,
counter "2 of 4 photos". Submit is `aria-disabled` until valid with the reason in helper text, never
a silently dead button. Optimistic insert at full opacity with a `Posting` pill per Phase 2.

**Empty state:** "No reports yet. If you have visited this site, you can be the first to report."
Action-oriented, because on a public portal the empty state is the recruitment surface.

**A11y:** `<ol>` of `<article>` elements, each labelled by its author and time. The list has
`aria-live="polite"` scoped to insertions so a socket-delivered comment is announced once. Photo
expansion is a `<button>` with `aria-expanded`.

---

## 18. Access-code generator

**Anatomy:** Card header → role `Select` + `Generate code` primary button → **reveal panel** → codes table.

**Reveal panel** is the part the current implementation lacks: on generation the new code appears in
a dedicated `inset` region at `h2` size in JetBrains Mono with letter-spacing 0.08em, next to a
`Copy` button that confirms with "Copied" for 2 seconds, plus a one-line caution: "Share this code
only with the person you are inviting. It works once." The code is the product of this screen and it
currently appears only as another table row.

**Table columns:** Code (mono, truncated after reveal), Role, Status (Active / Used, using the status
chips rather than the ad hoc red and green spans at
[AccessCodeManager.jsx:61-64](../../src/components/dashboard/AccessCodeManager.jsx#L61-L64)),
Generated by, Created.

**A11y:** the generated code is announced through a polite live region. Copy success is announced too,
since a silent visual "Copied" is invisible to a screen reader user. The code is selectable text, not
only a copy button, because copy buttons fail in some mobile browsers.

**Fixes:** `bg-secondary` with `hover:bg-amber-600` at
[AccessCodeManager.jsx:34](../../src/components/dashboard/AccessCodeManager.jsx#L34) becomes
`Button variant="primary"`.

---

## 19. Component to file map (for Phase 5)

```
src/components/ui/          Button, Input, Textarea, Select, DateField, Card, Badge,
                            Meter, Table/*, Modal, Sheet, Toast/*, Tabs, Skeleton,
                            Icon, StatTile, ChartShell, Tooltip, VisuallyHidden
src/components/app/         ProjectCard, StatusBadge, ProgressMeter, PhotoGallery,
                            Lightbox, CommentThread, AccessCodeGenerator, LiveIndicator
src/components/layout/      Navbar, Sidebar, Footer, PageHeader, AdminLayout
```

Every existing page and dashboard module is refactored onto this layer in Phase 5 with all props,
state, API calls, routes and socket logic preserved.
