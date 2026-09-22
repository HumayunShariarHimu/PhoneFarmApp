'use strict';

module.exports = function socketHandler(io, pool) {
  io.on('connection', socket => {
    socket.emit('farm:state', { devices: pool.getAllJSON(), stats: pool.getStats() });
    const broadcastState = () => io.emit('farm:state', { devices: pool.getAllJSON(), stats: pool.getStats() });
    const handle = action => async data => { try { const result = await pool.action(data.id, action, data); if (action === 'screenshot') socket.emit('device:screenshot', { id: data.id, frame: result }); else if (action === 'eval') socket.emit('device:eval:result', { id: data.id, result }); else if (['diagnostics', 'clipboard_get'].includes(action)) socket.emit(`device:${action}:result`, { id: data.id, result }); broadcastState(); } catch (e) { socket.emit('device:error', { id: data.id, error: e.message }); } };

    ['tap', 'double_tap', 'long_press', 'swipe', 'swipe_up', 'swipe_down', 'swipe_left', 'swipe_right', 'type', 'key', 'clear', 'scroll_down', 'scroll_up', 'scroll_top', 'scroll_bottom', 'back', 'forward', 'reload', 'goto', 'screenshot', 'eval', 'network', 'geolocation', 'clear_storage', 'diagnostics', 'clipboard_get', 'clipboard_set'].forEach(action => socket.on(action, handle(action)));

    socket.on('device:add', async opts => { try { const dev = await pool.add(opts); broadcastState(); socket.emit('device:added', dev.toJSON()); } catch (e) { socket.emit('device:error', { error: e.message }); } });
    socket.on('device:add_many', async ({ devices } = {}) => { try { await pool.addMany(Array.isArray(devices) ? devices : []); broadcastState(); } catch (e) { socket.emit('device:error', { error: e.message }); } });
    socket.on('device:remove', async ({ id } = {}) => { await pool.remove(id).catch(() => {}); broadcastState(); });
    socket.on('device:start', async ({ id } = {}) => { const dev = pool.get(id); if (dev) await pool.startDevice(id).catch(e => { dev.error = e.message; }); broadcastState(); });
    socket.on('device:stop', async ({ id } = {}) => { const dev = pool.get(id); if (dev) await dev.stop(); broadcastState(); });
    socket.on('device:restart', async ({ id } = {}) => { const dev = pool.get(id); if (dev) { await dev.stop(); await new Promise(r => setTimeout(r, 1000)); await pool.startDevice(id).catch(() => {}); } broadcastState(); });
    socket.on('farm:start_all', async () => { await pool.startAll(); broadcastState(); });
    socket.on('farm:stop_all', async () => { await pool.stopAll(); broadcastState(); });
    socket.on('farm:remove_all', async () => { await pool.removeAll(); broadcastState(); });
    socket.on('batch', async ({ ids, action, params } = {}) => { try { const safeIds = Array.isArray(ids) ? ids : []; const results = await pool.batch(safeIds, action, params || {}); socket.emit('batch:done', { action, results: results.map((r, i) => ({ id: safeIds[i], ok: r.status === 'fulfilled', error: r.reason?.message })) }); broadcastState(); } catch (e) { socket.emit('device:error', { error: e.message }); } });
    socket.on('subscribe', ({ id } = {}) => socket.join(`dev:${id}`));
    socket.on('unsubscribe', ({ id } = {}) => socket.leave(`dev:${id}`));
  });
  setInterval(() => io.volatile.emit('farm:stats', pool.getStats()), 4000);
  setInterval(() => io.volatile.emit('farm:devices', pool.getAllJSON()), 6000);
};
