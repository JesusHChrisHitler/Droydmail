import { useEffect, useCallback, useRef } from 'react';
import { useCache } from '../context/CacheContext';

export function useEmailList(folder, filter = 'all', recipient = [], autoRefreshMs = 0) {
  const { getList, fetchList, loadMoreList, isLoading, isLoadingMore } = useCache();
  const getListRef = useRef(getList);
  const fetchListRef = useRef(fetchList);
  const loadMoreListRef = useRef(loadMoreList);
  getListRef.current = getList;
  fetchListRef.current = fetchList;
  loadMoreListRef.current = loadMoreList;

  const recipientKey = recipient.sort().join(',');
  const list = getList(folder, filter, recipient);
  const loading = isLoading(folder, filter, recipient);
  const loadingMore = isLoadingMore(folder, filter, recipient);
  const fetchedRef = useRef(null);

  useEffect(() => {
    const key = `${folder}:${filter}:${recipientKey}`;
    const cached = getListRef.current(folder, filter, recipient);
    if (cached) {
      fetchedRef.current = key;
      return;
    }
    if (fetchedRef.current === key) return;
    fetchedRef.current = key;
    fetchListRef.current(folder, filter, false, false, recipient);
  }, [folder, filter, recipientKey]);

  useEffect(() => {
    if (autoRefreshMs <= 0) return;
    const interval = setInterval(() => {
      const cached = getListRef.current(folder, filter, recipient);
      if (cached && Date.now() - cached.timestamp > autoRefreshMs) {
        fetchListRef.current(folder, filter, true, recipient);
      }
    }, autoRefreshMs);
    return () => clearInterval(interval);
  }, [folder, filter, recipientKey, autoRefreshMs]);

  const loadMore = useCallback(() => {
    loadMoreListRef.current(folder, filter, recipient);
  }, [folder, filter, recipientKey]);

  const refresh = useCallback(() => fetchListRef.current(folder, filter, true, false, recipient), [folder, filter, recipientKey]);

  return {
    emails: list?.emails || [],
    loading: !list && (loading || fetchedRef.current !== `${folder}:${filter}:${recipientKey}`),
    refreshing: loading && !!list,
    loadingMore,
    total: list?.total || 0,
    batch: list?.batch || 1,
    totalBatches: list?.totalBatches || 1,
    hasMore: (list?.batch || 1) < (list?.totalBatches || 1),
    loadMore,
    refresh
  };
}