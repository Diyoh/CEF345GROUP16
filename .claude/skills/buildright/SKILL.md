---
name: buildright
description: Authoritative reference for the BuildRight Cameroon infrastructure transparency platform — architecture, data model, API contract, roles/RBAC, socket events, shared enums, deployment topology, and known constraints. Use whenever implementing or reviewing anything in Frontend/ or Backend/.
---

# BuildRight Cameroon

Public accountability record for Cameroonian government infrastructure spending. The product
thesis is one comparison: **money spent vs. work built**. Anything that makes a displayed number
wrong is a P0, not a cosmetic bug.

Stack: React 18 + Vite 7 + Tailwind 3 (`Frontend/`) · Node ESM + Express 4 + MySQL + Socket.io
(`Backend/`) · MySQL 8/MariaDB (`Database/`).
Deploy: Vercel (frontend) → Render (backend) → Aiven (MySQL). Cross-site cookies are load-bearing.

**Trust model:** reading is open to all; writing is invite-only. Access codes carry the role and
are consumed on registration — you cannot choose your own role. Contractors are confined to
projects assigned to them. Citizens post reports with photo evidence *without* an account, on
purpose: that is the check on contractor self-reporting.

---

## Where things live

| Task | Open these |
|---|---|
| Add/change a project business rule | `Backend/services/projectService.js` **only** — never controllers |
| Add an API endpoint | `Backend/routes/<x>Routes.js` → `Backend/controllers/<x>Controller.js` → `Backend/services/` |
| Change who may do what | `Backend/middleware/authMiddleware.js` (role gate) + `projectService.assertCanEditProject` (record ownership) |
| Change auth / cookies / login | `Backend/controllers/authController.js` (`sendTokenResponse`), `Backend/middleware/authMiddleware.js` |
| Add a CORS origin | `Backend/config/allowedOrigins.js` + `CORS_ORIGINS` env — used by REST **and** sockets |
| Change DB connection / SSL | `Backend/config/db.js` |
| Change API output key casing | `Backend/utils/serialize.js` — one global rule, applied in `index.js` |
| Change password policy or limits | `MIN_PASSWORD_LENGTH` in `authController.js` (mirror it in `Login.jsx`), `RATE_LIMIT_MAX` / `JSON_BODY_LIMIT` env vars in `index.js` |
| Add a role-guarded page | `components/AuthPending.jsx` pattern — gate on `authChecked` BEFORE `user`, and put every hook above the early returns |
| Add a frontend API call | `Frontend/src/api.js` → wire an action in `Frontend/src/store.jsx` |
| Add a route/page | `Frontend/src/App.jsx` (+ `components/layout/AdminLayout.jsx` for admin sections) |
| Change global state | `Frontend/src/store.jsx` (single Context; `useAppStore.js` is the hook) |
| Build a UI control | `Frontend/src/components/ui/*` — never raw Tailwind for chrome |
| Change money/date formatting | `Frontend/src/utils/helpers.js` — the ONLY formatter |
| Change the risk/health verdict | `Frontend/src/utils/projectHealth.js` — client-side only, not persisted |
| Change status colours/icons | `Frontend/src/utils/projectHealth.js` (`statusTone`, `statusIcon`) + tokens in `Frontend/src/index.css` |
| Change theme/design tokens | `Frontend/src/index.css` (CSS vars) + `Frontend/tailwind.config.js` |
| Image upload behaviour | `Backend/middleware/uploadMiddleware.js` + `Backend/config/cloudinary.js` + `Backend/utils/fileHandler.js` |
| Seed/reset data | `Backend/seed.js` (`npm run seed`) |
| Schema | `Database/schema.sql`; live dump `backup_latest.sql` (do not edit backups) |
| Change the schema | `Database/migrations/` — numbered SQL, applied by hand. See its README for the apply commands and the applied-state log |
| Add a field that should be auditable | `COLUMN_BY_FIELD` + the editable-fields lists in `projectService.js` — logging is automatic from there via `diffFields`/`recordChanges` |
| Change how history is displayed | `Frontend/src/components/ChangeHistory.jsx` (`FIELD_LABELS`, unit rendering) |

Full detail: [API contract](references/api-contract.md) · [Data model](references/data-model.md) ·
[Frontend conventions](references/frontend.md)

---

## Canonical vocabulary — exact strings

| Concept | Values | Defined in |
|---|---|---|
| `ProjectStatus` | `Planned` `Ongoing` `Stalled` `Completed` | DB ENUM + `Frontend/src/types.js` + `PROJECT_STATUSES` in `projectService.js` — **3 copies, change all 3** |
| `UserRole` | `ADMIN` `CONTRACTOR` `DEVELOPER_ADMIN` `PUBLIC` | DB ENUM + `Frontend/src/types.js` + literals in `projectService.js`/routes |
| `authorType` | `Citizen` `NGO` | DB ENUM + literals in `ProjectDetails.jsx` |
| Health bands (derived) | `balance` `watch` `critical` `over` | `projectHealth.js` — **client-side only, never stored** |
| Money | stored `DECIMAL(15,2)` → JS Number via `typeCast` in `db.js`; displayed **FCFA** (not XAF), suffixes `k`/`m`/`bn`, narrow-no-break-space grouping | `helpers.js` `formatMoney(v, 'full'\|'compact'\|'bare')` |
| Dates | DB `DATE`/`TIMESTAMP`; display `"12 Mar 2026"` en-GB, **never numeric** (day/month ambiguity) | `helpers.js` `formatDate` |
| Regions | 10 values in `ProjectModal.REGIONS`; DB column is free-text VARCHAR(100), **not enforced server-side** | `ProjectModal.jsx` |

Derived health formulas (`projectHealth.js`):
```
burn       = spent / budget * 100
variance   = progress - burn          // points of build minus points of spend
overBudget = burn > 100               // overrides every other band
delayed    = completionDate < today && status !== 'Completed'
band       = overBudget ? 'over' : variance >= -5 ? 'balance' : variance >= -20 ? 'watch' : 'critical'
```
Positive variance renders **neutral, never green** — underspend on public works is not
automatically good news.

---

## RBAC matrix

| Action | PUBLIC (no login) | CONTRACTOR | ADMIN | DEVELOPER_ADMIN |
|---|---|---|---|---|
| View projects / detail / team | ✅ | ✅ | ✅ | ✅ |
| Post citizen report | ✅ (no auth) | ✅ | ✅ | ✅ |
| Create project | ❌ | ❌ | ✅ | ❌ |
| Edit project — `status/progress/spent/description` + photos | ❌ | ✅ **own only** | ✅ any | ❌ |
| Edit project — `title/budget/region/location/dates/contractorId` | ❌ | ❌ | ✅ | ❌ |
| Delete project | ❌ | ❌ | ✅ | ❌ |
| Add timeline update | ❌ | ✅ own only | ✅ any | ❌ |
| Delete comment | ❌ | ❌ | ✅ | ❌ |
| Generate / list access codes | ❌ | ❌ | ✅ | ✅ (own only) |
| List contractors + stats | ❌ | ❌ | ✅ | ❌ *(dev-admin gets 403)* |
| Create/update/delete team member | ❌ | ❌ | ✅ | ✅ |

Two enforcement layers, both required:
- `authorize(...roles)` in routes — coarse: "may this *kind* of user call this endpoint".
- `assertCanEditProject(actor, project)` in `projectService.js` — fine: "may this *specific* user
  touch this *specific* record". Routes cannot do this; they have no record access.

Frontend guards (`AdminLayout.jsx`, `ContractorDashboard.jsx`) hide UI only. **They protect nothing.**

---

## Socket events

Server: `Backend/socket.js` (origins shared with REST via `config/allowedOrigins.js`).
Emitted from `Backend/controllers/projectController.js` via `req.app.get('io')`.

| Event | Payload | When |
|---|---|---|
| `project:created` | full stored project row (incl. `contractorName`, `images[]`, `updates[]`) | after `POST /projects` |
| `project:updated` | full stored project row | after `PATCH /projects/:id` and `POST /projects/:id/updates` |
| `project:deleted` | `{ id }` | after `DELETE /projects/:id` |

Client listens in `Frontend/src/store.jsx` (socket effect). No rooms, no socket auth, no
server-side listeners beyond `connection`/`disconnect`. Client URL derives from `VITE_API_URL`
with `/api/v1` stripped — see `SOCKET_URL` in `Frontend/src/api.js`.

**The socket effect is NOT auth-gated** — it runs for every visitor including anonymous ones, so a
contractor's progress update reaches an open public page live, with no refresh. That is the
end-to-end path: contractor form → `store.updateProject` → `PATCH /projects/:id` →
`projectService` (ownership + validation) → UPDATE → controller emits `project:updated` with the
stored row → every client's store merges it → `ProjectCard`/`ProjectDetails` re-render through
`projectHealth`.

---

## Landmines — touch X, you must also touch Y

| If you change… | You must also change… | Why |
|---|---|---|
| A `ProjectStatus` value | **6 sites**: DB ENUM (`Database/schema.sql` + a migration for the live DB), `Frontend/src/types.js`, `PROJECT_STATUSES` in `projectService.js`, `statusTone`+`statusIcon`+`COMPLETED` check in `projectHealth.js`, the hardcoded `{Planned,Ongoing,Stalled,Completed}` object in `Backend/controllers/statsController.js`, status tokens (`--planned-*` … `--stalled-*`) in `index.css` | Nothing imports a shared constant across the stack. A rename silently breaks filters, the stats endpoint, the `delayed` derivation, and writes — with no error |
| A `UserRole` value | DB ENUM, `types.js`, role literals in `projectService.js` + every `authorize()` call + `AdminLayout` guards | Role strings are hardcoded, not imported |
| Add a socket `emit` | Wrap the payload with `camelizeKeys` (use the `emit()` helper in `projectController.js`) | Socket payloads bypass the global `res.json` serializer; an unwrapped emit sends snake_case over the socket and camelCase over HTTP |
| Add a new endpoint | Nothing — `serializeResponse` in `index.js` camelCases every response automatically | The API contract is **camelCase out**; do not hand-alias columns |
| Write more than one row in an operation | Wrap it in `withTransaction` from `config/db.js` and pass `tx` into every helper that writes | A helper closing over `pool` runs OUTSIDE the transaction and silently defeats it. Registration, project creation and the audit log all depend on this |
| Add a write path that changes project figures | Route it through `projectService.updateProject`, or call `recordChanges` with the same `tx` | A figure that moves without a `project_changes` row is indistinguishable from the original value. The audit log is the product's credibility |
| `components/ui/Card.jsx` | Keep `relative` in the base class list | `ProjectCard` stretches its link with `after:absolute after:inset-0`. Without `relative` the overlay escapes to the initial containing block and swallows almost every click on the site — silently, with nothing thrown |
| Add a schema change | A numbered file in `Database/migrations/` **and** `Database/schema.sql`, then tick the log table | `schema.sql` only describes fresh installs; existing databases (local, Docker, Aiven) need the migration |
| `CORS_ORIGINS` / a frontend domain | Nothing else — `allowedOrigins.js` feeds REST *and* Socket.io | Previously two hardcoded lists that drifted; live updates died in production |
| Auth cookie options | `sameSite:'none'` + `secure:true` + `app.set('trust proxy', 1)` must stay together | Vercel↔Render is cross-site; removing any one breaks login in production only, never locally |
| Add a field to `projects` | `projectService.COLUMN_BY_FIELD`, `CONTRACTOR_EDITABLE_FIELDS` / `ADMIN_EDITABLE_FIELDS`, `validateField` | Update path is an explicit whitelist; unlisted fields are silently ignored |
| Add a row-creating query | Generate the id with `randomUUID()` in Node | SQL `UUID()` forced insert-then-reselect, which returned the wrong row on duplicate titles/names |
| A UI control's look | `Frontend/src/components/ui/*`, not the page | Pages compose layout only; `className` on a primitive is for margin/width/grid **only** |
| `helpers.js` money output | Nothing — it is the single formatter | Two formatters previously disagreed (`85 000 000 000 FCFA` vs `85.0B FCFA`) |

---

## Deployment gotchas

- **`CORS_ORIGINS` is required in production.** When `NODE_ENV=production`, localhost defaults are
  *not* applied — an unset value rejects all browser traffic. Server logs its accepted origins on
  boot. (`Backend/config/allowedOrigins.js`)
- **Cross-site cookies:** `secure:true` + `sameSite:'none'` + `trust proxy` are mandatory together
  for Vercel→Render. Auth works locally and fails in production if any is removed.
- **Aiven SSL:** `db.js` enables SSL when `DB_SSL=true` *or* `NODE_ENV=production`, with
  `rejectUnauthorized:false`. `DB_PORT` must be set — Aiven does not use 3306.
- **Render cold starts:** free-tier instances sleep; first request after idle can take ~30s. The
  store's boot `Promise.all` has no timeout or retry.
- **Env loading order:** ES imports evaluate *before* `index.js` runs `dotenv.config()`. Any config
  module reading `process.env` at module scope must call `dotenv.config()` itself
  (`db.js`, `cloudinary.js`, `allowedOrigins.js` all do).
- **`Backend/vercel.json` exists but the backend deploys to Render** — contradictory, ignore it.
- Images live on **Cloudinary**, not on disk. `/uploads` static serving is vestigial.

---

## KNOWN-BROKEN (verified, not yet fixed)

Do not trust these paths; do not "discover" them again.

| ID | Where | Problem |
|---|---|---|
| P1-07 | `Database/migrations/001` | Index migration is **written but NOT APPLIED** to any database. Until the log table in `migrations/README.md` is ticked, assume the live schema has no query indexes |
| P1-08 | `Backend/socket.js` | No socket auth, no rooms — every client receives every project mutation. Harmless while all data is public; a leak the moment a non-public field is added |
| P2-04 | `commentRoutes.js` | `POST /projects/:id/comments` is unauthenticated with only the global limiter — spam vector on the public write path |
| P2-05 | `index.js` | No 404 handler for unknown API paths; they fall through to the error handler |
| P2-08 | `index.html` | FontAwesome CDN — external blocking request (~70 KB) on every page load |
| P3 | — | Dead code (below), `ProjectStatus` in 6 places, no backend integration tests |

**FIXED 2026-08-14** (do not re-report): S-01…S-08 (the whole snake_case/camelCase class, via the
boundary serializer), P0-02 (access-code entropy), P0-05 (`Card` missing `relative` — stretched-link
overlay swallowed nearly every click site-wide), P1-01 (`api.deleteProject`), P1-02 (false success
toast + missing optimistic rollback), P1-05 (timeline wired: `addProjectUpdate` in the store, note
field on the contractor form), P2-01 (project create + registration now transactional, with
`FOR UPDATE` closing the double-spend race on access codes), P2-02 (8-char minimum enforced
server-side on both register and change-password), P2-03 (JSON body 50mb → 10mb), P2-06 (guards wait
for `authChecked`), P2-07 (global rate limit 1000 → 300, env-tunable).

Dead code (safe to delete): `Frontend/src/data.js`, `Frontend/src/style.css`,
`Backend/debug_contractors.js`, `Backend/debug_user.js`, `GET /stats/global` (no caller),
`api.getProjectById` / `api.getStats` (no callers).

PLANNED, not built: local SVG icon sprite (currently FontAwesome CDN), self-hosted fonts
(`@font-face` blocks are commented out in `index.css` — the woff2 files do not exist), FR/EN
bilingual support, offline contractor updates.

---

## Commands

```bash
cd Backend  && npm run dev     # node --watch, port 5000
cd Backend  && npm run seed    # wipes and reseeds; default password for every user: "password"
cd Backend  && npm test        # Jest, ESM via --experimental-vm-modules
cd Frontend && npm run dev     # Vite, port 5173
cd Frontend && npm test -- --run   # Vitest
cd Frontend && npm run build   # must stay green
docker-compose up --build -d   # db 3306 · api 5000 · web 8080
```

Demo accounts (seeded): `admin@buildright.cm` (ADMIN), `contact@btpcameroun.cm` (CONTRACTOR),
`dev@buildright.cm` (DEVELOPER_ADMIN) — password `password`.
