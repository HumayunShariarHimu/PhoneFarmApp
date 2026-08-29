'use strict';
const cron       = require('node-cron');
const { prisma } = require('../db/client');
const TaskEngine = require('./TaskEngine');

class TaskScheduler {
  constructor() { this.jobs = new Map(); }

  start() {
    // Every minute: check for scheduled tasks
    cron.schedule('* * * * *', () => this._checkScheduled());
    // Every 5min: retry failed tasks
    cron.schedule('*/5 * * * *', () => this._retryFailed());
    console.log('[Scheduler] Started');
  }

  async _checkScheduled() {
    try {
      const due = await prisma.task.findMany({
        where: {
          status: 'SCHEDULED',
          scheduledAt: { lte: new Date() },
        },
      });
      for (const task of due) {
        await TaskEngine.addTask({
          taskId: task.id, deviceId: task.deviceId,
          appKey: task.appKey, action: task.action,
          config: task.config || {},
        });
        await prisma.task.update({ where: { id: task.id }, data: { status: 'QUEUED' } });
        console.log(`[Scheduler] Queued scheduled task: ${task.id}`);
      }
    } catch (e) { console.error('[Scheduler] Check error:', e.message); }
  }

  async _retryFailed() {
    try {
      const failed = await prisma.task.findMany({
        where: { status: 'FAILED', retryCount: { lt: prisma.task.fields.maxRetries } },
        take: 10,
      });
      for (const task of failed) {
        if (task.retryCount < task.maxRetries) {
          await TaskEngine.addTask({
            taskId: task.id, deviceId: task.deviceId,
            appKey: task.appKey, action: task.action,
            config: task.config || {},
          });
          await prisma.task.update({
            where: { id: task.id },
            data: { status: 'QUEUED', retryCount: { increment: 1 } },
          });
        }
      }
    } catch (e) {}
  }
}

module.exports = new TaskScheduler();
