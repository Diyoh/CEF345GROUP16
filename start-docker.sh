#!/bin/sh
# Starts the BuildRight Docker stack (macOS and Linux counterpart of start-docker.bat).
set -e
cd "$(dirname "$0")"

if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from .env.example. Change its passwords before sharing this machine."
fi

docker compose up --build -d

cat <<MSG

Services started!
Frontend: http://localhost:8080
Backend:  http://localhost:5001

First run only, create the schema and demo data:
  docker compose exec backend npm run db:init
  docker compose exec backend npm run migrate
  docker compose exec backend npm run seed:entities
  docker compose exec backend npm run seed
MSG
