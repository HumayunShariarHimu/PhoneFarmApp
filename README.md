# PhoneFarmZone

PhoneFarmZone is an owner-authenticated virtual device lab for mobile-web QA, responsive testing, visual regression checks, and controlled browser interaction. Each virtual device is an isolated mobile Puppeteer/Chromium session exposed through a responsive Next.js dashboard.

> This project is intentionally scoped for authorized testing and device-lab workflows. It does not include App Connector pairing, ad-clicking, account farming, CAPTCHA bypass, proxy rotation, or other platform-abuse automation.

## Included capabilities

- Responsive dashboard with device grid, search, status and brand filtering.
- Add up to 20 virtual device profiles at a time, with queueing when the Render memory budget is reached.
- Live screenshot streaming over Socket.IO, mobile viewport emulation, user-agent profiles and device metadata.
- Authorized manual interactions: tap, double tap, long press, swipe, type, keyboard key, scroll, navigation, reload and screenshot.
- Batch actions for selected devices, start/stop/remove-all controls, device groups and audit events.
- Owner password login with signed expiring tokens, rate-limited login attempts, protected REST and WebSocket APIs, CORS allow-listing and security headers.
- Health endpoint for Render monitoring and a small audit API for recent device lifecycle/actions.

## Architecture

| Layer | Runtime | Purpose |
|---|---|---|
| Frontend | Next.js 14 + React 18 | Mobile-responsive control dashboard on Vercel |
| Backend | Node.js + Express | Authenticated API and lifecycle manager on Render |
| Realtime | Socket.IO | Live state, screenshots and interaction events |
| Device engine | Puppeteer + Chromium | Isolated mobile browser sessions for QA |

## Local development

```bash
cd backend
cp .env.example .env
npm install
npm start

# in another terminal
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

Set `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL` to `http://localhost:4000` while developing. Never commit `.env` files. Keep `ENABLE_BROWSER_EVAL=false` unless you explicitly need scripts against pages you own or are authorized to test.

## Render deployment

The backend is configured by [`backend/render.yaml`](backend/render.yaml). In Render, confirm the service uses the repository root directory `backend`, build command `npm install --no-audit --no-fund`, start command `node index.js`, and health path `/health`. Set the secret environment values `FRONTEND_URL`, `FARM_PASSWORD`, and `FARM_SESSION_SECRET`; do not use the old default password in production. The free plan is suitable for a small QA pool only; Chromium sessions are memory-intensive, so increase `MAX_ACTIVE` only after observing memory and restart behavior on an appropriately sized plan.

The health response contains `ok`, uptime, version and device counts. Render should use `/health` for automatic service health checks. The GitHub keep-alive workflow is only an availability hint; it cannot prevent every platform sleep policy and should not be treated as a substitute for a paid always-on plan.

## Vercel deployment

Create a Vercel project from the `frontend` directory with the Next.js framework. Configure:

```text
NEXT_PUBLIC_API_URL=https://<your-render-service>.onrender.com
NEXT_PUBLIC_WS_URL=https://<your-render-service>.onrender.com
NEXT_PUBLIC_MAX_ACTIVE=3
```

Then set the exact Vercel production URL as Render's comma-separated `FRONTEND_URL` value. Redeploy both sides after changing environment variables.

## Operational notes

Render's free service may sleep and cold-start. Device browser sessions are intentionally in-memory and are stopped when the service restarts; the dashboard should be used to recreate the test pool. For durable test results, export them from the application or add a separately managed database rather than storing Chromium state on the ephemeral filesystem.

The connector integration has been removed from both code and configuration. There are no pairing, heartbeat or connector routes in the backend.
