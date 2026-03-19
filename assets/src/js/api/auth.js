import { request } from './client';

export const authApi = {
  me: () => request('GET', '/api/me'),
  login: (username, password, captcha) => request('POST', '/api/login', { username, password }, captcha),
  register: (username, password, email, captcha) => request('POST', '/api/register', { username, password, email }, captcha),
  verify: (username, code) => request('POST', '/api/verify', { username, code }),
  logout: () => request('POST', '/api/logout'),
  sessions: () => request('GET', '/api/sessions'),
  revokeSession: (id) => request('DELETE', `/api/sessions/${id}`),
  getStorage: () => request('GET', '/api/storage'),
  getCaptchaConfig: () => request('GET', '/api/captcha/config'),
};