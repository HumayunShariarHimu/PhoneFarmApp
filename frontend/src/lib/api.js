import axios from 'axios';

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

const api = axios.create({ baseURL: `${BASE}/api`, timeout: 30000 });
api.interceptors.response.use(r => r.data, e => Promise.reject(e?.response?.data || e));

export const devicesAPI = {
  list:       ()              => api.get('/devices'),
  get:        (id)            => api.get(`/devices/${id}`),
  add:        (data)          => api.post('/devices', data),
  remove:     (id)            => api.delete(`/devices/${id}`),
  action:     (id, action, p) => api.post(`/devices/${id}/action`, { action, ...p }),
  goto:       (id, url)       => api.post(`/devices/${id}/goto`, { url }),
  screenshot: (id)            => api.get(`/devices/${id}/screenshot`),
  batch:      (ids,act,params)=> api.post('/batch', { ids, action:act, params }),
  startAll:   ()              => api.post('/farm/start-all'),
  stopAll:    ()              => api.post('/farm/stop-all'),
  removeAll:  ()              => api.post('/farm/remove-all'),
  stats:      ()              => api.get('/stats'),
};

export default api;
