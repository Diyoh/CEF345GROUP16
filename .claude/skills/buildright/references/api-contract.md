# API contract

Base `/api/v1`. Mounted in `Backend/index.js`. Every response is `{ success: boolean, data?, error?, message? }`.

**Auth:** JWT in HttpOnly cookie `token` (30d). Fallback `Authorization: Bearer <jwt>` is accepted
by `protect` but no client uses it. Cookie options (`authController.sendTokenResponse`):
`httpOnly:true, secure:true, sameSite:'none'` — required for Vercel↔Render.

**Guards:** `protect` = valid cookie/bearer + user still exists (re-queried per request, so a
deleted user's token dies immediately). `authorize(...roles)` = role membership.

**Output contract: every response key is camelCase.** `serializeResponse` (`utils/serialize.js`,
mounted in `index.js`) deep-converts MySQL's snake_case columns on the way out, so
`author_name` → `authorName`, `is_used` → `isUsed`, `contractor_id` → `contractorId`,
`created_at` → `createdAt`, `update_date` → `updateDate`. This applies to endpoints that do not
exist yet — do not hand-alias columns in SQL. Dates stay `Date` objects (serialized to ISO by
`JSON.stringify`).

**Socket payloads bypass `res.json`** and are serialized explicitly by the `emit()` helper in
`projectController.js`. A new emit site must use it.

---

## Auth — `Backend/routes/authRoutes.js`

| Method | Path | Guard | Body | Success |
|---|---|---|---|---|
| POST | `/auth/register` | — | `{name,email,password,accessCode}` | `201 {data:{id,name,email,role}}` + cookie |
| POST | `/auth/login` | — | `{email,password}` | `200 {data:{id,name,email,role}}` + cookie |
| POST | `/auth/logout` | — | — | `200 {message}` + cleared cookie |
| GET | `/auth/me` | protect | — | `200 {data:{id,name,email,role}}` |
| PUT | `/auth/change-password` | protect | `{currentPassword,newPassword}` | `200 {message}` |

`register` rules (`authController.js`):
- Access code must exist and `is_used = FALSE`, else `400 'Invalid or used access code'`.
- **Role comes from the code**, never from the request.
- Duplicate email → `400 'User already exists'`.
- User id is generated as `<prefix><n>`: `adm`/`con`/`dev`/`user`, e.g. `con3`. **Not a UUID.**
- The whole claim is one transaction: `SELECT ... FOR UPDATE` on the code, insert user, mark code
  used. The row lock makes concurrent claims of the same code serialise, so a code grants exactly
  one account.
- Password: bcrypt, 10 salt rounds. No strength requirement server-side.
- Rate limited: 20 failed attempts / 15 min / IP (`credentialLimiter`).

---

## Projects — `Backend/routes/projectRoutes.js` → `services/projectService.js`

| Method | Path | Guard | Body | Emits |
|---|---|---|---|---|
| GET | `/projects` | — | query `status,search,limit,page` | — |
| GET | `/projects/:id` | — | — | — |
| POST | `/projects` | protect + ADMIN | multipart, `images` ≤10 | `project:created` |
| PATCH | `/projects/:id` | protect + ADMIN\|CONTRACTOR | JSON **or** multipart | `project:updated` |
| DELETE | `/projects/:id` | protect + ADMIN | — | `project:deleted` |
| POST | `/projects/:id/updates` | protect + ADMIN\|CONTRACTOR | `{message,date}` | `project:updated` |

Called from `store.addProjectUpdate`, surfaced as the optional "Add to update history" field on the
contractor's edit form. Posted only after the figures save, so the history can never describe a
change the record does not show.

**GET /projects** — `limit` clamped 1–100 (default 10), `page` ≥1. `status` must be a valid
`ProjectStatus` or `All`, else 400. `search` matches `title` OR `location` (LIKE `%term%`).
Returns `p.* + contractorName + images[]`. Images batched in one `IN (...)` query.

**POST /projects** — required: `title`, `description`, `location`, `region`. `budget` defaults 0,
`status` defaults `Planned`. `contractorId` must exist AND have role `CONTRACTOR`, else 400.
Id generated with `randomUUID()`. First uploaded image gets `is_main_cover = true`.
Returns the **stored row**, not the request body.

**PATCH /projects/:id** — the important one.
1. Load row → 404 if missing.
2. `assertCanEditProject(actor, project)`: ADMIN passes; CONTRACTOR passes only if
   `project.contractor_id === actor.id`, else **403 'You can only update projects assigned to you'**;
   any other role → 403.
3. Whitelist by role:
   - CONTRACTOR: `status`, `progress`, `spent`, `description`
   - ADMIN: those + `title`, `location`, `region`, `budget`, `contractorId`, `startDate`, `completionDate`
   Fields outside the whitelist are **silently ignored**, not rejected.
4. Validation (`validateField`): `progress` integer 0–100; `spent` ≥ 0; `budget` ≥ 0; `status` in
   enum; `title`/`location`/`region` non-empty. Values arrive as strings from multipart and are coerced.
   **`spent > budget` is deliberately allowed** — overspend must stay on the record.
5. Images: files from multer, plus any `data:image` entries in `newImages[]` or `images[]`
   (http URLs in `images[]` are ignored so existing photos are not duplicated). Cover assigned only
   if the project had none.
6. `400 'No valid fields to update'` if nothing valid and no images.
7. Returns the full stored row.

**POST /projects/:id/updates** — same ownership rule. `message` required. `date` defaults to today.
Appends to `project_updates`. ⚠️ No frontend caller exists.

---

## Comments — `Backend/routes/commentRoutes.js` (mounted at `/api/v1`)

| Method | Path | Guard | Body |
|---|---|---|---|
| GET | `/projects/:id/comments` | — | — |
| POST | `/projects/:id/comments` | **none** | `{authorName,authorType,text,images[]}` |
| DELETE | `/comments/:commentId` | protect + ADMIN | — |

POST validates non-empty `text` and `authorName`, 404s on unknown project, defaults `authorType`
to `Citizen`, generates ids with `randomUUID()`, uploads `data:image` entries to Cloudinary, and
returns the created row. GET batches comment images in one query.

⚠️ POST is unauthenticated by design (citizen voice) but has only the global rate limiter.

---

## Team — `Backend/routes/teamRoutes.js`

| Method | Path | Guard | Notes |
|---|---|---|---|
| GET | `/team` | — | `SELECT *` |
| POST | `/team` | protect + ADMIN\|DEV_ADMIN | multipart `image`. **No frontend caller** |
| PUT | `/team/:id` | protect + ADMIN\|DEV_ADMIN | multipart `image` or `imageUrl` base64 |
| DELETE | `/team/:id` | protect + ADMIN\|DEV_ADMIN | **No frontend caller** |

`team_members` has **no `created_at`** column — do not ORDER BY it.

---

## Admin — `Backend/routes/adminRoutes.js`

| Method | Path | Guard | Notes |
|---|---|---|---|
| POST | `/admin/access-codes` | ADMIN\|DEV_ADMIN | `{role}` → `{code, role}`. `role` must be in the ENUM, else 400 |
| GET | `/admin/access-codes` | ADMIN\|DEV_ADMIN | **Only codes the caller created** (`WHERE generated_by_user_id = ?`), aliased `generatedBy` |
| GET | `/admin/contractors` | **ADMIN only** | dev-admin → 403 |
| GET | `/admin/contractors/:id/stats` | ADMIN only | `{contractor, stats:{totalProjects,totalBudget,totalSpent,avgProgress}, projects[]}` |

## Stats — `Backend/routes/statsRoutes.js`

`GET /stats/global` → `{totalProjects, totalBudget, projectsByStatus{Planned,Ongoing,Stalled,Completed}}`.
Public. **Dead — no caller.**

---

## Error shape

`utils/AppError.js`: services throw `AppError(message, statusCode)`; `sendError(res, err)` maps
`AppError` → its status, anything else → `500 'Server Error'` with the real cause logged server-side.
Helpers: `badRequest` 400, `forbidden` 403, `notFound` 404.

Global handler in `index.js`: CORS rejection → `403 'Origin not allowed'`; `MulterError` or
`'Only image files are allowed!'` → 400; otherwise 500 (`details` only when `NODE_ENV=development`).

## Middleware order — `Backend/index.js`

`trust proxy 1` → `helmet({crossOriginResourcePolicy:'cross-origin'})` → `rateLimit` (15 min /
**1000** — loosened for dev, never restored) → `cors(corsOptions)` → `cookieParser` →
`express.json({limit:'50mb'})` → **`serializeResponse`** → `/uploads` static → routes → error handler.

`POST /auth/register` and `POST /auth/login` carry an additional `credentialLimiter`
(`routes/authRoutes.js`): 20 attempts / 15 min, `skipSuccessfulRequests: true` so only failures
burn quota. These are the only routes where guessing wins something.

Uploads (`middleware/uploadMiddleware.js`): Cloudinary storage, 20 MB per file, extension **and**
mimetype must both match `jpeg|jpg|png|gif|webp`.
