#!/bin/bash
set -e
Xvfb :99 -screen 0 1920x1080x24 &
adb start-server 2>/dev/null || true
echo "[✓] Starting PhoneFarmOS Backend..."
until npx prisma db push --skip-generate 2>/dev/null; do sleep 2; done
npx prisma db push 2>/dev/null || true
node src/db/seed.js 2>/dev/null || true
exec "$@"
