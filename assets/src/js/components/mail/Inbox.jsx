import { useState, useCallback, useRef, useEffect } from 'react';
import { useSessionState } from '../../hooks/useSessionState';
import { useEmailList } from '../../hooks/useEmailList';
import { useCache } from '../../context/CacheContext';
import { useContactsContext } from '../../context/ContactsContext';
import { RefreshButton } from '../ui/RefreshButton';
import { EmailRow } from '../email/EmailRow';
import { EmptyState } from '../ui/EmptyState';
import { Spinner } from '../ui/Spinner';
import { Pagination } from '../ui/Pagination';
import { useToast } from '../ui/Toast';
import { ROUTES } from '../../routes';
import { mailApi } from '../../api';
import { SearchIcon, CloseIcon } from '../icons';
import { wsSearch } from '../../hooks/useSocket';
import { RecipientFilter } from './RecipientFilter';
import { BulkActions } from './BulkActions';

export function Inbox({ navigate, folder, user }) {
  const [filter, setFilter] = useSessionState(`${folder}:filter`, 'all');
  const [recipientFilter, setRecipientFilter] = useSessionState(`${folder}:recipientFilter`, 'all');
  const [selectedAliases, setSelectedAliases] = useSessionState(`${folder}:selectedAliases`, []);
  const [searchQuery, setSearchQuery] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('search') || '';
  });
  const listRef = useRef(null);
  const savedScrollPos = useRef(0);
  const [searchResults, setSearchResults] = useState([]);
  const [selectedEmails, setSelectedEmails] = useState(new Set());
  const [searchTotal, setSearchTotal] = useState(0);
    const [searching, setSearching] = useState(() => (new URLSearchParams(window.location.search).get('search') || '').length >= 2);
  const [searchDisplayLimit, setSearchDisplayLimit] = useState(50);
  const searchTimeout = useRef(null);
  const cancelSearch = useRef(null);
  const { recipientArray, dropdown: recipientDropdown } = RecipientFilter({ user, recipientFilter, setRecipientFilter, selectedAliases, setSelectedAliases, folder });
  const { emails, loading, refreshing, refresh, hasMore, loadMore, loadingMore, total, batch, totalBatches } = useEmailList(folder, filter, recipientArray);
  const { getContactByEmail } = useContactsContext();
  const { moveEmail } = useCache();
  const toast = useToast();
  const folderLabel = folder.charAt(0).toUpperCase() + folder.slice(1);

  const doSearch = useCallback((query) => {
    if (!query.trim()) { setSearchResults([]); setSearchTotal(0); return; }
    if (cancelSearch.current) cancelSearch.current();
    setSearching(true);
    setSearchResults([]);
    setSearchTotal(0);
    setSearchDisplayLimit(50);
    cancelSearch.current = wsSearch(query, folder,
      (email) => setSearchResults(prev => [...prev, email]),
      (total) => { setSearchTotal(total); setSearching(false); }
    );
  }, [folder]);

  useEffect(() => {
    if (window.AndroidBridge?.setCanRefresh) {
      window.AndroidBridge.setCanRefresh(true);
    }
    if (searchQuery.length >= 2) {
      doSearch(searchQuery);
    }
    return () => {
      if (cancelSearch.current) cancelSearch.current();
      if (window.AndroidBridge?.setCanRefresh) {
        window.AndroidBridge.setCanRefresh(false);
      }
    };
  }, []);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    const url = new URL(window.location.href);
    if (query.length >= 2) {
      if (!savedScrollPos.current && listRef.current) {
        savedScrollPos.current = listRef.current.scrollTop;
      }
      url.searchParams.set('search', query);
      window.history.replaceState({}, '', url.pathname + url.search);
      searchTimeout.current = setTimeout(() => doSearch(query), 300);
    } else {
      setSearchResults([]); setSearchTotal(0);
      url.searchParams.delete('search');
      window.history.replaceState({}, '', url.pathname + url.search);
    }
  };

  const clearSearch = () => { 
    setSearchQuery(''); 
    setSearchResults([]); 
    setSearchTotal(0);
    setSearchDisplayLimit(50);
    if (cancelSearch.current) cancelSearch.current();
    const url = new URL(window.location.href);
    url.searchParams.delete('search');
    window.history.replaceState({}, '', url.pathname + url.search);
    if (savedScrollPos.current && listRef.current) {
      requestAnimationFrame(() => {
        if (listRef.current) listRef.current.scrollTop = savedScrollPos.current;
        savedScrollPos.current = 0;
      });
    }
  };

  const toggleSelect = (email) => {
    setSelectedEmails(prev => {
      const next = new Set(prev);
      if (next.has(email.token)) {
        next.delete(email.token);
      } else {
        next.add(email.token);
      }
      return next;
    });
  };

  const selectAll = () => {
    if (selectedEmails.size === displayEmails.length) {
      setSelectedEmails(new Set());
    } else {
      setSelectedEmails(new Set(displayEmails.map(e => e.token)));
    }
  };

  const clearSelection = () => {
    setSelectedEmails(new Set());
  };

  const handleBulkArchive = async () => {
    const tokens = [...selectedEmails];
    const dest = folder === 'archive' ? 'inbox' : 'archive';
    tokens.forEach(token => {
      const email = displayEmails.find(e => e.token === token);
      if (email) moveEmail(token, dest, email);
    });
    clearSelection();
    await mailApi.bulkMove(tokens, dest);
    toast.success(`${tokens.length} email${tokens.length !== 1 ? 's' : ''} ${folder === 'archive' ? 'restored' : 'archived'}`);
    refresh();
  };

  const handleBulkDelete = async () => {
    const tokens = [...selectedEmails];
    if (folder === 'trash') {
      tokens.forEach(token => {
        const email = displayEmails.find(e => e.token === token);
        if (email) moveEmail(token, null, email);
      });
      clearSelection();
      await mailApi.bulkDelete(tokens);
      toast.success(`${tokens.length} email${tokens.length !== 1 ? 's' : ''} permanently deleted`);
    } else {
      tokens.forEach(token => {
        const email = displayEmails.find(e => e.token === token);
        if (email) moveEmail(token, 'trash', email);
      });
      clearSelection();
      await mailApi.bulkMove(tokens, 'trash');
      toast.success(`${tokens.length} email${tokens.length !== 1 ? 's' : ''} moved to trash`);
    }
    refresh();
  };

  const handleBulkRestore = async () => {
    const tokens = [...selectedEmails];
    tokens.forEach(token => {
      const email = displayEmails.find(e => e.token === token);
      if (email) moveEmail(token, 'inbox', email);
    });
    clearSelection();
    await mailApi.bulkRestore(tokens);
    toast.success(`${tokens.length} email${tokens.length !== 1 ? 's' : ''} restored`);
    refresh();
  };

  const isSearchActive = searchQuery.length >= 2;
  const displayEmails = isSearchActive ? searchResults.slice(0, searchDisplayLimit) : emails;
  const displayTotal = isSearchActive ? searchTotal : total;
  const hasMoreSearchResults = isSearchActive && searchResults.length > searchDisplayLimit;

  const handleSwipeRight = async (email) => {
    const dest = folder === 'archive' ? 'inbox' : 'archive';
    moveEmail(email.token, dest, email);
    await mailApi.move(email.token, dest);
    toast.success(folder === 'archive' ? 'Restored to inbox' : 'Archived', {
      action: {
        label: 'Undo',
        onClick: async () => {
          moveEmail(email.token, folder, email);
          await mailApi.move(email.token, folder);
        }
      }
    });
  };

  const handleSwipeLeft = async (email) => {
    moveEmail(email.token, 'trash', email);
    await mailApi.move(email.token, 'trash');
    toast.success('Moved to trash', {
      action: {
        label: 'Undo',
        onClick: async () => {
          moveEmail(email.token, folder, email);
          await mailApi.move(email.token, folder);
        }
      }
    });
  };

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (window.AndroidBridge?.setCanRefresh) {
      window.AndroidBridge.setCanRefresh(scrollTop === 0);
    }
    if (scrollHeight - scrollTop <= clientHeight + 200) {
      if (isSearchActive && hasMoreSearchResults) {
        setSearchDisplayLimit(prev => prev + 50);
      } else if (!isSearchActive && hasMore && !loadingMore) {
        loadMore();
      }
    }
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex flex-col border-b border-border shrink-0">
        <div className="h-14 flex items-center justify-between px-4 md:px-6 gap-4">
          <h2 className="text-lg font-semibold text-white shrink-0">{folderLabel}</h2>
          <div className="flex items-center gap-3 flex-1 justify-end">
            <div className="relative max-w-xs w-full">
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
              <input type="text" value={searchQuery} onChange={handleSearchChange} placeholder="Search..." className="form-input-compact !pl-9 !pr-8" />
              {searchQuery && <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors"><CloseIcon className="w-4 h-4" /></button>}
            </div>
            {!isSearchActive && <RefreshButton onClick={refresh} disabled={refreshing || loading} refreshing={refreshing} />}
            <span className="text-sm text-gray-500 whitespace-nowrap">{isSearchActive ? (searching ? 'Searching...' : `${displayTotal} results`) : `${total} messages`}</span>
          </div>
        </div>
        <div className="flex items-center gap-1 px-4 md:px-6 pb-3 flex-wrap">
          {[
            { id: 'all', label: 'All' },
            { id: 'read', label: 'Read' },
            { id: 'unread', label: 'Unread' },
            { id: 'attachments', label: 'Has attachments' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filter === f.id
                  ? 'bg-primary text-white'
                  : 'text-gray-400 hover:text-white hover:bg-border'
              }`}
            >
              {f.label}
            </button>
          ))}
          {recipientDropdown}
        </div>
      </div>
      <BulkActions
        selectedCount={selectedEmails.size}
        onArchive={handleBulkArchive}
        onDelete={handleBulkDelete}
        onRestore={handleBulkRestore}
        onClear={clearSelection}
        onSelectAll={selectAll}
        totalCount={displayEmails.length}
        allSelected={displayEmails.length > 0 && selectedEmails.size === displayEmails.length}
        isTrash={folder === 'trash'}
      />
      {loading || (searching && displayEmails.length === 0) ? (
        <div className="flex-1 flex items-center justify-center">
          <Spinner />
        </div>
      ) : displayEmails.length === 0 ? (
        <EmptyState message={isSearchActive ? 'No emails match your search' : (filter === 'all' ? `No messages in ${folderLabel.toLowerCase()}` : `No ${filter} messages`)} />
      ) : (
        <div ref={listRef} className="flex-1 overflow-auto" onScroll={handleScroll}>
          {displayEmails.map((email, i) => (
            <EmailRow 
              key={email.token || i} 
              email={email}
              contact={getContactByEmail(email.from)}
              onClick={() => navigate(`${ROUTES[folder] || ROUTES.inbox}/${email.token}`)} 
              onSwipeLeft={folder !== 'trash' && selectedEmails.size === 0 ? handleSwipeLeft : undefined}
              onSwipeRight={folder !== 'trash' && selectedEmails.size === 0 ? handleSwipeRight : undefined}
              swipeRightLabel={folder === 'archive' ? 'Restore' : 'Archive'}
              swipeLeftLabel="Delete"
              highlightText={isSearchActive ? searchQuery : ''}
              selected={selectedEmails.has(email.token)}
              onSelect={toggleSelect}
            />
          ))}
          {!isSearchActive && <Pagination batch={batch} totalBatches={totalBatches} hasMore={hasMore} loadMore={loadMore} loadingMore={loadingMore} />}
        </div>
      )}
    </div>
  );
}