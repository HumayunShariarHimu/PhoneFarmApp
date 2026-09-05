'use strict';
require('dotenv').config();
const express     = require('express');
const http        = require('http');
const { Server }  = require('socket.io');
const cors        = require('cors');
const compression = require('compression');
const path        = require('path');

const { DevicePool } = require('./src/DevicePool');
const socketHandler  = require('./src/socket');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors:         { origin: '*', credentials: true },
  transports:   ['websocket', 'polling'],
  pingTimeout:  60000,
  maxHttpBufferSize: 5e6,
});

global.io = io;

app.use(cors({ origin: '*', credentials: true }));
app.use(compression());
app.use(express.json({ limit: '20mb' }));

const pool = new DevicePool();

// ── REST API ──────────────────────────────
app.get('/api/devices', (req, res) => {
  res.json({ success: true, data: pool.getAllJSON(), stats: pool.getStats() });
});

app.post('/api/devices', async (req, res) => {
  try {
    const { count = 1, devices, ...opts } = req.body;
    if (devices && Array.isArray(devices)) {
      const created = await pool.addMany(devices);
      return res.json({ success: true, data: created.map(d => d.toJSON()) });
    }
    const list = Array.from({ length: Math.min(count, 20) }, (_, i) => ({
      ...opts,
      name: count > 1 ? `${opts.name || opts.brand || 'Device'} ${String(pool.devices.size + i + 1).padStart(3,'0')}` : opts.name,
    }));
    const created = await pool.addMany(list);
    res.json({ success: true, data: created.map(d => d.toJSON()) });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/devices/:id', (req, res) => {
  const dev = pool.get(req.params.id);
  if (!dev) return res.status(404).json({ success: false, error: 'Not found' });
  res.json({ success: true, data: dev.toJSON() });
});

app.delete('/api/devices/:id', async (req, res) => {
  await pool.remove(req.params.id).catch(() => {});
  res.json({ success: true });
});

app.post('/api/devices/:id/action', async (req, res) => {
  try {
    const result = await pool.action(req.params.id, req.body.action, req.body);
    res.json({ success: true, data: result });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/devices/:id/goto', async (req, res) => {
  try {
    const url = await pool.action(req.params.id, 'goto', req.body);
    res.json({ success: true, data: { url } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.get('/api/devices/:id/screenshot', async (req, res) => {
  try {
    const frame = await pool.action(req.params.id, 'screenshot');
    res.json({ success: true, data: { frame } });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/batch', async (req, res) => {
  try {
    const { ids, action, params } = req.body;
    const results = await pool.batch(ids, action, params || {});
    res.json({
      success: true,
      results: results.map((r, i) => ({ id: ids[i], ok: r.status === 'fulfilled', value: r.value })),
    });
  } catch (e) { res.status(500).json({ success: false, error: e.message }); }
});

app.post('/api/farm/start-all',  async (req, res) => { await pool.startAll();  res.json({ success: true }); });
app.post('/api/farm/stop-all',   async (req, res) => { await pool.stopAll();   res.json({ success: true }); });
app.post('/api/farm/remove-all', async (req, res) => { await pool.removeAll(); res.json({ success: true }); });

app.get('/api/stats', (req, res) => res.json({ success: true, data: pool.getStats() }));
app.get('/health',    (req, res) => res.json({ ok: true, uptime: Math.floor(process.uptime()), devices: pool.getStats() }));

// ── FRONTEND (static) ─────────────────────
const PUBLIC = path.join(__dirname, 'public');
const fs = require('fs');
if (fs.existsSync(PUBLIC)) {
  app.use(express.static(PUBLIC));
  app.get('*', (req, res) => res.sendFile(path.join(PUBLIC, 'index.html')));
}

socketHandler(io, pool);

const PORT = parseInt(process.env.PORT) || 4000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n╔══════════════════════════════╗`);
  console.log(`║  Virtual Phone Farm v3       ║`);
  console.log(`║  API Port: ${PORT}              ║`);
  console.log(`╚══════════════════════════════╝\n`);
});

process.on('SIGTERM', async () => {
  await pool.stopAll();
  server.close(() => process.exit(0));
});
