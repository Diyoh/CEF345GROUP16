# Setup Guide

Two ways to run BuildRight: **Docker** (everything in containers, nothing to install but
Docker) or **locally** (Node.js and MySQL on your machine). Both build the database the same
way: `db:init`, `migrate`, `seed:entities`, `seed`.

## Requirements

| For | You need |
|---|---|
| Docker | Docker Desktop (Windows, macOS) or Docker Engine with the compose plugin (Linux) |
| Local | Node.js 20.19 or newer (22 recommended), MySQL 8, Git |

Vite 7 does not run on Node 18.

## Option A: Docker

1. Start the stack. The script creates `.env` from `.env.example` on the first run.

   ```bash
   ./start-docker.sh        # macOS, Linux
   start-docker.bat         # Windows
   ```

   Or by hand: `cp .env.example .env`, then `docker compose up --build -d`.

2. First run only: create the schema and the demo data.

   ```bash
   docker compose exec backend npm run db:init
   docker compose exec backend npm run migrate
   docker compose exec backend npm run seed:entities
   docker compose exec backend npm run seed
   ```

3. Open the app:

   | Service | Address |
   |---|---|
   | App | http://localhost:8080 |
   | API | http://localhost:5001/api/v1 |
   | MySQL (for a database client) | localhost:3310 |

The ports are 5001 and 3310 rather than 5000 and 3306 so they do not collide with a local
Node server or MySQL. Inside the Docker network the services still use 5000 and 3306.

**Configuration.** The root `.env` holds the database passwords and the two secrets for
the local stack; change the passwords if anyone else uses your machine. `Backend/.env` is
optional under Docker and only needed for Cloudinary image uploads.

**Useful commands**

```bash
docker compose logs -f backend      # follow the API log
docker compose down                 # stop, keep the data
docker compose down -v              # stop and delete the database
```

## Option B: Local

1. Create an empty MySQL database, for example `buildright`.

2. Configure the backend:

   ```bash
   cd Backend
   cp .env.example .env
   ```

   Set `DB_HOST`, `DB_USER`, `DB_PASS`, `DB_NAME`, `JWT_SECRET` and `LEDGER_HMAC_KEY`.
   The comments in `.env.example` explain every setting.

3. Install, build the database, start the API:

   ```bash
   npm install
   npm run db:init
   npm run migrate
   npm run seed:entities
   npm run seed
   npm run dev                 # http://localhost:5000
   ```

   If `migrate` fails with an error about `SUPER` privilege while creating triggers, run
   this once as the MySQL root user: `SET GLOBAL log_bin_trust_function_creators = 1;`

4. In a second terminal, start the frontend:

   ```bash
   cd Frontend
   npm install
   npm run dev                 # http://localhost:5173
   ```

The sign-in accounts are listed under "Demo accounts" in the [README](README.md).

## Tests

```bash
cd Frontend && npm test -- --run      # component and unit tests
cd Backend && npm test                # unit tests, database mocked
cd Backend && npm run test:integration
```

The integration tests run against a **real MySQL**: they check the append-only triggers,
the ledger hash chain and full money flows. Point `Backend/.env` (or `DB_*` variables) at a
disposable database built with the four commands above. The tests add rows and cannot
remove them, because the ledger refuses deletes, so never run them against data you care
about. CI runs all three suites on every pull request.

## Database changes

Schema changes are numbered SQL files in `Database/migrations/`, applied by
`npm run migrate`. Read [Database/migrations/README.md](Database/migrations/README.md)
before writing one. `Database/schema.sql` must be updated to match.

## Production

- Set `NODE_ENV=production`. The API then refuses to start unless `JWT_SECRET` and
  `LEDGER_HMAC_KEY` are set, at least 32 characters, not the example values, and different
  from each other.
- Set `CORS_ORIGINS` to the frontend's address.
- `LEDGER_HMAC_KEY` signs every financial record. Store it outside the database, back it
  up, and do not change it: past signatures only verify against the key that made them.
- Deployment notes for Vercel and a managed MySQL (Aiven) are in
  [Documents/Vercel_Deployment_Guide.md](Documents/Vercel_Deployment_Guide.md) and
  [Documents/Database_Deployment_Guide.md](Documents/Database_Deployment_Guide.md).
- Never commit a database dump. `backup*.sql` is gitignored because dumps contain account
  data and password hashes.
