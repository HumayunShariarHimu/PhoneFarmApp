'use strict';
const express    = require('express');
const bcrypt     = require('bcryptjs');
const { prisma } = require('../db/client');
const WebRTCBridge    = require('../emulator/WebRTCBridge');
const EmulatorManager = require('../emulator/EmulatorManager');

// ════════════════════════════════════════════
//  ACCOUNTS ROUTER
// ════════════════════════════════════════════
const accountRouter = express.Router();

accountRouter.get('/', async (req, res) => {
  try {
    const { platform, status, search, limit = 100, page = 1 } = req.query;
    const where = { deletedAt: null };
    if (platform) where.platform = platform;
    if (status)   where.status   = status.toUpperCase();
    if (search)   where.OR = [{ email: { contains: search } }, { username: { contains: search } }];

    const [accounts, total] = await Promise.all([
      prisma.account.findMany({
        where, orderBy: { createdAt: 'desc' },
        take: +limit, skip: (+page - 1) * +limit,
        select: {
          id: true, name: true, email: true, username: true,
          platform: true, status: true, balance: true, points: true,
          currency: true, totalEarned: true, loginCount: true,
          lastLoginAt: true, createdAt: true, tags: true,
          _count: { select: { devices: true, tasks: true } },
        },
      }),
      prisma.account.count({ where }),
    ]);
    res.json({ success: true, data: accounts, total, page: +page });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

accountRouter.post('/', async (req, res) => {
  try {
    const { email, username, password, platform, name, notes, tags } = req.body;
    if (!email || !password || !platform)
      return res.status(400).json({ success: false, error: 'email, password, platform required' });

    const hashed = await bcrypt.hash(password, 10);
    const account = await prisma.account.create({
      data: { email, username, password: hashed, platform, name, notes, tags: tags || [] },
    });
    res.status(201).json({ success: true, data: { ...account, password: undefined } });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Account already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

accountRouter.get('/:id', async (req, res) => {
  try {
    const account = await prisma.account.findUnique({
      where: { id: req.params.id },
      include: { earnings: { orderBy: { earnedAt: 'desc' }, take: 20 } },
    });
    if (!account) return res.status(404).json({ success: false, error: 'Not found' });
    res.json({ success: true, data: { ...account, password: undefined, sessionData: undefined } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

accountRouter.patch('/:id', async (req, res) => {
  try {
    const { password, ...rest } = req.body;
    const data = { ...rest };
    if (password) data.password = await bcrypt.hash(password, 10);
    const updated = await prisma.account.update({ where: { id: req.params.id }, data });
    res.json({ success: true, data: { ...updated, password: undefined } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

accountRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.account.delete({ where: { id: req.params.id } });
    res.json({ success: true, message: 'Account deleted' });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Bulk import
accountRouter.post('/import', async (req, res) => {
  try {
    const { accounts } = req.body;
    if (!Array.isArray(accounts)) return res.status(400).json({ success: false, error: 'accounts array required' });
    const results = { created: 0, skipped: 0, errors: [] };
    for (const acc of accounts) {
      try {
        const hashed = await bcrypt.hash(acc.password || 'changeme', 10);
        await prisma.account.create({ data: { ...acc, password: hashed, tags: acc.tags || [] } });
        results.created++;
      } catch (e) {
        if (e.code === 'P2002') results.skipped++;
        else results.errors.push({ email: acc.email, error: e.message });
      }
    }
    res.json({ success: true, data: results });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ════════════════════════════════════════════
//  PROXIES ROUTER
// ════════════════════════════════════════════
const proxyRouter = express.Router();

proxyRouter.get('/', async (req, res) => {
  try {
    const { status, protocol, country, limit = 200, page = 1 } = req.query;
    const where = {};
    if (status)   where.status   = status.toUpperCase();
    if (protocol) where.protocol = protocol.toUpperCase();
    if (country)  where.country  = { contains: country, mode: 'insensitive' };

    const [proxies, total] = await Promise.all([
      prisma.proxy.findMany({
        where, orderBy: { latency: 'asc' },
        take: +limit, skip: (+page - 1) * +limit,
        include: { _count: { select: { devices: true } } },
      }),
      prisma.proxy.count({ where }),
    ]);
    res.json({ success: true, data: proxies, total, page: +page });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

proxyRouter.post('/', async (req, res) => {
  try {
    const { host, port, protocol, username, password, country, city, countryCode, provider, name, tags } = req.body;
    if (!host || !port) return res.status(400).json({ success: false, error: 'host and port required' });
    const proxy = await prisma.proxy.create({
      data: { host, port: +port, protocol: (protocol || 'HTTP').toUpperCase(), username, password, country, city, countryCode, provider, name, tags: tags || [] },
    });
    res.status(201).json({ success: true, data: proxy });
  } catch (err) {
    if (err.code === 'P2002') return res.status(409).json({ success: false, error: 'Proxy already exists' });
    res.status(500).json({ success: false, error: err.message });
  }
});

proxyRouter.delete('/:id', async (req, res) => {
  try {
    await prisma.proxy.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Test a proxy
proxyRouter.post('/:id/test', async (req, res) => {
  try {
    const proxy = await prisma.proxy.findUnique({ where: { id: req.params.id } });
    if (!proxy) return res.status(404).json({ success: false, error: 'Not found' });

    const start = Date.now();
    let ok = false, latency = null, error = null;

    try {
      const { SocksProxyAgent } = require('socks-proxy-agent');
      const fetch = require('node-fetch');
      const agent = proxy.protocol.startsWith('SOCKS')
        ? new SocksProxyAgent(`socks5://${proxy.username ? proxy.username + ':' + proxy.password + '@' : ''}${proxy.host}:${proxy.port}`)
        : null;

      const resp = await Promise.race([
        fetch('https://api.ipify.org?format=json', { agent, timeout: 10000 }),
        new Promise((_, rej) => setTimeout(() => rej(new Error('Timeout')), 10000)),
      ]);
      latency = Date.now() - start;
      ok = resp.ok;
    } catch (e) {
      error = e.message;
    }

    const status = ok ? (latency < 500 ? 'ACTIVE' : 'SLOW') : 'FAILED';
    await prisma.proxy.update({
      where: { id: proxy.id },
      data: { status, latency, lastTestedAt: new Date(), lastError: error },
    });

    res.json({ success: true, data: { ok, latency, status, error } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Test all proxies
proxyRouter.post('/test-all', async (req, res) => {
  try {
    const proxies = await prisma.proxy.findMany({ where: { status: { not: 'BANNED' } } });
    res.json({ success: true, message: `Testing ${proxies.length} proxies in background` });
    // Test in background
    for (const proxy of proxies) {
      const start = Date.now();
      try {
        const fetch = require('node-fetch');
        await fetch('https://api.ipify.org?format=json', { timeout: 8000 });
        await prisma.proxy.update({
          where: { id: proxy.id },
          data: { status: 'ACTIVE', latency: Date.now() - start, lastTestedAt: new Date() },
        });
      } catch (e) {
        await prisma.proxy.update({
          where: { id: proxy.id },
          data: { status: 'FAILED', lastTestedAt: new Date(), lastError: e.message },
        });
      }
      await new Promise(r => setTimeout(r, 200));
    }
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// Bulk import proxies (host:port:user:pass format)
proxyRouter.post('/import', async (req, res) => {
  try {
    const { lines, protocol = 'HTTP', country } = req.body;
    const parsed = (lines || '').split('\n').filter(Boolean).map(line => {
      const parts = line.trim().split(':');
      return { host: parts[0], port: +parts[1] || 8080, username: parts[2] || null, password: parts[3] || null, protocol: protocol.toUpperCase(), country };
    }).filter(p => p.host);

    let created = 0, skipped = 0;
    for (const p of parsed) {
      try {
        await prisma.proxy.create({ data: p });
        created++;
      } catch (e) { if (e.code === 'P2002') skipped++; }
    }
    res.json({ success: true, data: { created, skipped, total: parsed.length } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ════════════════════════════════════════════
//  STREAM ROUTER (WebRTC Signaling)
// ════════════════════════════════════════════
const streamRouter = express.Router();

streamRouter.post('/offer', async (req, res) => {
  try {
    const { deviceId } = req.body;
    const em = EmulatorManager.get(deviceId);
    if (!em) return res.status(404).json({ success: false, error: 'Device not found' });
    if (em.status !== 'running') return res.status(400).json({ success: false, error: `Device is ${em.status}` });

    const { peerId, offer } = await WebRTCBridge.createOffer(deviceId, em.vncPort);
    res.json({ success: true, data: { peerId, offer } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

streamRouter.post('/answer', async (req, res) => {
  try {
    const { peerId, answer } = req.body;
    if (!peerId || !answer) return res.status(400).json({ success: false, error: 'peerId and answer required' });
    await WebRTCBridge.processAnswer(peerId, answer);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

streamRouter.post('/ice', async (req, res) => {
  try {
    const { peerId, candidate } = req.body;
    await WebRTCBridge.addIceCandidate(peerId, candidate);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

streamRouter.delete('/:peerId', async (req, res) => {
  try {
    WebRTCBridge.closePeer(req.params.peerId);
    res.json({ success: true });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

// ════════════════════════════════════════════
//  ANALYTICS ROUTER
// ════════════════════════════════════════════
const analyticsRouter = express.Router();

analyticsRouter.get('/overview', async (req, res) => {
  try {
    const [totalEarnings, totalTasks, totalDevices, totalAccounts, recentEarnings] = await Promise.all([
      prisma.earning.aggregate({ _sum: { amount: true } }),
      prisma.task.count(),
      prisma.device.count({ where: { deletedAt: null } }),
      prisma.account.count(),
      prisma.earning.findMany({ orderBy: { earnedAt: 'desc' }, take: 10 }),
    ]);

    const deviceStats = EmulatorManager.getAll();
    const running = deviceStats.filter(d => d.status === 'running').length;

    res.json({
      success: true,
      data: {
        totalEarnings:  totalEarnings._sum.amount || 0,
        totalTasks,
        totalDevices:   deviceStats.length,
        activeDevices:  running,
        totalAccounts,
        currentRateHr:  running * 0.08,
        recentEarnings,
      },
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

analyticsRouter.get('/earnings', async (req, res) => {
  try {
    const { period = '7d', groupBy = 'day', deviceId, appKey } = req.query;
    const days = period === '24h' ? 1 : period === '7d' ? 7 : period === '30d' ? 30 : 7;
    const since = new Date(Date.now() - days * 86400000);

    const where = { earnedAt: { gte: since } };
    if (deviceId) where.deviceId = deviceId;
    if (appKey)   where.appKey   = appKey;

    const earnings = await prisma.earning.findMany({
      where,
      orderBy: { earnedAt: 'asc' },
      select: { amount: true, appKey: true, earnedAt: true, deviceId: true },
    });

    // Group by day
    const byDay = {};
    earnings.forEach(e => {
      const day = e.earnedAt.toISOString().split('T')[0];
      byDay[day] = (byDay[day] || 0) + e.amount;
    });

    // By app
    const byApp = {};
    earnings.forEach(e => {
      byApp[e.appKey] = (byApp[e.appKey] || 0) + e.amount;
    });

    res.json({
      success: true,
      data: {
        timeline: Object.entries(byDay).map(([date, amount]) => ({ date, amount })),
        byApp:    Object.entries(byApp).map(([app, amount]) => ({ app, amount })),
        total:    earnings.reduce((s, e) => s + e.amount, 0),
        count:    earnings.length,
      },
    });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

analyticsRouter.get('/tasks', async (req, res) => {
  try {
    const [total, completed, failed, running] = await Promise.all([
      prisma.task.count(),
      prisma.task.count({ where: { status: 'COMPLETED' } }),
      prisma.task.count({ where: { status: 'FAILED' } }),
      prisma.task.count({ where: { status: 'RUNNING' } }),
    ]);

    const byApp = await prisma.task.groupBy({
      by: ['appKey'],
      _count: { id: true },
      _sum: { earnings: true },
    });

    res.json({ success: true, data: { total, completed, failed, running, byApp } });
  } catch (err) { res.status(500).json({ success: false, error: err.message }); }
});

module.exports = { accountRouter, proxyRouter, streamRouter, analyticsRouter };
