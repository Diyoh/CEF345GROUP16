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

The runner reuses the application's connection pool (`Backend/config/db.js`), so it reaches
whatever database `Backend/.env` points at — same host, port, SSL and credentials as the API,
with no second config to keep in sync. **To migrate a different environment, point `.env` at
it and run the same command.**

Always run `migrate:dry` before `migrate` against a database you care about.

### Standing up a fresh database

`Database/schema.sql` describes the CURRENT desired state, including the audit-log triggers,
so a new database does not need the migrations replayed to be correct:

```bash
docker compose up -d db                 # or point .env at any MySQL 8 / MariaDB
cd Backend && npm run migrate           # records baseline; already-present objects are tolerated
npm run seed                            # optional demo data
```

Running the migrator against a fresh `schema.sql` install is safe and recommended: statements
whose effect is already present (index exists, table exists, foreign key already absent,
trigger already defined) are tolerated and logged, and the run populates `schema_migrations`
so future migrations apply cleanly.

## Checking what is already applied

`npm run migrate:status`. The `schema_migrations` table is the record — not this file, and
not anybody's memory.

The runner also stores a checksum per file and warns if an already-applied migration has
been edited since it ran, which means the database no longer matches the repository. Fix
that by writing a new migration, never by editing the old one.

Statements that are already present (duplicate index, existing table, existing column) are
tolerated and logged, so a partially applied file can be re-run safely.

## Log

| # | File | What |
|---|---|---|
| 001 | `001_add_query_indexes.sql` | Indexes on `projects.created_at`, `status`, `region`, and `(status, created_at)` |
| 002 | `002_anonymous_citizen_reports.sql` | `comments.author_name` made nullable; new reports store NULL |
| 003 | `003_project_change_log.sql` | `project_changes` immutable audit log of every figure change |
| 004 | `004_enforce_audit_immutability.sql` | Drops the audit FK cascade; triggers reject UPDATE/DELETE on `project_changes` |

**Per-environment state is NOT tracked in this file.** Each database records its own applied
migrations in its `schema_migrations` table; run `npm run migrate:status` against an
environment to ask it directly. A checklist in a markdown file drifts from reality the first
time someone forgets to tick it.

History: 001-004 were applied to the original Aiven instance on 2026-08-14. That instance is
being retired, so nothing depends on it — any replacement gets the same state from
`schema.sql` plus a `npm run migrate` run.
