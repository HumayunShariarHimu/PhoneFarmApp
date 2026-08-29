'use strict';

const express    = require('express');
const router     = express.Router();
const { prisma } = require('../db/client');
const TaskEngine = require('../automation/TaskEngine');
const EmulatorManager = require('../emulator/EmulatorManager');

// ── GET /api/tasks ────────────────────────────
router.get('/', async (req, res) => {
  try {
    const { status, deviceId, appKey, limit = 50, page = 1 } = req.query;
    const where = {};
    if (status)   where.status   = status.toUpperCase();
    if (deviceId) where.deviceId = deviceId;
    if (appKey)   where.appKey   = appKey;

    const [tasks, total] = await Promise.all([
      prisma.task.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        take: +limit,
        skip:  (+page - 1) * +limit,
        include: { device: { select: { id: true, name: true } } },
      }),
      prisma.task.count({ where }),
    ]);

    const queueStats = await TaskEngine.getStats().catch(() => ({}));

    res.json({ success: true, data: tasks, total, page: +page, queueStats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/tasks ───────────────────────────
router.post('/', async (req, res) => {
  try {
    const {
      name, description, appKey, action, config,
      deviceId, accountId, proxyId, groupId,
      scheduleType, cronExpression, scheduledAt,
      priority = 5, maxRetries = 3, timeout = 300,
    } = req.body;

    if (!appKey)  return res.status(400).json({ success: false, error: 'appKey required' });
    if (!action)  return res.status(400).json({ success: false, error: 'action required' });
    if (!deviceId && !groupId) return res.status(400).json({ success: false, error: 'deviceId or groupId required' });

    // Handle group — create one task per device
    let deviceIds = deviceId ? [deviceId] : [];
    if (groupId) {
      const group = await prisma.deviceGroup.findUnique({
        where: { id: groupId },
        include: { devices: { select: { id: true } } },
      });
      deviceIds = group?.devices.map(d => d.id) || [];
    }

    const createdTasks = [];

    for (const dId of deviceIds) {
      const task = await prisma.task.create({
        data: {
          name: name || `${appKey}/${action}`,
          description,
          appKey,
          action,
          config:   config   || {},
          deviceId: dId,
          accountId,
          proxyId,
          priority,
          maxRetries,
          timeout,
          scheduleType: scheduleType || 'ONCE',
          cronExpression,
          scheduledAt:  scheduledAt ? new Date(scheduledAt) : null,
          status: scheduledAt ? 'SCHEDULED' : 'PENDING',
        },
      });

      // Add to queue (unless scheduled for later)
      if (!scheduledAt || new Date(scheduledAt) <= new Date()) {
        await TaskEngine.addTask({
          taskId:    task.id,
          deviceId:  dId,
          appKey,
          action,
          accountId,
          proxyId,
          priority,
          config: config || {},
        });
        await prisma.task.update({ where: { id: task.id }, data: { status: 'QUEUED' } });
      }

      createdTasks.push(task);
    }

    res.status(201).json({
      success: true,
      data: createdTasks,
      message: `${createdTasks.length} task(s) created`,
    });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/tasks/:id ────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({
      where: { id: req.params.id },
      include: {
        device:  { select: { id: true, name: true } },
        account: { select: { id: true, email: true, platform: true } },
        logs:    { orderBy: { createdAt: 'desc' }, take: 50 },
      },
    });
    if (!task) return res.status(404).json({ success: false, error: 'Task not found' });
    res.json({ success: true, data: task });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── DELETE /api/tasks/:id ─────────────────────
router.delete('/:id', async (req, res) => {
  try {
    await TaskEngine.cancelTask(req.params.id);
    await prisma.task.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Task deleted' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/tasks/:id/cancel ────────────────
router.post('/:id/cancel', async (req, res) => {
  try {
    const result = await TaskEngine.cancelTask(req.params.id);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── POST /api/tasks/:id/retry ─────────────────
router.post('/:id/retry', async (req, res) => {
  try {
    const task = await prisma.task.findUnique({ where: { id: req.params.id } });
    if (!task) return res.status(404).json({ success: false, error: 'Not found' });

    await prisma.task.update({
      where: { id: task.id },
      data: { status: 'QUEUED', progress: 0, error: null, retryCount: { increment: 1 } },
    });
    await TaskEngine.addTask({
      taskId:   task.id,
      deviceId: task.deviceId,
      appKey:   task.appKey,
      action:   task.action,
      config:   task.config || {},
    });

    res.json({ success: true, message: 'Task re-queued' });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ── GET /api/tasks/queue/stats ────────────────
router.get('/queue/stats', async (req, res) => {
  try {
    const stats = await TaskEngine.getStats();
    res.json({ success: true, data: stats });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
