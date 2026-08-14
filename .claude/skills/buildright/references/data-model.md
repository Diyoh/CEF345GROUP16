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

`id` PK · `project_id` FK CASCADE · `author_name` · `author_type` ENUM(`Citizen`,`NGO`) ·
`text` TEXT · `created_at`.
**No `user_id`** — citizen reports are anonymous by design.

## comment_images

`id` PK · `comment_id` FK CASCADE · `image_url` TEXT. Up to 4 per report (frontend cap).

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
4 projects, 6 images, 2 updates, 2 comments, 5 team members, 3 access codes
(`DEV123`, `ADMIN123`, `CONTR123`). Every user's password is `password`.
Seeded image URLs are `/pictures/...` local paths, not Cloudinary URLs.
