'use strict';

const crypto = require('crypto');

const PAIR_CODE_TTL = 10 * 60 * 1000;
const CONNECTOR_TOKEN_TTL = 30 * 24 * 60 * 60 * 1000;
const pairCodes = new Map();
const connectors = new Map();

function now() { return Date.now(); }
function randomToken(prefix) { return `${prefix}_${crypto.randomBytes(24).toString('base64url')}`; }
function prune() {
  const current = now();
  for (const [code, item] of pairCodes) if (item.expiresAt <= current || item.used) pairCodes.delete(code);
  for (const [token, item] of connectors) if (item.expiresAt <= current || item.revoked) connectors.delete(token);
}
function safeConnector(item) {
  return {
    id: item.id,
    deviceId: item.deviceId,
    name: item.name,
    platform: item.platform,
    status: item.lastSeenAt && now() - item.lastSeenAt < 90_000 ? 'online' : 'offline',
    pairedAt: item.pairedAt,
    lastSeenAt: item.lastSeenAt,
    capabilities: item.capabilities || [],
  };
}
function createPairCode() {
  prune();
  let code;
  do code = String(crypto.randomInt(100000, 1000000)); while (pairCodes.has(code));
  pairCodes.set(code, { createdAt: now(), expiresAt: now() + PAIR_CODE_TTL, used: false });
  return { code, expiresAt: pairCodes.get(code).expiresAt };
}
function pair({ code, deviceId, name, platform, consent, capabilities }) {
  prune();
  const normalizedCode = String(code || '').trim();
  const item = pairCodes.get(normalizedCode);
  if (!item || item.used || item.expiresAt <= now()) throw new Error('Pairing code is invalid or expired.');
  if (consent !== true) throw new Error('Explicit owner consent is required.');
  if (!deviceId || String(deviceId).length > 160) throw new Error('A valid deviceId is required.');
  item.used = true;
  const token = randomToken('pfc');
  const connector = {
    id: crypto.randomUUID(), deviceId: String(deviceId), name: String(name || 'Android device').slice(0, 120),
    platform: String(platform || 'android').slice(0, 40), capabilities: Array.isArray(capabilities) ? capabilities.slice(0, 40) : [],
    pairedAt: now(), lastSeenAt: now(), expiresAt: now() + CONNECTOR_TOKEN_TTL, revoked: false,
  };
  connectors.set(token, connector);
  return { token, expiresIn: CONNECTOR_TOKEN_TTL, connector: safeConnector(connector) };
}
function authenticate(token) {
  prune();
  const item = connectors.get(String(token || ''));
  if (!item || item.revoked || item.expiresAt <= now()) return null;
  return item;
}
function heartbeat(token, data = {}) {
  const item = authenticate(token);
  if (!item) throw new Error('Connector authentication required.');
  item.lastSeenAt = now();
  if (data.name) item.name = String(data.name).slice(0, 120);
  if (Array.isArray(data.capabilities)) item.capabilities = data.capabilities.slice(0, 40);
  return safeConnector(item);
}
function revoke(token) {
  const item = authenticate(token);
  if (!item) throw new Error('Connector authentication required.');
  item.revoked = true;
  return { success: true };
}
function list() { prune(); return [...connectors.values()].map(safeConnector); }
module.exports = { createPairCode, pair, authenticate, heartbeat, revoke, list, PAIR_CODE_TTL };
