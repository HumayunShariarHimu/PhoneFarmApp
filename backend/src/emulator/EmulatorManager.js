'use strict';
const { spawn, exec } = require('child_process');
const fs   = require('fs');
const path = require('path');
const { v4: uuid } = require('uuid');
const ADBController = require('./ADBController');

const IMG_DIR  = process.env.ANDROID_IMAGES_PATH || '/android/images';
const BASE_IMG = process.env.ANDROID_BASE_IMG     || '/android/base/android-x86-9.0.img';
const QEMU     = process.env.QEMU_PATH || 'qemu-system-x86_64';
const ADB_BIN  = process.env.ADB_PATH  || 'adb';
const BASE_VNC = 5900;
const BASE_ADB = 5554;
const RUNTIME_MODE = (process.env.EMULATOR_MODE || 'safe').toLowerCase();

class EmulatorManager {
  constructor() {
    this.ems   = new Map();
    this.slots = new Set();
    this.initialized = false;
  }

  async init() {
    fs.mkdirSync(IMG_DIR, { recursive: true });
    this._exec(`${ADB_BIN} start-server`).catch(() => {});
    this.initialized = true;
    console.log('[EmulatorManager] Ready. IMG_DIR:', IMG_DIR);
  }

  runtimeStatus() {
    const qemuAvailable = (() => {
      try { return fs.existsSync(QEMU) || require('child_process').execFileSync('which', [QEMU], { stdio: ['ignore', 'pipe', 'ignore'] }).length > 0; } catch { return false; }
    })();
    const baseImageAvailable = fs.existsSync(BASE_IMG);
    const kvmAvailable = fs.existsSync('/dev/kvm');
    const enabled = RUNTIME_MODE === 'qemu';
    return {
      mode: enabled ? 'qemu' : 'safe',
      emulatorAvailable: enabled && qemuAvailable && baseImageAvailable,
      qemuAvailable,
      baseImageAvailable,
      kvmAvailable,
      reason: enabled
        ? (!qemuAvailable ? `QEMU is unavailable: ${QEMU}` : !baseImageAvailable ? `Android base image is missing: ${BASE_IMG}` : 'QEMU runtime ready')
        : 'Safe mode is enabled; connect a separate Android runtime to control real devices.',
    };
  }

  // ─── Create Android VM ────────────────────
  async create(opts = {}) {
    if (RUNTIME_MODE !== 'qemu') {
      throw new Error('Android emulator runtime is disabled in Railway safe mode. Connect a KVM-enabled remote runtime to create live devices.');
    }
    if (!fs.existsSync(BASE_IMG)) {
      throw new Error(`Android base image is missing: ${BASE_IMG}. Provision a bootable Android-x86 qcow2 image before creating devices.`);
    }
    const id   = opts.id   || uuid();
    const name = opts.name || `Phone-${id.slice(0,6).toUpperCase()}`;
    const ram  = opts.ram  || 2048;
    const cpus = opts.cpus || 2;
    const slot = this._nextSlot();

    const vncPort = BASE_VNC + slot;
    const adbPort = BASE_ADB + slot * 2;
    const imgPath = path.join(IMG_DIR, `${id}.qcow2`);

    // Create disk image from base
    await this._createDisk(imgPath);

    // Build QEMU args
    const hasKvm = fs.existsSync('/dev/kvm');
    const args = [
      ...(hasKvm ? ['-enable-kvm', '-cpu', 'host'] : ['-cpu', 'x86-64']),
      '-smp', String(cpus), '-m', String(ram),
      '-drive', `file=${imgPath},format=qcow2,if=virtio`,
      '-net', 'nic,model=virtio',
      '-net', `user,hostfwd=tcp::${adbPort}-:5555`,
      '-vnc', `0.0.0.0:${slot}`,    // VNC on 5900+slot
      '-nographic',
      '-pidfile', `/tmp/qemu-${id}.pid`,
    ];

    const proc = spawn(QEMU, args, { detached: false, stdio: ['ignore','pipe','pipe'] });
    proc.stderr.on('data', d => { const m = d.toString(); if (m.includes('error')) console.error(`[VM:${name}]`, m.trim()); });

    const em = {
      id, name, slot, pid: proc.pid, proc,
      vncPort, adbPort,
      adbSerial: `127.0.0.1:${adbPort}`,
      ram, cpus, status: 'starting',
      androidVersion: opts.androidVersion || '9',
      imgPath, adb: null,
      startedAt: Date.now(),
      metrics: { cpu:0, memory:0, battery:100, temperature:35, uptime:0, earnings:0 },
      currentApp: null, taskProgress: 0,
      display: { width:1080, height:1920 },
      error: null,
    };

    this.ems.set(id, em);
    this.slots.add(slot);

    proc.on('exit', code => {
      const e = this.ems.get(id);
      if (e) { e.status = code === 0 ? 'stopped' : 'error'; e.error = code ? `Exit ${code}` : null; }
      this.slots.delete(slot);
      if (global.io) global.io.emit('emulator:stopped', { id, code });
    });

    // Boot in background
    this._waitBoot(id).then(async () => {
      em.status = 'running';
      em.adb = new ADBController(em.adbSerial);
      try {
        const info = await em.adb.getDeviceInfo();
        Object.assign(em.display, { width: parseInt(info.resolution)||1080, height: 1920 });
        em.androidVersion = info.android || em.androidVersion;
      } catch {}
      if (global.io) global.io.emit('emulator:started', { id, name, status:'running' });
      console.log(`[VM] ${name} booted ✓ (adb:${adbPort} vnc:${vncPort})`);
    }).catch(err => {
      console.error(`[VM] ${name} boot failed:`, err.message);
      em.status = 'error'; em.error = err.message;
      if (global.io) global.io.emit('emulator:error', { id, error: err.message });
    });

    return em;
  }

  // ─── Stop VM ─────────────────────────────
  async stop(id) {
    const em = this.ems.get(id);
    if (!em) throw new Error('Not found: ' + id);
    em.status = 'stopping';
    try { await em.adb?.exec('reboot -p').catch(() => {}); await this._sleep(2000); } catch {}
    if (em.proc && !em.proc.killed) {
      em.proc.kill('SIGTERM');
      await this._sleep(2000);
      if (!em.proc.killed) em.proc.kill('SIGKILL');
    }
    this.slots.delete(em.slot);
    this.ems.delete(id);
    return { success: true, id };
  }

  async restart(id) {
    const em = this.ems.get(id);
    if (!em) throw new Error('Not found: ' + id);
    const opts = { id, name: em.name, ram: em.ram, cpus: em.cpus, androidVersion: em.androidVersion };
    await this.stop(id);
    await this._sleep(3000);
    return this.create(opts);
  }

  async stopAll() {
    await Promise.all(Array.from(this.ems.keys()).map(id => this.stop(id).catch(() => {})));
  }

  // ─── ADB Passthrough ──────────────────────
  async tap(id, x, y)                    { return this._adb(id, a => a.tap(x, y)); }
  async swipe(id, x1,y1,x2,y2,ms)       { return this._adb(id, a => a.swipe(x1,y1,x2,y2,ms)); }
  async typeText(id, text)               { return this._adb(id, a => a.typeText(text)); }
  async screenshot(id)                   { return this._adb(id, a => a.screenshot(`vm_${id}`)); }
  async installApk(id, apkPath)          { return this._adb(id, a => a.installApk(apkPath)); }
  async launchApp(id, pkg, activity)     { return this._adb(id, a => a.launchApp(pkg, activity)); }
  async setProxy(id, host, port, u, pw)  { return this._adb(id, a => a.setProxy(host, port, u, pw)); }

  async getMetrics(id) {
    const em = this.ems.get(id);
    if (!em) return null;
    if (em.adb && em.status === 'running') {
      try {
        const [cpu, memory, battery, temperature, uptime] = await Promise.all([
          em.adb.getCpuUsage(), em.adb.getMemoryUsage(),
          em.adb.getBatteryLevel(), em.adb.getTemperature(), em.adb.getUptime(),
        ]);
        Object.assign(em.metrics, { cpu, memory, battery, temperature, uptime });
      } catch {}
    }
    return { ...em.metrics, status: em.status };
  }

  // ─── Getters ─────────────────────────────
  get(id)   { return this.ems.get(id); }
  getAll()  { return Array.from(this.ems.values()).map(em => this._serialize(em)); }

  _serialize(em) {
    return {
      id: em.id, name: em.name, status: em.status,
      slot: em.slot, vncPort: em.vncPort, adbPort: em.adbPort, adbSerial: em.adbSerial,
      androidVersion: em.androidVersion, ram: em.ram, cpus: em.cpus,
      display: em.display, currentApp: em.currentApp, taskProgress: em.taskProgress,
      metrics: em.metrics, error: em.error, startedAt: em.startedAt,
    };
  }

  // ─── Private ─────────────────────────────
  async _adb(id, fn) {
    const em = this.ems.get(id);
    if (!em) throw new Error('Device not found: ' + id);
    if (!em.adb) throw new Error('ADB not ready for: ' + em.name);
    return fn(em.adb);
  }

  async _createDisk(imgPath) {
    if (fs.existsSync(imgPath)) return;
    if (fs.existsSync(BASE_IMG)) {
      await this._exec(`qemu-img create -f qcow2 -b "${BASE_IMG}" -F qcow2 "${imgPath}"`);
    } else {
      throw new Error(`Android base image is missing: ${BASE_IMG}. A blank disk cannot boot Android; provision a bootable Android-x86 qcow2 image first.`);
    }
  }

  async _waitBoot(id, timeout = 300000) {
    const em = this.ems.get(id);
    if (!em) throw new Error('VM removed');
    await this._sleep(8000); // QEMU startup time

    // Connect ADB
    const deadline = Date.now() + timeout;
    let connected = false;
    while (Date.now() < deadline && !connected) {
      try {
        const out = await this._exec(`${ADB_BIN} connect 127.0.0.1:${em.adbPort}`);
        if (out.includes('connected')) connected = true;
      } catch {}
      if (!connected) await this._sleep(3000);
    }
    if (!connected) throw new Error(`ADB connect timeout`);

    // Wait for boot_completed
    let booted = false;
    while (Date.now() < deadline && !booted) {
      try {
        const r = await this._exec(`${ADB_BIN} -s 127.0.0.1:${em.adbPort} shell getprop sys.boot_completed`);
        if (r.trim() === '1') booted = true;
      } catch {}
      if (!booted) await this._sleep(3000);
    }
    if (!booted) throw new Error(`Boot timeout after ${Math.round(timeout/1000)}s`);
  }

  _nextSlot() {
    let s = 0;
    while (this.slots.has(s)) s++;
    return s;
  }

  _sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  _exec(cmd) {
    return new Promise((res, rej) => {
      exec(cmd, { timeout: 30000 }, (err, stdout) => {
        if (err) rej(err); else res(stdout.trim());
      });
    });
  }
}

module.exports = new EmulatorManager();
