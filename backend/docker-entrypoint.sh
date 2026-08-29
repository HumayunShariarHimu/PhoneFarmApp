#!/bin/bash
set -e
Xvfb :99 -screen 0 1920x1080x24 &
adb start-server 2>/dev/null || true
echo "[✓] Starting PhoneFarmOS Backend..."
if [ -n "${DATABASE_URL:-}" ]; then
  until npx prisma db push --skip-generate 2>/dev/null; do sleep 2; done
  npx prisma db push 2>/dev/null || true
else
  echo "[!] DATABASE_URL is not configured; starting API without database migration"
fi
node src/db/seed.js 2>/dev/null || true
exec "$@"
