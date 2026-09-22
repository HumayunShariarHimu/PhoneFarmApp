import axios from 'axios';

const BASE = String(process.env.NEXT_PUBLIC_API_URL || 'https://vpfarm-backend.onrender.com').replace(/\/+$/, '');

// Render free services can take 30–90 seconds to wake from sleep. Keep the
// request alive long enough for the service to wake instead of showing a
// misleading device-creation failure while Chromium is still booting.
const api = axios.create({ baseURL: `${BASE}/api`, timeout: 120000 });
api.interceptors.request.use(config => {
  if (typeof window !== 'undefined') {
    const token = window.localStorage.getItem('farm_token');
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
api.interceptors.response.use(r => r.data, e => {
  if (e?.response?.status === 401 && typeof window !== 'undefined') window.dispatchEvent(new Event('farm:logout'));
  return Promise.reject(e?.response?.data || e);
});

export const authAPI = {
  login: password => axios.post(`${BASE}/api/auth/login`, { password }).then(r => r.data),
};

export const devicesAPI = {
  list:       ()              => api.get('/devices'),
  get:        (id)            => api.get(`/devices/${id}`),
  add:        (data)          => api.post('/devices', data),
  create:     (data)          => api.post('/devices', data),
  remove:     (id)            => api.delete(`/devices/${id}`),
  action:     (id, action, p) => api.post(`/devices/${id}/action`, { action, ...p }),
  goto:       (id, url)       => api.post(`/devices/${id}/goto`, { url }),
  screenshot: (id)            => api.get(`/devices/${id}/screenshot`),
  batch:      (ids,act,params)=> api.post('/batch', { ids, action:act, params }),
  startAll:   ()              => api.post('/farm/start-all'),
  stopAll:    ()              => api.post('/farm/stop-all'),
  removeAll:  ()              => api.post('/farm/remove-all'),
  stats:      ()              => api.get('/stats'),
  diagnostics:(id)           => api.get(`/devices/${id}/diagnostics`),
  logs:       (id)           => api.get(`/devices/${id}/logs`),
  clearStorage:(id)          => api.post(`/devices/${id}/storage/clear`),
  network:    (id, profile)   => api.post(`/devices/${id}/network`, { profile }),
  geolocation:(id, data)     => api.post(`/devices/${id}/geolocation`, data),
  clipboard: (id, action, text) => api.post(`/devices/${id}/clipboard`, { action, text }),
  profiles:  ()              => api.get('/qa/profiles'),
  recordings:()              => api.get('/recordings'),
  createRecording: name     => api.post('/recordings', { name }),
  addRecordingAction:(id, action) => api.post(`/recordings/${id}/actions`, action),
  replayRecording:(id, ids) => api.post(`/recordings/${id}/replay`, { ids }),
  deleteRecording:(id)      => api.delete(`/recordings/${id}`),
};

export default api;
