'use strict';

const express = require('express');
const router  = express.Router();
const multer  = require('multer');
const path    = require('path');
const fs      = require('fs');

const EmulatorManager = require('../emulator/EmulatorManager');
const { prisma }      = require('../db/client');
const TaskEngine      = require('../automation/TaskEngine');

const apkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../../apks');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => cb(null, `${Date.now()}_${file.originalname}`),
});
const upload = multer({ storage: apkStorage, limits: { fileSize: 500 * 1024 * 1024 } }); // 500MB

// ── GET /api/devices — List all devices ─────
router.get('/', async (req, res) => {
  try {
    const { status, group, search, limit = 200, page = 1 } = req.query;
    const running = EmulatorManager.getAll();

    // Merge live metrics with DB data
    let devices = running.map(em => ({
      ...em,
      dbStatus: em.status,
    }));

    // Apply filters
    if (status)  devices = devices.filter(d => d.status === status.toUpperCase() || d.status === status);
    if (search) {
      const q = search.toLowerCase();
      devices = devices.filter(d => d.name?.toLowerCase().includes(q) || d.id.includes(q));
    }

    const total = devices.length;
    const paged = devices.slice((page - 1) * limit, page * limit);

    // Stats
    const stats = {
      total:   running.length,
      running: running.filter(d => d.status === 'running').length,
      stopped: running.filter(d => d.status === 'stopped').length,
      error:   running.filter(d => d.status === 'error').length,
      totalEarnings: running.reduce((s, d) => s + (d.metrics?.earnings || 0), 0),
    };

    res.json({ success: true, data: paged, stats, total, page: +page, limit: +limit });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/devices — Create emulator ─────
router.post('/', async (req, res) => {
  try {
    const { name, ram, cpus, androidVersion, count = 1, groupId, proxyId } = req.body;
    const created = [];

    for (let i = 0; i < Math.min(count, 50); i++) {
      const em = await EmulatorManager.create({
        name: count > 1 ? `${name || 'Phone'} ${i + 1}` : (name || 'Phone'),
        ram:  parseInt(ram)  || 2048,
        cpus: parseInt(cpus) || 2,
        androidVersion: androidVersion || '9',
      });
      created.push(em);
    }

    res.status(201).json({ success: true, data: created, message: `${created.length} device(s) created` });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/devices/:id ─────────────────────
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const em = EmulatorManager.get(id);
    if (!em) return res.status(404).json({ success: false, error: 'Device not found' });

    // Get metrics
    const metrics = await EmulatorManager.getMetrics(id);

    // Get recent tasks
    const tasks = await prisma.task.findMany({
      where: { deviceId: id },
      orderBy: { createdAt: 'desc' },
      take: 10,
    }).catch(() => []);

    // Get recent earnings
    const earnings = await prisma.earning.findMany({
      where: { deviceId: id },
      orderBy: { earnedAt: 'desc' },
      take: 20,
    }).catch(() => []);

    // Get installed apps
    const installedApps = await prisma.installedApp.findMany({
      where: { deviceId: id },
    }).catch(() => []);

    // Get screenshots
    const screenshots = await prisma.screenshot.findMany({
      where: { deviceId: id },
      orderBy: { takenAt: 'desc' },
      take: 10,
    }).catch(() => []);

    res.json({
      success: true,
      data: { ...EmulatorManager._serialize ? EmulatorManager._serialize(em) : em,
              metrics, tasks, earnings, installedApps, screenshots },
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/devices/:id ──────────────────
router.delete('/:id', async (req, res) => {
  try {
    await EmulatorManager.stop(req.params.id);
    await prisma.device.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    }).catch(() => {});
    res.json({ success: true, message: 'Device stopped and removed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/devices/:id/action ─────────────
router.post('/:id/action', async (req, res) => {
  const { id } = req.params;
  const { action, ...params } = req.body;

  try {
    const em = EmulatorManager.get(id);
    if (!em) return res.status(404).json({ success: false, error: 'Device not found' });

    let result;

    switch (action) {
      case 'start':
        result = await EmulatorManager.create({ id, name: em.name });
        break;
      case 'stop':
        result = await EmulatorManager.stop(id);
        break;
      case 'restart':
        result = await EmulatorManager.restart(id);
        break;
      case 'tap':
        result = await EmulatorManager.tap(id, params.x, params.y);
        break;
      case 'swipe':
        result = await EmulatorManager.swipe(id, params.x1, params.y1, params.x2, params.y2, params.duration);
        break;
      case 'type':
        result = await EmulatorManager.typeText(id, params.text);
        break;
      case 'keyevent':
        result = await em.adb.pressKey(params.keycode);
        break;
      case 'back':
        result = await em.adb.pressBack();
        break;
      case 'home':
        result = await em.adb.pressHome();
        break;
      case 'screenshot':
        result = await EmulatorManager.screenshot(id);
        break;
      case 'shell':
        if (!params.command) return res.status(400).json({ success: false, error: 'command required' });
        result = await em.adb.exec(params.command);
        break;
      case 'launch_app':
        result = await em.adb.launchApp(params.packageName, params.activity);
        break;
      case 'stop_app':
        result = await em.adb.stopApp(params.packageName);
        break;
      case 'clear_app':
        result = await em.adb.clearAppData(params.packageName);
        break;
      case 'open_url':
        result = await em.adb.openUrl(params.url);
        break;
      case 'set_proxy':
        result = await em.adb.setProxy(params.host, params.port, params.username, params.password);
        break;
      case 'clear_proxy':
        result = await em.adb.clearProxy();
        break;
      case 'set_location':
        result = await em.adb.setMockLocation(params.lat, params.lng);
        break;
      case 'set_wifi':
        result = await em.adb.setWifiEnabled(params.enabled !== false);
        break;
      case 'reboot':
        result = await em.adb.reboot();
        break;
      case 'unlock':
        result = await em.adb.unlockScreen();
        break;
      default:
        return res.status(400).json({ success: false, error: `Unknown action: ${action}` });
    }

    res.json({ success: true, data: result, action });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/devices/:id/install ─────────────
router.post('/:id/install', upload.single('apk'), async (req, res) => {
  const { id } = req.params;
  try {
    if (!req.file && !req.body.apkPath) {
      return res.status(400).json({ success: false, error: 'APK file or path required' });
    }
    const apkPath = req.file?.path || req.body.apkPath;
    const result  = await EmulatorManager.installApk(id, apkPath);
    res.json({ success: true, data: result, message: 'APK installed' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/devices/:id/apps ─────────────────
router.get('/:id/apps', async (req, res) => {
  try {
    const em = EmulatorManager.get(req.params.id);
    if (!em?.adb) return res.status(404).json({ success: false, error: 'Device not available' });
    const apps = await em.adb.getInstalledApps();
    res.json({ success: true, data: apps });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/devices/:id/screenshot ──────────
router.get('/:id/screenshot', async (req, res) => {
  try {
    const result = await EmulatorManager.screenshot(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/devices/:id/logs ─────────────────
router.get('/:id/logs', async (req, res) => {
  try {
    const logs = await prisma.deviceLog.findMany({
      where: { deviceId: req.params.id },
      orderBy: { createdAt: 'desc' },
      take: parseInt(req.query.limit) || 100,
    });
    res.json({ success: true, data: logs });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/devices/start-all ───────────────
router.post('/batch/start-all', async (req, res) => {
  try {
    EmulatorManager.getAll().forEach(em => {
      if (em.status === 'stopped') EmulatorManager.create({ id: em.id, name: em.name }).catch(() => {});
    });
    res.json({ success: true, message: 'Starting all devices' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/devices/stop-all ────────────────
router.post('/batch/stop-all', async (req, res) => {
  try {
    await EmulatorManager.stopAll();
    res.json({ success: true, message: 'All devices stopped' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/devices/batch-action ────────────
router.post('/batch/action', async (req, res) => {
  const { deviceIds, action, params = {} } = req.body;
  try {
    const results = await Promise.allSettled(
      deviceIds.map(id => {
        const em = EmulatorManager.get(id);
        if (!em?.adb) return Promise.reject(new Error('Not available'));
        switch (action) {
          case 'tap':       return em.adb.tap(params.x, params.y);
          case 'launch_app':return em.adb.launchApp(params.packageName);
          case 'stop_app':  return em.adb.stopApp(params.packageName);
          case 'open_url':  return em.adb.openUrl(params.url);
          case 'reboot':    return em.adb.reboot();
          default:          return Promise.reject(new Error(`Unknown: ${action}`));
        }
      })
    );
    res.json({
      success:  true,
      results:  results.map((r, i) => ({ deviceId: deviceIds[i], ok: r.status === 'fulfilled' })),
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
