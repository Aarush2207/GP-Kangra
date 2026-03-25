import axios from 'axios';

const API_BASE =
  (import.meta.env.VITE_API_BASE_URL || import.meta.env.VITE_API_URL || '/api').replace(/\/+$/, '');

// Create axios instance
const api = axios.create({
  baseURL: API_BASE,
  timeout: 30000,
});

// Auto-attach JWT token
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auto-logout on 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('manager');
      window.location.href = '/login';
    }
    return Promise.reject(err);
  }
);

// ─── Auth ─────────────────────────────────────────────────────
export const login = (email, password) =>
  api.post('/auth/login', { email, password }).then(r => r.data);

// ─── Employees ────────────────────────────────────────────────
export const getEmployees = () => api.get('/employees').then(r => r.data);

export const getEmployee = (id) =>
  api.get(`/employees/${id}`).then(r => r.data);

export const createEmployee = (data) =>
  api.post('/employees', data).then(r => r.data);

export const updateEmployee = (id, data) =>
  api.put(`/employees/${id}`, data).then(r => r.data);

export const deleteEmployee = (id) =>
  api.delete(`/employees/${id}`).then(r => r.data);

export const rankEmployees = (roleId, top = 5) =>
  api.get(`/employees/rank/${roleId}?top=${top}`).then(r => r.data);

export const sendNotification = (employeeId, data) =>
  api.post(`/employees/${employeeId}/notifications`, data).then(r => r.data);

export const getNotifications = (employeeId) =>
  api.get(`/employees/${employeeId}/notifications`).then(r => r.data);

export const markNotificationRead = (employeeId, notifId) =>
  api.patch(`/employees/${employeeId}/notifications/${notifId}/read`).then(r => r.data);

export const getEmployeeCourses = (employeeId) =>
  api.get(`/employees/${employeeId}/courses`).then(r => r.data);

// ─── Roles ────────────────────────────────────────────────────
export const getRoles = () => api.get('/roles').then(r => r.data);

export const createRole = (data) =>
  api.post('/roles', data).then(r => r.data);

export const deleteRole = (id) =>
  api.delete(`/roles/${id}`).then(r => r.data);

export const getSkillGap = (roleId, employeeId) =>
  api.get(`/roles/${roleId}/gap/${employeeId}`).then(r => r.data);

// ─── Interview ────────────────────────────────────────────────
export const startInterview = (payload) => {
  // payload can be FormData (PDF) or JSON { resumeText }
  // NOTE: Do NOT manually set Content-Type for FormData — axios must auto-set it
  // with the correct multipart boundary. Setting it manually strips the boundary
  // and breaks the server's ability to parse the file.
  const isFormData = payload instanceof FormData;
  return api.post('/interview/start', payload, {
    headers: isFormData ? { 'Content-Type': undefined } : {},
    timeout: 60000, // PDF parsing + Gemini can take up to 60s
  }).then(r => r.data);
};

export const evaluateInterview = (data) =>
  api.post('/interview/evaluate', data).then(r => r.data);

export const saveInterview = (data) =>
  api.post('/interview/save', data).then(r => r.data);

export default api;
