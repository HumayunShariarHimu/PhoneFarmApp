// socket.js
import { io } from 'socket.io-client';

const WS = process.env.NEXT_PUBLIC_WS_URL || 'https://vpfarm-backend.onrender.com';
let socket = null;

export function getSocket() {
  if (!socket) {
    socket = io(WS, { transports:['websocket','polling'], reconnection:true, reconnectionDelay:1000 });
    socket.on('connect',       () => console.log('[WS] connected'));
    socket.on('disconnect',    () => console.log('[WS] disconnected'));
    socket.on('connect_error', e  => console.warn('[WS] error:', e.message));
  }
  return socket;
}

// Typed actions for device control
export const ctrl = {
  tap:        (id, x, y)              => getSocket().emit('tap',        { id, x, y }),
  doubleTap:  (id, x, y)              => getSocket().emit('double_tap', { id, x, y }),
  longPress:  (id, x, y, ms)          => getSocket().emit('long_press', { id, x, y, ms }),
  swipe:      (id, x1,y1,x2,y2,ms)   => getSocket().emit('swipe',      { id, x1, y1, x2, y2, ms }),
  swipeUp:    (id)                    => getSocket().emit('swipe_up',   { id }),
  swipeDown:  (id)                    => getSocket().emit('swipe_down', { id }),
  swipeLeft:  (id)                    => getSocket().emit('swipe_left', { id }),
  swipeRight: (id)                    => getSocket().emit('swipe_right',{ id }),
  type:       (id, text)              => getSocket().emit('type',       { id, text }),
  key:        (id, key)               => getSocket().emit('key',        { id, key }),
  clear:      (id)                    => getSocket().emit('clear',      { id }),
  scrollDown: (id, px)                => getSocket().emit('scroll_down',{ id, px }),
  scrollUp:   (id, px)                => getSocket().emit('scroll_up',  { id, px }),
  scrollTop:  (id)                    => getSocket().emit('scroll_top', { id }),
  scrollBot:  (id)                    => getSocket().emit('scroll_bottom',{ id }),
  back:       (id)                    => getSocket().emit('back',       { id }),
  forward:    (id)                    => getSocket().emit('forward',    { id }),
  reload:     (id)                    => getSocket().emit('reload',     { id }),
  goto:       (id, url)               => getSocket().emit('goto',       { id, url }),
  screenshot: (id)                    => getSocket().emit('screenshot', { id }),
  eval:       (id, code)              => getSocket().emit('eval',       { id, code }),

  addDevice:  (opts)                  => getSocket().emit('device:add',      opts),
  addMany:    (devices)               => getSocket().emit('device:add_many', { devices }),
  removeDevice:(id)                   => getSocket().emit('device:remove',   { id }),
  startDevice:(id)                    => getSocket().emit('device:start',    { id }),
  stopDevice: (id)                    => getSocket().emit('device:stop',     { id }),
  restart:    (id)                    => getSocket().emit('device:restart',  { id }),
  startAll:   ()                      => getSocket().emit('farm:start_all'),
  stopAll:    ()                      => getSocket().emit('farm:stop_all'),
  removeAll:  ()                      => getSocket().emit('farm:remove_all'),
  batch:      (ids, action, params)   => getSocket().emit('batch', { ids, action, params }),
  subscribe:  (id)                    => getSocket().emit('subscribe',   { id }),
  unsubscribe:(id)                    => getSocket().emit('unsubscribe', { id }),
};
