# BuildRight Cameroon

A public record of Cameroon's infrastructure projects and the money behind them. Citizens see
every project's budget, spending and progress. Ministries, councils and contractors record
each payment on both sides, and the platform publishes any gap between what was sent and what
arrived.

## What it does

- **Public portal.** Browse projects as a list or on a map of Cameroon, filter by region,
  ministry, council, contractor or status, and download exactly what you are looking at as
  CSV. English and French throughout.
- **Automatic flags.** Projects spending faster than they build, past their deadline, stalled,
  without photo evidence, or with a payment the contractor disputes are flagged without anyone
  having to report them.
- **Follow the money.** The Ministry of Finance allocates and sends funds; the receiving
  ministry or council separately confirms what arrived; institutions pay contractors, who
  separately affirm what they received. Every gap is computed and published.
- **Tamper-evident ledger.** Every money action is written to an append-only, hash-chained,
  signed ledger. Anyone can recompute the chain in their own browser from the Ledger page.
- **Two-factor money actions.** Each financial action requires the password and a private
  confirmation number (PCN).
- **Ask in plain words (optional).** A free local AI model (via Ollama) turns questions in
  English, French or Pidgin into the page's filters. It never changes a record; see
  [SETUP.md](SETUP.md#ai-search-with-a-free-local-model-optional).
- **Open data API** at `/api/v1/public`, no key required.
- **Staff desks** for the platform administrator, ministries and councils, contractors and
  developers, with role- and institution-scoped access.

## Tech stack

React 18, Vite, Tailwind CSS · Node.js, Express, MySQL 8 · Socket.io for live updates ·
Leaflet and OpenStreetMap for the map · Docker Compose for local deployment.

## Quick start

With Docker:

```bash
./start-docker.sh             # or start-docker.bat on Windows
docker compose exec backend npm run db:init
docker compose exec backend npm run migrate
docker compose exec backend npm run seed:entities
docker compose exec backend npm run seed
```

Then open http://localhost:8080. For running without Docker, configuration, tests and
production notes, see **[SETUP.md](SETUP.md)**.

## Project structure

| Folder | Contents |
|---|---|
| `Backend/` | Express API: `routes/`, `controllers/`, `services/` (business rules), `middleware/`, `scripts/` (database setup and migrations), `test/` (unit), `test-integration/` (real MySQL) |
| `Frontend/` | React app: `src/pages/`, `src/components/`, `src/i18n/` (English and French), `docs/design/` (design specification) |
| `Database/` | `schema.sql` (a fresh install), `migrations/` (changes to existing databases), `data/` (reference data) |
| `Documents/` | Architecture, API reference, manuals and course reports; see its [index](Documents/README.md) |

## Demo accounts

Seeded by `cd Backend && npm run seed` (run `npm run seed:entities` first for the
government hierarchy). The sign-in form asks for your role; pick the one listed here,
because a mismatched declaration is refused even with the right password.

| Sign in as | Email | Password | PCN (for money actions) |
|---|---|---|---|
| Platform administrator | admin@buildright.cm | password | none |
| Institution administrator (Ministry of Finance) | finance@minfi.cm | password | AB23-CD45-EF67 |
| Institution administrator (Ministry of Public Works) | works@mintp.cm | password | AB23-CD45-EF67 |
| Institution administrator (Bamenda I Council) | council@bamenda1.cm | password | AB23-CD45-EF67 |
| Contractor | contact@btpcameroun.cm | password | AB23-CD45-EF67 |
| Developer | dev@buildright.cm | password | none |

What each desk opens onto (the seed includes a working money story):

- **finance@minfi.cm**: the Allocations desk, with 2bn FCFA committed to MINTP (1bn sent,
  still awaiting confirmation) and 500M to Bamenda I (300M sent, 250M confirmed, the 50M
  gap published).
- **council@bamenda1.cm**: the Finances desk, with the council's 900M budget, its own
  income, the incoming allocation with its confirmation record, and a 60M payment to its
  market contractor of which only 45M is affirmed.
- **works@mintp.cm**: the contractor Verification queue (BuildFast is pending) plus the
  ministry's own projects.
- **contact@btpcameroun.cm**: the payment inbox showing the 60M/45M payment, the company
  verification file, and the assigned projects, where `spent` is now read-only because it
  derives from affirmed payments.

The PCN (Private Confirmation Number) is the second factor demanded by every money
action, together with the password. Real accounts receive theirs exactly once, at
registration.

## Contributing

Please see [CONTRIBUTING.md](CONTRIBUTING.md) for details on how to contribute to this project.

## License

This project is licensed under the MIT License.
