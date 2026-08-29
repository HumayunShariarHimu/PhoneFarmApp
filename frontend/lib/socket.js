// ════════════════════════════════════════════
//  socket.js — Socket.IO client (singleton)
// ════════════════════════════════════════════
import { io } from 'socket.io-client';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:4000';

let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(WS_URL, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
      timeout: 20000,
    });

    socket.on('connect',    () => console.log('[Socket] Connected:', socket.id));
    socket.on('disconnect', () => console.log('[Socket] Disconnected'));
    socket.on('connect_error', e => console.warn('[Socket] Error:', e.message));
  }
  return socket;
}

// ── Typed emitters ────────────────────────────
export const socketActions = {
  // Screen interaction
  tap:       (deviceId, x, y)              => getSocket().emit('device:tap',       { deviceId, x, y }),
  doubleTap: (deviceId, x, y)              => getSocket().emit('device:doubletap',  { deviceId, x, y }),
  longPress: (deviceId, x, y, duration)    => getSocket().emit('device:longpress',  { deviceId, x, y, duration }),
  swipe:     (deviceId, x1, y1, x2, y2, ms) => getSocket().emit('device:swipe',   { deviceId, x1, y1, x2, y2, duration: ms }),
  type:      (deviceId, text)              => getSocket().emit('device:type',       { deviceId, text }),
  keyevent:  (deviceId, keycode)           => getSocket().emit('device:keyevent',   { deviceId, keycode }),
  back:      (deviceId)                    => getSocket().emit('device:back',       { deviceId }),
  home:      (deviceId)                    => getSocket().emit('device:home',       { deviceId }),
  recents:   (deviceId)                    => getSocket().emit('device:recents',    { deviceId }),
  enter:     (deviceId)                    => getSocket().emit('device:enter',      { deviceId }),

  // App control
  launchApp: (deviceId, pkg, act)          => getSocket().emit('device:launch_app', { deviceId, packageName: pkg, activity: act }),
  stopApp:   (deviceId, pkg)               => getSocket().emit('device:stop_app',   { deviceId, packageName: pkg }),
  openUrl:   (deviceId, url)               => getSocket().emit('device:open_url',   { deviceId, url }),
  shell:     (deviceId, command)           => getSocket().emit('device:shell',      { deviceId, command }),
  screenshot:(deviceId)                    => getSocket().emit('device:screenshot', { deviceId }),

  // Emulator lifecycle
  createEmulator: (opts)                   => getSocket().emit('emulator:create',   opts),
  stopEmulator:   (deviceId)               => getSocket().emit('emulator:stop',     { deviceId }),
  restartEmulator:(deviceId)               => getSocket().emit('emulator:restart',  { deviceId }),
  stopAll:        ()                       => getSocket().emit('emulator:stop_all'),

  // WebRTC
  requestStream: (deviceId)               => getSocket().emit('webrtc:request_stream', { deviceId }),
  sendAnswer:    (deviceId, peerId, ans)  => getSocket().emit('webrtc:answer',    { deviceId, peerId, answer: ans }),
  sendIce:       (deviceId, peerId, cand) => getSocket().emit('webrtc:ice_candidate', { deviceId, peerId, candidate: cand }),
  stopStream:    (deviceId, peerId)       => getSocket().emit('webrtc:stop_stream', { deviceId, peerId }),

  // Metrics
  subscribeMetrics:   (deviceIds) => getSocket().emit('metrics:subscribe', { deviceIds }),
  unsubscribeMetrics: ()          => getSocket().emit('metrics:unsubscribe'),
};

export { socket };
