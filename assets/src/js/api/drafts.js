import { request } from './client';

export const draftsApi = {
  list: () => request('GET', '/api/drafts'),
  get: (token) => request('GET', `/api/drafts/${token}`),
  save: (data) => request('POST', '/api/drafts', data),
  delete: (token) => request('DELETE', `/api/drafts/${token}`),
};