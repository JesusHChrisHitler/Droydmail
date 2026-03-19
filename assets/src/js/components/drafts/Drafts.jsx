import { useState, useEffect, useRef } from 'react';
import { draftsApi } from '../../api';
import { useCache } from '../../context/CacheContext';
import { DraftRow } from './DraftRow';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import { RefreshButton } from '../ui/RefreshButton';
import { useToast } from '../ui/Toast';
import { ROUTES } from '../../routes';

export function Drafts({ navigate }) {
  const { getCachedData, setCachedData, updateCachedData } = useCache();
  const cached = getCachedData('drafts');
  const [loading, setLoading] = useState(!cached);
  const [refreshing, setRefreshing] = useState(false);
  const hasFetched = useRef(false);
  const toast = useToast();

  const load = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    try {
      const data = await draftsApi.list();
      setCachedData('drafts', { drafts: data.drafts || [] });
    } catch {
      if (!hasFetched.current) toast.error('Failed to load drafts');
    } finally {
      hasFetched.current = true;
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleDelete = async (token) => {
    updateCachedData('drafts', prev => ({
      ...prev,
      drafts: prev.drafts.filter(d => d.token !== token)
    }));
    try {
      await draftsApi.delete(token);
      toast.success('Draft deleted');
    } catch {
      toast.error('Failed to delete draft');
      load();
    }
  };

  const drafts = cached?.drafts || [];

  return (
    <div className="h-full flex flex-col">
      <div className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border shrink-0">
        <h2 className="text-lg font-semibold text-white">Drafts</h2>
        <div className="flex items-center gap-3">
          <RefreshButton onClick={() => load(true)} disabled={refreshing || loading} refreshing={refreshing} />
          <span className="text-sm text-gray-500">{drafts.length} drafts</span>
        </div>
      </div>
      {loading ? (
        <div className="flex-1 flex items-center justify-center"><Spinner /></div>
      ) : drafts.length === 0 ? (
        <EmptyState message="No drafts" />
      ) : (
        <div className="flex-1 overflow-auto">
          {drafts.map(draft => (
            <DraftRow
              key={draft.token}
              draft={draft}
              onClick={() => navigate(`${ROUTES.compose}?draft=${draft.token}`)}
              onDelete={() => handleDelete(draft.token)}
            />
          ))}
        </div>
      )}
    </div>
  );
}