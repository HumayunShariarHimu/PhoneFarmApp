# ⌬ PhoneFarmOS v3 — Real Android Phone Farm

> **সত্যিকারের ভার্চুয়াল ফোন ফার্মিং সিস্টেম**
> QEMU Android-x86 emulators + ADB automation + WebRTC live streaming

---

## Architecture

```
Browser (Vercel)          Backend (Railway/VPS)
┌─────────────────┐      ┌────────────────────────────────┐
│  Next.js UI     │◄────►│  Node.js + Express + Socket.IO │
│  WebRTC viewer  │      │                                │
│  Live screen    │      │  ┌─────────────────────────┐   │
│  Click → ADB   │      │  │  Android-x86 VM (QEMU)  │   │
│  Task control  │      │  │  ├── ADB control         │   │
│  Account mgmt  │      │  │  ├── VNC screen          │   │
│  Proxy mgmt    │      │  │  └── WebRTC stream       │   │
└─────────────────┘      │  └─────────────────────────┘   │
                          │  ×N (up to 50 VMs)             │
                          │                                │
                          │  PostgreSQL (DB)               │
                          │  Redis (Task Queue)            │
                          │  Puppeteer (Web automation)    │
                          └────────────────────────────────┘
```

---

## Quick Start (Local)

### Prerequisites
- Docker + Docker Compose
- Linux host with KVM support (`/dev/kvm`)
- 16GB+ RAM recommended (2GB per emulator)

### 1. Clone & Configure
```bash
git clone https://github.com/YOUR/real-phone-farm.git
cd real-phone-farm

# Copy env files
cp backend/.env.example backend/.env
# Edit backend/.env with your settings

cp frontend/.env.example frontend/.env.local
# Set NEXT_PUBLIC_API_URL=http://localhost:4000
```

### 2. Download Android-x86 Image
```bash
# Download Android-x86 9.0
wget https://sourceforge.net/projects/android-x86/files/Release%209.0/android-x86_64-9.0-r2.iso

# Create base disk image
qemu-img create -f qcow2 /android/base/android-x86-9.0.img 8G

# Install Android to disk (run once)
qemu-system-x86_64 \
  -enable-kvm -m 2048 -smp 2 \
  -hda /android/base/android-x86-9.0.img \
  -cdrom android-x86_64-9.0-r2.iso \
  -boot d -vga std
```

### 3. Start Full Stack
```bash
docker-compose up -d
```

### 4. Access
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:4000
- **Health**: http://localhost:4000/health

---

## Deploy to Production

### Backend → Railway
```bash
cd backend
railway login
railway init
railway up

# Set env vars in Railway dashboard:
# DATABASE_URL, REDIS_URL, JWT_SECRET, FRONTEND_URL
```

### Frontend → Vercel
```bash
cd frontend
vercel --prod

# Set env vars in Vercel dashboard:
# NEXT_PUBLIC_API_URL = https://your-backend.railway.app
# NEXT_PUBLIC_WS_URL  = https://your-backend.railway.app
```

### Database → Railway PostgreSQL
```bash
# Add PostgreSQL service in Railway
# Copy DATABASE_URL to backend env vars
railway run npm run db:migrate
railway run npm run db:seed
```

---

## Features

### 📱 Farm Control
- **Real Android-x86 VMs** via QEMU/KVM
- **Live WebRTC screen** in browser (click anywhere → ADB tap)
- Full gesture support: tap, double-tap, long press, swipe
- Keyboard input forwarded to Android
- Start/Stop/Restart VMs from browser
- Bulk operations on all phones

### 🤖 Real Automation
- **YouTube**: Watch videos, skip ads, like, subscribe
- **Swagbucks**: SBTV videos, surveys, daily search
- **Honeygain**: Passive bandwidth sharing
- **Mistplay**: Game session automation
- **Puppeteer**: Web-based app automation (fallback)
- Custom config per task (duration, targets, etc.)

### 📦 APK Management
- Install any APK on any emulator
- APK library management
- Bulk install across all phones

### 👤 Account Manager
- Multi-platform account storage (encrypted passwords)
- Bulk import (email:password:platform)
- Status tracking (active/banned)
- Balance & points tracking

### 🌐 Proxy Manager
- Per-device proxy assignment
- Bulk import (host:port:user:pass)
- Automatic proxy testing
- Country/protocol filtering

### 📊 Analytics
- Real-time earnings tracking
- 7-day/30-day charts
- Per-app breakdown
- Device performance metrics

---

## API Reference

### Devices
```bash
GET    /api/devices              # List all
POST   /api/devices              # Create VM(s)
GET    /api/devices/:id          # Get one
DELETE /api/devices/:id          # Delete
POST   /api/devices/:id/action   # Execute action
POST   /api/devices/:id/install  # Install APK

# Actions:
# tap, swipe, type, keyevent, back, home, recents
# shell, launch_app, stop_app, open_url, screenshot
# set_proxy, clear_proxy, set_location, reboot, unlock
```

### Tasks
```bash
GET    /api/tasks                # List tasks
POST   /api/tasks                # Create task
POST   /api/tasks/:id/cancel     # Cancel
POST   /api/tasks/:id/retry      # Retry failed
DELETE /api/tasks/:id            # Delete
```

### Stream (WebRTC)
```bash
POST   /api/stream/offer         # Get WebRTC offer
POST   /api/stream/answer        # Send answer
POST   /api/stream/ice           # ICE candidate
DELETE /api/stream/:peerId       # Stop stream
```

---

## WebSocket Events

```javascript
// Control phone
socket.emit('device:tap',       { deviceId, x, y })
socket.emit('device:swipe',     { deviceId, x1, y1, x2, y2, duration })
socket.emit('device:type',      { deviceId, text })
socket.emit('device:keyevent',  { deviceId, keycode })
socket.emit('device:shell',     { deviceId, command })
socket.emit('device:launch_app',{ deviceId, packageName })
socket.emit('device:open_url',  { deviceId, url })
socket.emit('device:screenshot',{ deviceId })

// Emulator lifecycle
socket.emit('emulator:create',   options)
socket.emit('emulator:stop',     { deviceId })
socket.emit('emulator:restart',  { deviceId })

// WebRTC streaming
socket.emit('webrtc:request_stream', { deviceId })
socket.emit('webrtc:answer',    { deviceId, peerId, answer })

// Receive events
socket.on('farm:devices:update',   devices => {})
socket.on('emulator:started',      { id, name, status } => {})
socket.on('task:progress',         { taskId, progress } => {})
socket.on('task:completed',        { taskId, result } => {})
socket.on('device:screenshot:done',{ deviceId, url } => {})
socket.on('metrics:update',        updates => {})
```

---

## Scaling

### Multiple emulators
```bash
# Each emulator uses:
# - 2GB RAM (configurable)
# - 2 CPU cores (configurable)
# - 1 VNC port (5900+slot)
# - 1 ADB port (5554+slot*2)
# - 8GB disk space

# For 10 emulators: ~20GB RAM, 20 CPUs
# Recommended: VPS with 32GB RAM, 8-core CPU
```

### Cloud alternatives
```bash
# If no KVM available, use Appetize.io or Genymotion
# Set in backend/.env:
APPETIZE_API_KEY=your_key_here
```

---

## ⚠️ Legal Notice

This tool is for:
✅ App testing and QA automation
✅ Research and education
✅ Testing your own applications

Always comply with platform Terms of Service.
