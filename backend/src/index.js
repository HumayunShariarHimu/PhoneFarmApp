'use strict';
require('dotenv').config();
const express    = require('express');
const http       = require('http');
const { Server } = require('socket.io');
const cors       = require('cors');
const helmet     = require('helmet');
const morgan     = require('morgan');
const compression = require('compression');
const path       = require('path');

const { prisma }      = require('./db/client');
const EmulatorManager = require('./emulator/EmulatorManager');
const TaskEngine      = require('./automation/TaskEngine');
const TaskScheduler   = require('./automation/TaskScheduler');
const socketHandler   = require('./socket/socketHandler');

// Routes
const deviceRoutes    = require('./routes/devices');
const taskRoutes      = require('./routes/tasks');
const { accountRouter, proxyRouter, streamRouter, analyticsRouter } = require('./routes/accounts');

const app    = express();
const server = http.createServer(app);
const io     = new Server(server, {
  cors: { origin: '*', credentials: true },
  transports: ['websocket', 'polling'],
  pingTimeout: 60000,
});

app.set('io', io);
global.io = io;

// Middleware
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors({ origin: '*', credentials: true }));
app.use(compression());
app.use(morgan('dev'));
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ extended: true, limit: '100mb' }));

// Static
app.use('/screenshots', express.static(path.join(__dirname, '../screenshots')));
app.use('/apks',        express.static(path.join(__dirname, '../apks')));

// API Routes
app.use('/api/devices',   deviceRoutes);
app.use('/api/tasks',     taskRoutes);
app.use('/api/accounts',  accountRouter);
app.use('/api/proxies',   proxyRouter);
app.use('/api/stream',    streamRouter);
app.use('/api/analytics', analyticsRouter);

// Health
app.get('/health', async (req, res) => {
  const devices = EmulatorManager.getAll();
  res.json({
    ok: true,
    uptime: Math.floor(process.uptime()),
    devices: devices.length,
    running: devices.filter(d => d.status === 'running').length,
    version: '3.0.0',
    ts: new Date().toISOString(),
  });
});

app.get('/api/settings', async (req, res) => {
  const settings = await prisma.setting.findMany().catch(() => []);
  res.json({ success: true, data: Object.fromEntries(settings.map(s => [s.key, s.value])) });
});

app.use((err, req, res, next) => {
  console.error('[ERR]', err.message);
  res.status(500).json({ success: false, error: err.message });
});

socketHandler(io);

const PORT = parseInt(process.env.PORT) || 4000;
server.listen(PORT, '0.0.0.0', async () => {
  console.log(`\n╔══════════════════════════════╗`);
  console.log(`║  PhoneFarmOS Backend v3.0    ║`);
  console.log(`║  Port: ${PORT}                  ║`);
  console.log(`╚══════════════════════════════╝\n`);
  try {
    await EmulatorManager.init();
    await TaskEngine.init();
    TaskScheduler.start();
    console.log('[✓] All systems ready');
  } catch (e) {
    console.error('[✗] Startup error:', e.message);
  }
});

process.on('SIGTERM', async () => {
  await EmulatorManager.stopAll();
  await prisma.$disconnect();
  server.close(() => process.exit(0));
});

module.exports = { app, server, io };
