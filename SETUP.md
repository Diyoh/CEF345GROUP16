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

## AI search with a free local model (optional)

The Projects page can take a question in plain English, French or Pidgin ("stalled roads
in Bamenda", "écoles en cours à Yaoundé") and turn it into its filters. The model only
picks filters; the page then lists the real records. It is off unless you turn it on.

1. Install [Ollama](https://ollama.com) and download the model (about 2 GB, once):

   ```bash
   ollama pull qwen2.5:3b
   ```

2. Turn it on:

   - **Local backend:** in `Backend/.env` set `AI_PROVIDER=ollama`. The defaults for
     `AI_MODEL` (`qwen2.5:3b`) and `OLLAMA_URL` (`http://localhost:11434`) fit a standard
     Ollama install.
   - **Docker:** the root `.env.example` already sets `AI_PROVIDER=ollama`, and the backend
     container reaches Ollama on your computer through `host.docker.internal`.

3. Restart the backend. It logs `AI features: ollama, model qwen2.5:3b`, and the "Ask in
   plain words" box appears above the projects list. If Ollama is not running or the
   model is not pulled, the box stays hidden and the rest of the site works as before.

On a laptop without a graphics card each question takes roughly 10 to 15 seconds; the
first one after a restart is slower while the model loads.

**Other models.** Any Ollama model works: set `AI_MODEL`, for example `llama3.2:3b`, or a
larger model if your computer has the memory. `AI_PROVIDER=anthropic` with
`ANTHROPIC_API_KEY` uses Claude through the paid Anthropic API instead; nothing else changes.

**How it stays trustworthy.** Statuses, ministries, regions, councils, towns and kinds of
work are recognised by code from word lists in English, French and Pidgin
(`Backend/services/ai/searchLexicon.js`). The model fills in only what those lists cannot,
and its answer is kept only where it quotes words that really are in the question. The
assistant cannot change any record. The chosen filters are shown to the user, who can
remove them.

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
