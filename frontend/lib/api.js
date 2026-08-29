// ════════════════════════════════════════════
//  api.js — Backend REST API client
// ════════════════════════════════════════════
import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({
  baseURL: `${BASE}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use(cfg => {
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('pfarm_token');
    if (token) cfg.headers.Authorization = `Bearer ${token}`;
  }
  return cfg;
});

api.interceptors.response.use(
  res => res.data,
  err => Promise.reject(err?.response?.data || err)
);

// ─── Devices ─────────────────────────────────
export const devicesAPI = {
  list:      (params) => api.get('/devices', { params }),
  get:       (id)     => api.get(`/devices/${id}`),
  create:    (data)   => api.post('/devices', data),
  delete:    (id)     => api.delete(`/devices/${id}`),
  action:    (id, action, params) => api.post(`/devices/${id}/action`, { action, ...params }),
  install:   (id, formData) => api.post(`/devices/${id}/install`, formData, { headers: { 'Content-Type': 'multipart/form-data' }, timeout: 120000 }),
  apps:      (id)     => api.get(`/devices/${id}/apps`),
  screenshot:(id)     => api.get(`/devices/${id}/screenshot`),
  logs:      (id, params) => api.get(`/devices/${id}/logs`, { params }),
  startAll:  ()       => api.post('/devices/batch/start-all'),
  stopAll:   ()       => api.post('/devices/batch/stop-all'),
  batchAction:(deviceIds, action, params) => api.post('/devices/batch/action', { deviceIds, action, params }),
};

// ─── Tasks ───────────────────────────────────
export const tasksAPI = {
  list:       (params) => api.get('/tasks', { params }),
  get:        (id)     => api.get(`/tasks/${id}`),
  create:     (data)   => api.post('/tasks', data),
  delete:     (id)     => api.delete(`/tasks/${id}`),
  cancel:     (id)     => api.post(`/tasks/${id}/cancel`),
  retry:      (id)     => api.post(`/tasks/${id}/retry`),
  queueStats: ()       => api.get('/tasks/queue/stats'),
};

// ─── Accounts ────────────────────────────────
export const accountsAPI = {
  list:   (params) => api.get('/accounts', { params }),
  get:    (id)     => api.get(`/accounts/${id}`),
  create: (data)   => api.post('/accounts', data),
  update: (id, data) => api.patch(`/accounts/${id}`, data),
  delete: (id)     => api.delete(`/accounts/${id}`),
  import: (data)   => api.post('/accounts/import', data),
};

// ─── Proxies ─────────────────────────────────
export const proxiesAPI = {
  list:    (params) => api.get('/proxies', { params }),
  create:  (data)   => api.post('/proxies', data),
  delete:  (id)     => api.delete(`/proxies/${id}`),
  test:    (id)     => api.post(`/proxies/${id}/test`),
  testAll: ()       => api.post('/proxies/test-all'),
  import:  (data)   => api.post('/proxies/import', data),
};

// ─── Stream (WebRTC) ─────────────────────────
export const streamAPI = {
  getOffer: (deviceId)         => api.post('/stream/offer', { deviceId }),
  sendAnswer:(peerId, answer)  => api.post('/stream/answer', { peerId, answer }),
  sendIce:  (peerId, candidate)=> api.post('/stream/ice', { peerId, candidate }),
  stop:     (peerId)           => api.delete(`/stream/${peerId}`),
};

// ─── Analytics ───────────────────────────────
export const analyticsAPI = {
  overview: ()       => api.get('/analytics/overview'),
  earnings: (params) => api.get('/analytics/earnings', { params }),
  tasks:    ()       => api.get('/analytics/tasks'),
};

// ─── Settings ────────────────────────────────
export const settingsAPI = {
  get: () => api.get('/settings'),
};

export default api;
