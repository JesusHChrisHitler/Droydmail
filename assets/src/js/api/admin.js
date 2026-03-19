import { request } from './client';

export const adminApi = {
  users: () => request('GET', '/api/admin/users'),
  getUser: (userId) => request('GET', `/api/admin/users/${userId}`),
  setRole: (userId, role) => request('POST', '/api/admin/set-role', { user_id: userId, role }),
  reports: () => request('GET', '/api/admin/reports'),
  getReport: (token) => request('GET', `/api/admin/reports/${token}`),
  deleteReport: (token) => request('DELETE', `/api/admin/reports/${token}`),
  bulkDeleteReports: (tokens) => request('POST', '/api/admin/reports/bulk-delete', { tokens }),
};