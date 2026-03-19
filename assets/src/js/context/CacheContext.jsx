import { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';
import { mailApi } from '../api';
import { getCacheKey, updateEmailInLists, removeEmailFromLists, addEmailToMatchingLists } from '../cache/cacheUtils';

const CacheContext = createContext(null);

export function CacheProvider({ children }) {
  const [lists, setLists] = useState({});
  const [emails, setEmails] = useState({});
  const [reports, setReports] = useState({ data: null, timestamp: 0 });
  const [dataStore, setDataStore] = useState({});
  const [loading, setLoading] = useState({});
  const [loadingMore, setLoadingMore] = useState({});
  const fetchingRef = useRef({});

  const getList = useCallback((folder, filter = 'all', recipient = []) => lists[getCacheKey(folder, filter, recipient)] || null, [lists]);
  const getEmail = useCallback((token) => emails[token] || null, [emails]);

const fetchList = useCallback(async (folder, filter = 'all', forceRefresh = false, silent = false, recipient = []) => {
  const key = getCacheKey(folder, filter, recipient);
  const cached = lists[key];
  if (cached && !forceRefresh) return cached;
  if (fetchingRef.current[key]) return cached;

  fetchingRef.current[key] = true;
  if (!silent) setLoading(prev => ({ ...prev, [key]: true }));

  try {
    const currentBatch = cached?.batch || 1;
    const size = 50;
    const totalToFetch = currentBatch * size;
    const apiFilter = filter === 'all' ? '' : filter;
    const data = await mailApi.list(folder, 1, totalToFetch, apiFilter, recipient);
    const result = {
      emails: data.emails || [],
      total: data.total || 0,
      batch: currentBatch,
      totalBatches: Math.ceil((data.total || 0) / size) || 1,
      timestamp: Date.now()
    };
    setLists(prev => ({ ...prev, [key]: result }));
    if (data.counts) {
      window.dispatchEvent(new CustomEvent('unreadCounts', { detail: data.counts }));
    }
    return result;
  } finally {
    fetchingRef.current[key] = false;
    if (!silent) setLoading(prev => ({ ...prev, [key]: false }));
  }
}, [lists]);

const loadMoreList = useCallback(async (folder, filter = 'all', recipient = []) => {
  const key = getCacheKey(folder, filter, recipient);
  const cached = lists[key];
  if (!cached || cached.batch >= cached.totalBatches) return;
  if (fetchingRef.current[`${key}_more`]) return;

  fetchingRef.current[`${key}_more`] = true;
  setLoadingMore(prev => ({ ...prev, [key]: true }));

  try {
    const nextBatch = cached.batch + 1;
    const apiFilter = filter === 'all' ? '' : filter;
    const data = await mailApi.list(folder, nextBatch, 50, apiFilter, recipient);
    const newEmails = data.emails || [];
    const existingTokens = new Set(cached.emails.map(e => e.token));
    const unique = newEmails.filter(e => !existingTokens.has(e.token));

    setLists(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        emails: [...prev[key].emails, ...unique],
        batch: nextBatch,
        timestamp: Date.now()
      }
    }));
  } finally {
    fetchingRef.current[`${key}_more`] = false;
    setLoadingMore(prev => ({ ...prev, [key]: false }));
  }
}, [lists]);

  const fetchEmail = useCallback(async (token) => {
    const data = await mailApi.get(token);
    setEmails(prev => ({ ...prev, [token]: data }));
    setLists(prev => updateEmailInLists(prev, token, { unread: false }));
    window.dispatchEvent(new Event('refreshUnreadCounts'));
    return data;
  }, []);

  const markEmailRead = useCallback((token) => {
    setEmails(prev => prev[token] ? { ...prev, [token]: { ...prev[token], unread: false } } : prev);
    setLists(prev => updateEmailInLists(prev, token, { unread: false }));
    window.dispatchEvent(new Event('refreshUnreadCounts'));
  }, []);

  const removeEmail = useCallback((token) => {
    setEmails(prev => { const next = { ...prev }; delete next[token]; return next; });
    setLists(prev => removeEmailFromLists(prev, token));
    window.dispatchEvent(new Event('refreshUnreadCounts'));
  }, []);

  const moveEmail = useCallback((token, toFolder, emailData) => {
    setLists(prev => {
      let next = removeEmailFromLists(prev, token);
      if (emailData) next = addEmailToMatchingLists(next, emailData, toFolder);
      return next;
    });
    window.dispatchEvent(new Event('refreshUnreadCounts'));
  }, []);

  const invalidateList = useCallback((folder) => {
    setLists(prev => {
      const next = { ...prev };
      delete next[folder];
      return next;
    });
  }, []);

const isLoading = useCallback((folder, filter = 'all', recipient = []) => !!loading[getCacheKey(folder, filter, recipient)], [loading]);
const isLoadingMore = useCallback((folder, filter = 'all', recipient = []) => !!loadingMore[getCacheKey(folder, filter, recipient)], [loadingMore]);

  const getReports = useCallback(() => reports, [reports]);
  const setReportsList = useCallback((data) => {
    setReports({ data, timestamp: Date.now() });
  }, []);

  const addReport = useCallback((report) => {
    setReports(prev => ({
      data: prev.data ? [report, ...prev.data.filter(r => r.token !== report.token)] : [report],
      timestamp: Date.now()
    }));
  }, []);

  const removeReport = useCallback((token) => {
    setReports(prev => ({
      data: prev.data ? prev.data.filter(r => r.token !== token) : null,
      timestamp: Date.now()
    }));
  }, []);

  const removeReports = useCallback((tokens) => {
    const tokenSet = new Set(tokens);
    setReports(prev => ({
      data: prev.data ? prev.data.filter(r => !tokenSet.has(r.token)) : null,
      timestamp: Date.now()
    }));
  }, []);

  const markReportRead = useCallback((token) => {
    setReports(prev => ({
      ...prev,
      data: prev.data ? prev.data.map(r => r.token === token ? { ...r, unread: false } : r) : null
    }));
  }, []);

  const getCachedData = useCallback((key) => dataStore[key] || null, [dataStore]);
  const setCachedData = useCallback((key, data) => setDataStore(prev => ({ ...prev, [key]: data })), []);
  const updateCachedData = useCallback((key, updater) => setDataStore(prev => prev[key] ? { ...prev, [key]: updater(prev[key]) } : prev), []);

  useEffect(() => {
    const handleEmail = (e) => {
      const email = e.detail;
      if (email.folder) {
        setLists(prev => addEmailToMatchingLists(prev, email, email.folder));
      }
    };
    const handleMailMove = (e) => {
      const { token, fromFolder, toFolder, email } = e.detail;
      setLists(prev => {
        let next = removeEmailFromLists(prev, token);
        if (email && toFolder) next = addEmailToMatchingLists(next, email, toFolder);
        return next;
      });
      setEmails(prev => { const next = { ...prev }; delete next[token]; return next; });
    };
    const handleMailDelete = (e) => {
      const { token } = e.detail;
      setLists(prev => removeEmailFromLists(prev, token));
      setEmails(prev => { const next = { ...prev }; delete next[token]; return next; });
    };
    const handleBatchDelete = (e) => {
      const { tokens } = e.detail;
      setLists(prev => {
        let next = prev;
        tokens.forEach(token => { next = removeEmailFromLists(next, token); });
        return next;
      });
      setEmails(prev => {
        const next = { ...prev };
        tokens.forEach(token => { delete next[token]; });
        return next;
      });
    };
    const handleAdminReport = (e) => {
      const { token, from, subject, preview } = e.detail;
      addReport({
        token,
        from_addr: from,
        subject,
        preview,
        created_at: new Date().toISOString(),
        unread: true,
      });
    };
    window.addEventListener('wsEmail', handleEmail);
    window.addEventListener('wsMailMove', handleMailMove);
    window.addEventListener('wsMailDelete', handleMailDelete);
    window.addEventListener('wsBatchDelete', handleBatchDelete);
    window.addEventListener('wsAdminReport', handleAdminReport);
    return () => {
      window.removeEventListener('wsEmail', handleEmail);
      window.removeEventListener('wsMailMove', handleMailMove);
      window.removeEventListener('wsMailDelete', handleMailDelete);
      window.removeEventListener('wsBatchDelete', handleBatchDelete);
      window.removeEventListener('wsAdminReport', handleAdminReport);
    };
  }, []);

  return (
    <CacheContext.Provider value={{ 
      getList, getEmail, fetchList, loadMoreList, fetchEmail, invalidateList, isLoading, isLoadingMore, markEmailRead, removeEmail, moveEmail,
      getReports, setReportsList, addReport, removeReport, removeReports, markReportRead,
      getCachedData, setCachedData, updateCachedData
    }}>
      {children}
    </CacheContext.Provider>
  );
}

export function useCache() {
  const ctx = useContext(CacheContext);
  if (!ctx) throw new Error('useCache must be used within CacheProvider');
  return ctx;
}