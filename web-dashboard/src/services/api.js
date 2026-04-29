import axios from 'axios';

const BASE_URL = 'http://localhost:3000/api/v1';

const api = axios.create({ baseURL: BASE_URL });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  res => res,
  err => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(err);
  }
);

export const login        = (email, password) => api.post('/auth/login', { email, password });
export const register     = (data)            => api.post('/auth/register', data);
export const getIssues    = (params)          => api.get('/issues', { params });
export const getMyIssues  = ()                => api.get('/issues/mine');
export const updateStatus = (id, status, note)=> api.patch(`/issues/${id}/status`, { status, note });
export const submitIssue  = (formData)        => api.post('/issues', formData, { headers:{ 'Content-Type':'multipart/form-data' } });
export const getWards     = ()                => api.get('/wards');
export const getWardStats = (wardId)          => api.get(`/wards/${wardId}/stats`);

export default api;