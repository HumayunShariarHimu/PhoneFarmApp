# 📱 PhoneFarmOS — মোবাইল থেকে Deployment গাইড

> মোবাইল ব্রাউজার দিয়েই সব করা যাবে। কোনো PC দরকার নেই।

---

## 🗺️ সিস্টেম Overview

```
তোমার মোবাইল Browser
        ↕ WebRTC (Live Screen)
        ↕ Socket.IO (Real-time control)
        
┌─────────────────────────────────────┐
│  Frontend  →  Vercel (Free)          │  dashboard দেখাবে
│  Backend   →  Railway ($5-20/mo)     │  Android VMs চালাবে
│  Database  →  Railway PostgreSQL     │  data store করবে
│  Queue     →  Railway Redis          │  tasks manage করবে
└─────────────────────────────────────┘
```

---

## ⚠️ গুরুত্বপূর্ণ — আগে পড়ো

**Real Android emulation এর জন্য লাগবে:**
- Railway Pro plan ($5/month) — KVM support আছে
- OR DigitalOcean Droplet ($12/month, Ubuntu + KVM)
- OR Vultr VPS ($12/month, KVM enabled)

**Vercel শুধু frontend serve করবে।**  
**Backend অবশ্যই একটি real Linux server এ চলবে।**

---

## ধাপ ১ — GitHub এ Code Upload (মোবাইল থেকে)

### Option A: GitHub.com মোবাইল সাইট

1. **github.com** এ যাও (Desktop mode চালু করো)
2. **New repository** তৈরি করো:
   - Name: `real-phone-farm`
   - Private: ✓ (recommended)
   - Create repository
3. ZIP ফাইল থেকে প্রতিটি ফাইল upload করো:
   - **Add file → Upload files**
   - Folder structure maintain করতে হবে

### Option B: GitHub Mobile App (সহজ)

1. **GitHub Mobile** app install করো
2. New repo তৈরি করো
3. Files আলাদাভাবে যোগ করো

### Option C: Replit (সবচেয়ে সহজ — মোবাইলে) ⭐

1. **replit.com** এ যাও
2. **Create Repl** → Import from ZIP
3. ZIP upload করো
4. সব ফাইল automatically import হবে
5. **Connect to GitHub** করো

---

## ধাপ ২ — Railway Backend Deploy

### 2.1 Railway Account তৈরি

1. **railway.app** → Sign up with GitHub
2. **New Project** → Deploy from GitHub repo
3. Repository: `real-phone-farm`
4. Root directory: `backend`

### 2.2 Services যোগ করো

Railway dashboard থেকে:

**PostgreSQL যোগ করো:**
```
+ New → Database → PostgreSQL
```
Auto-generate হবে: `DATABASE_URL`

**Redis যোগ করো:**
```
+ New → Database → Redis
```
Auto-generate হবে: `REDIS_URL`

### 2.3 Backend Environment Variables

Railway → backend service → Variables tab:

```
NODE_ENV=production
PORT=4000

# Auto থেকে copy করো:
DATABASE_URL=${{Postgres.DATABASE_URL}}
REDIS_URL=${{Redis.REDIS_URL}}

# নিজে set করো:
JWT_SECRET=আমার_খুব_লম্বা_গোপন_key_2024
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=strongpassword123
FRONTEND_URL=https://your-app.vercel.app

# Android settings:
ANDROID_IMAGES_PATH=/android/images
MAX_EMULATORS=10
WORKER_CONCURRENCY=3
AUTO_RESTART=true

# Puppeteer:
PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true
PUPPETEER_EXECUTABLE_PATH=/usr/bin/google-chrome-stable
```

### 2.4 Railway Deploy Settings

Railway → backend → Settings:

```
Build Command:  npm install && npm run db:push && npm run db:seed
Start Command:  node src/index.js
Root Directory: backend
```

### 2.5 Deploy!

**Deploy** button চাপো।  
Deploy হলে URL পাবে: `https://real-phone-farm-backend.up.railway.app`

---

## ধাপ ৩ — Vercel Frontend Deploy

### 3.1 Vercel এ যাও

1. **vercel.com** → Continue with GitHub
2. **Add New Project**
3. Repository: `real-phone-farm` import করো
4. **Root Directory**: `frontend` (⚠️ গুরুত্বপূর্ণ)
5. **Framework**: Next.js (auto-detect হবে)

### 3.2 Vercel Environment Variables

Vercel → Project → Settings → Environment Variables:

```
NEXT_PUBLIC_API_URL  = https://[তোমার-railway-url].up.railway.app
NEXT_PUBLIC_WS_URL   = https://[তোমার-railway-url].up.railway.app
NEXT_PUBLIC_APP_NAME = PhoneFarmOS
```

### 3.3 Deploy!

**Deploy** চাপো।  
URL পাবে: `https://your-app.vercel.app`

---

## ধাপ ৪ — Railway Backend URL Vercel কে দাও

1. Vercel → Settings → Environment Variables
2. `NEXT_PUBLIC_API_URL` = Railway backend URL
3. **Redeploy** করো

---

## ধাপ ৫ — Android Emulator Setup

> ⚠️ এটা সবচেয়ে গুরুত্বপূর্ণ ধাপ। Real Android VM চালাতে হলে।

### Option A: Railway (সরাসরি KVM)

Railway Pro plan নিলে KVM পাওয়া যায়:

```bash
# Railway terminal থেকে:
# Android-x86 image download করো
wget https://sourceforge.net/projects/android-x86/files/Release%209.0/android-x86_64-9.0-r2.iso

# Base disk image তৈরি করো
qemu-img create -f qcow2 /android/base/android-x86-9.0.img 8G

# Android install করো (একবার)
qemu-system-x86_64 \
  -enable-kvm -m 2048 -smp 2 \
  -hda /android/base/android-x86-9.0.img \
  -cdrom android-x86_64-9.0-r2.iso \
  -boot d -nographic \
  -net user
```

### Option B: DigitalOcean Droplet ($12/mo)

1. DigitalOcean → Create Droplet
   - OS: Ubuntu 22.04
   - Size: 4GB RAM, 2 vCPU ($24/mo recommended)
   - Enable: KVM acceleration ✓
2. SSH করো (SSH app মোবাইলে: **Termius**)
3. Docker install করো:
   ```bash
   curl -fsSL https://get.docker.com | sh
   ```
4. Repository clone করো:
   ```bash
   git clone https://github.com/YOUR/real-phone-farm.git
   cd real-phone-farm
   cp backend/.env.example backend/.env
   # .env edit করো
   nano backend/.env
   docker-compose up -d
   ```

### Option C: Puppeteer Only (KVM ছাড়া) ✅

Real Android VM না থাকলেও Puppeteer দিয়ে web-based farming চলবে:

- YouTube, Swagbucks web version → Puppeteer automation
- Dashboard সব কিছু দেখাবে
- ADB features disabled থাকবে (phone screen stream নেই)

---

## ধাপ ৬ — প্রথমবার Login

1. Browser এ যাও: `https://your-app.vercel.app`
2. Dashboard দেখা যাবে
3. **Farm Control** → **+ Add Phones** চাপো
4. Phone count, RAM, CPU set করো
5. **Create** চাপো

**Backend log দেখতে:**
```
Railway → backend → Deployments → View logs
```

---

## ধাপ ৭ — Real Phone Screen দেখতে

প্রতিটি phone card এ ক্লিক করলে:
- Live Android screen দেখা যাবে (WebRTC)
- Tap/swipe করা যাবে
- Text type করা যাবে
- যেকোনো app launch করা যাবে

---

## 💰 Cost Breakdown

| Service | Plan | Cost |
|---------|------|------|
| Vercel | Free | $0/mo |
| Railway PostgreSQL | Free tier | $0/mo |
| Railway Redis | Free tier | $0/mo |
| Railway Backend | Starter | $5/mo |
| **Total (basic)** | | **$5/mo** |
| Railway Backend (10 VMs) | Pro | $20-50/mo |
| DigitalOcean 4GB Droplet | | $24/mo |

---

## 🔧 সমস্যা হলে

### Backend connect হচ্ছে না?
```
Railway → backend → Logs চেক করো
CORS error হলে: FRONTEND_URL সঠিক দিয়েছ কিনা দেখো
```

### Database error?
```
Railway → backend → Variables
DATABASE_URL সঠিক আছে কিনা দেখো
```

### Android VM boot হচ্ছে না?
```
KVM available কিনা দেখো:
ls -la /dev/kvm

না থাকলে Puppeteer-only mode ব্যবহার করো
```

### WebRTC screen দেখা যাচ্ছে না?
```
- wrtc package install হয়েছে কিনা দেখো
- VNC port (5900+) open আছে কিনা দেখো
- Railway → Settings → Networking → Port expose করো
```

---

## 📱 মোবাইলে ব্যবহারের টিপস

- **Chrome** বা **Firefox** ব্যবহার করো
- **Desktop mode** চালু রাখো dashboard এ
- Phone screen tap করতে → finger দিয়ে tap করো
- Swipe → finger slide করো
- Keyboard input → input field এ tap করে type করো

---

## Quick Reference URLs

| কী | URL |
|----|-----|
| Dashboard | https://your-app.vercel.app |
| Farm | https://your-app.vercel.app/farm |
| Tasks | https://your-app.vercel.app/tasks |
| Accounts | https://your-app.vercel.app/accounts |
| Analytics | https://your-app.vercel.app/analytics |
| API Health | https://your-backend.railway.app/health |
| API Docs | https://your-backend.railway.app/api/devices |
