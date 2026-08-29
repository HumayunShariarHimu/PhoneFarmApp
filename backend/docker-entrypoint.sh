#!/bin/sh
set -e

Xvfb :99 -screen 0 1920x1080x24 >/tmp/xvfb.log 2>&1 &
adb start-server 2>/dev/null || true
echo "[✓] Starting PhoneFarmOS Backend..."

# Database initialization runs in the background so the HTTP health endpoint
# remains available while Railway provisions or connects the database.
if [ -n "${DATABASE_URL:-}" ]; then
  (
    npx prisma db push --skip-generate >/tmp/prisma-push.log 2>&1 || true
    node src/db/seed.js >/tmp/seed.log 2>&1 || true
  ) &
else
  echo "[!] DATABASE_URL is not configured; skipping database initialization"
fi

exec "$@"
