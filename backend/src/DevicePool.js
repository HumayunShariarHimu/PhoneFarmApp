'use strict';
const puppeteer = require('puppeteer');
const chromium = require('@sparticuz/chromium');
const { v4: uuid } = require('uuid');
const EventEmitter = require('events');

const MAX_ACTIVE = Math.max(1, Math.min(parseInt(process.env.MAX_ACTIVE, 10) || 3, 20));
const SCREENSHOT_INTERVAL = Math.max(400, Math.min(parseInt(process.env.SCREENSHOT_INTERVAL, 10) || 800, 5000));
const MAX_LOGS = 300;
const NETWORK_PROFILES = {
  online: { offline: false, latency: 0, downloadThroughput: -1, uploadThroughput: -1 },
  offline: { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 },
  slow3g: { offline: false, latency: 400, downloadThroughput: 50000, uploadThroughput: 50000 },
  fast3g: { offline: false, latency: 150, downloadThroughput: 1.6e6, uploadThroughput: 750000 },
  '4g': { offline: false, latency: 40, downloadThroughput: 8e6, uploadThroughput: 3e6 },
};

class VirtualDevice extends EventEmitter {
  constructor(o = {}) {
    super();
    Object.assign(this, {
      id: o.id || uuid(), name: o.name || `Device-${uuid().slice(0, 6)}`,
      brand: o.brand || 'Samsung', model: o.model || 'Galaxy A54 5G', android: o.android || '13',
      width: Number(o.width) || 393, height: Number(o.height) || 851, ram: o.ram || '6GB',
      cpu: o.cpu || 'Exynos 1380', group: o.group || 'Default', notes: o.notes || '',
      browser: null, page: null, cdp: null, status: 'stopped', currentUrl: 'about:blank',
      battery: 85 + Math.floor(Math.random() * 15), signal: 3 + Math.floor(Math.random() * 2),
      startedAt: null, uptime: 0, screenTimer: null, uptimeTimer: null, error: null,
      logs: [], network: 'online', geolocation: null, requestCount: 0, failedRequestCount: 0,
      cookies: 0, lastFrameAt: null,
    });
    this.userAgent = o.userAgent || this._buildUA();
  }

  log(level, message, detail = {}) {
    this.logs.unshift({ at: new Date().toISOString(), level, message: String(message).slice(0, 1000), ...detail });
    this.logs = this.logs.slice(0, MAX_LOGS);
    if (global.io) global.io.volatile.emit(`device:log:${this.id}`, { id: this.id, log: this.logs[0] });
  }

  async start() {
    if (this.browser) return;
    this.status = 'starting';
    try {
      const executablePath = process.env.PUPPETEER_EXEC || await chromium.executablePath();
      this.browser = await puppeteer.launch({
        headless: 'new', executablePath,
        args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu', '--disable-extensions', '--single-process', `--window-size=${this.width},${this.height}`],
        defaultViewport: { width: this.width, height: this.height, deviceScaleFactor: this.width >= 393 ? 3 : 2.75, isMobile: true, hasTouch: true },
      });
      this.page = await this.browser.newPage();
      this.cdp = await this.page.createCDPSession();
      await this.page.setUserAgent(this.userAgent);
      await this.page.setCacheEnabled(true);
      await this.page.setRequestInterception(true);
      this.page.on('request', request => { this.requestCount += 1; ['media', 'font'].includes(request.resourceType()) ? request.abort().catch(() => {}) : request.continue().catch(() => {}); });
      this.page.on('requestfailed', request => { this.failedRequestCount += 1; this.log('warn', 'request.failed', { url: request.url(), reason: request.failure()?.errorText }); });
      this.page.on('console', msg => this.log(msg.type(), msg.text(), { source: 'console' }));
      this.page.on('pageerror', error => this.log('error', error.message, { source: 'pageerror' }));
      this.page.on('framenavigated', frame => { if (frame === this.page.mainFrame()) { this.currentUrl = frame.url(); this.log('info', 'navigation', { url: frame.url() }); } });
      await this.page.goto('https://example.com', { waitUntil: 'domcontentloaded', timeout: 20000 }).catch(e => this.log('warn', 'initial navigation failed', { error: e.message }));
      await this.setNetwork(this.network);
      this.status = 'running'; this.startedAt = Date.now(); this.error = null;
      this.log('info', 'device.started');
      this.screenTimer = setInterval(() => this._sendFrame(), SCREENSHOT_INTERVAL);
      this.uptimeTimer = setInterval(() => { this.uptime += 1; this.battery = Math.max(10, this.battery - 0.001); }, 1000);
      if (global.io) global.io.emit('device:started', this.toJSON());
    } catch (e) {
      this.error = e.message; this.log('error', 'device.start failed', { error: e.message });
      await this.stop(); this.status = 'error'; throw e;
    }
  }

  async stop() {
    clearInterval(this.screenTimer); clearInterval(this.uptimeTimer);
    this.screenTimer = null; this.uptimeTimer = null;
    await this.cdp?.detach().catch(() => {}); this.cdp = null;
    await this.browser?.close().catch(() => {}); this.browser = null; this.page = null;
    this.status = 'stopped';
    if (global.io) global.io.emit('device:stopped', { id: this.id });
  }

  async goto(url) {
    let u; try { u = new URL(String(url).startsWith('http') ? String(url) : `https://${String(url)}`); } catch { throw new Error('Invalid URL'); }
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only http and https URLs are allowed.');
    if (!this.page) throw new Error('Device not running');
    await this.page.goto(u.toString(), { waitUntil: 'domcontentloaded', timeout: 30000 });
    this.currentUrl = this.page.url(); return this.currentUrl;
  }

  async back() { await this.page?.goBack({ timeout: 5000 }).catch(() => {}); }
  async forward() { await this.page?.goForward({ timeout: 5000 }).catch(() => {}); }
  async reload() { await this.page?.reload({ timeout: 10000, waitUntil: 'domcontentloaded' }).catch(() => {}); }
  async tap(x, y) { if (this.page) await this.page.touchscreen.tap(Number(x), Number(y)).catch(() => this.page.mouse.click(Number(x), Number(y))); }
  async doubleTap(x, y) { await this.tap(x, y); await this._sleep(100); await this.tap(x, y); }
  async longPress(x, y, ms = 1000) { if (!this.page) return; await this.page.mouse.move(Number(x), Number(y)); await this.page.mouse.down(); await this._sleep(Math.min(Number(ms) || 1000, 10000)); await this.page.mouse.up(); }
  async swipe(x1, y1, x2, y2, ms = 300) {
    if (!this.page) return; const duration = Math.min(Number(ms) || 300, 3000); const steps = Math.max(5, Math.floor(duration / 16));
    if (!this.cdp) { await this.page.mouse.move(x1, y1); await this.page.mouse.down(); await this.page.mouse.move(x2, y2, { steps }); await this.page.mouse.up(); return; }
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x1, y: y1, radiusX: 1, radiusY: 1 }] });
    for (let i = 1; i <= steps; i += 1) { await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x1 + (x2 - x1) * i / steps, y: y1 + (y2 - y1) * i / steps, radiusX: 1, radiusY: 1 }] }); await this._sleep(duration / steps); }
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  async pinch(x, y, startDistance = 80, endDistance = 180, ms = 450) {
    if (!this.cdp) return;
    const duration = Math.min(Math.max(Number(ms) || 450, 80), 3000);
    const steps = Math.max(6, Math.floor(duration / 16));
    const start = Math.max(10, Number(startDistance) || 80);
    const end = Math.max(10, Number(endDistance) || 180);
    const points = distance => [{ x: Number(x) - distance / 2, y: Number(y), radiusX: 1, radiusY: 1 }, { x: Number(x) + distance / 2, y: Number(y), radiusX: 1, radiusY: 1 }];
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: points(start) });
    for (let i = 1; i <= steps; i += 1) { const distance = start + (end - start) * i / steps; await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: points(distance) }); await this._sleep(duration / steps); }
    await this.cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  }
  swipeUp() { return this.swipe(this.width / 2, this.height * .75, this.width / 2, this.height * .25); }
  swipeDown() { return this.swipe(this.width / 2, this.height * .25, this.width / 2, this.height * .75); }
  swipeLeft() { return this.swipe(this.width * .85, this.height / 2, this.width * .15, this.height / 2); }
  swipeRight() { return this.swipe(this.width * .15, this.height / 2, this.width * .85, this.height / 2); }
  async type(t) { if (this.page) await this.page.keyboard.type(String(t || '').slice(0, 4000), { delay: 40 }); }
  async pressKey(k) { if (this.page) await this.page.keyboard.press(String(k || '')); }
  async clearInput() { await this.pressKey('Control+a'); await this.pressKey('Backspace'); }
  async scrollDown(px = 400) { await this.page?.evaluate(y => window.scrollBy(0, y), Number(px) || 400); }
  async scrollUp(px = 400) { await this.page?.evaluate(y => window.scrollBy(0, -y), Number(px) || 400); }
  async scrollToTop() { await this.page?.evaluate(() => window.scrollTo(0, 0)); }
  async scrollToBottom() { await this.page?.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); }

  async setNetwork(profile = 'online') {
    if (!NETWORK_PROFILES[profile]) throw new Error(`Unknown network profile: ${profile}`);
    this.network = profile;
    if (this.cdp) await this.cdp.send('Network.emulateNetworkConditions', NETWORK_PROFILES[profile]);
    this.log('info', 'network.profile', { profile }); return profile;
  }
  async setCustomNetwork({ latency = 0, downloadThroughput = -1, uploadThroughput = -1, offline = false } = {}) {
    const conditions = { offline: Boolean(offline), latency: Math.max(0, Math.min(Number(latency) || 0, 3000)), downloadThroughput: Math.max(-1, Number(downloadThroughput) || -1), uploadThroughput: Math.max(-1, Number(uploadThroughput) || -1) };
    if (this.cdp) await this.cdp.send('Network.emulateNetworkConditions', conditions);
    this.network = `custom:${conditions.latency}ms/${conditions.downloadThroughput}bps`;
    this.log('info', 'network.custom', conditions); return conditions;
  }
  async setGeolocation(latitude, longitude, accuracy = 50) {
    const lat = Number(latitude), lon = Number(longitude), acc = Number(accuracy) || 50;
    if (!Number.isFinite(lat) || lat < -90 || lat > 90 || !Number.isFinite(lon) || lon < -180 || lon > 180) throw new Error('Invalid latitude or longitude');
    await this.page?.setGeolocation({ latitude: lat, longitude: lon, accuracy: acc });
    this.geolocation = { latitude: lat, longitude: lon, accuracy: acc }; this.log('info', 'geolocation.updated', this.geolocation); return this.geolocation;
  }
  async clearStorage() {
    if (!this.page) throw new Error('Device not running');
    await this.page.deleteCookie(...(await this.page.cookies()));
    await this.page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); }).catch(() => {});
    await this.cdp?.send('Network.clearBrowserCache').catch(() => {});
    this.log('info', 'browser.storage.cleared'); return true;
  }
  async getClipboard() { return this.page?.evaluate(async () => navigator.clipboard?.readText?.() || '').catch(() => ''); }
  async setClipboard(text) { const value = String(text || '').slice(0, 10000); await this.page?.evaluate(async t => navigator.clipboard?.writeText?.(t), value).catch(() => {}); this.log('info', 'clipboard.updated'); return value.length; }
  async getDiagnostics() {
    const page = this.page;
    const storage = page ? await page.evaluate(() => ({ title: document.title, readyState: document.readyState, localStorageKeys: Object.keys(localStorage).length, sessionStorageKeys: Object.keys(sessionStorage).length, viewport: { width: innerWidth, height: innerHeight }, scroll: { x: scrollX, y: scrollY, height: document.body?.scrollHeight || 0 } })).catch(() => null) : null;
    const cookies = page ? (await page.cookies().catch(() => [])) : [];
    this.cookies = cookies.length;
    return { id: this.id, url: this.getUrl(), title: page ? await page.title().catch(() => '') : '', network: this.network, geolocation: this.geolocation, requestCount: this.requestCount, failedRequestCount: this.failedRequestCount, cookies: this.cookies, storage, logs: this.logs.slice(0, 80), frameAt: this.lastFrameAt };
  }
  async eval(code) { if (process.env.ENABLE_BROWSER_EVAL !== 'true') throw new Error('Browser evaluation is disabled by default; enable only for authorized QA.'); return this.page?.evaluate(String(code || '').slice(0, 20000)); }
  getUrl() { return this.page?.url() || this.currentUrl; }
  async screenshot() { return this.page?.screenshot({ encoding: 'base64', type: 'jpeg', quality: 60 }).catch(() => null); }
  async _sendFrame() { if (!this.page || this.status === 'stopped' || !global.io) return; const frame = await this.screenshot(); if (frame) { this.lastFrameAt = new Date().toISOString(); global.io.volatile.emit(`device:frame:${this.id}`, { id: this.id, frame, url: this.page.url(), ts: Date.now() }); } }
  _sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }
  _buildUA() { return `Mozilla/5.0 (Linux; Android ${this.android}; ${this.model}) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36`; }
  toJSON() { return { id: this.id, name: this.name, brand: this.brand, model: this.model, android: this.android, width: this.width, height: this.height, ram: this.ram, cpu: this.cpu, group: this.group, notes: this.notes, status: this.status, currentUrl: this.getUrl(), battery: Math.round(this.battery), signal: this.signal, uptime: this.uptime, startedAt: this.startedAt, error: this.error, network: this.network, geolocation: this.geolocation, requestCount: this.requestCount, failedRequestCount: this.failedRequestCount, lastFrameAt: this.lastFrameAt }; }
}

class DevicePool extends EventEmitter {
  constructor() { super(); this.devices = new Map(); this.audit = []; this.recordings = new Map(); this.maxActive = MAX_ACTIVE; this.screenshotInterval = SCREENSHOT_INTERVAL; }
  record(event, detail = {}) { this.audit.unshift({ at: new Date().toISOString(), event, ...detail }); this.audit = this.audit.slice(0, 300); }
  getAudit() { return this.audit; }
  createRecording(name = 'Untitled test') { const id = uuid(); const test = { id, name: String(name).slice(0, 120) || 'Untitled test', createdAt: new Date().toISOString(), actions: [] }; this.recordings.set(id, test); return test; }
  listRecordings() { return [...this.recordings.values()].map(test => ({ ...test, actions: test.actions.map(action => ({ ...action })) })); }
  addRecordingAction(id, action) { const test = this.recordings.get(id); if (!test) throw new Error('Recording not found'); if (!action?.action) throw new Error('Action is required'); test.actions.push({ ...action, at: new Date().toISOString() }); return test; }
  async replayRecording(recordingId, ids = []) { const test = this.recordings.get(recordingId); if (!test) throw new Error('Recording not found'); const targets = (Array.isArray(ids) && ids.length ? ids : this.getAll().map(d => d.id)).slice(0, 50); const results = []; for (const id of targets) { const deviceResults = []; for (const step of test.actions) { try { deviceResults.push({ action: step.action, ok: true, value: await this.action(id, step.action, step) }); } catch (error) { deviceResults.push({ action: step.action, ok: false, error: error.message }); } } results.push({ id, ok: deviceResults.every(step => step.ok), steps: deviceResults }); } this.record('recording.replayed', { recordingId, ids: targets }); return results; }
  deleteRecording(id) { return this.recordings.delete(id); }
  async add(o = {}) { const d = new VirtualDevice(o); this.devices.set(d.id, d); this.record('device.created', { id: d.id, name: d.name }); if (this._activeCount() < MAX_ACTIVE) d.start().catch(e => { this.record('device.error', { id: d.id, error: e.message }); if (global.io) global.io.emit('device:error', { id: d.id, error: e.message }); }); else d.status = 'queued'; if (global.io) global.io.emit('device:added', d.toJSON()); return d; }
  async addMany(list) { const out = []; for (const o of list.slice(0, 20)) { out.push(await this.add(o)); await new Promise(r => setTimeout(r, 250)); } return out; }
  async remove(id) { const d = this.devices.get(id); if (!d) return; await d.stop(); this.devices.delete(id); this.record('device.removed', { id }); this._startNext(); }
  async removeAll() { await Promise.all([...this.devices.keys()].map(id => this.remove(id))); }
  get(id) { return this.devices.get(id); } getAll() { return [...this.devices.values()]; } getAllJSON() { return this.getAll().map(d => d.toJSON()); }
  async startDevice(id) { const d = this.devices.get(id); if (!d) throw new Error('Device not found'); if (d.browser) return d; if (this._activeCount() >= MAX_ACTIVE) { d.status = 'queued'; return d; } await d.start(); return d; }
  async startAll() { for (const d of this.devices.values()) if ((d.status === 'stopped' || d.status === 'queued') && this._activeCount() < MAX_ACTIVE) await this.startDevice(d.id).catch(() => {}); }
  async stopAll() { await Promise.all(this.getAll().map(d => d.stop().catch(() => {}))); }
  async action(id, action, p = {}) {
    const d = this.devices.get(id); if (!d) throw new Error('Device not found');
    const needsBrowser = !['screenshot'].includes(action);
    if (needsBrowser && (d.status === 'stopped' || d.status === 'queued')) await this.startDevice(id);
    this.record('device.action', { id, action });
    const m = { tap: () => d.tap(p.x, p.y), double_tap: () => d.doubleTap(p.x, p.y), long_press: () => d.longPress(p.x, p.y, p.ms), swipe: () => d.swipe(p.x1, p.y1, p.x2, p.y2, p.ms), pinch: () => d.pinch(p.x, p.y, p.startDistance, p.endDistance, p.ms), swipe_up: () => d.swipeUp(), swipe_down: () => d.swipeDown(), swipe_left: () => d.swipeLeft(), swipe_right: () => d.swipeRight(), type: () => d.type(p.text), key: () => d.pressKey(p.key), clear: () => d.clearInput(), scroll_down: () => d.scrollDown(p.px), scroll_up: () => d.scrollUp(p.px), scroll_top: () => d.scrollToTop(), scroll_bottom: () => d.scrollToBottom(), back: () => d.back(), forward: () => d.forward(), reload: () => d.reload(), goto: () => d.goto(p.url), screenshot: () => d.screenshot(), eval: () => d.eval(p.code), get_html: () => d.page?.content(), get_title: () => d.page?.title(), get_url: () => d.page?.url(), network: () => p.profile === 'custom' ? d.setCustomNetwork(p) : d.setNetwork(p.profile), geolocation: () => d.setGeolocation(p.latitude, p.longitude, p.accuracy), clear_storage: () => d.clearStorage(), diagnostics: () => d.getDiagnostics(), clipboard_get: () => d.getClipboard(), clipboard_set: () => d.setClipboard(p.text) };
    if (!m[action]) throw new Error(`Unknown action: ${action}`); return m[action]();
  }
  batch(ids, action, params = {}) { return Promise.allSettled(ids.slice(0, 50).map(id => this.action(id, action, params))); }
  _activeCount() { return this.getAll().filter(d => d.browser).length; }
  _startNext() { const d = this.getAll().find(x => x.status === 'queued'); if (d && this._activeCount() < MAX_ACTIVE) d.start().catch(() => {}); }
  getStats() { const a = this.getAll(); return { total: a.length, running: a.filter(d => ['running', 'busy'].includes(d.status)).length, stopped: a.filter(d => d.status === 'stopped').length, queued: a.filter(d => d.status === 'queued').length, error: a.filter(d => d.status === 'error').length, maxActive: MAX_ACTIVE, memory: process.memoryUsage().rss, uptime: Math.floor(process.uptime()) }; }
}
module.exports = { DevicePool, VirtualDevice, NETWORK_PROFILES };
