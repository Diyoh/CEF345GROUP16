# Data model

Source: `Database/schema.sql`. Live dump: `backup_latest.sql` (MariaDB dialect — `int(11)`,
`DEFAULT(uuid())`). **Never edit the `.sql` backups.**

8 tables. All PKs are `CHAR(36)`, but ids are **not** always UUIDs — see the id conventions below.

---

## users

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | `adm1`/`con1`/`dev1`/`user1` from `authController`; seed uses `u1`–`u4`, `dev1`–`dev5` |
| `email` | VARCHAR(255) UNIQUE | |
| `password_hash` | VARCHAR(255) | bcrypt, 10 rounds |
| `name` | VARCHAR(255) | |
| `role` | ENUM | `ADMIN` `CONTRACTOR` `DEVELOPER_ADMIN` `PUBLIC` — default `PUBLIC` |
| `created_at` / `updated_at` | TIMESTAMP | `updated_at` is never read |

## access_codes

| Column | Type | Notes |
|---|---|---|
| `code` | VARCHAR(50) **PK** | Format `XXXXX-XXXXX`, 10 chars from `ABCDEFGHJKMNPQRSTUVWXYZ23456789` (no 0/O/1/I/L), via `crypto.randomInt` ≈ 2^49. **Does not encode the role** |
| `role` | ENUM | The role the bearer receives |
| `is_used` | BOOLEAN | Set TRUE at registration. Serialized out as `isUsed` |
| `generated_by_user_id` | CHAR(36) FK → users | Listing is scoped to this |
| `created_at` | TIMESTAMP | ORDER BY only |

No expiry column. A code is valid forever until used.

## projects

| Column | Type | Notes |
|---|---|---|
| `id` | CHAR(36) PK | `randomUUID()` in Node |
| `title` `description` `location` | VARCHAR/TEXT NOT NULL | |
| `region` | VARCHAR(100) NOT NULL | Free text; the 10 regions are enforced only by the frontend `<select>` |
| `budget` `spent` | DECIMAL(15,2) | Cast to JS Number by `typeCast` in `db.js`. Max ≈ 10^13 |
| `progress` | INT + `CHECK (0..100)` | Also validated in `projectService` |
| `status` | ENUM | `Planned` `Ongoing` `Stalled` `Completed` — default `Planned` |
| `contractor_id` | CHAR(36) FK → users | Nullable. **The ownership key for RBAC** |
| `start_date` `completion_date` | DATE | `completion_date` drives the derived `delayed` flag |
| `created_at` `updated_at` | TIMESTAMP | `created_at` is the list `ORDER BY` (unindexed ⚠️) |

## project_images

`id` PK · `project_id` FK→projects **ON DELETE CASCADE** · `image_url` TEXT (Cloudinary URL) ·
`is_main_cover` BOOL · `uploaded_at` TIMESTAMP.
Cover = first image uploaded when the project had none. Ordered `is_main_cover DESC, uploaded_at ASC`.

## project_updates

`id` PK · `project_id` FK CASCADE · `message` TEXT · `author_name` VARCHAR(255) ·
`update_date` DATE default today.
The append-only audit trail. Nothing updates or deletes rows here. Currently only ever written by
`seed.js` — no frontend caller reaches the endpoint.

## comments

`id` PK · `project_id` FK CASCADE · `author_name` **NULLABLE** (migration 002) ·
`author_type` ENUM(`Citizen`,`NGO`) · `text` TEXT · `created_at`.

**No `user_id`, and no name.** Reports are anonymous end to end: the API does not read
`authorName` from the request and writes `NULL`. Rows predating migration 002 keep the name they
were filed under — history in an accountability record is not rewritten silently, and purging that
data is an owner decision, not a migration's.

## comment_images

`id` PK · `comment_id` FK CASCADE · `image_url` TEXT. Up to 4 per report (frontend cap).

## project_changes  (immutable audit log)

`id` PK · `project_id` FK CASCADE · `actor_id` · `actor_name` · `actor_role` · `field` ·
`old_value` TEXT · `new_value` TEXT · `changed_at` TIMESTAMP.
Indexes: `(project_id, changed_at DESC)`, `(actor_id)`.

**This is the table the product's credibility rests on.** Before it, a contractor could revise
progress 60% → 30% and the record showed only "30%".

- Written by `recordChanges()` in `projectService`, **inside the same transaction** as the UPDATE.
  A figure cannot move without a log row landing with it.
- **UPDATE and DELETE are rejected by the database itself** — triggers `project_changes_no_update`
  and `project_changes_no_delete` raise SQLSTATE 45000 (migration 004). Verified against the live
  database: INSERT succeeds, UPDATE and DELETE both fail.
- **No foreign key to `projects`.** The FK's `ON DELETE CASCADE` meant deleting a project erased
  its whole history — the cheapest way to make an inconvenient record vanish. Audit rows now
  outlive the project, and deletion is itself logged as `field='project', new_value='deleted'`.
- Limit of the guarantee: triggers stop every application path and any casual client, but not
  someone with DDL rights who deliberately drops the trigger. That escape hatch is documented in
  migration 004 and leaves a visible gap in the schema. True tamper-proofing needs append-only
  storage or off-box log shipping.
- `actor_name` / `actor_role` are **denormalised on purpose** — joining to `users` would let a
  rename or deletion rewrite history retroactively.
- Only genuinely changed fields are logged (`diffFields` compares rendered values), because a log
  full of `30 → 30` is one nobody reads.
- Values are TEXT: the log spans money, percentages, dates, enums and free text, and the rendered
  value stays readable even if a column's type changes later.

Distinct from `project_updates`: that is a **narrative the contractor chooses to write**; this is a
**factual record the system writes regardless**. Both render on the project page, adjacent.

## team_members

`id` PK · `name` · `role` VARCHAR(100) · `bio` TEXT · `image_url` TEXT.
**No `created_at`.** Public "About" page content — unrelated to `users.role`.

---

## Relationships

```
users ──1:N── projects (contractor_id)
users ──1:N── access_codes (generated_by_user_id)
projects ──1:N── project_images   (CASCADE)
projects ──1:N── project_updates  (CASCADE)
projects ──1:N── comments         (CASCADE)
comments ──1:N── comment_images   (CASCADE)
team_members  — standalone
```

Deleting a project removes its images, updates and comments. Deleting a user is **blocked** by the
`projects.contractor_id` FK (no CASCADE) — intentional: work cannot be orphaned.

## Indexes

Present in every database: all PKs, `users.email` UNIQUE, FK-implied keys (`contractor_id`,
`project_id`, `comment_id`, `generated_by_user_id`).

Added by `migrations/001_add_query_indexes.sql` and mirrored in `schema.sql`:
`idx_projects_created_at` (the main list `ORDER BY`), `idx_projects_status`,
`idx_projects_region`, `idx_projects_status_created` (composite, serves "filtered, newest first").

⚠️ **The migration is written but not yet applied anywhere.** Check the log table in
`migrations/README.md` before assuming an index exists; `SHOW INDEX FROM projects;` is definitive.

Deliberately not indexed: `title`/`location`. Search uses `LIKE '%term%'`, which no B-tree can
serve. FULLTEXT is the right tool if search becomes slow, and it changes query syntax — a
considered change, not a side effect.

## Transactions

`withTransaction(work)` in `config/db.js` runs `work` on one dedicated connection, commits on
success, rolls back on throw, always releases. Used by:

- `authController.register` — claims the access code with `SELECT ... FOR UPDATE`, creates the
  user, burns the code. The row lock serialises concurrent claims of the same code.
- `projectService.createProject` — project row plus all image rows.

Any helper that writes must receive the transaction connection (`db: tx`). A helper closing over
`pool` runs outside the transaction.

## Dead / unused

`users.updated_at` · `project_images.uploaded_at` (ORDER BY only) · `access_codes.created_at`
(ORDER BY only) · `comment_images` are written but never surfaced in admin moderation.

## Seeding

`Backend/seed.js` (`npm run seed`) **deletes every row** in FK-safe order, then inserts 9 users,
6 projects, 8 images, 2 updates, 2 comments, 5 team members, 3 access codes
(`DEV123`, `ADMIN123`, `CONTR123`). Every user's password is `password`.
Seeded image URLs are `/pictures/...` local paths, not Cloudinary URLs.

**All seed dates are RELATIVE to the run date** (`daysAgo()` / `daysAhead()`). They were
hardcoded, which decayed silently: every demo project drifted past its completion date and
stopped being updated, so a freshly seeded database showed 13 flags across 6 projects and the
flags read as background noise. Never reintroduce a literal date here.

The six projects are shaped to demonstrate each flag roughly once — healthy, completed,
stalled, not-yet-started, spending-ahead, and over-budget/past-due/undocumented. Three are
deliberately clean, because a reader has to be able to see what "no problems" looks like.
Current distribution: 5 flags across 6 projects.
