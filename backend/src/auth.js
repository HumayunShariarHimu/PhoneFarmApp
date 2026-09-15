'use strict';
const crypto = require('crypto');

const PASSWORD = process.env.FARM_PASSWORD || '369';
const SECRET = process.env.FARM_SESSION_SECRET || crypto.createHash('sha256').update(PASSWORD).digest('hex');
const TOKEN_TTL = 12 * 60 * 60 * 1000;

function sign(value) {
  return crypto.createHmac('sha256', SECRET).update(value).digest('hex');
}

function issueToken() {
  const payload = `${Date.now()}:${crypto.randomBytes(16).toString('hex')}`;
  return `${Buffer.from(payload).toString('base64url')}.${sign(payload)}`;
}

function isValidToken(token) {
  if (!token || typeof token !== 'string') return false;
  const [encoded, signature] = token.split('.');
  if (!encoded || !signature) return false;
  let payload;
  try { payload = Buffer.from(encoded, 'base64url').toString('utf8'); } catch { return false; }
  const created = Number(payload.split(':')[0]);
  if (!Number.isFinite(created) || Date.now() - created > TOKEN_TTL) return false;
  const expected = sign(payload);
  return signature.length === expected.length && crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

function tokenFromRequest(req) {
  const header = req.headers.authorization || '';
  return header.startsWith('Bearer ') ? header.slice(7) : req.headers['x-farm-token'];
}

function requireAuth(req, res, next) {
  if (!isValidToken(tokenFromRequest(req))) return res.status(401).json({ success: false, error: 'Authentication required' });
  next();
}

module.exports = { PASSWORD, issueToken, isValidToken, tokenFromRequest, requireAuth };
