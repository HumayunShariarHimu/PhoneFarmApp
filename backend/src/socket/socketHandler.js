'use strict';

/**
 * Socket Handler — Real-time phone control
 * Every click/swipe in browser → ADB command on real Android VM
 */

const EmulatorManager = require('../emulator/EmulatorManager');
const WebRTCBridge    = require('../emulator/WebRTCBridge');
const TaskEngine      = require('../automation/TaskEngine');
const { prisma }      = require('../db/client');

module.exports = function socketHandler(io) {

  io.on('connection', (socket) => {
    console.log(`[Socket] Client connected: ${socket.id}`);

    // ─── Send current farm state ─────────────
    socket.emit('farm:state', {
      devices: EmulatorManager.getAll(),
      timestamp: Date.now(),
    });

    // ═══════════════════════════════════════
    //  DEVICE CONTROL — Real ADB commands
    // ═══════════════════════════════════════

    // Tap (click) on screen
    socket.on('device:tap', async ({ deviceId, x, y }) => {
      try {
        const em = EmulatorManager.get(deviceId);
        if (!em?.adb) return socket.emit('device:error', { deviceId, error: 'Device not available' });
        await em.adb.tap(x, y);
        socket.emit('device:action:ok', { deviceId, action: 'tap', x, y });
      } catch (err) {
        socket.emit('device:error', { deviceId, error: err.message });
      }
    });

    // Double tap
    socket.on('device:doubletap', async ({ deviceId, x, y }) => {
      try {
        const em = EmulatorManager.get(deviceId);
        if (!em?.adb) return;
        await em.adb.doubleTap(x, y);
      } catch (err) {
        socket.emit('device:error', { deviceId, error: err.message });
      }
    });

    // Long press
    socket.on('device:longpress', async ({ deviceId, x, y, duration }) => {
      try {
        const em = EmulatorManager.get(deviceId);
        if (!em?.adb) return;
        await em.adb.longPress(x, y, duration || 1000);
      } catch (err) {
        socket.emit('device:error', { deviceId, error: err.message });
      }
    });

    // Swipe gesture
    socket.on('device:swipe', async ({ deviceId, x1, y1, x2, y2, duration }) => {
      try {
        const em = EmulatorManager.get(deviceId);
        if (!em?.adb) return;
        await em.adb.swipe(x1, y1, x2, y2, duration || 300);
        socket.emit('device:action:ok', { deviceId, action: 'swipe' });
      } catch (err) {
        socket.emit('device:error', { deviceId, error: err.message });
      }
    });

    // Type text
    socket.on('device:type', async ({ deviceId, text }) => {
      try {
        const em = EmulatorManager.get(deviceId);
        if (!em?.adb) return;
        await em.adb.typeText(text);
        socket.emit('device:action:ok', { deviceId, action: 'type', text });
      } catch (err) {
        socket.emit('device:error', { deviceId, error: err.message });
      }
    });

    // Key event
    socket.on('device:keyevent', async ({ deviceId, keycode }) => {
      try {
        const em = EmulatorManager.get(deviceId);
        if (!em?.adb) return;
        await em.adb.pressKey(keycode);
      } catch (err) {
        socket.emit('device:error', { deviceId, error: err.message });
      }
    });

    // Special keys
    socket.on('device:back',    async ({ deviceId }) => { const em = EmulatorManager.get(deviceId); await em?.adb?.pressBack().catch(() => {}); });
    socket.on('device:home',    async ({ deviceId }) => { const em = EmulatorManager.get(deviceId); await em?.adb?.pressHome().catch(() => {}); });
    socket.on('device:recents', async ({ deviceId }) => { const em = EmulatorManager.get(deviceId); await em?.adb?.pressRecents().catch(() => {}); });
    socket.on('device:enter',   async ({ deviceId }) => { const em = EmulatorManager.get(deviceId); await em?.adb?.pressEnter().catch(() => {}); });

    // Screenshot request
    socket.on('device:screenshot', async ({ deviceId }) => {
      try {
        const em = EmulatorManager.get(deviceId);
        if (!em?.adb) return socket.emit('device:error', { deviceId, error: 'No ADB' });
        const result = await em.adb.screenshot(`device_${deviceId}`);

        // Save to DB
        await prisma.screenshot.create({
          data: {
            deviceId,
            filePath: result.path,
            url:      result.url,
            width:    em.adb.display.width,
            height:   em.adb.display.height,
          },
        }).catch(() => {});

        socket.emit('device:screenshot:done', { deviceId, url: result.url });
      } catch (err) {
        socket.emit('device:error', { deviceId, error: err.message });
      }
    });

    // Launch app
    socket.on('device:launch_app', async ({ deviceId, packageName, activity }) => {
      try {
        const em = EmulatorManager.get(deviceId);
        if (!em?.adb) return;
        await em.adb.launchApp(packageName, activity);
        socket.emit('device:action:ok', { deviceId, action: 'launch_app', packageName });
      } catch (err) {
        socket.emit('device:error', { deviceId, error: err.message });
      }
    });

    // Stop app
    socket.on('device:stop_app', async ({ deviceId, packageName }) => {
      try {
        const em = EmulatorManager.get(deviceId);
        if (!em?.adb) return;
        await em.adb.stopApp(packageName);
      } catch (err) {
        socket.emit('device:error', { deviceId, error: err.message });
      }
    });

    // Open URL
    socket.on('device:open_url', async ({ deviceId, url }) => {
      try {
        const em = EmulatorManager.get(deviceId);
        if (!em?.adb) return;
        await em.adb.openUrl(url);
        socket.emit('device:action:ok', { deviceId, action: 'open_url', url });
      } catch (err) {
        socket.emit('device:error', { deviceId, error: err.message });
      }
    });

    // ADB shell (raw command)
    socket.on('device:shell', async ({ deviceId, command }) => {
      try {
        const em = EmulatorManager.get(deviceId);
        if (!em?.adb) return;
        const output = await em.adb.exec(command);
        socket.emit('device:shell:output', { deviceId, command, output });
      } catch (err) {
        socket.emit('device:shell:output', { deviceId, command, output: '', error: err.message });
      }
    });

    // Get device metrics
    socket.on('device:metrics', async ({ deviceId }) => {
      try {
        const metrics = await EmulatorManager.getMetrics(deviceId);
        socket.emit('device:metrics:update', { deviceId, metrics });
      } catch (err) {
        socket.emit('device:error', { deviceId, error: err.message });
      }
    });

    // ═══════════════════════════════════════
    //  EMULATOR LIFECYCLE
    // ═══════════════════════════════════════

    socket.on('emulator:create', async (options) => {
      try {
        socket.emit('emulator:creating', { name: options.name });
        const em = await EmulatorManager.create(options);
        socket.emit('emulator:created', EmulatorManager.getAll().find(e => e.id === em.id));
        io.emit('farm:devices:update', EmulatorManager.getAll());
      } catch (err) {
        socket.emit('emulator:error', { error: err.message });
      }
    });

    socket.on('emulator:stop', async ({ deviceId }) => {
      try {
        await EmulatorManager.stop(deviceId);
        io.emit('farm:devices:update', EmulatorManager.getAll());
      } catch (err) {
        socket.emit('emulator:error', { deviceId, error: err.message });
      }
    });

    socket.on('emulator:restart', async ({ deviceId }) => {
      try {
        await EmulatorManager.restart(deviceId);
        io.emit('farm:devices:update', EmulatorManager.getAll());
      } catch (err) {
        socket.emit('emulator:error', { deviceId, error: err.message });
      }
    });

    socket.on('emulator:stop_all', async () => {
      await EmulatorManager.stopAll();
      io.emit('farm:devices:update', EmulatorManager.getAll());
    });

    // ═══════════════════════════════════════
    //  WebRTC SIGNALING
    // ═══════════════════════════════════════

    socket.on('webrtc:request_stream', async ({ deviceId }) => {
      try {
        const em = EmulatorManager.get(deviceId);
        if (!em) return socket.emit('webrtc:error', { deviceId, error: 'Device not found' });

        const { peerId, offer } = await WebRTCBridge.createOffer(deviceId, em.vncPort);
        socket.emit('webrtc:offer', { deviceId, peerId, offer });
      } catch (err) {
        socket.emit('webrtc:error', { deviceId, error: err.message });
      }
    });

    socket.on('webrtc:answer', async ({ deviceId, peerId, answer }) => {
      try {
        await WebRTCBridge.processAnswer(peerId, answer);
      } catch (err) {
        socket.emit('webrtc:error', { deviceId, error: err.message });
      }
    });

    socket.on('webrtc:ice_candidate', async ({ deviceId, peerId, candidate }) => {
      try {
        await WebRTCBridge.addIceCandidate(peerId, candidate);
      } catch (err) {}
    });

    socket.on('webrtc:stop_stream', async ({ deviceId, peerId }) => {
      try {
        WebRTCBridge.closePeer(peerId);
      } catch (err) {}
    });

    // ═══════════════════════════════════════
    //  TASK CONTROL
    // ═══════════════════════════════════════

    socket.on('task:cancel', async ({ taskId }) => {
      try {
        const result = await TaskEngine.cancelTask(taskId);
        socket.emit('task:cancelled', result);
      } catch (err) {
        socket.emit('task:error', { taskId, error: err.message });
      }
    });

    socket.on('task:pause_all',  async () => { await TaskEngine.pause(); });
    socket.on('task:resume_all', async () => { await TaskEngine.resume(); });

    // ═══════════════════════════════════════
    //  LIVE METRICS SUBSCRIPTION
    // ═══════════════════════════════════════

    let metricsInterval = null;

    socket.on('metrics:subscribe', ({ deviceIds }) => {
      clearInterval(metricsInterval);
      metricsInterval = setInterval(async () => {
        const ids = deviceIds || EmulatorManager.getAll().map(e => e.id);
        const updates = await Promise.all(
          ids.map(async id => ({
            id,
            metrics: await EmulatorManager.getMetrics(id).catch(() => null),
          }))
        );
        socket.emit('metrics:update', updates.filter(u => u.metrics));
      }, 3000);
    });

    socket.on('metrics:unsubscribe', () => {
      clearInterval(metricsInterval);
    });

    // ─── Disconnect ──────────────────────
    socket.on('disconnect', () => {
      clearInterval(metricsInterval);
      console.log(`[Socket] Client disconnected: ${socket.id}`);
    });
  });

  // ─── Broadcast metrics every 5s ─────────
  setInterval(async () => {
    const devices = EmulatorManager.getAll();
    if (devices.length === 0) return;
    io.emit('farm:devices:update', devices);
  }, 5000);
};
