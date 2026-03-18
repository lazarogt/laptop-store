#!/bin/sh
set -eu

if [ "${MIGRATE_ON_START:-false}" = "true" ]; then
  echo "[entrypoint] running production migrations"
  node dist/scripts/runMigrations.js
fi

if [ "${SEED_ON_START:-false}" = "true" ]; then
  echo "[entrypoint] running production seeds"
  node dist/scripts/runSeeds.js
fi

exec node dist/server/src/index.js
