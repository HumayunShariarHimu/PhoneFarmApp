'use strict';
const crypto = require('crypto');

const pending = new Map();
const active = new Map();

function id() { return crypto.randomBytes(18).toString('hex'); }
function cleanExpired() {
  const now = Date.now();
  for (const [code, value] of pending) if (value.expiresAt < now) pending.delete(code);
  for (const [token, value] of active) if (now - value.lastSeen > 10 * 60 * 1000) active.delete(token);
}
function issuePairCode() {
  cleanExpired();
  let code;
  do code = String(Math.floor(100000 + Math.random() * 900000)); while (pending.has(code));
  pending.set(code, { expiresAt: Date.now() + 10 * 60 * 1000 });
  return { code, expiresIn: 600 };
}
function router({ requireAuth }) {
  const express = require('express');
  const r = express.Router();
  r.post('/pair-request', requireAuth, (req, res) => res.json({ success: true, ...issuePairCode() }));
  r.post('/pair', (req, res) => {
    cleanExpired();
    const code = String(req.body?.code || '');
    const consent = req.body?.consent === true;
    if (!consent) return res.status(400).json({ success: false, error: 'Explicit device-owner consent is required.' });
    if (!pending.has(code)) return res.status(401).json({ success: false, error: 'Pairing code is invalid or expired.' });
    pending.delete(code);
    const token = id();
    const device = { token, deviceId: String(req.body.deviceId || id()), name: String(req.body.name || 'Android device').slice(0, 80), platform: 'android', createdAt: new Date().toISOString(), lastSeen: Date.now(), status: 'online' };
    active.set(token, device);
    res.json({ success: true, token, deviceId: device.deviceId, expiresIn: 30 * 24 * 60 * 60 });
  });
  r.post('/heartbeat', (req, res) => {
    cleanExpired();
    const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, '');
    const device = active.get(token);
    if (!device) return res.status(401).json({ success: false, error: 'Connector is not paired.' });
    device.lastSeen = Date.now(); device.status = 'online';
    if (req.body?.name) device.name = String(req.body.name).slice(0, 80);
    res.json({ success: true, data: { deviceId: device.deviceId, status: device.status, serverTime: new Date().toISOString() } });
  });
  r.get('/', requireAuth, (req, res) => { cleanExpired(); res.json({ success: true, data: [...active.values()].map(({ token, ...device }) => ({ ...device, status: Date.now() - device.lastSeen < 90000 ? 'online' : 'offline' })) }); });
  r.post('/revoke', (req, res) => { const token = String(req.headers.authorization || '').replace(/^Bearer\s+/i, ''); active.delete(token); res.json({ success: true }); });
  return r;
}
module.exports = { router };
