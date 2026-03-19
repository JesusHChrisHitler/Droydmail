import { request } from './client';

export const aliasesApi = {
  list: () => request('GET', '/api/aliases'),
  create: (alias) => request('POST', '/api/aliases', { alias }),
  delete: (id) => request('DELETE', `/api/aliases/${id}`),
};