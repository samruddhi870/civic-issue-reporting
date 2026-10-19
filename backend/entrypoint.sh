#!/bin/sh
# Seed demo data only on first start (seed.py drops all tables, so never re-run it).
if [ ! -f /app/civicconnect.db ]; then
  echo "[ENTRYPOINT] No database found - seeding demo data"
  python seed.py
fi
exec "$@"
