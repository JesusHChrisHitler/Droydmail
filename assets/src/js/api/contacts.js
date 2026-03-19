import { request, requestWithFiles } from './client';

export const contactsApi = {
  list: () => request('GET', '/api/contacts'),
  get: (id) => request('GET', `/api/contacts/${id}`),
  create: (email, name, avatar = null) => {
    const formData = new FormData();
    formData.append('email', email);
    formData.append('name', name);
    if (avatar) formData.append('avatar', avatar);
    return requestWithFiles('POST', '/api/contacts', formData);
  },
  update: (id, name, avatar = null) => {
    const formData = new FormData();
    formData.append('name', name);
    if (avatar) formData.append('avatar', avatar);
    return requestWithFiles('PUT', `/api/contacts/${id}`, formData);
  },
  delete: (id) => request('DELETE', `/api/contacts/${id}`),
};