export const getCacheKey = (folder, filter, recipient = []) => {
  let key = filter && filter !== 'all' ? `${folder}:${filter}` : folder;
  if (recipient.length > 0) key += `:r:${recipient.sort().join(',')}`;
  return key;
};

export const parseKey = (key) => {
  const [folder, filter = 'all'] = key.split(':');
  return { folder, filter };
};

export const matchesFilter = (email, filter) => {
  switch (filter) {
    case 'all': return true;
    case 'unread': return email.unread === true;
    case 'read': return email.unread === false;
    case 'attachments': return email.hasAttachments === true;
    default: return true;
  }
};

export const updateEmailInLists = (lists, token, updates) => {
  const next = { ...lists };
  Object.keys(next).forEach(key => {
    if (!next[key]?.emails) return;
    
    const { filter } = parseKey(key);
    const emailIndex = next[key].emails.findIndex(e => e.token === token);
    if (emailIndex === -1) return;
    
    const updatedEmail = { ...next[key].emails[emailIndex], ...updates };
    const stillMatches = matchesFilter(updatedEmail, filter);
    
    if (stillMatches) {
      next[key] = {
        ...next[key],
        emails: next[key].emails.map(e => e.token === token ? updatedEmail : e)
      };
    } else {
      next[key] = {
        ...next[key],
        emails: next[key].emails.filter(e => e.token !== token),
        total: Math.max(0, (next[key].total || 1) - 1)
      };
    }
  });
  return next;
};

export const removeEmailFromLists = (lists, token) => {
  const next = { ...lists };
  
  Object.keys(next).forEach(key => {
    if (!next[key]?.emails) return;
    const hadEmail = next[key].emails.some(e => e.token === token);
    if (hadEmail) {
      next[key] = {
        ...next[key],
        emails: next[key].emails.filter(e => e.token !== token),
        total: Math.max(0, (next[key].total || 1) - 1)
      };
    }
  });
  
  return next;
};

const insertSorted = (emails, email) => {
  const t = email.time || '';
  for (let i = 0; i < emails.length; i++) {
    if (t >= (emails[i].time || '')) return [...emails.slice(0, i), email, ...emails.slice(i)];
  }
  return [...emails, email];
};

export const addEmailToMatchingLists = (lists, email, folder) => {
  const next = { ...lists };
  
  Object.keys(next).forEach(key => {
    if (!next[key]?.emails) return;
    const { folder: keyFolder, filter } = parseKey(key);
    if (keyFolder !== folder) return;
    if (next[key].emails.some(e => e.token === email.token)) return;
    if (!matchesFilter(email, filter)) return;
    
    next[key] = {
      ...next[key],
      emails: insertSorted(next[key].emails, email),
      total: (next[key].total || 0) + 1
    };
  });
  
  return next;
};