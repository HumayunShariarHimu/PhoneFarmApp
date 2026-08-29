'use strict';
const { exec } = require('child_process');
const fs   = require('fs');
const path = require('path');

const ADB          = process.env.ADB_PATH || 'adb';
const SCREENSHOT_DIR = path.join(__dirname, '../../screenshots');

class ADBController {
  constructor(serial) {
    this.serial  = serial;
    this.cmd     = `${ADB} -s ${serial}`;
    this.display = { width: 1080, height: 1920 };
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  // ── Core exec ────────────────────────────
  exec(shellCmd, opts = {}) {
    return new Promise((resolve, reject) => {
      exec(`${this.cmd} shell ${shellCmd}`, { timeout: opts.timeout || 15000, maxBuffer: 10*1024*1024 }, (err, stdout) => {
        if (err && !opts.ignoreError) return reject(err);
        resolve((stdout || '').trim());
      });
    });
  }
  adb(sub, opts = {}) {
    return new Promise((resolve, reject) => {
      exec(`${this.cmd} ${sub}`, { timeout: opts.timeout || 30000, maxBuffer: 50*1024*1024 }, (err, stdout) => {
        if (err && !opts.ignoreError) return reject(err);
        resolve((stdout || '').trim());
      });
    });
  }
  sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

  // ── Device info ──────────────────────────
  async getDeviceInfo() {
    const [model, brand, android, resolution] = await Promise.all([
      this.exec('getprop ro.product.model',          { ignoreError:true }),
      this.exec('getprop ro.product.brand',          { ignoreError:true }),
      this.exec('getprop ro.build.version.release',  { ignoreError:true }),
      this.exec('wm size',                           { ignoreError:true }),
    ]);
    const match = resolution.match(/(\d+)x(\d+)/);
    if (match) { this.display.width = +match[1]; this.display.height = +match[2]; }
    return { model: model||'Android-x86', brand: brand||'Virtual', android: android||'9', resolution: `${this.display.width}x${this.display.height}` };
  }

  // ── Input ────────────────────────────────
  tap(x, y)                     { return this.exec(`input tap ${x} ${y}`); }
  doubleTap(x, y)               { return this.tap(x,y).then(() => this.sleep(100)).then(() => this.tap(x,y)); }
  longPress(x, y, ms=1000)      { return this.exec(`input swipe ${x} ${y} ${x} ${y} ${ms}`); }
  swipe(x1,y1,x2,y2,dur=300)   { return this.exec(`input swipe ${x1} ${y1} ${x2} ${y2} ${dur}`); }
  swipeUp()   { return this.swipe(540,1500,540,500,400); }
  swipeDown() { return this.swipe(540,500,540,1500,400); }
  swipeLeft() { return this.swipe(900,960,100,960,300); }
  swipeRight(){ return this.swipe(100,960,900,960,300); }

  typeText(text) {
    const esc = text.replace(/\\/g,'\\\\').replace(/'/g,"\\'").replace(/ /g,'%s').replace(/[&<>|;*~^()]/g, m=>'\\'+m);
    return this.exec(`input text '${esc}'`);
  }

  clearField() { return this.exec('input keyevent KEYCODE_CTRL_A').then(() => this.exec('input keyevent KEYCODE_DEL')); }

  // ── Keys ─────────────────────────────────
  pressBack()    { return this.exec('input keyevent KEYCODE_BACK'); }
  pressHome()    { return this.exec('input keyevent KEYCODE_HOME'); }
  pressRecents() { return this.exec('input keyevent KEYCODE_APP_SWITCH'); }
  pressEnter()   { return this.exec('input keyevent KEYCODE_ENTER'); }
  pressKey(kc)   { return this.exec(`input keyevent ${kc}`); }
  wakeScreen()   { return this.exec('input keyevent KEYCODE_WAKEUP'); }
  unlockScreen() { return this.wakeScreen().then(() => this.sleep(500)).then(() => this.swipe(540,1600,540,800,300)); }

  // ── Apps ─────────────────────────────────
  installApk(apkPath) { return this.adb(`install -r -g "${apkPath}"`, { timeout:120000 }); }
  uninstallApp(pkg)   { return this.adb(`uninstall ${pkg}`,            { ignoreError:true }); }
  launchApp(pkg, act) { return act ? this.exec(`am start -n ${pkg}/${act}`) : this.exec(`monkey -p ${pkg} -c android.intent.category.LAUNCHER 1`); }
  stopApp(pkg)        { return this.exec(`am force-stop ${pkg}`); }
  clearAppData(pkg)   { return this.exec(`pm clear ${pkg}`); }
  isAppInstalled(pkg) { return this.exec(`pm list packages ${pkg}`, { ignoreError:true }).then(r => r.includes(pkg)); }
  getInstalledApps()  { return this.exec('pm list packages -3').then(r => r.split('\n').map(l=>l.replace('package:','')).filter(Boolean)); }
  getCurrentApp()     { return this.exec('dumpsys window | grep mCurrentFocus', { ignoreError:true }).then(r => { const m=r.match(/\{[^}]+ ([^\s]+)\/([^\s]+)\}/); return m ? { package:m[1], activity:m[2] } : null; }); }
  openUrl(url)        { return this.exec(`am start -a android.intent.action.VIEW -d "${url.replace(/&/g,'\\&')}"`); }

  // ── Screenshot ───────────────────────────
  async screenshot(name) {
    const fname = `${name||this.serial.replace(/[^a-z0-9]/gi,'_')}_${Date.now()}.png`;
    const local  = path.join(SCREENSHOT_DIR, fname);
    const device = `/sdcard/sc_${Date.now()}.png`;
    await this.exec(`screencap -p ${device}`);
    await this.sleep(300);
    await this.adb(`pull ${device} "${local}"`, { timeout:10000 });
    await this.exec(`rm ${device}`, { ignoreError:true });
    return { path: local, url: `/screenshots/${fname}` };
  }

  // ── Files ────────────────────────────────
  pushFile(local, device) { return this.adb(`push "${local}" "${device}"`, { timeout:60000 }); }
  pullFile(device, local) { return this.adb(`pull "${device}" "${local}"`, { timeout:60000 }); }

  // ── Network ──────────────────────────────
  async setProxy(host, port, user, pw) {
    await this.exec(`settings put global http_proxy ${host}:${port}`);
    await this.exec(`settings put global global_http_proxy_host ${host}`);
    await this.exec(`settings put global global_http_proxy_port ${port}`);
    if (user) { await this.exec(`settings put global global_http_proxy_username ${user}`); await this.exec(`settings put global global_http_proxy_password ${pw||''}`); }
  }
  async clearProxy() {
    await this.exec('settings put global http_proxy :0');
    await this.exec('settings delete global global_http_proxy_host', { ignoreError:true });
    await this.exec('settings delete global global_http_proxy_port', { ignoreError:true });
  }
  setWifiEnabled(on) { return this.exec(`svc wifi ${on?'enable':'disable'}`); }
  setAirplaneMode(on) { return this.exec(`settings put global airplane_mode_on ${on?1:0}`).then(() => this.exec(`am broadcast -a android.intent.action.AIRPLANE_MODE --ez state ${on}`)); }

  // ── Metrics ──────────────────────────────
  async getCpuUsage() {
    try { const r=await this.exec("top -bn1|grep 'cpu'"); const m=r.match(/(\d+)%\s+idle/); return m?100-+m[1]:0; } catch { return 0; }
  }
  async getMemoryUsage() {
    try { const r=await this.exec('cat /proc/meminfo'); const t=r.match(/MemTotal:\s+(\d+)/)?.[1]; const f=r.match(/MemAvailable:\s+(\d+)/)?.[1]; return (t&&f)?Math.round((1-+f/+t)*100):0; } catch { return 0; }
  }
  async getBatteryLevel() {
    try { const r=await this.exec('dumpsys battery|grep level'); const m=r.match(/level:\s*(\d+)/); return m?+m[1]:100; } catch { return 100; }
  }
  async getTemperature() {
    try { const r=await this.exec('dumpsys battery|grep temperature'); const m=r.match(/temperature:\s*(\d+)/); return m?+m[1]/10:35; } catch { return 35; }
  }
  async getUptime() {
    try { const r=await this.exec('cat /proc/uptime'); return parseFloat(r)||0; } catch { return 0; }
  }

  // ── UI automation ────────────────────────
  async findAndClick(text) {
    try {
      await this.exec('uiautomator dump /sdcard/ui.xml');
      const xml = await this.exec('cat /sdcard/ui.xml');
      const rx  = new RegExp(`text="${text}"[^>]*bounds="\\[(\\d+),(\\d+)\\]\\[(\\d+),(\\d+)\\]"`);
      const m   = xml.match(rx);
      if (m) { await this.tap((+m[1]+m[3])/2, (+m[2]+m[4])/2); return true; }
    } catch {}
    return false;
  }

  async scrollToText(text, max=5) {
    for (let i=0;i<max;i++) { if (await this.findAndClick(text)) return true; await this.swipeUp(); await this.sleep(800); }
    return false;
  }

  // ── System ───────────────────────────────
  reboot() { return this.exec('reboot', { ignoreError:true }); }
}

module.exports = ADBController;
