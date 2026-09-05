# ⌬ Virtual Phone Farm v3

> ভার্চুয়াল Android ফোন ফার্ম — Samsung, Xiaomi, Vivo, Realme, Symphony সহ ২০০+ মডেল
> বাস্তব ফোন ফার্মিং এর মতো — tap, swipe, URL open, JS run, batch control

---

## 🎯 এটা কী করে?

```
Browser এ দেখো ─────────────────────────────────────────┐
│  Samsung A54 │  Xiaomi Note 13 │  Symphony Z55 │  ...  │
│  [Live Screen│  [Live Screen]  │  [Live Screen]│       │
│  Tap করো    │  Swipe করো     │  URL open করো│       │
└─────────────────────────────────────────────────────────┘
           ↕ Socket.IO (real-time)
     Backend (Render) ── Puppeteer browser instances
```

প্রতিটা ভার্চুয়াল ফোন = একটা headless Chrome browser
- Real website দেখায় (live screenshot streaming)
- Click করলে → Puppeteer tap করে
- Swipe করলে → Puppeteer swipe করে
- URL দিলে → সেই site opens
- Batch: সব ফোনে একসাথে একই কাজ

---

## 🚀 Deploy — মোবাইল থেকে (৫ ধাপ)

### ধাপ ১ — GitHub Repo তৈরি ও Upload

1. **github.com** → New Repository → `virtual-phone-farm`
2. ZIP extract করো
3. **frontend/** ও **backend/** ফোল্ডার আলাদাভাবে upload করো
   - Add file → Upload files → Drag & Drop করো

### ধাপ ২ — Render এ Backend Deploy

1. **render.com** → New → Web Service
2. GitHub: `virtual-phone-farm` → Root: `backend`
3. Build: `npm install`
4. Start: `node index.js`
5. Environment Variables:
   ```
   PORT          = 4000
   NODE_ENV      = production
   MAX_ACTIVE    = 3
   ```
6. **Deploy** → URL পাবে: `https://vpfarm-backend.onrender.com`

> ⚠️ Render Free tier এ Puppeteer chromium automatically install হবে।
> যদি না হয়, environment variable দাও:
> `PUPPETEER_EXEC = /usr/bin/google-chrome-stable`

### ধাপ ৩ — Vercel এ Frontend Deploy

1. **vercel.com** → Add New Project
2. GitHub: `virtual-phone-farm` → Root: `frontend`
3. Framework: **Next.js**
4. Environment Variables:
   ```
   NEXT_PUBLIC_API_URL = https://vpfarm-backend.onrender.com
   NEXT_PUBLIC_WS_URL  = https://vpfarm-backend.onrender.com
   ```
5. **Deploy** → URL পাবে: `https://vpfarm.vercel.app`

### ধাপ ৪ — Render এ Backend URL Update

Render → backend → Environment → যোগ করো:
```
FRONTEND_URL = https://vpfarm.vercel.app
```
Redeploy করো।

### ধাপ ৫ — ব্যবহার শুরু!

1. `https://vpfarm.vercel.app` খোলো
2. **＋ Add** → Brand বাছো → Model → Count → Add
3. Device card এ ক্লিক করো → Full screen control
4. যেকোনো website open করো
5. Tap, swipe, type করো

---

## 📱 ফোন মডেল সমূহ

| Brand | মডেল সংখ্যা |
|-------|-------------|
| Samsung | Galaxy S24, A55, M55, Note 20 সহ ৩০+ |
| Xiaomi/Redmi/POCO | Note 13 Pro+, F5, X6 সহ ৩০+ |
| Vivo | V30, Y200, X100 সহ ১৬+ |
| Realme | GT 6, 13 Pro+, C67 সহ ১৮+ |
| Symphony | Z60, H200, E78, V142 সহ ২০+ |
| OPPO | Reno 12, Find X7 সহ ১১+ |
| OnePlus | 12, Nord 4 সহ ৮+ |
| Google Pixel | 9 Pro, 8, 7a সহ ৯+ |
| Motorola | Edge 50, G84 সহ ৯+ |
| Tecno | Camon 30, Spark 20 সহ ৮+ |
| Infinix | Note 40, Hot 40 সহ ৮+ |
| itel, Nokia | বিভিন্ন মডেল |
| **মোট** | **২০০+ মডেল** |

---

## ⚡ Features

### Device Grid
- সব ভার্চুয়াল ফোন একসাথে দেখা
- Live screenshot প্রতি ৮০০ms
- Brand/Status/Search filter
- Grid/Compact view

### Device Control (ক্লিক করলে full screen)
- **Tap** — স্ক্রিনে যেকোনো জায়গায় click
- **Double Tap** — দুইবার click
- **Long Press** — right-click করো
- **Swipe** — touch drag করো
- **Type** — কীবোর্ড type
- **URL bar** — যেকোনো website open
- **Back/Forward/Reload**
- **Scroll Up/Down**
- **Quick apps** — YouTube, Instagram, TikTok, etc.

### Batch Operations
- সব ফোনে একই URL open
- সব ফোনে একই text type
- সব ফোনে JS code চালাও
- Start All / Stop All / Remove All

### Device Management
- Brand + Model + Android version বেছে add করো
- Groups (Group A, Group B, etc.)
- ১-২০টা একসাথে add করো

---

## ⚠️ Free Tier সীমাবদ্ধতা

| বিষয় | Render Free |
|-------|-------------|
| একসাথে active ফোন | ৩টা (RAM limit) |
| RAM | 512MB |
| Sleep after | ১৫ মিনিট idle |
| Screenshot delay | ~800ms |

**Render sleep problem solution:**
UptimeRobot (free) দিয়ে প্রতি ৫ মিনিটে ping করো:
- uptimerobot.com → New Monitor
- URL: `https://vpfarm-backend.onrender.com/health`
- Interval: 5 minutes

**বেশি ফোন চাইলে:**
Render Pro ($7/mo) → 1GB RAM → ৫-৬টা active
Render Standard ($25/mo) → 2GB RAM → ১০-১৫টা active

---

## 🔧 Technical Stack

```
Frontend:  Next.js 14 → Vercel (Free)
Backend:   Node.js + Express → Render (Free)
Real-time: Socket.IO (WebSocket)
Phones:    Puppeteer (headless Chrome)
Screen:    JPEG screenshot stream (base64)
```

---

## 📞 সমস্যা হলে

**Backend connect হচ্ছে না:**
- Render logs চেক করো
- CORS error → FRONTEND_URL ঠিক আছে কিনা দেখো

**Phone screen দেখা যাচ্ছে না:**
- Phone start করো (▶ Start বোতাম)
- Render এ Puppeteer install হয়েছে কিনা logs দেখো

**Queued দেখাচ্ছে:**
- Free tier এ max ৩টা active — স্বাভাবিক
- বেশি চাইলে Render Pro নাও
