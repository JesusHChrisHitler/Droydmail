import { useState, useEffect, useRef, useCallback } from 'react';
import { adminApi } from '../../api/admin';
import { useCache } from '../../context/CacheContext';
import { ShieldIcon, SearchIcon, CloseIcon, ClockIcon } from '../icons';
import { Spinner } from '../ui/Spinner';
import { Modal, ModalActions } from '../modals/Modal';
import { ClickCopy } from '../ui/ClickCopy';

function UserDetailModal({ user, isOpen, onClose, currentUserId, onToggleRole }) {
  if (!user) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex items-start gap-fluid-3 mb-fluid-4">
        <div className="w-fluid-icon-xl h-fluid-icon-xl rounded-full bg-primary/20 flex items-center justify-center text-primary-light font-bold text-fluid-lg shrink-0">
          {user.username.charAt(0).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-fluid-2 mb-1">
            <span className="text-fluid-lg font-semibold text-white truncate">{user.username}</span>
            <span className={`inline-flex items-center gap-1 px-fluid-2 py-fluid-1 rounded-full text-fluid-xs font-medium ${
              user.role === 'admin' ? 'bg-primary/20 text-primary-light' : 'bg-surface-elevated text-gray-400'
            }`}>
              {user.role === 'admin' && <ShieldIcon className="w-fluid-icon-xs h-fluid-icon-xs" />}
              {user.role}
            </span>
          </div>
          <ClickCopy text={user.email} className="text-fluid-sm text-gray-400" />
        </div>
      </div>
      <div className="space-y-fluid-2 text-fluid-sm mb-fluid-3">
        <div className="flex items-center gap-fluid-2 text-gray-400">
          <ClockIcon className="w-fluid-icon-sm h-fluid-icon-sm shrink-0" />
          <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
        </div>
        {user.recovery_email && (
          <div className="text-gray-500 truncate">Recovery: {user.recovery_email}</div>
        )}
      </div>
      <ModalActions>
        {user.id !== currentUserId && (
          <button
            onClick={() => { onToggleRole(user); onClose(); }}
            className={`flex-1 px-fluid-4 py-fluid-2 rounded-lg text-fluid-sm font-medium transition-colors ${
              user.role === 'admin' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-primary/20 text-primary-light hover:bg-primary/30'
            }`}
          >
            {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
          </button>
        )}
        <button onClick={onClose} className="flex-1 px-fluid-4 py-fluid-2 rounded-lg text-fluid-sm font-medium bg-border text-gray-300 hover:bg-surface-elevated transition-colors">
          Close
        </button>
      </ModalActions>
    </Modal>
  );
}

export function Users({ currentUserId }) {
  const { getCachedData, setCachedData, updateCachedData } = useCache();
  const cachedUsers = getCachedData('adminUsers');
  const [users, setUsers] = useState(cachedUsers || []);
  const [loading, setLoading] = useState(!cachedUsers);
  const [searchQuery, setSearchQuery] = useState('');
  const [error, setError] = useState(null);
  const [displayLimit, setDisplayLimit] = useState(50);
  const [selectedUser, setSelectedUser] = useState(null);
  const [sortField, setSortField] = useState('created_at');
  const [sortDir, setSortDir] = useState('desc');
  const searchTimeout = useRef(null);
  const listRef = useRef(null);

  useEffect(() => { if (!cachedUsers) loadUsers(); }, []);

  useEffect(() => {
    const handleRoleChange = (e) => {
      setUsers(prev => prev.map(u => u.id === e.detail.user_id ? { ...u, role: e.detail.role } : u));
      updateCachedData('adminUsers', prev => prev.map(u => u.id === e.detail.user_id ? { ...u, role: e.detail.role } : u));
    };
    window.addEventListener('wsUserRoleChange', handleRoleChange);
    return () => window.removeEventListener('wsUserRoleChange', handleRoleChange);
  }, []);

  const loadUsers = async () => {
    try {
      const data = await adminApi.users();
      setUsers(data.users || []);
      setCachedData('adminUsers', data.users || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const toggleRole = async (user) => {
    const newRole = user.role === 'admin' ? 'user' : 'admin';
    try {
      await adminApi.setRole(user.id, newRole);
      setUsers(users.map(u => u.id === user.id ? { ...u, role: newRole } : u));
      updateCachedData('adminUsers', prev => prev.map(u => u.id === user.id ? { ...u, role: newRole } : u));
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    searchTimeout.current = setTimeout(() => setDisplayLimit(50), 300);
  };

  const clearSearch = () => {
    setSearchQuery('');
    setDisplayLimit(50);
  };

  const handleScroll = useCallback((e) => {
    const { scrollTop, scrollHeight, clientHeight } = e.target;
    if (scrollHeight - scrollTop <= clientHeight + 200) {
      setDisplayLimit(prev => prev + 50);
    }
  }, []);

  const filtered = users.filter(u =>
    u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.email.toLowerCase().includes(searchQuery.toLowerCase())
  ).sort((a, b) => {
    let cmp = 0;
    if (sortField === 'username') cmp = a.username.localeCompare(b.username);
    else if (sortField === 'role') cmp = a.role.localeCompare(b.role);
    else if (sortField === 'created_at') cmp = new Date(a.created_at) - new Date(b.created_at);
    return sortDir === 'asc' ? cmp : -cmp;
  });
  const displayUsers = filtered.slice(0, displayLimit);
  const hasMore = filtered.length > displayLimit;

  const toggleSort = (field) => {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    else { setSortField(field); setSortDir(field === 'username' ? 'asc' : 'desc'); }
  };

  const SortIndicator = ({ field }) => {
    if (sortField !== field) return <span className="text-gray-600 ml-1">↕</span>;
    return <span className="text-primary-light ml-1">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;

  return (
    <div className="h-full flex flex-col -mx-4 md:-mx-6 -mt-4 md:-mt-6">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border shrink-0">
        <h2 className="text-lg font-semibold text-white">Users</h2>
        <div className="flex items-center gap-3">
          <div className="relative max-w-xs w-full">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              placeholder="Search users..."
              value={searchQuery}
              onChange={handleSearchChange}
              className="form-input-compact !pl-9 !pr-8"
            />
            {searchQuery && (
              <button onClick={clearSearch} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-500 hover:text-white transition-colors">
                <CloseIcon className="w-4 h-4" />
              </button>
            )}
          </div>
          <select
            value={`${sortField}-${sortDir}`}
            onChange={(e) => {
              const [f, d] = e.target.value.split('-');
              setSortField(f);
              setSortDir(d);
            }}
            className="form-input-compact text-xs !py-1.5 !pr-6 bg-surface-base border-border text-gray-400 md:hidden"
          >
            <option value="created_at-desc">Newest</option>
            <option value="created_at-asc">Oldest</option>
            <option value="username-asc">Name A-Z</option>
            <option value="username-desc">Name Z-A</option>
            <option value="role-asc">Role</option>
          </select>
          <span className="text-sm text-gray-500 whitespace-nowrap">{filtered.length} users</span>
        </div>
      </div>

      {error && <div className="text-red-400 text-sm px-4 md:px-6 py-2">{error}</div>}

      {filtered.length === 0 ? (
        <div className="flex-1 flex items-center justify-center text-gray-500">No users found</div>
      ) : (
        <div ref={listRef} className="flex-1 overflow-auto" onScroll={handleScroll}>
          <div className="hidden md:block">
            <table className="w-full table-fixed border-separate border-spacing-0">
              <thead className="sticky top-0 bg-surface-body z-10">
                <tr className="border-b border-border text-left text-xs text-gray-500 uppercase tracking-wider">
                  <th className="w-[30%] px-4 py-3 border-r border-border cursor-pointer hover:text-white transition-colors select-none" onClick={() => toggleSort('username')}>User<SortIndicator field="username" /></th>
                  <th className="w-[25%] px-4 py-3 border-r border-border">Recovery</th>
                  <th className="w-[12%] px-4 py-3 border-r border-border cursor-pointer hover:text-white transition-colors select-none" onClick={() => toggleSort('role')}>Role<SortIndicator field="role" /></th>
                  <th className="w-[15%] px-4 py-3 border-r border-border cursor-pointer hover:text-white transition-colors select-none" onClick={() => toggleSort('created_at')}>Joined<SortIndicator field="created_at" /></th>
                  <th className="w-[18%] px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayUsers.map(user => (
                  <tr key={user.id} className="hover:bg-surface-elevated transition-colors">
                    <td className="px-4 py-3 border-r border-b border-border">
                      <button onClick={() => setSelectedUser(user)} className="flex items-center gap-3 text-left hover:opacity-80 transition-opacity w-full">
                        <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-primary-light font-medium text-sm">
                          {user.username.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <div className="text-white font-medium truncate hover:text-primary-light transition-colors">{user.username}</div>
                        </div>
                      </button>
                    </td>
                    <td className="px-4 py-3 border-r border-b border-border">
                      {user.recovery_email ? <ClickCopy text={user.recovery_email} className="text-sm text-gray-400" /> : <span className="text-sm text-gray-500">—</span>}
                    </td>
                    <td className="px-4 py-3 border-r border-b border-border">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin' ? 'bg-primary/20 text-primary-light' : 'bg-surface-elevated text-gray-400'
                      }`}>
                        {user.role === 'admin' && <ShieldIcon className="w-3 h-3" />}
                        {user.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 border-r border-b border-border">
                      <span className="text-sm text-gray-500">{new Date(user.created_at).toLocaleDateString()}</span>
                    </td>
                    <td className="px-4 py-3 border-b border-border text-right">
                      {user.id !== currentUserId && (
                        <button
                          onClick={() => toggleRole(user)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                            user.role === 'admin' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-primary/20 text-primary-light hover:bg-primary/30'
                          }`}
                        >
                          {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="md:hidden p-4 space-y-3">
            {displayUsers.map(user => (
              <div key={user.id} className="bg-surface-base border border-border rounded-xl p-4">
                <button onClick={() => setSelectedUser(user)} className="flex items-start gap-3 w-full text-left">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary-light font-medium shrink-0">
                    {user.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium truncate hover:text-primary-light transition-colors">{user.username}</span>
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium shrink-0 ${
                        user.role === 'admin' ? 'bg-primary/20 text-primary-light' : 'bg-surface-elevated text-gray-400'
                      }`}>
                        {user.role === 'admin' && <ShieldIcon className="w-3 h-3" />}
                        {user.role}
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-gray-500">
                      <span>Joined {new Date(user.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </button>
                {user.id !== currentUserId && (
                  <div className="mt-3 pt-3 border-t border-border">
                    <button
                      onClick={() => toggleRole(user)}
                      className={`w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        user.role === 'admin' ? 'bg-red-500/20 text-red-400 hover:bg-red-500/30' : 'bg-primary/20 text-primary-light hover:bg-primary/30'
                      }`}
                    >
                      {user.role === 'admin' ? 'Remove Admin' : 'Make Admin'}
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
          {hasMore && (
            <div className="text-center py-4 text-gray-500 text-sm">
              Scroll for more...
            </div>
          )}
        </div>
      )}

      <UserDetailModal
        user={selectedUser}
        isOpen={!!selectedUser}
        onClose={() => setSelectedUser(null)}
        currentUserId={currentUserId}
        onToggleRole={toggleRole}
      />
    </div>
  );
}