# BuildRight Cameroon — Information Architecture & UX (Phase 2)

Depends on: `01-foundations.md`. Carried-forward defaults: serif display kept (public portal only),
full dark mode on all three surfaces, 1440 public / 1760 admin containers.

Convention used throughout, including in all proposed UI copy: **no em dashes**.

---

## 1. What the current IA gets wrong

Evidence from the codebase, not impressions.

| # | Problem | Where | Cost |
|---|---|---|---|
| 1 | The two numbers that define the product (built % and spent %) are rendered in **two different columns of two different cards**: completion in the main column, budget burn in the sidebar. | `ProjectDetails.jsx:97-109` vs `:258-279` | The core judgement of the app requires the user to hold one number in memory while scrolling to find the other. |
| 2 | Red is a decorative brand fill: "New Project" and "Post Comment" are `bg-secondary` (red). | `AdminDashboard.jsx:111`, `ProjectDetails.jsx:198` | Red stops meaning "over budget". Violates the Phase 1 colour contract. |
| 3 | The admin's primary work object (the project table) is the **last** thing on the page, below a chart, a comment feed and a contractor list. | `AdminDashboard.jsx:118-129` | Every admin session begins with a scroll past three things they did not come for. |
| 4 | Three role dashboards, three different page shells, all named "Dashboard" in the nav. | `Navbar.jsx:46-54` | No sense of place; no active state anywhere in the nav. |
| 5 | Two competing project lists: Home has a filter+sort dashboard grid, `/projects` has a filter sidebar. | `Home.jsx:76-117`, `ProjectsPage.jsx:53-70` | Duplicate mental models; the homepage grid has no region or contractor filter, so users who start there hit a dead end and re-filter from scratch. |
| 6 | Login is the single most visually dominant control in the header (yellow fill on green). | `Navbar.jsx:64-69` | The page spends its strongest affordance on the action that ~0.1% of visitors take. |
| 7 | Status is 4 values with no notion of schedule or budget health. | `types.js:8-13` | "Ongoing" covers both a healthy project and one that has spent 95% of budget to build 20%. |
| 8 | Success and failure both open a blocking modal. | `AdminDashboard.jsx:77-92`, `StatusModal.jsx` | A modal to say "saved" costs a dismissal click on every single save. |

---

## 2. The status system

### 2.1 Stored status stays as-is; health is derived

`ProjectStatus` has four values and the API and socket payloads depend on them. **No schema change.**
The two new states from Phase 1 are computed on the client from data that already exists:

```
burn      = spent / budget * 100
variance  = progress - burn          // "points of build minus points of spend"
overBudget = burn > 100
delayed    = completionDate < today && status !== 'Completed'
```

| Displayed state | Source | Colour token |
|---|---|---|
| Planned | `status === 'Planned'` | planned (blue) |
| In progress | `status === 'Ongoing'` | in-progress (green) |
| Completed | `status === 'Completed'` | completed (green, deeper) |
| Stalled | `status === 'Stalled'` | stalled (achromatic) |
| Delayed | derived: past `completionDate`, not completed | delayed (amber) |
| Over budget | derived: `burn > 100` | over-budget (red) |

Rationale: an accountability platform must not let a contractor self-report "Ongoing" and thereby
hide a schedule slip. Derived states are computed from figures the contractor cannot edit without
it showing up in the money, so they are harder to game than a dropdown.

### 2.2 Badge language

Two ranks, and they are visually different so they never read as equals:

- **Lifecycle badge** (exactly one per project): Planned / In progress / Completed / Stalled. Tinted chip, `overline` type, 4px radius on the left icon, icon + word.
- **Risk flags** (zero to two, appended): Delayed, Over budget. Same chip metrics but with a 1px border in the flag hue and no fill on light surfaces, so a flag reads as an *annotation on* the lifecycle badge rather than a competing status.

Every badge carries icon + word + colour, so colour is never the only channel (1.4.1). Icon set:
Planned `circle-dashed`, In progress `circle-half`, Completed `circle-check`, Stalled `circle-pause`,
Delayed `clock`, Over budget `trending-up`.

### 2.3 Variance chip

The single most repeated atom in the product: `−50 pts` in the band colour, tabular figures,
`caption` size, always adjacent to the meter. Bands:

| Variance | Band | Token | Meaning |
|---|---|---|---|
| `>= -5` | On balance | green | Spend is tracking build |
| `-5 to -20` | Watch | amber | Spending ahead of building |
| `< -20` | Critical | red | Money is leaving faster than work is arriving |
| any, with `burn > 100` | Over budget | red (overrides) | Budget exhausted |

A positive variance (built more than spent) is shown in neutral, not green: underspend on public
works is not automatically good news, and colouring it as a win would be an editorial claim the
data does not support.

---

## 3. Navigation and page hierarchy

### 3.1 Public Portal

| Change | User goal | Task-time argument |
|---|---|---|
| Nav becomes: **Projects · Map · About**, with `Staff sign in` demoted to a quiet `caption`-size link at the far right and repeated in the footer | "Find the project near me" | Removes the yellow Login button that currently wins the visual competition against the primary task. Zero cost to staff: the link is still one click, just not the loudest pixel on the page. |
| Rename `Developers` to `About` | "Who is behind this and can I trust it?" | "Developers" reads as an API/dev-portal to a citizen and as a construction firm to a contractor. The page is a team page; name it for the question it answers. |
| Home stops being a second project browser: it keeps the hero, three national stat tiles, "Recently updated" (6 cards), and "Needs attention" (over budget or stalled, 4 cards), each with one link into `/projects` carrying the filter | "Show me something is happening, then let me dig" | The homepage grid today offers status+sort but not region or contractor, so any real query forces a restart on `/projects`. Cutting the duplicate saves the restart and turns the homepage into an editorial front page, which is the brand thesis. |
| `/projects` is the one browse surface: sticky filter rail on `lg+`, a bottom sheet on mobile, filter state in the URL query string | "Share what I found" | URL-encoded filters make a filtered view linkable, which is how citizen journalism actually spreads. Currently a filtered view cannot be shared. |
| Project detail gains a breadcrumb (`Projects / Littoral / Yaoundé-Douala Highway`) and the back link points to the filtered list, not `/` | "Go back to where I was" | Today the back link is hardcoded to `/` (`ProjectDetails.jsx:83`) and says "Back to Dashboard", which discards the user's filter work and uses a word citizens do not have a model for. |
| Add a "Report an issue" affordance in the detail page's sticky action bar on mobile | "Tell someone what I saw" | The comment form is currently ~1200px down the page on a phone. |

Route changes: none required. `/developers` keeps its path with a new label (rename the path later if you want; it is not worth a broken external link now).

### 3.2 Contractor surface

Field-first. No sidebar, no chrome that does not perform work.

- **`/contractor` becomes a task list, ordered by urgency, not by insertion**: projects with no update in 7+ days first, then nearest `completionDate`, then the rest. A contractor's real question is "what do I owe an update on", and today the answer requires reading every card.
- Each project is a **task row** collapsed to: title, lifecycle badge, "Last updated 12 days ago" in the delayed hue if stale, and one 48px-min primary button, `Update progress`.
- Updating opens a **full-screen sheet on mobile / side panel on desktop**, one logical group per step: (1) progress %, (2) amount spent, (3) photos, (4) note. Today all five inputs live in an inline form inside a card, which on a 360px screen means a cramped form with a keyboard covering the submit button.
- The sheet's primary action is fixed to the bottom, above the safe area, always visible.
- Photos: capture-first (`capture="environment"`), queued, uploaded in the background with per-file progress and retry, because a 3G upload failing silently is the single most likely way this product loses data.

### 3.3 Admin / Developer surface

Convert one long scroll into a persistent left sidebar with real sections. All new routes are
additive; existing routes keep working (`HashRouter` unchanged).

```
/admin              → redirect to /admin/overview
/admin/overview       Stat tiles, financial chart, "Needs attention" queue
/admin/projects       The project table. Default landing for returning admins.
/admin/contractors    ContractorList + analytics
/admin/reports        CommentManager (citizen reports moderation)
/dev-admin          → redirect to /dev-admin/access
/dev-admin/access     AccessCodeManager
/dev-admin/team       TeamManager
```

| Change | Task-time argument |
|---|---|
| Sidebar (240px, collapsible to a 56px icon rail, state persisted) | Moving between the table and the comment queue is currently a scroll of the entire page. Sidebar makes it one click and preserves scroll position per section. |
| The project table becomes its own route and the default landing after the first visit | Removes ~1400px of scrolling from the start of ~80% of admin sessions. |
| Header keeps: page title, live indicator, search, and exactly one primary action per route (`New project` on `/admin/projects`) | One primary per surface is what makes a primary readable. `Change password` moves into the account menu, where password changes have lived in every product the user has ever used. |
| `Cmd/Ctrl+K` command palette: jump to project, jump to section, new project, generate access code | Optional but cheap: a `<dialog>` with a filtered list over data already in the store. This is the difference between "admin template" and Linear. Recommended, but it is the one item here I would cut first if the timeline is tight. |
| Success stops being a modal; it becomes a toast. Modals are reserved for destructive confirmation. | Removes one forced click from every save. `StatusModal` is kept and re-pointed at destructive confirms, so no component is thrown away. |

---

## 4. The visual hierarchy contract

The rule for all three: **at most two saturated elements per unit**. Everything else is neutral
type at three weights. Colour is reserved for encoding, so wherever colour appears it means something.

### 4.1 ProjectCard

| Rank | Element | How it wins |
|---|---|---|
| 0 | Cover photo, 16:9, intrinsic dimensions, lazy | Physical attention anchor. It carries no information, so it is captioned by rank 1 and never cropped to a shape that implies status. |
| 1 | **Title**, `h3` 20px/600, text-primary, 2-line clamp | Largest text in the unit; 16px of space above it, 8px below (space is the strongest hierarchy signal). |
| 2 | **Lifecycle badge + variance chip** | The only saturated pixels in the card. Top-right of the photo for the badge, inline before the meter for the chip. |
| 3 | **Build vs Spend meter** with both figures in text | Full card width; the widest element after the photo, so it reads as the card's payload. |
| 4 | Location, budget | `body`/`caption`, text-secondary, tabular figures for money. |
| 5 | "Updated 3 days ago" | `caption`, text-tertiary, bottom-left, lowest contrast in the card. |

### 4.2 Table row (admin)

| Rank | Element | How it wins |
|---|---|---|
| 1 | **Project title**, `body` 500 weight, text-primary, first column at 34% width | Position and the only medium-weight text in the row. |
| 2 | **Lifecycle badge** (fixed-width column, so badges form a scannable vertical stripe) | Alignment: a column of chips can be scanned in one vertical saccade, which is the whole point of a table. |
| 3 | **Variance chip + compact meter** | Colour, and the only non-text mark in the row. |
| 4 | Budget, right-aligned tabular; spent as a `caption` second line | Right alignment plus tabular figures makes magnitude comparison positional rather than numeric. |
| 5 | Contractor, region, updated | text-tertiary, truncated with title attribute. |
| 6 | Row actions | Icon-only, revealed on row hover/focus, always present for keyboard and touch (never hover-only in a way that hides them from touch devices). |

Location lives as a `caption` second line under the title, not its own column: it is an attribute of
the project's identity, not an independent axis of comparison.

### 4.3 Project detail page

The critical restructure. Today: title, completion card, gallery, description, comments, with money
in a right sidebar. Proposed order in the main column:

| Rank | Block | Rationale |
|---|---|---|
| 1 | Breadcrumb, `display`/`h1` title, lifecycle badge + risk flags, location | Identity and verdict in the first viewport on a 320px screen. |
| 2 | **"Build vs Spend" panel, full width, directly under the title** | This is the fix for problem #1. The panel holds the dual meter, both raw figures, the variance chip, and one sentence of plain-language interpretation: "80% of the budget is spent and 30% of the work is done." |
| 3 | **Evidence**: photo gallery with capture dates | In a transparency product, photos are the proof layer; they outrank prose. |
| 4 | Description | Prose at 68ch. |
| 5 | Timeline of updates (`project.updates`, currently unrendered anywhere in the UI) | The audit trail is the second proof layer and it already exists in the data model. |
| 6 | Citizen reports | Highest-volume content, so it goes last and gets its own heading and count. |

Sidebar (desktop) keeps only stable facts: contractor, region, start date, completion date, source
note. On mobile the sidebar collapses to a definition list below block 2, not to the bottom of the page.

---

## 5. The Build vs Spend meter (the core component)

Requirement: an auditor must see "80% budget spent, 30% built" without reading two numbers and
subtracting. Three options were designed; all three use only Phase 1 tokens.

### Option A — Dual track (recommended)

Two 6px rails, stacked with 6px between, sharing one 0-100% axis, left-aligned.

```
Built    ██████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  30%
Spent    ████████████████████████████████████░░░░░░░░░░  80%
                       ↑ the gap is the finding          −50 pts
```

- Build rail: `accent` (green-700 light / green-400 dark). Spend rail: band colour (neutral-700 on balance, amber-600 watch, red-600 critical / over budget).
- Over 100% burn: the spend rail fills to 100% and grows a 4px overflow cap past the axis end in `red-700`, with the true figure in the label ("112% spent").
- **Tradeoffs.** Best legibility of the three; the misalignment between two rail ends *is* the finding, and length comparison on a shared baseline is the most accurately decoded visual channel available. Costs two rows of vertical height (~28px with labels). Small risk that stacked bars read as a time series, mitigated by the persistent left-hand labels "Built" and "Spent".

### Option B — Single rail with spend marker (the compact variant)

One 8px rail filled to `progress`, with a 2px vertical marker at `burn` and a hatched zone between them.

- **Tradeoffs.** Half the height, and the hatched "spent beyond built" zone is exactly the quantity an auditor cares about, rendered as a single object. But the second variable is encoded as a position marker, which decodes less accurately than length, and when spend is *behind* build the marker falls inside the fill and reads like a threshold rather than a value. Excellent at small sizes, weaker as a primary.

### Option C — Efficiency index or portfolio scatter

A derived index (`progress / burn`, e.g. `0.38`) as a chip, or, at portfolio scale, a scatter of
built % against spent % with a 45° reference line where outliers fall below it.

- **Tradeoffs.** The scatter is genuinely the best way to spot the 5 bad projects in 200, and belongs in the admin overview. As a per-project component it fails the brand thesis: a single derived number asks the citizen to trust an opaque formula, and a transparency product must show its inputs. Rejected as the primary, adopted as an admin-only Phase 4 chart.

### Recommendation

**A as the primary `ProgressMeter`, B as its `compact` variant** (table rows, cards below 360px,
contractor task rows), **C as an admin overview chart only.** One component, one prop.

### Specification

- Sizes: `sm` 4px rails (table), `md` 6px (card), `lg` 10px (detail page). Rail radius `full`, track `bg-sunken`.
- Animation: on first paint the rails fill from 0 over 700ms `ease-out`, staggered 60ms, once per mount. On a live socket update, the affected rail transitions over 400ms `ease-standard` and the Phase 1 value flash fires. Both disabled under `prefers-reduced-motion` (rails render at final width immediately).
- **Accessibility: the meter is `aria-hidden`.** The numbers are real text next to it, and the interpretation sentence is real text under it. A `role="meter"` with an `aria-label` would force a screen reader user to accept our summary; giving them the same two figures the sighted user gets is both more accurate and less work.
- Never render the meter without both raw figures visible. Percentages without the XAF amounts are exactly the kind of abstraction that makes people distrust a number.

---

## 6. System states

| State | Rule |
|---|---|
| **Loading** | Skeletons matched to the final layout at exact final dimensions (CLS target 0). Three primitives only: text line, block, circle. Delay 200ms before showing, so fast responses never flash. Shimmer is a 1.2s opacity pulse, removed under reduced motion. Never a centred spinner on a page that has a known shape. |
| **Empty: first run** | Icon at `h2` size max, one sentence, one primary action. "No projects yet. Create the first one to start tracking." |
| **Empty: filtered to zero** | Different copy and a different action: "No projects match these filters." Primary action is `Clear filters`, secondary shows which filters are active as removable chips. Distinguishing these two is the difference between "the app is broken" and "my query was narrow". |
| **Empty: nothing assigned** (contractor) | "No projects are assigned to you yet." plus the admin contact. Never an error tone; it is a normal state. |
| **Error** | Inline and local. Field errors under the field in `danger` with an icon, `aria-describedby` wired, and focus moved to the first invalid field on submit. Page-level failures use a bordered panel with the retry action, not a modal. Modals are for destructive confirmation only. |
| **Offline** | A `bg-raised` bar pinned to the bottom: "You are offline. Your changes are saved on this device and will sync when you reconnect." Rows with queued changes get a `Queued` pill. Detected via `navigator.onLine` plus socket disconnect. |
| **Optimistic update** | The new or edited row appears immediately at **full opacity** with a `Saving` pill. Greying out an optimistic row reads as failure and teaches users to distrust the confirmation. On failure the row switches to an error state with `Retry` and `Discard`, and never silently reverts. |
| **Live update** | Persistent `Live · updated 12s ago` indicator with the breathing dot in the header. Value flash per Phase 1. If the user has scrolled away from the top of a list, new items are buffered behind a `3 new updates` pill instead of being inserted, because reordering content under a reading cursor is the most disorienting thing a live app can do. On socket disconnect the indicator switches to `Reconnecting` in the delayed hue. |

Microcopy rules: sentence case everywhere except `overline`. No em dashes. Numbers before words
("30% built", not "built 30%"). Never a bare "N/A": say what is missing ("No completion date set").

---

## 7. Data density strategy (admin tables)

### Column priority and responsive collapse

| Priority | Column | Appears at | Behaviour |
|---|---|---|---|
| P1 | Project (title + location caption) | all | 34% width, truncate at 2 lines |
| P1 | Status (lifecycle + flags) | all | fixed 160px so chips align vertically |
| P2 | Build vs Spend (compact meter + variance chip) | ≥768 | fixed 180px |
| P2 | Budget (spent as caption line) | ≥768 | right-aligned, tabular |
| P3 | Contractor | ≥1024 | truncate |
| P3 | Updated (relative) | ≥1280 | `caption`, tertiary |
| P4 | Region | ≥1536 | `caption`, tertiary |
| — | Actions | all | pinned right, icon-only ≥1024, overflow menu below |

Below 768px the table does **not** scroll horizontally: it becomes a stacked list using the card
hierarchy contract from 4.1. A horizontally scrolling table on a phone hides the columns that
matter and makes the row unreadable as a unit.

### Behaviour

- **Sticky header**: `position: sticky; top: 0` on `<thead>` with `bg-surface`; its bottom border and `e1` shadow appear only once scrolled (IntersectionObserver on a sentinel row).
- **Density**: 52px default row, 44px compact, toggled in the toolbar and persisted to `localStorage`.
- **No zebra striping.** 1px `border-subtle` rules only. Zebra plus status tints plus meters is three background systems fighting; the rules alone are enough at 52px.
- **Row affordance**: the whole row is a link to the detail page (rendered as a `<td>`-wrapped anchor so the row stays a real table row); hover raises `bg-surface` and reveals actions. Actions are focusable and present for touch, never hover-only.
- **Sorting**: `<th>` carries `aria-sort`, the label is a `<button>` filling the cell, sort state is in the URL.
- **Bulk actions**: checkbox column appears only after the first selection is made via row `Space`, or permanently once the header checkbox is used. The action bar is `position: fixed` at the bottom so selecting never shifts layout, and states the count: "3 projects selected".
- **Keyboard**: real `<table>` with a `<caption>` (visually hidden). Roving `tabindex` on rows. `↑/↓` move, `Enter` opens, `Space` toggles selection, `Shift+↑/↓` extends, `Ctrl/Cmd+A` selects the page, `Escape` clears selection, `/` focuses search, `n` opens new project. Shortcuts are listed in the toolbar's `?` popover, because an undiscoverable shortcut is not a feature.
- **Pagination**: server-side is out of scope; client-side windowing at 50 rows with "Load more". Infinite scroll is rejected: auditors need a stable, referenceable position in a list.
