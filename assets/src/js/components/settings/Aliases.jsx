import { useState, useEffect } from 'react';
import { aliasesApi } from '../../api/aliases';
import { useCache } from '../../context/CacheContext';
import { Modal, ModalHeader, ModalActions } from '../modals/Modal';
import { useToast } from '../ui/Toast';
import { MailIcon, TrashIcon, PlusIcon, RefreshIcon } from '../icons';
import { generateRandomAlias } from '../../utils';

export function Aliases({ user }) {
  const { getCachedData, setCachedData, updateCachedData } = useCache();
  const cached = getCachedData('aliases');
  const [aliases, setAliases] = useState(cached?.aliases || []);
  const [limit, setLimit] = useState(cached?.limit || 3);
  const [loading, setLoading] = useState(!cached);
  const [showAdd, setShowAdd] = useState(false);
  const [newAlias, setNewAlias] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const toast = useToast();
  const domain = user.email.split('@')[1];

  useEffect(() => {
    if (cached) return;
    aliasesApi.list().then(data => {
      if (data && !data.error) {
        setAliases(data.aliases || []);
        setLimit(data.limit || 3);
        setCachedData('aliases', { aliases: data.aliases || [], limit: data.limit || 3 });
      }
      setLoading(false);
    });
  }, []);

  useEffect(() => {
    const handleCreate = (e) => {
      setAliases(prev => {
        if (prev.some(a => a.id === e.detail.id)) return prev;
        return [e.detail, ...prev];
      });
      updateCachedData('aliases', prev => ({ ...prev, aliases: prev.aliases.some(a => a.id === e.detail.id) ? prev.aliases : [e.detail, ...prev.aliases] }));
    };
    const handleDelete = (e) => {
      setAliases(prev => prev.filter(a => a.id !== e.detail.id));
      updateCachedData('aliases', prev => ({ ...prev, aliases: prev.aliases.filter(a => a.id !== e.detail.id) }));
    };
    window.addEventListener('wsAliasCreate', handleCreate);
    window.addEventListener('wsAliasDelete', handleDelete);
    return () => {
      window.removeEventListener('wsAliasCreate', handleCreate);
      window.removeEventListener('wsAliasDelete', handleDelete);
    };
  }, []);

  const handleAdd = async () => {
    if (!newAlias.trim()) return;
    setSubmitting(true);
    try {
      const result = await aliasesApi.create(newAlias.trim().toLowerCase());
      setAliases([result, ...aliases]);
      updateCachedData('aliases', prev => ({ ...prev, aliases: [result, ...prev.aliases] }));
      setNewAlias('');
      setShowAdd(false);
      toast.success('Alias created');
    } catch (err) {
      toast.error(err.message);
    }
    setSubmitting(false);
  };

  const handleDelete = async (id) => {
    try {
      await aliasesApi.delete(id);
      setAliases(aliases.filter(a => a.id !== id));
      updateCachedData('aliases', prev => ({ ...prev, aliases: prev.aliases.filter(a => a.id !== id) }));
      toast.success('Alias deleted');
    } catch (err) {
      toast.error(err.message);
    }
  };

  if (loading) {
    return <div className="text-gray-500 text-center py-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white mb-2">Email Aliases</h1>
        <p className="text-gray-400 text-sm">Create alternate email addresses that deliver to your inbox.</p>
      </div>

      <div className="bg-surface-base border border-border rounded-xl overflow-hidden">
        {aliases.length === 0 ? (
          <div className="px-4 py-8 text-center">
            <div className="w-12 h-12 bg-primary/20 rounded-full flex items-center justify-center mx-auto mb-3">
              <MailIcon className="w-6 h-6 text-primary-light" />
            </div>
            <p className="text-gray-400 text-sm mb-4">No aliases yet</p>
            <button onClick={() => setShowAdd(true)} className="btn-primary text-sm">
              Create your first alias
            </button>
          </div>
        ) : (
          <div className="divide-y divide-border">
            {aliases.map(alias => (
              <div key={alias.id} className="flex items-center justify-between gap-2 px-4 py-3 min-w-0">
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <div className="w-9 h-9 rounded-lg bg-primary/20 flex items-center justify-center text-primary-light">
                    <MailIcon className="w-4 h-4" />
                  </div>
                  <span className="text-white font-mono text-sm truncate">{alias.email}</span>
                </div>
                <button onClick={() => handleDelete(alias.id)} className="p-2 text-gray-500 hover:text-red-400 transition-colors shrink-0">
                  <TrashIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex items-center justify-between">
        <p className="text-xs text-gray-500">{aliases.length}/{limit} aliases used</p>
        {aliases.length > 0 && aliases.length < limit && (
          <button onClick={() => setShowAdd(true)} className="text-sm text-primary-light hover:text-white transition-colors flex items-center gap-1">
            <PlusIcon className="w-4 h-4" />
            Add Alias
          </button>
        )}
      </div>

      {showAdd && (
        <Modal isOpen={showAdd} onClose={() => setShowAdd(false)} size="sm">
          <ModalHeader icon={<MailIcon className="w-5 h-5" />} title="Create Alias" />
          <div className="mb-4">
            <div className="flex items-center justify-between mb-2">
              <label className="text-sm text-gray-400">Choose your alias</label>
              <button
                type="button"
                onClick={() => setNewAlias(generateRandomAlias())}
                className="flex items-center gap-1.5 text-sm text-primary-light hover:text-white transition-colors"
              >
                <RefreshIcon className="w-4 h-4" />
                Random
              </button>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newAlias}
                onChange={(e) => setNewAlias(e.target.value.toLowerCase().replace(/[^a-z0-9._-]/g, ''))}
                placeholder="myalias"
                className="form-input flex-1"
                maxLength={32}
                autoFocus
              />
              <span className="text-gray-500 text-sm shrink-0">@{domain}</span>
            </div>
            <p className="text-xs text-gray-500 mt-2">3-32 characters: letters, numbers, dots, dashes, underscores</p>
          </div>
          <ModalActions>
            <button onClick={() => setShowAdd(false)} className="btn-secondary">Cancel</button>
            <button onClick={handleAdd} disabled={submitting || newAlias.length < 3} className="btn-primary">
              {submitting ? 'Creating...' : 'Create'}
            </button>
          </ModalActions>
        </Modal>
      )}
    </div>
  );
}