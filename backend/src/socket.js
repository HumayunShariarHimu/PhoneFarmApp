'use strict';

module.exports = function socketHandler(io, pool) {
  io.on('connection', socket => {
    // Send current state
    socket.emit('farm:state', { devices: pool.getAllJSON(), stats: pool.getStats() });

    // ── DEVICE CONTROL ───────────────────────
    const handle = (action) => async (data) => {
      try {
        const result = await pool.action(data.id, action, data);
        if (action === 'screenshot') {
          socket.emit('device:screenshot', { id: data.id, frame: result });
        } else if (action === 'eval') {
          socket.emit('device:eval:result', { id: data.id, result });
        }
      } catch (e) {
        socket.emit('device:error', { id: data.id, error: e.message });
      }
    };

    socket.on('tap',          handle('tap'));
    socket.on('double_tap',   handle('double_tap'));
    socket.on('long_press',   handle('long_press'));
    socket.on('swipe',        handle('swipe'));
    socket.on('swipe_up',     handle('swipe_up'));
    socket.on('swipe_down',   handle('swipe_down'));
    socket.on('swipe_left',   handle('swipe_left'));
    socket.on('swipe_right',  handle('swipe_right'));
    socket.on('type',         handle('type'));
    socket.on('key',          handle('key'));
    socket.on('clear',        handle('clear'));
    socket.on('scroll_down',  handle('scroll_down'));
    socket.on('scroll_up',    handle('scroll_up'));
    socket.on('scroll_top',   handle('scroll_top'));
    socket.on('scroll_bottom',handle('scroll_bottom'));
    socket.on('back',         handle('back'));
    socket.on('forward',      handle('forward'));
    socket.on('reload',       handle('reload'));
    socket.on('goto',         handle('goto'));
    socket.on('screenshot',   handle('screenshot'));
    socket.on('eval',         handle('eval'));

    // ── DEVICE LIFECYCLE ─────────────────────
    socket.on('device:add', async (opts) => {
      try {
        const dev = await pool.add(opts);
        io.emit('farm:state', { devices: pool.getAllJSON(), stats: pool.getStats() });
        socket.emit('device:added', dev.toJSON());
      } catch (e) { socket.emit('device:error', { error: e.message }); }
    });

    socket.on('device:add_many', async ({ devices }) => {
      try {
        await pool.addMany(devices);
        io.emit('farm:state', { devices: pool.getAllJSON(), stats: pool.getStats() });
      } catch (e) { socket.emit('device:error', { error: e.message }); }
    });

    socket.on('device:remove', async ({ id }) => {
      await pool.remove(id).catch(() => {});
      io.emit('farm:state', { devices: pool.getAllJSON(), stats: pool.getStats() });
    });

    socket.on('device:start', async ({ id }) => {
      const dev = pool.get(id);
      if (dev) {
        await dev.start().catch(e => { dev.error = e.message; });
        io.emit('farm:state', { devices: pool.getAllJSON(), stats: pool.getStats() });
      }
    });

    socket.on('device:stop', async ({ id }) => {
      const dev = pool.get(id);
      if (dev) {
        await dev.stop();
        io.emit('farm:state', { devices: pool.getAllJSON(), stats: pool.getStats() });
      }
    });

    socket.on('device:restart', async ({ id }) => {
      const dev = pool.get(id);
      if (dev) {
        await dev.stop();
        await new Promise(r => setTimeout(r, 1000));
        await dev.start().catch(() => {});
        io.emit('farm:state', { devices: pool.getAllJSON(), stats: pool.getStats() });
      }
    });

    socket.on('farm:start_all', async () => {
      await pool.startAll();
      io.emit('farm:state', { devices: pool.getAllJSON(), stats: pool.getStats() });
    });

    socket.on('farm:stop_all', async () => {
      await pool.stopAll();
      io.emit('farm:state', { devices: pool.getAllJSON(), stats: pool.getStats() });
    });

    socket.on('farm:remove_all', async () => {
      await pool.removeAll();
      io.emit('farm:state', { devices: pool.getAllJSON(), stats: pool.getStats() });
    });

    // ── BATCH OPERATIONS ─────────────────────
    socket.on('batch', async ({ ids, action, params }) => {
      try {
        const results = await pool.batch(ids, action, params || {});
        socket.emit('batch:done', {
          action,
          results: results.map((r, i) => ({ id: ids[i], ok: r.status === 'fulfilled' })),
        });
        io.emit('farm:state', { devices: pool.getAllJSON(), stats: pool.getStats() });
      } catch (e) { socket.emit('device:error', { error: e.message }); }
    });

    // ── FRAME SUBSCRIPTION ───────────────────
    socket.on('subscribe', ({ id }) => socket.join(`dev:${id}`));
    socket.on('unsubscribe', ({ id }) => socket.leave(`dev:${id}`));

    socket.on('disconnect', () => {});
  });

  // Broadcast stats every 4s
  setInterval(() => {
    io.volatile.emit('farm:stats', pool.getStats());
  }, 4000);

  // Broadcast device list every 6s
  setInterval(() => {
    io.volatile.emit('farm:devices', pool.getAllJSON());
  }, 6000);
};
