import { useState, useEffect, useRef } from 'react';
import { aliasesApi } from '../../api';
import { useCache } from '../../context/CacheContext';
import { ChevronUpIcon, MailIcon, CheckIcon, UserIcon, TagIcon } from '../icons';

export function RecipientFilter({ user, recipientFilter, setRecipientFilter, selectedAliases, setSelectedAliases, folder = 'inbox' }) {
  const { getCachedData, setCachedData, updateCachedData } = useCache();
  const cachedAliases = getCachedData('aliases');
  const [aliases, setAliases] = useState(cachedAliases?.aliases || []);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    if (cachedAliases) return;
    aliasesApi.list().then(data => {
      setAliases(data.aliases || []);
      setCachedData('aliases', { aliases: data.aliases || [], limit: data.limit || 3 });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const handleAliasCreate = (e) => {
      setAliases(prev => [e.detail, ...prev]);
      updateCachedData('aliases', prev => ({ ...prev, aliases: [e.detail, ...prev.aliases] }));
    };
    const handleAliasDelete = (e) => {
      setAliases(prev => prev.filter(a => a.id !== e.detail.id));
      setSelectedAliases(prev => prev.filter(x => x !== e.detail.email));
      updateCachedData('aliases', prev => ({ ...prev, aliases: prev.aliases.filter(a => a.id !== e.detail.id) }));
    };
    window.addEventListener('wsAliasCreate', handleAliasCreate);
    window.addEventListener('wsAliasDelete', handleAliasDelete);
    return () => {
      window.removeEventListener('wsAliasCreate', handleAliasCreate);
      window.removeEventListener('wsAliasDelete', handleAliasDelete);
    };
  }, [setSelectedAliases]);

  useEffect(() => {
    const handleClick = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const getRecipientArray = () => {
    if (recipientFilter === 'all') return [];
    if (recipientFilter === 'main') return [user?.email].filter(Boolean);
    if (recipientFilter === 'aliases') return aliases.map(a => a.email);
    if (recipientFilter === 'selected') return selectedAliases;
    return [];
  };

  const isSent = folder === 'sent';
  const getLabel = () => {
    if (recipientFilter === 'all') return 'All addresses';
    if (recipientFilter === 'main') return isSent ? 'Sent as main' : 'Main';
    if (recipientFilter === 'aliases') return isSent ? 'Sent as alias' : 'Aliases';
    return `${selectedAliases.length} selected`;
  };

  const Option = ({ active, icon, label, onClick }) => (
    <button
      onClick={onClick}
      className={`dropdown-option ${active ? 'dropdown-option-active' : 'dropdown-option-default'}`}
    >
      <span className={`w-4 h-4 md:w-5 md:h-5 flex items-center justify-center shrink-0 ${active ? 'text-primary-light' : 'text-gray-500'}`}>
        {icon}
      </span>
      <span className="flex-1 truncate">{label}</span>
      {active && <CheckIcon className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary-light shrink-0" />}
    </button>
  );

  return {
    recipientArray: getRecipientArray(),
    aliases,
    dropdown: (
      <div className="relative ml-auto" ref={dropdownRef}>
        <button
          onClick={() => setShowDropdown(!showDropdown)}
          className={`dropdown-trigger ${recipientFilter !== 'all' ? 'dropdown-trigger-active' : 'dropdown-trigger-default'}`}
        >
          <MailIcon className="w-3 h-3 md:w-3.5 md:h-3.5" />
          <span className="hidden xs:inline">{getLabel()}</span>
          <ChevronUpIcon
            className={`w-2.5 h-2.5 md:w-3 md:h-3 transition-transform duration-200 ${showDropdown ? '' : 'rotate-180'}`}
          />
        </button>

        {showDropdown && (
          <div className="dropdown-panel animate-dropdown-in">
            <div className="p-1.5 md:p-2">
              <Option
                active={recipientFilter === 'all'}
                icon={<MailIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                label="All addresses"
                onClick={() => setRecipientFilter('all')}
              />
              <Option
                active={recipientFilter === 'main'}
                icon={<UserIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                label={isSent ? "Sent from main" : "Main email only"}
                onClick={() => setRecipientFilter('main')}
              />
              {aliases.length > 0 && (
                <Option
                  active={recipientFilter === 'aliases'}
                  icon={<TagIcon className="w-3.5 h-3.5 md:w-4 md:h-4" />}
                  label={isSent ? "Sent from any alias" : "Any alias"}
                  onClick={() => setRecipientFilter('aliases')}
                />
              )}
            </div>

            {aliases.length > 0 && (
              <>
                <div className="border-t border-border" />
                <div className="p-1.5 md:p-2 dropdown-scroll">
                  <div className="dropdown-section-title">Select aliases</div>
                  {aliases.map(a => (
                    <label key={a.id} className="dropdown-option dropdown-option-default cursor-pointer group">
                      <div
                        className={`dropdown-checkbox ${
                          selectedAliases.includes(a.email)
                            ? 'dropdown-checkbox-checked'
                            : 'dropdown-checkbox-unchecked'
                        }`}
                      >
                        {selectedAliases.includes(a.email) && (
                          <CheckIcon className="w-2.5 h-2.5 md:w-3 md:h-3 text-white" />
                        )}
                      </div>
                      <input
                        type="checkbox"
                        checked={selectedAliases.includes(a.email)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedAliases([...selectedAliases, a.email]);
                            setRecipientFilter('selected');
                          } else {
                            const ns = selectedAliases.filter(x => x !== a.email);
                            setSelectedAliases(ns);
                            if (ns.length === 0) setRecipientFilter('all');
                          }
                        }}
                        className="sr-only"
                      />
                      <span className="text-xs md:text-sm text-gray-300 truncate font-mono">
                        {a.email}
                      </span>
                    </label>
                  ))}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    )
  };
}
