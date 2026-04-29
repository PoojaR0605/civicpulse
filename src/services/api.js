import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export const login = (email, password) =>
  api.post('/auth/login', { email, password });

export const getIssues = (params) =>
  api.get('/issues', { params });

export const updateStatus = (id, status, note) =>
  api.patch(`/issues/${id}/status`, { status, note });

export const getWards = () =>
  api.get('/wards');

export const getWardStats = (wardId) =>
  api.get(`/wards/${wardId}/stats`);

export default api;