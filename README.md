# PhoneFarmZone

**PhoneFarmZone** is an owner-authorized mobile-browser QA and virtual device lab. It is designed for responsive testing, mobile-web compatibility checks, visual regression workflows, controlled browser interaction, network/geolocation simulation, and repeatable QA test execution.

> **Safety and acceptable use:** Use this project only to test websites or applications that you own or are explicitly authorized to test. It is not intended for ad clicking, account farming, CAPTCHA bypass, proxy rotation, spam, credential abuse, platform manipulation, App Connector pairing, or any other abusive automation. It is also not a native Android, ADB, or physical-device farm.

**Copyright © Humayun Shariar Himu**

Repository: <https://github.com/HumayunShariarHimu/PhoneFarmApp>

---

## Table of contents

- [Project purpose](#project-purpose)
- [Features](#features)
- [How it works](#how-it-works)
- [Technology and architecture](#technology-and-architecture)
- [Requirements](#requirements)
- [Local development](#local-development)
- [Environment variables](#environment-variables)
- [QA workflow](#qa-workflow)
- [REST API](#rest-api)
- [Socket.IO events](#socketio-events)
- [Deployment](#deployment)
- [Security checklist](#security-checklist)
- [Troubleshooting](#troubleshooting)
- [Limitations and roadmap](#limitations-and-roadmap)
- [Contributing](#contributing)
- [License and copyright](#license-and-copyright)

---

## Project purpose

PhoneFarmZone manages multiple isolated Puppeteer/Chromium mobile sessions through a web dashboard. Each virtual device has its own viewport, user-agent, device metadata, browser state, and live screenshot stream.

Typical use cases include:

- Mobile-first website and responsive UI QA
- Testing multiple viewport sizes and Android user-agent profiles
- Touch gesture and navigation testing
- Slow 3G, Fast 3G, 4G, and offline network simulation
- Geolocation-dependent UX testing
- Cookies, localStorage, sessionStorage, and cache reset
- Console, page-error, failed-request, and request-count monitoring
- Replaying the same test actions across multiple devices
- Live screenshot capture for visual regression workflows

---

## Features

### Dashboard and device management

- Responsive Next.js dashboard
- Device grid with search and brand filtering
- Create up to 20 virtual device profiles in one request
- Queue devices when the active-browser memory budget is reached
- Device groups, notes, model, Android version, RAM, CPU, and viewport metadata
- Start, stop, restart, remove, and start/stop/remove-all operations
- Batch actions for selected devices

### Mobile interaction

- Tap, double tap, and long press
- Swipe, directional swipes, and multi-touch pinch gestures
- Text input, keyboard keys, and input clearing
- Scroll up, down, to top, and to bottom
- Back, forward, reload, and URL navigation
- Screenshot capture and live JPEG frame streaming

### QA controls

- `online`, `offline`, `slow3g`, `fast3g`, and `4g` network profiles
- Custom latency and upload/download throughput
- Dhaka, Chittagong, London, and New York geolocation presets
- Custom latitude, longitude, and accuracy
- Browser cache, cookies, localStorage, and sessionStorage reset
- Clipboard read/write
- Page title, URL, viewport, scroll, cookie, and storage diagnostics
- Request and failed-request counters
- Console, page-error, and request-failure logs
- Audit events and in-memory test recordings
- Recording replay on one or more devices

### Security

- Owner password login
- Signed, expiring session tokens
- Login-attempt rate limiting
- Protected REST API and authenticated WebSocket connections
- CORS allow-listing
- Security headers: `X-Content-Type-Options`, `X-Frame-Options`, and `Referrer-Policy`
- Browser evaluation disabled by default (`ENABLE_BROWSER_EVAL=false`)
- Only `http` and `https` URLs are accepted

---

## How it works

```text
┌─────────────────────────────┐
│ Next.js dashboard (Vercel)  │
│ React + Axios + Socket.IO    │
└──────────────┬──────────────┘
               │ REST / WebSocket
               ▼
┌─────────────────────────────┐
│ Express API (Render)        │
│ Auth + DevicePool + audit    │
└──────────────┬──────────────┘
               │
               ▼
┌─────────────────────────────┐
│ Puppeteer + Chromium        │
│ Isolated mobile sessions     │
└─────────────────────────────┘
```

Browser sessions and recordings are kept in the backend process memory. A Render restart, deploy, or sleep event stops active sessions; devices must be started again from the dashboard.

---

## Technology and architecture

| Component | Technology | Responsibility |
|---|---|---|
| Frontend | Next.js 14, React 18 | Responsive control dashboard |
| API server | Node.js 20, Express 4 | Authentication, REST API, and lifecycle management |
| Realtime | Socket.IO 4 | State, screenshots, and event streaming |
| Device engine | Puppeteer 21 + Chromium | Mobile browser emulation |
| Compression | `compression` | HTTP response compression |
| Deployment | Vercel + Render | Frontend and backend hosting |

Project structure:

```text
PhoneFarmApp/
├── backend/
│   ├── src/
│   │   ├── DevicePool.js   # Virtual device and pool lifecycle
│   │   ├── auth.js         # Token authentication
│   │   └── socket.js       # Socket.IO events
│   ├── index.js             # Express/HTTP entry point
│   ├── .env.example
│   ├── package.json
│   └── render.yaml
├── frontend/
│   ├── src/
│   │   ├── components/     # Phone UI components
│   │   ├── data/            # Phone model data
│   │   ├── lib/api.js       # REST client
│   │   └── lib/socket.js    # Realtime client
│   ├── .env.example
│   ├── package.json
│   └── vercel.json
├── .github/workflows/
│   └── render-keepalive.yml
└── README.md
```

---

## Requirements

- Node.js **20.x** recommended
- npm 9 or newer
- Linux, macOS, or Windows development machine
- Enough RAM for Chromium browser sessions
- One port for the frontend and one port for the backend
- Memory monitoring before increasing the production device limit

> Puppeteer and Chromium are memory-intensive. Start with `MAX_ACTIVE=3` and increase it only after observing memory usage and restart behavior.

---

## Local development

### 1. Clone the repository

```bash
git clone https://github.com/HumayunShariarHimu/PhoneFarmApp.git
cd PhoneFarmApp
```

### 2. Start the backend

```bash
cd backend
cp .env.example .env
npm install
npm start
```

The backend runs at `http://localhost:4000` by default.

For automatic restarts during development:

```bash
npm run dev
```

### 3. Start the frontend

In a second terminal:

```bash
cd frontend
cp .env.example .env.local
npm install
npm run dev
```

The frontend normally runs at `http://localhost:3000`.

Set the local backend URLs in `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000
NEXT_PUBLIC_WS_URL=http://localhost:4000
NEXT_PUBLIC_MAX_ACTIVE=3
```

### 4. Verify the health endpoint

```bash
curl http://localhost:4000/health
```

A healthy response includes `"ok": true`.

### 5. Verify a production frontend build

```bash
cd frontend
npm run build
npm start
```

---

## Environment variables

### Backend: `backend/.env`

| Variable | Required | Example | Description |
|---|---:|---|---|
| `PORT` | No | `4000` | HTTP server port |
| `NODE_ENV` | No | `production` | Runtime mode |
| `FRONTEND_URL` | Yes | `https://your-app.vercel.app` | Comma-separated CORS allow-list |
| `FARM_PASSWORD` | Yes | A long random password | Dashboard owner password |
| `FARM_SESSION_SECRET` | Yes | 32+ random bytes | Token signing secret |
| `MAX_ACTIVE` | No | `3` | Maximum active browsers; limited to 1–20 |
| `SCREENSHOT_INTERVAL` | No | `800` | Frame interval in milliseconds; limited to 400–5000 |
| `ENABLE_BROWSER_EVAL` | No | `false` | Keep disabled except for authorized QA |
| `PUPPETEER_EXEC` | No | `/usr/bin/google-chrome` | Custom local Chromium path |

Generate a secret with:

```bash
openssl rand -base64 48
```

**Important:** If `FARM_PASSWORD` is omitted, the source contains a development fallback. Never rely on that fallback in production. Do not commit `.env` or `.env.local` files.

### Frontend: `frontend/.env.local`

| Variable | Required | Example | Description |
|---|---:|---|---|
| `NEXT_PUBLIC_API_URL` | Yes | `https://your-backend.onrender.com` | REST API base URL |
| `NEXT_PUBLIC_WS_URL` | Yes | `https://your-backend.onrender.com` | Socket.IO server URL |
| `NEXT_PUBLIC_MAX_ACTIVE` | No | `3` | UI device-capacity hint |

---

## QA workflow

1. Log in to the dashboard with the owner password.
2. Create the required device profiles.
3. Start the devices and wait until their browser sessions are ready.
4. Open a URL from your own or authorized staging/production target.
5. Configure the viewport, touch gestures, network profile, and geolocation.
6. Review screenshots, diagnostics, and logs.
7. Create a recording and add actions when a flow needs to be repeatable.
8. Replay the recording on selected devices.
9. Stop devices and remove unused sessions when testing is complete.

### Example device profile

```json
{
  "name": "Pixel QA 001",
  "brand": "Google",
  "model": "Pixel 7",
  "android": "13",
  "width": 393,
  "height": 851,
  "ram": "8GB",
  "cpu": "Tensor G2",
  "group": "Regression",
  "notes": "Checkout mobile smoke test"
}
```

### Network profiles

| Profile | Use case |
|---|---|
| `online` | Normal network conditions |
| `offline` | Offline and error-state testing |
| `slow3g` | Slow mobile connection |
| `fast3g` | Medium-speed mobile connection |
| `4g` | Fast mobile connection |
| Custom | Specific latency and throughput testing |

---

## REST API

Only the login and health endpoints are public. All other API endpoints require a token:

```http
Authorization: Bearer <TOKEN>
```

### Authentication and monitoring

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/auth/login` | Get a token with the owner password |
| `GET` | `/health` | Render health check |
| `GET` | `/api/config` | Runtime capabilities and limits |
| `GET` | `/api/stats` | Device-pool statistics |
| `GET` | `/api/audit` | Recent audit events |
| `GET` | `/api/qa/profiles` | Network and geolocation presets |

### Devices

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/api/devices` | List all devices and stats |
| `POST` | `/api/devices` | Create one or more devices |
| `GET` | `/api/devices/:id` | Get device details |
| `DELETE` | `/api/devices/:id` | Remove a device |
| `POST` | `/api/devices/:id/action` | Run a generic device action |
| `POST` | `/api/devices/:id/goto` | Navigate to a URL |
| `GET` | `/api/devices/:id/screenshot` | Get a base64 JPEG screenshot |
| `GET` | `/api/devices/:id/diagnostics` | Get page and browser diagnostics |
| `GET` | `/api/devices/:id/logs` | Get device logs |
| `POST` | `/api/devices/:id/storage/clear` | Clear cookies, cache, and storage |
| `POST` | `/api/devices/:id/network` | Change the network profile |
| `POST` | `/api/devices/:id/geolocation` | Change geolocation |
| `POST` | `/api/devices/:id/clipboard` | Read or write clipboard data |

### Android QA connectors

The Android companion is an owner-visible connector for authorized testing. It does not create hidden Android clones or silently install packages. Open the public download page at `/download`, install the PhoneFarm APK from GitHub Releases, then use **Pair Android** in the owner dashboard to generate a one-time 6-digit code.

| Method | Endpoint | Access | Description |
|---|---|---|---|
| `POST` | `/api/connectors/pair` | One-time code | Pair an Android connector with explicit consent |
| `POST` | `/api/connectors/pair-code` | Owner token | Generate a 10-minute pairing code |
| `GET` | `/api/connectors` | Owner token | List paired connector status and capabilities |
| `POST` | `/api/connectors/heartbeat` | Connector token | Update online status and capabilities |
| `POST` | `/api/connectors/revoke` | Connector token | Revoke the connector token |

Example requests:

```bash
# Login
curl -s -X POST http://localhost:4000/api/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"password":"YOUR_PASSWORD"}'

# List devices
curl -s http://localhost:4000/api/devices \
  -H 'Authorization: Bearer YOUR_TOKEN'

# Apply Slow 3G
curl -s -X POST http://localhost:4000/api/devices/DEVICE_ID/network \
  -H 'Authorization: Bearer YOUR_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"profile":"slow3g"}'
```

### Recordings and batch operations

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/recordings` | Create a recording |
| `GET` | `/api/recordings` | List recordings |
| `POST` | `/api/recordings/:id/actions` | Add an action |
| `POST` | `/api/recordings/:id/replay` | Replay on up to 50 devices |
| `DELETE` | `/api/recordings/:id` | Delete a recording |
| `POST` | `/api/batch` | Run an action on up to 50 devices |
| `POST` | `/api/farm/start-all` | Start all devices |
| `POST` | `/api/farm/stop-all` | Stop all devices |
| `POST` | `/api/farm/remove-all` | Remove all devices |

> API errors are normally returned as `{ "success": false, "error": "..." }`.

---

## Socket.IO events

The WebSocket handshake must include a valid token:

```js
import { io } from 'socket.io-client';

const socket = io(process.env.NEXT_PUBLIC_WS_URL, {
  auth: { token: window.localStorage.getItem('farm_token') },
  transports: ['websocket', 'polling'],
});
```

### State events

- `farm:state` — Initial device state and statistics
- `farm:stats` — Statistics approximately every 4 seconds
- `farm:devices` — Device state approximately every 6 seconds
- `device:frame:<id>` — Live screenshot frame
- `device:log:<id>` — New device log
- `device:started`, `device:stopped` — Lifecycle events

### Client actions

Supported action events include:

`tap`, `double_tap`, `long_press`, `swipe`, `pinch`, `swipe_up`, `swipe_down`, `swipe_left`, `swipe_right`, `type`, `key`, `clear`, `scroll_down`, `scroll_up`, `scroll_top`, `scroll_bottom`, `back`, `forward`, `reload`, `goto`, `screenshot`, `network`, `geolocation`, `clear_storage`, `diagnostics`, `clipboard_get`, and `clipboard_set`.

Lifecycle events:

- `device:add`, `device:add_many`, `device:remove`
- `device:start`, `device:stop`, `device:restart`
- `farm:start_all`, `farm:stop_all`, `farm:remove_all`
- `batch`, `subscribe`, `unsubscribe`

Server result/error events include `device:screenshot`, `device:eval:result`, `device:diagnostics:result`, `device:clipboard_get:result`, `batch:done`, and `device:error`.

---

## Deployment

### Backend: Render

The repository includes [`backend/render.yaml`](backend/render.yaml). Configure Render as follows:

1. Connect the GitHub repository.
2. Set the root directory to `backend`.
3. Use the Node runtime.
4. Build command: `npm install --no-audit --no-fund`
5. Start command: `node index.js`
6. Health check path: `/health`
7. Set these secret environment variables:
   - `FRONTEND_URL`
   - `FARM_PASSWORD`
   - `FARM_SESSION_SECRET`
8. After deployment, verify `https://YOUR-SERVICE.onrender.com/health`.

Start with a small `MAX_ACTIVE` value. Chromium sessions can cause out-of-memory errors or restarts on low-memory instances.

### Frontend: Vercel

1. Create a Vercel project from the same repository.
2. Set the root directory to `frontend`.
3. Select the Next.js framework preset.
4. Add these environment variables:

```env
NEXT_PUBLIC_API_URL=https://YOUR-SERVICE.onrender.com
NEXT_PUBLIC_WS_URL=https://YOUR-SERVICE.onrender.com
NEXT_PUBLIC_MAX_ACTIVE=3
```

5. Deploy the frontend.
6. Set the exact Vercel production URL as Render's `FRONTEND_URL` value.
7. Redeploy both services after changing environment variables.

### Keep-alive workflow

`.github/workflows/render-keepalive.yml` pings `/health` every five minutes. This may reduce cold starts, but it does not guarantee availability or replace a paid always-on hosting plan. Update the workflow's `HEALTH_URL` if the backend URL changes.

---

## Security checklist

Before production deployment:

- [ ] A strong, unique `FARM_PASSWORD` is configured
- [ ] A long random `FARM_SESSION_SECRET` is configured
- [ ] `ENABLE_BROWSER_EVAL=false` is set
- [ ] `FRONTEND_URL` contains only trusted origins
- [ ] `.env`, `.env.local`, tokens, and secrets are not committed
- [ ] HTTPS is enabled when exposing the dashboard publicly
- [ ] Ownership or explicit authorization for every target URL is confirmed
- [ ] Sensitive device data is cleared or removed after testing
- [ ] Logs do not contain secrets or credentials
- [ ] Durable storage requirements have been evaluated for production

Enable `ENABLE_BROWSER_EVAL=true` only in a controlled, authorized QA environment. Arbitrary page-script execution increases the risk of sensitive-data exposure and destructive actions.

---

## Troubleshooting

### The frontend cannot connect to the backend

- Check `NEXT_PUBLIC_API_URL` and `NEXT_PUBLIC_WS_URL`; do not add a trailing slash.
- Set the exact Vercel origin in Render's `FRONTEND_URL`.
- Check the browser console for CORS errors.
- Run `curl https://YOUR-BACKEND/health` to confirm that the backend is awake.

### A device does not start

- Review the backend logs.
- Reduce `MAX_ACTIVE` and check instance memory.
- In local development, verify the `PUPPETEER_EXEC` path if one is configured.
- Confirm that Chromium is installed with `npx puppeteer browsers install chrome`.

### The first Render request is slow

A sleeping free service may take 30–90 seconds to cold-start. The frontend API timeout is set to 120 seconds. Wait for the first health request to finish before retrying device creation.

### WebSocket authentication fails

- Confirm that the login token exists in localStorage.
- Confirm that the same token is passed as `auth.token` to Socket.IO.
- Confirm that the frontend and backend URLs point to the same deployed service.

### Screenshots or touch actions do not work

- Confirm that the device status is `running`.
- Review browser console logs, page errors, and diagnostics.
- Use coordinates inside the configured device viewport.

---

## Limitations and roadmap

### Current limitations

- Device state, recordings, and audit data are in-memory and are lost after a backend restart.
- This is not a native Android emulator or physical USB device system.
- APK installation, ADB, Android system apps, and emulator snapshots are not included.
- Render's ephemeral filesystem must not be treated as durable storage.
- Screenshot streaming and Chromium sessions can consume significant memory.
- There is no built-in database for durable test-result export.

### Suggested roadmap

- PostgreSQL/SQLite-backed test-result persistence
- Test-run, screenshot, and log export
- Role-based access control and team members
- Per-project workspaces and retention policies
- Visual regression baselines and image diffs
- Queue metrics, memory guards, and autoscaling workers
- Structured logging, OpenTelemetry, and alerting
- Optional Android worker/ADB integration for true Android-device testing

---

## Contributing

1. Fork the repository.
2. Create a feature branch:

```bash
git checkout -b feat/your-feature
```

3. Make your changes and run the frontend build:

```bash
cd frontend
npm run build
```

4. Test the backend health endpoint and the affected QA workflow.
5. Use a clear commit message and open a pull request.

Do not publish sensitive security-vulnerability details in a public issue. Contact the repository owner privately instead.

---

## License and copyright

The copyright for this repository belongs to **Humayun Shariar Himu**. Until a separate `LICENSE` file is added, obtain permission from the copyright holder before reusing, redistributing, or commercially using this code.

**Copyright © Humayun Shariar Himu. All rights reserved.**
