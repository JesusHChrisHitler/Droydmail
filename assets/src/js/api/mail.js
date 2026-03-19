import { request, requestWithFiles, uploadWithProgress } from './client';

export const mailApi = {
  list: (folder = 'inbox', batch = 1, size = 50, filter = '', recipient = []) => request('POST', '/api/mail/list', { folder, batch, size, filter, recipient }),
  get: (id) => request('GET', `/api/mail/${id}`),
  send: (to, cc, subject, body, attachments = [], onProgress = null, from = null) => {
    const formData = new FormData();
    if (from) formData.append('from', from);
    formData.append('to', to);
    if (cc) formData.append('cc', cc);
    formData.append('subject', subject);
    formData.append('body', body);
    attachments.forEach(file => formData.append('attachments', file));
    if (onProgress && attachments.length > 0) {
      return uploadWithProgress('POST', '/api/mail', formData, onProgress);
    }
    return requestWithFiles('POST', '/api/mail', formData);
  },
  delete: (id) => request('DELETE', `/api/mail/${id}`),
  move: (id, folder) => request('PATCH', `/api/mail/${id}`, { folder }),
  restore: (id) => request('POST', `/api/mail/${id}/restore`),
  getCounts: () => request('GET', '/api/mail/counts'),
  bulkMove: (tokens, folder) => request('POST', '/api/batch/move', { tokens, folder }),
  bulkDelete: (tokens) => request('POST', '/api/batch/delete', { tokens }),
  bulkRestore: (tokens) => request('POST', '/api/batch/restore', { tokens }),
};