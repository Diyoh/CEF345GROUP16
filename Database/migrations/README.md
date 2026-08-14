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

Local / Docker:

```bash
docker exec -i buildright-db mysql -ubuildright_user -pbuildright_pass buildright_db1 \
  < Database/migrations/001_add_query_indexes.sql
```

Direct MySQL:

```bash
mysql -h <host> -P <port> -u <user> -p <database> < Database/migrations/001_add_query_indexes.sql
```

Aiven (SSL required — same settings as `Backend/config/db.js`):

```bash
mysql -h <aiven-host> -P <aiven-port> -u avnadmin -p --ssl-mode=REQUIRED <database> \
  < Database/migrations/001_add_query_indexes.sql
```

## Checking what is already applied

MySQL has no `CREATE INDEX IF NOT EXISTS`. Before applying, list existing indexes:

```sql
SHOW INDEX FROM projects;
```

If a migration has already run, re-running it fails with `ER_DUP_KEYNAME (1061)`. That error is
safe to ignore — it means the index is present.

## Log

| # | File | Applied to local | Applied to Aiven | What |
|---|---|---|---|---|
| 001 | `001_add_query_indexes.sql` | ☐ | ☐ | Indexes on `projects.created_at`, `status`, `region`, and `(status, created_at)` |

Tick the boxes when applied. This table is the only record of production schema state.
