'use strict';

const puppeteer  = require('puppeteer-extra');
const Stealth    = require('puppeteer-extra-plugin-stealth');
puppeteer.use(Stealth());

const { v4: uuid } = require('uuid');
const EventEmitter  = require('events');

const MAX_ACTIVE = parseInt(process.env.MAX_ACTIVE) || 3;

class VirtualDevice extends EventEmitter {
  constructor(opts = {}) {
    super();
    this.id         = opts.id    || uuid();
    this.name       = opts.name  || `Device-${this.id.slice(0,6)}`;
    this.brand      = opts.brand || 'Samsung';
    this.model      = opts.model || 'Galaxy A54 5G';
    this.android    = opts.android || '13';
    this.width      = opts.width   || 393;
    this.height     = opts.height  || 851;
    this.ram        = opts.ram     || '6GB';
    this.cpu        = opts.cpu     || 'Exynos 1380';
    this.userAgent  = opts.userAgent || this._buildUA();
    this.group      = opts.group || 'Default';
    this.notes      = opts.notes || '';

    this.browser    = null;
    this.page       = null;
    this.status     = 'stopped';   // stopped|starting|running|busy|error
    this.currentUrl = 'about:blank';
    this.battery    = 85 + Math.floor(Math.random() * 15);
    this.signal     = 3 + Math.floor(Math.random() * 2);
    this.startedAt  = null;
    this.uptime     = 0;
    this.screenTimer  = null;
    this.uptimeTimer  = null;
    this.error      = null;
  }

  async start() {
    if (this.browser) return;
    this.status = 'starting';
    this.emit('status', this.status);

    const args = [
      '--no-sandbox', '--disable-setuid-sandbox',
      '--disable-dev-shm-usage', '--disable-gpu',
      '--disable-software-rasterizer', '--disable-extensions',
      '--single-process', '--memory-pressure-off',
      '--disable-background-timer-throttling',
      '--js-flags=--max-old-space-size=200',
      `--window-size=${this.width},${this.height}`,
    ];

    this.browser = await puppeteer.launch({
      headless: 'new',
      executablePath: process.env.PUPPETEER_EXEC || undefined,
      args,
      defaultViewport: {
        width: this.width, height: this.height,
        deviceScaleFactor: this.width >= 393 ? 3 : 2.75,
        isMobile: true, hasTouch: true,
      },
    });

    this.page = await this.browser.newPage();
    await this.page.setUserAgent(this.userAgent);

    // Block heavy resources to save RAM
    await this.page.setRequestInterception(true);
    this.page.on('request', req => {
      if (['media','font'].includes(req.resourceType())) req.abort();
      else req.continue();
    });

    this.page.on('pageerror', () => {});
    this.page.on('console',   () => {});

    // Home screen
    await this.page.goto('https://www.google.com', { waitUntil: 'domcontentloaded', timeout: 20000 })
      .catch(() => {});

    this.status    = 'running';
    this.startedAt = Date.now();
    this.error     = null;

    // Screenshot stream
    this.screenTimer = setInterval(() => this._sendFrame(), 800);
    // Uptime counter
    this.uptimeTimer = setInterval(() => { this.uptime++; this.battery = Math.max(10, this.battery - 0.001); }, 1000);

    this.emit('started');
    if (global.io) global.io.emit('device:started', this.toJSON());
    console.log(`[Device] ${this.name} started`);
  }

  async stop() {
    clearInterval(this.screenTimer);
    clearInterval(this.uptimeTimer);
    if (this.browser) {
      await this.browser.close().catch(() => {});
      this.browser = null;
      this.page    = null;
    }
    this.status = 'stopped';
    this.emit('stopped');
    if (global.io) global.io.emit('device:stopped', { id: this.id });
  }

  // ── Navigation ────────────────────────────
  async goto(url) {
    if (!url.startsWith('http')) url = 'https://' + url;
    if (!this.page) throw new Error('Device not running');
    await this.page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    this.currentUrl = this.page.url();
    return this.currentUrl;
  }

  async back()    { await this.page?.goBack({ timeout:5000 }).catch(() => {}); }
  async forward() { await this.page?.goForward({ timeout:5000 }).catch(() => {}); }
  async reload()  { await this.page?.reload({ timeout:10000 }).catch(() => {}); }

  // ── Interactions ──────────────────────────
  async tap(x, y) {
    if (!this.page) return;
    try { await this.page.touchscreen.tap(x, y); }
    catch { await this.page.mouse.click(x, y).catch(() => {}); }
  }

  async doubleTap(x, y) {
    await this.tap(x, y);
    await this._sleep(100);
    await this.tap(x, y);
  }

  async longPress(x, y, ms = 1000) {
    if (!this.page) return;
    await this.page.mouse.move(x, y);
    await this.page.mouse.down();
    await this._sleep(ms);
    await this.page.mouse.up();
  }

  async swipe(x1, y1, x2, y2, ms = 300) {
    if (!this.page) return;
    const steps = Math.max(5, Math.floor(ms / 16));
    try {
      await this.page.touchscreen.touchStart(x1, y1);
      for (let i = 1; i <= steps; i++) {
        await this.page.touchscreen.touchMove(
          x1 + (x2 - x1) * i / steps,
          y1 + (y2 - y1) * i / steps
        );
        await this._sleep(ms / steps);
      }
      await this.page.touchscreen.touchEnd();
    } catch {
      await this.page.mouse.move(x1, y1);
      await this.page.mouse.down();
      await this.page.mouse.move(x2, y2, { steps });
      await this.page.mouse.up();
    }
  }

  async swipeUp()    { return this.swipe(this.width/2, this.height*0.75, this.width/2, this.height*0.25, 350); }
  async swipeDown()  { return this.swipe(this.width/2, this.height*0.25, this.width/2, this.height*0.75, 350); }
  async swipeLeft()  { return this.swipe(this.width*0.85, this.height/2, this.width*0.15, this.height/2, 300); }
  async swipeRight() { return this.swipe(this.width*0.15, this.height/2, this.width*0.85, this.height/2, 300); }

  async type(text) {
    if (!this.page) return;
    await this.page.keyboard.type(text, { delay: 40 + Math.random() * 30 });
  }

  async pressKey(key) {
    if (!this.page) return;
    await this.page.keyboard.press(key);
  }

  async clearInput() {
    await this.pressKey('Control+a');
    await this.pressKey('Backspace');
  }

  async scrollDown(px = 400) {
    await this.page?.evaluate(y => window.scrollBy(0, y), px);
  }
  async scrollUp(px = 400) {
    await this.page?.evaluate(y => window.scrollBy(0, -y), px);
  }
  async scrollToTop()    { await this.page?.evaluate(() => window.scrollTo(0, 0)); }
  async scrollToBottom() { await this.page?.evaluate(() => window.scrollTo(0, document.body.scrollHeight)); }

  // ── JS Evaluation ─────────────────────────
  async eval(code) {
    if (!this.page) return null;
    try { return await this.page.evaluate(code); }
    catch (e) { return { error: e.message }; }
  }

  // ── Screenshot ────────────────────────────
  async screenshot() {
    if (!this.page) return null;
    return this.page.screenshot({ encoding: 'base64', type: 'jpeg', quality: 60 })
      .catch(() => null);
  }

  async _sendFrame() {
    if (!this.page || this.status === 'stopped') return;
    const frame = await this.screenshot();
    if (frame && global.io) {
      global.io.volatile.emit(`device:frame:${this.id}`, {
        id: this.id, frame, url: this.page?.url() || '', ts: Date.now(),
      });
    }
  }

  // ── Info ──────────────────────────────────
  getUrl() { return this.page?.url() || this.currentUrl; }
  async getTitle() { return this.page?.title().catch(() => '') || ''; }
  async getPageHTML() { return this.page?.content().catch(() => '') || ''; }

  // ── Utils ─────────────────────────────────
  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  _buildUA() {
    return `Mozilla/5.0 (Linux; Android ${this.android}; ${this.model}) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36`;
  }

  toJSON() {
    return {
      id: this.id, name: this.name, brand: this.brand, model: this.model,
      android: this.android, width: this.width, height: this.height,
      ram: this.ram, cpu: this.cpu, group: this.group, notes: this.notes,
      status: this.status, currentUrl: this.currentUrl,
      battery: Math.round(this.battery), signal: this.signal,
      uptime: this.uptime, startedAt: this.startedAt, error: this.error,
    };
  }
}

// ════════════════════════════════════════════
class DevicePool extends EventEmitter {
  constructor() {
    super();
    this.devices = new Map();
  }

  async add(opts = {}) {
    const dev = new VirtualDevice(opts);
    this.devices.set(dev.id, dev);
    if (this._activeCount() < MAX_ACTIVE) {
      await dev.start().catch(e => { dev.status = 'error'; dev.error = e.message; });
    } else {
      dev.status = 'queued';
    }
    if (global.io) global.io.emit('device:added', dev.toJSON());
    return dev;
  }

  async addMany(list) {
    const results = [];
    for (const opts of list) {
      results.push(await this.add(opts));
      await new Promise(r => setTimeout(r, 300));
    }
    return results;
  }

  async remove(id) {
    const dev = this.devices.get(id);
    if (!dev) return;
    await dev.stop();
    this.devices.delete(id);
    if (global.io) global.io.emit('device:removed', { id });
    this._startNext();
  }

  async removeAll() {
    await Promise.all(Array.from(this.devices.keys()).map(id => this.remove(id)));
  }

  get(id) { return this.devices.get(id); }
  getAll() { return Array.from(this.devices.values()); }
  getAllJSON() { return this.getAll().map(d => d.toJSON()); }

  async startAll() {
    for (const d of this.devices.values()) {
      if ((d.status === 'stopped' || d.status === 'queued') && this._activeCount() < MAX_ACTIVE) {
        await d.start().catch(() => {});
      }
    }
  }

  async stopAll() {
    await Promise.all(this.getAll().map(d => d.stop().catch(() => {})));
  }

  async action(id, action, params = {}) {
    const dev = this.devices.get(id);
    if (!dev) throw new Error(`Device ${id} not found`);
    if (dev.status === 'stopped' || dev.status === 'queued') await dev.start();

    switch (action) {
      case 'tap':         return dev.tap(params.x, params.y);
      case 'double_tap':  return dev.doubleTap(params.x, params.y);
      case 'long_press':  return dev.longPress(params.x, params.y, params.ms);
      case 'swipe':       return dev.swipe(params.x1, params.y1, params.x2, params.y2, params.ms);
      case 'swipe_up':    return dev.swipeUp();
      case 'swipe_down':  return dev.swipeDown();
      case 'swipe_left':  return dev.swipeLeft();
      case 'swipe_right': return dev.swipeRight();
      case 'type':        return dev.type(params.text);
      case 'key':         return dev.pressKey(params.key);
      case 'clear':       return dev.clearInput();
      case 'scroll_down': return dev.scrollDown(params.px);
      case 'scroll_up':   return dev.scrollUp(params.px);
      case 'scroll_top':  return dev.scrollToTop();
      case 'scroll_bottom': return dev.scrollToBottom();
      case 'back':        return dev.back();
      case 'forward':     return dev.forward();
      case 'reload':      return dev.reload();
      case 'goto':        return dev.goto(params.url);
      case 'screenshot':  return dev.screenshot();
      case 'eval':        return dev.eval(params.code);
      case 'get_html':    return dev.getPageHTML();
      case 'get_title':   return dev.getTitle();
      case 'get_url':     return dev.getUrl();
      default: throw new Error(`Unknown action: ${action}`);
    }
  }

  // Batch: same action on many devices
  async batch(ids, action, params = {}) {
    return Promise.allSettled(ids.map(id => this.action(id, action, params)));
  }

  getStats() {
    const all = this.getAll();
    return {
      total:   all.length,
      running: all.filter(d => d.status === 'running' || d.status === 'busy').length,
      stopped: all.filter(d => d.status === 'stopped').length,
      queued:  all.filter(d => d.status === 'queued').length,
      error:   all.filter(d => d.status === 'error').length,
      maxActive: MAX_ACTIVE,
    };
  }

  _activeCount() { return this.getAll().filter(d => d.browser).length; }

  _startNext() {
    const next = this.getAll().find(d => d.status === 'queued');
    if (next && this._activeCount() < MAX_ACTIVE) next.start().catch(() => {});
  }
}

module.exports = { DevicePool, VirtualDevice };
