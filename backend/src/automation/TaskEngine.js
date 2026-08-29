'use strict';
const Bull   = require('bull');
const { prisma } = require('../db/client');
const EmulatorManager = require('../emulator/EmulatorManager');

const scripts = {
  youtube:      () => require('./scripts/youtube'),
  swagbucks:    () => require('./scripts/swagbucks'),
  honeygain:    () => require('./scripts/honeygain'),
  mistplay:     () => require('./scripts/mistplay'),
  inboxdollars: () => require('./scripts/inboxdollars'),
  rakuten:      () => require('./scripts/rakuten'),
  surveytime:   () => require('./scripts/surveytime'),
  cashapp:      () => require('./scripts/cashapp'),
};

class TaskEngine {
  constructor() { this.queue = null; this.running = new Map(); }

  async init() {
    const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
    this.queue = new Bull('pfarm', redisUrl, {
      defaultJobOptions: { attempts:3, backoff:{ type:'exponential', delay:5000 }, removeOnComplete:100, removeOnFail:50 },
    });
    this.queue.process('*', parseInt(process.env.WORKER_CONCURRENCY)||5, this._run.bind(this));
    this.queue.on('completed', (job, result) => this._onDone(job, result));
    this.queue.on('failed',    (job, err)    => this._onFail(job, err));
    this.queue.on('progress',  (job, pct)    => { if(global.io) global.io.emit('task:progress', { taskId:job.data.taskId, deviceId:job.data.deviceId, progress:pct }); });
    console.log('[TaskEngine] Ready');
  }

  async addTask(data) {
    const { taskId, deviceId, appKey, action, accountId, proxyId, priority=5, delay=0, config={} } = data;
    return this.queue.add(appKey, { taskId, deviceId, appKey, action, accountId, proxyId, config }, { priority, delay });
  }

  async cancelTask(taskId) {
    const e = this.running.get(taskId);
    if (e) { e.cancelFn?.(); this.running.delete(taskId); }
    const jobs = await this.queue.getJobs(['waiting','active','delayed']);
    await Promise.all(jobs.filter(j => j.data.taskId === taskId).map(j => j.remove()));
    await prisma.task.update({ where:{ id:taskId }, data:{ status:'CANCELLED', completedAt:new Date() } }).catch(() => {});
    return { cancelled:true, taskId };
  }

  async getStats() {
    const [waiting, active, completed, failed, delayed] = await Promise.all([
      this.queue.getWaitingCount(), this.queue.getActiveCount(),
      this.queue.getCompletedCount(), this.queue.getFailedCount(), this.queue.getDelayedCount(),
    ]);
    return { waiting, active, completed, failed, delayed };
  }

  async pause()    { return this.queue?.pause(); }
  async resume()   { return this.queue?.resume(); }
  async shutdown() { return this.queue?.close(); }

  async _run(job) {
    const { taskId, deviceId, appKey, action, accountId, proxyId, config } = job.data;

    await prisma.task.update({ where:{ id:taskId }, data:{ status:'RUNNING', startedAt:new Date() } }).catch(() => {});
    if (global.io) global.io.emit('task:started', { taskId, deviceId, appKey, action });

    const em = EmulatorManager.get(deviceId);
    if (!em)              throw new Error(`Device ${deviceId} not found`);
    if (em.status !== 'running') throw new Error(`Device not running: ${em.status}`);

    let account = accountId ? await prisma.account.findUnique({ where:{ id:accountId } }).catch(() => null) : null;

    if (proxyId) {
      const proxy = await prisma.proxy.findUnique({ where:{ id:proxyId } }).catch(() => null);
      if (proxy && em.adb) await em.adb.setProxy(proxy.host, proxy.port, proxy.username, proxy.password).catch(() => {});
    }

    await em.adb?.unlockScreen().catch(() => {});

    let cancelled = false;
    this.running.set(taskId, { job, cancelFn: () => { cancelled = true; } });

    const progress = async (pct, msg) => {
      await job.progress(pct);
      await prisma.task.update({ where:{ id:taskId }, data:{ progress:pct, statusMessage:msg } }).catch(() => {});
    };

    const ctx = {
      emulator: em, adb: em.adb, account, config,
      progress,
      cancelled: () => cancelled,
      log: msg => console.log(`[Task:${taskId}] ${msg}`),
    };

    const scriptMod = scripts[appKey]?.();
    if (!scriptMod) throw new Error(`No script for: ${appKey}`);
    const fn = scriptMod[action] || scriptMod.default;
    if (!fn) throw new Error(`No action '${action}' in ${appKey}`);

    await progress(5, `Starting ${appKey}/${action}`);
    const result = await fn(ctx);
    await progress(100, 'Done');
    this.running.delete(taskId);

    if (result?.earnings) {
      await prisma.earning.create({ data:{ deviceId, taskId, amount:result.earnings, currency:'USD', appKey, action, earnedAt:new Date() } }).catch(() => {});
      em.metrics.earnings = (em.metrics.earnings || 0) + result.earnings;
    }

    await prisma.task.update({ where:{ id:taskId }, data:{ status:'COMPLETED', completedAt:new Date(), progress:100, earnings:result?.earnings||0 } }).catch(() => {});
    return result;
  }

  async _onDone(job, result) {
    const { taskId, deviceId } = job.data;
    if (global.io) global.io.emit('task:completed', { taskId, deviceId, result });
    await prisma.device.update({ where:{ id:deviceId }, data:{ tasksCompleted:{ increment:1 } } }).catch(() => {});
  }

  async _onFail(job, err) {
    const { taskId, deviceId } = job.data;
    if (global.io) global.io.emit('task:failed', { taskId, deviceId, error:err.message });
    await prisma.task.update({ where:{ id:taskId }, data:{ status:'FAILED', error:err.message, completedAt:new Date() } }).catch(() => {});
  }
}

module.exports = new TaskEngine();
