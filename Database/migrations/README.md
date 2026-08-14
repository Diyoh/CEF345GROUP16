# Database migrations

There is no migration framework in this project. Migrations are numbered SQL files applied
by hand, in order, once each. That is deliberate: adding Knex or Prisma to a codebase that
uses raw `mysql2` queries everywhere would be a larger change than the schema edits it manages.

## Rules

1. **Never edit an applied migration.** Write a new one.
2. **Never edit `../schema.sql` alone** — it describes a *fresh* install. Any change to it needs
   a matching migration so existing databases (local, Docker, Aiven) receive the same change.
3. **Never edit the `*.sql` backups** (`backup.sql`, `backup_latest.sql`, `backup_utf8.sql`,
   `Database/backup*.sql`). They are point-in-time dumps, not schema sources.
4. Number files `NNN_short_description.sql`, zero-padded, sequential.

## Applying

Use the runner. It applies pending files in order, exactly once each, and records what it
did in a `schema_migrations` table in the database itself.

```bash
cd Backend
npm run migrate:status   # what is applied, what is pending
npm run migrate:dry      # print the statements that would run, change nothing
npm run migrate          # apply pending migrations
```

The runner reuses the application's own connection pool (`Backend/config/db.js`), so it
reaches whatever database the API reaches — same host, port, SSL and credentials, with no
second config to keep in sync. Point it at another environment by pointing `Backend/.env`
at that environment.

Always run `migrate:dry` before `migrate` against a database you care about.

## Checking what is already applied

`npm run migrate:status`. The `schema_migrations` table is the record — not this file, and
not anybody's memory.

The runner also stores a checksum per file and warns if an already-applied migration has
been edited since it ran, which means the database no longer matches the repository. Fix
that by writing a new migration, never by editing the old one.

Statements that are already present (duplicate index, existing table, existing column) are
tolerated and logged, so a partially applied file can be re-run safely.

## Log

| # | File | Local / Docker | Remote (Aiven) | What |
|---|---|---|---|---|
| 001 | `001_add_query_indexes.sql` | ☐ | ☑ | Indexes on `projects.created_at`, `status`, `region`, and `(status, created_at)` |
| 002 | `002_anonymous_citizen_reports.sql` | ☐ | ☑ | `comments.author_name` made nullable; new reports store NULL |
| 003 | `003_project_change_log.sql` | ☐ | ☑ | `project_changes` immutable audit log of every figure change |
| 004 | `004_enforce_audit_immutability.sql` | ☐ | ☑ | Drops the audit FK cascade; triggers reject UPDATE/DELETE on `project_changes` |

Applied 2026-08-14 to the **remote (Aiven)** database via `npm run migrate`, verified by
inspecting `information_schema`. Local/Docker databases are unticked because `Backend/.env`
points at the remote host — anyone running a local database should run `npm run migrate`
against it with their own `.env`.

This table is a convenience summary. `schema_migrations` in each database is the
authoritative record; run `npm run migrate:status` rather than trusting this file.
