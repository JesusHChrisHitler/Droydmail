import { useEffect, useRef, useState } from 'react';
import { ROUTES } from '../../routes';
import { CheckIcon, CopyIcon, HomeIcon, SettingsIcon, LogoutIcon } from '../icons';

export function UserModal({ user, onLogout, navigate, isOpen, onClose }) {
  const modalRef = useRef(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (modalRef.current && !modalRef.current.contains(e.target)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(user.email);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {}
  };

  if (!isOpen) return null;

  return (
    <div ref={modalRef} className="absolute bottom-full left-0 right-0 mb-2 bg-surface-card border border-border rounded-xl p-2 shadow-xl animate-slide-up">
      <div className="px-3 py-2 mb-2 min-w-0">
        <div className="text-sm font-medium text-white truncate">{user.username}</div>
        <button onClick={copyEmail} className="text-xs text-gray-500 hover:text-primary-light transition-colors flex items-center gap-1 max-w-full">
          <span className="truncate">{user.email}</span>
          {copied ? (
            <CheckIcon className="w-3 h-3 text-green-500" />
          ) : (
            <CopyIcon className="w-3 h-3" />
          )}
        </button>
      </div>
      <hr className="border-border mb-2" />
      <button onClick={() => { navigate(ROUTES.home); onClose(); }} className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-border rounded-lg transition-colors flex items-center gap-3">
        <HomeIcon className="w-4 h-4" />
        Home
      </button>
      <button onClick={() => { navigate(ROUTES.settings); onClose(); }} className="w-full text-left px-3 py-2 text-sm text-gray-400 hover:text-white hover:bg-border rounded-lg transition-colors flex items-center gap-3">
        <SettingsIcon className="w-4 h-4" />
        Settings
      </button>
      <hr className="border-border my-2" />
      <button onClick={onLogout} className="w-full text-left px-3 py-2 text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors flex items-center gap-3">
        <LogoutIcon className="w-4 h-4" />
        Sign out
      </button>
    </div>
  );
}