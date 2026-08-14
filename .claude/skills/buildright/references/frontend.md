# Frontend conventions

React 18 + Vite 7 + Tailwind 3, `HashRouter`. Design spec lives at `Frontend/docs/design/`
(01-foundations, 02-ia-ux, 03-components, 04-dataviz) — the *rationale*; the rules are below.

---

## File layout

```
src/
  App.jsx              routes only
  store.jsx            single Context: all global state + all actions
  useAppStore.js       the hook (throws outside AppProvider)
  api.js               every fetch call; nothing else calls fetch
  types.js             UserRole, ProjectStatus
  utils/helpers.js     formatMoney, formatDate, formatRelative, formatPercent, fileToBase64
  utils/projectHealth.js  derived health, statusTone, statusIcon, byVarianceAsc
  components/ui/       primitives — Button, Card, Badge, Field/Input/Textarea/Select/DateField,
                       Meter, Modal/ConfirmModal, Toast, Tabs, Table/*, Skeleton, EmptyState,
                       StatTile, ChartShell, VisuallyHidden, cn
  components/layout/   AdminLayout (+ Sidebar, PageHeader)
  components/          app-level: Navbar, Footer, Layout, ProjectCard, StatusBadge,
                       PhotoGallery, ThemeToggle, ChangePasswordModal
  components/dashboard/ ProjectTable, ProjectModal, ContractorProjectCard, CommentManager,
                       ContractorList, ContractorAnalyticsModal, AccessCodeManager,
                       TeamManager, FinancialChart, StatusModal
  pages/               Home, ProjectsPage, ProjectDetails, Developers, Login, ContractorDashboard
  pages/admin/         AdminOverview, AdminProjects, AdminContractors, AdminReports,
                       DevAccess, DevTeam
```

The spec's section 19 proposes `components/app/`; **it was not adopted** — app-level components sit
directly in `components/`. Follow what exists.

---

## The uniformity contract (`03-components.md` §0)

1. Every interactive element is a `components/ui/*` primitive. **A page composes layout, never
   chrome.** No raw Tailwind for a control.
2. No component reads a raw palette value. Semantic tokens only (`bg-surface`, `text-fg`,
   `border-input`, `text-over-fg`). This is what makes dark mode a one-file edit.
3. Variants are closed sets. A sixth Button variant means the design is wrong, not a one-off
   `className`.
4. `className` on a primitive is for **layout only** — margin, width, grid placement. Chrome
   overrides are a review failure.

**`Card` is `relative` and must stay that way.** `ProjectCard` stretches its title link across
the card with `after:absolute after:inset-0`. That overlay resolves against the nearest positioned
ancestor — without `relative` on `Card` it escaped to the initial containing block, so every card
painted a full-viewport click target and the last one in the DOM captured almost every click on
the site. Nothing throws; the page simply navigates to the wrong project.
Guarded by `src/test/stretchedLink.test.jsx`.

**Control sizes** — four heights, nothing else: `xs` 28px (table inline actions, desktop only) ·
`sm` 36px (toolbars, dense admin) · `md` 40px (default) · `lg` 48px (mobile primary, contractor
field UI). Touch targets reach 44×44 via the `.hit-target` `::after` inset, never by growing the box.

**States**, in precedence order: default → hover (background steps one level, pointer devices only)
→ focus-visible (**one global rule** in `index.css`; `focus:outline-none` without a replacement is
banned) → active (steps two levels, **no transform** — transforms cause text shimmer on low-DPI
Android) → disabled (`bg-sunken`+`text-fg-disabled`, never opacity alone) → loading (spinner in the
leading-icon slot, label stays, **width locked**, `aria-busy`) → error (`aria-invalid` +
`aria-describedby`).

Disabled controls that gate a form use `aria-disabled="true"` and stay focusable, so a keyboard user
can read why.

---

## Design tokens

`Frontend/src/index.css` defines CSS variables as **RGB channel triples** so Tailwind opacity
modifiers keep working (`bg-surface/50`). `Frontend/tailwind.config.js` maps them via
`rgb(var(--x) / <alpha-value>)`.

Two layers: **ramps** (`green`/`red`/`amber`/`blue`/`neutral` fixed hex — charts only) and
**semantic tokens** (`canvas` `surface` `raised` `sunken` `fg` `fg-secondary` `fg-tertiary` `line`
`input` `accent` `danger` `warning` `info` `focus`). Components use layer 2 exclusively.

Status chip tokens: `planned` `progress` `delayed` `done` `over` `stalled`, each with `-bg`/`-fg`/
`-line`. Every value is annotated with its measured WCAG contrast ratio — **preserve those comments
when editing**; they are the audit trail for accessibility claims.

Dark mode is `class`-based (`.dark` on `<html>`), applied pre-paint by an inline script in
`index.html` reading `localStorage['br-theme']`. **Shadows do not exist in dark mode** — elevation
is carried by surface luminance; `index.css` nulls every shadow class under `.dark`.

Legacy aliases kept so unmigrated code renders: `primary`→accent, `secondary`→**danger**,
`dark`→fg. Do not add new uses.

---

## Bilingual EN/FR — `src/i18n/`

Cameroon is officially bilingual and the francophone regions are the majority, so this is a
correctness requirement, not a feature.

- `I18nProvider` is the **outermost** provider in `App.jsx`: it sets `<html lang>` and the
  number/date formatters, which everything below depends on from the first paint.
- `useT()` returns `t(key, params)`. Dot-path keys, `{name}` interpolation, `_one`/`_other`
  plurals selected by a **`count`** param. Missing keys fall back English → key, never
  `undefined`.
- Locale order: stored choice → `navigator.languages` → English. A francophone visitor lands
  on French without touching anything.
- **No i18n library.** react-i18next would be ~40KB gzipped for two locales, no runtime
  loading and trivial plurals; this is under 2KB. Call sites are library-agnostic, so replace
  wholesale if a third locale or real CLDR plural rules arrive.
- `en.js` is the source; `fr.js` mirrors its shape. `test/i18n.test.jsx` fails on missing
  keys, orphan keys, mismatched `{placeholders}`, and untranslated long strings — translation
  files rot silently otherwise.
- **Components using `useT` require the provider in tests.** That is deliberate: silently
  rendering English outside the provider would hide the bug from exactly the users it hurts.

**Server-derived text must be localised from data, not prose.** The API sends flag `label`
and `detail` as English (documented for open-data consumers) plus `params`. The UI renders
from `code` + `params` via `flags.<code>` / `flags.<code>_detail`, never from `detail`.
`FlagList` passes `count` alongside `days` so plurals select correctly. Stored `ProjectStatus`
values are English enums translated **for display only** — never for storage or comparison.

## Formatting rules — `utils/helpers.js`

**Locale-aware.** `setFormatLocale()` is module state synced by `I18nProvider` (deliberate:
threading a locale argument through every call site for a global value). French uses a comma
decimal (`85,0bn FCFA`) and a narrow no-break space before `%` (`55 %`); English uses a period
and no space. Dates go through `fr-FR`/`en-GB`. **`FCFA` is never translated** — it is what
the currency is called in daily written use in both languages.


There is exactly **one** money formatter. Two previously disagreed.

- Unit is **FCFA**, not XAF (XAF is for machine contexts only: CSV headers, API docs).
- Suffixes `k` / `m` / `bn` lowercase. **Never `B`** — it reads as billion in English and collides
  with French *milliard* in a bilingual country.
- Group separator is a narrow no-break space (correct in French and SI); decimal separator is a period.
- `formatMoney(v, 'full')` → `85 000 000 000 FCFA` (tooltips, financial panels, `title` attributes).
  `'compact'` → `85.0bn FCFA` (tiles, cards, table cells). `'bare'` → `85.0` (axis ticks).
- `moneyScale(max)` gives `{divisor, label}` so an axis states its unit once.
- `formatDate` → `"12 Mar 2026"`. **Never numeric** — day/month ambiguity in a public record is a
  real cost. `formatRelative` always travels with an absolute date in a `title`.
- Numeric columns carry `.tabular` or `[data-numeric]` so money never shifts column width.
- `formatCurrency` is **deprecated**, aliases `formatMoney(v,'full')`.

---

## Derived health — `utils/projectHealth.js`

The verdict layer. **Client-side only; nothing is persisted or exposed by the API.** Any non-browser
consumer sees raw numbers with no interpretation.

`projectHealth(project)` returns `{budget, spent, progress, burn, burnRounded, variance,
varianceTone, band, bandLabel, overBudget, delayed, completionDate, sentence}`.

- Reads both casings defensively: `completionDate || completion_date`.
- `sentence` is the plain-language truth ("55% of the budget is spent and 30% of the work is done").
  **The meter is `aria-hidden`; this sentence is the accessible content.**
- `statusTone` / `statusIcon` map stored status → token/icon. Editing status colours means editing
  these, not the components.
- `byVarianceAsc` is the "worst first" sort used by Home, ProjectsPage and AdminOverview.

Badge ranks: exactly one **lifecycle** badge (filled, from stored status) plus zero to two
**flag** badges (outlined: Delayed, Over budget). Flags are annotations on the lifecycle badge, never
competing statuses. Every badge carries icon + word + colour so colour is never the only channel.

---

## State & data flow

Single Context in `store.jsx`. State: `user, projects, teamMembers, comments, accessCodes,
contractors, loading, error, authChecked`.

Boot: `getMe()` → `Promise.all([getProjects({limit:100}), getTeam()])` → if ADMIN/DEV_ADMIN,
`getAccessCodes()`. No retry, no timeout (⚠️ Render cold start).

Mutations are **optimistic with rollback**. Every mutating action captures the pre-change row,
applies the change locally, calls the API, then either reconciles to the server's stored row
(`updateProject` merges `res.data`) or restores the captured row on failure. `deleteProject`
re-inserts at its original index. `addProject` handles the socket echo arriving before the HTTP
response by checking whether the real id is already present.

**Actions return `{success, error}` — callers must await and branch.** Firing a success toast
without awaiting is the P1-02 defect: a contractor saw "the public page now shows your changes"
on a rejected update. `ContractorDashboard.handleUpdate` and `AdminProjects.handleSave` are the
reference implementations — on failure they keep the editor open so typed input is not lost.

**API responses are camelCase** (`createdAt`, `authorName`, `updateDate`, `contractorId`,
`isUsed`). The `p.contractorId || p.contractor_id` fallbacks scattered through the components are
now redundant but harmless; do not add new ones.

**Pages never fetch a project by id.** `ProjectDetails` does `projects.find(p => p.id === id)`
against the store, which is populated once at boot by `getProjects({limit:100})`. Consequences:
a deep link to the 101st project renders the "Project not found" empty state; `api.getProjectById`
exists but has no caller; and `project.updates[]` is only present on rows that arrived via a socket
event or `getProjectDetail`, not on rows from the list endpoint. Comments are the exception — they
are fetched per project on mount via `fetchProjectComments(id)`.

The socket effect in `store.jsx` is **not** auth-gated: anonymous public visitors receive
`project:created/updated/deleted` live.

`authChecked` exists but no guard consumes it — guards can flash `/login` before `getMe()` resolves.

**Adding an API call:** add the method to `api.js` (always via `getOptions`, which sets
`credentials:'include'`), then expose an action from `store.jsx`. Components never call `fetch`.

---

## Routing & guards

`HashRouter` (chosen for static-host compatibility). Public shell = `components/Layout.jsx`;
admin/dev shell = `components/layout/AdminLayout.jsx`, which takes `role` and renders
`<Navigate to="/login">` when `user.role` does not match. `/admin` and `/dev-admin` redirect to
their first section.

Guards are **cosmetic**. All real enforcement is server-side.

**Every guard gates on `authChecked` before `user`.** The store starts with `user = null` and only
learns the session from `getMe()`, so a guard reading `user` alone reports every visitor as logged
out and redirects on page load. On a Render cold start that leaves an authenticated user staring at
a login form for ~30s. `components/AuthPending.jsx` is the shared pending state.

**Every hook must run before any early return.** `ContractorDashboard` had three `useMemo` calls
below its guard, so the hook count changed once `user` arrived — React's "rendered more hooks than
during the previous render". It only survived because the guard navigated away and remounted the
component; adding a second guard made it reachable. Hooks first, returns after.

---

## Accessibility baseline

Skip link is the first focusable element (`.skip-link`, target `#main` / `#admin-main`, both
`tabIndex={-1}`). One global `:focus-visible` rule. Icons adjacent to text are `aria-hidden`;
icon-only controls carry `aria-label`. Filter/sort controls use real `<label>`/`<legend>`. Modals
use `role="dialog"` + `aria-modal` and lock background scroll (same contract as the mobile filter
sheet). `prefers-reduced-motion` disables all animation — motion never carries information that is
not also in text.

---

## Performance

- Recharts is **lazy-loaded** in `AdminOverview.jsx` so it never reaches the public bundle. The
  public surface has the 3G users and needs no charts. Keep it that way.
- Current build: ~272 KB main + ~386 KB lazy chart + ~42 KB vendor; public first load ≈ 95 KB gzip.
- Images: `loading="lazy"` + `decoding="async"` + explicit `width`/`height` to prevent layout shift.
  Only the first hero slide is `eager`.
- FontAwesome is still a **CDN request** in `index.html` (~70 KB before a glyph renders). Replacing
  it with a local SVG sprite is PLANNED, not done.
- `@font-face` blocks in `index.css` are **commented out on purpose** — the woff2 files do not exist,
  and Vite's SPA fallback would serve `index.html` for them, producing OTS parsing errors on every
  page load. Do not uncomment until `public/fonts/` is populated.

---

## Testing

Vitest + happy-dom + Testing Library. Setup: `src/test/setup.js`. Config lives in `vite.config.js`
(`test.globals: true`).

Current suites: `components/StatusBadge.test.jsx`, `components/simple.test.jsx`,
`test/pages.smoke.test.jsx`, `test/admin.smoke.test.jsx` — 23 tests, all passing.

Run: `npm test -- --run` (the `--run` is required in CI; bare `vitest` watches).
