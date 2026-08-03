import axios from 'axios';

const BACKEND_URL = process.env.REACT_APP_BACKEND_URL;
export const API = `${BACKEND_URL}/api`;

export const api = axios.create({ baseURL: API });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('swell_admin_token');
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export const uploadFile = async (file) => {
  const fd = new FormData();
  fd.append('file', file);
  const { data } = await axios.post(`${API}/uploads`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
};

export const publicUrl = (path) => {
  if (!path) return '';
  if (path.startsWith('http')) return path;
  if (path.startsWith('/api')) return `${BACKEND_URL}${path}`;
  return path;
};
