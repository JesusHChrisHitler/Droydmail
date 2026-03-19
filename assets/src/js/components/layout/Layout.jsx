import { useState, useEffect } from 'react';
import { UserModal } from './UserModal';
import { Media } from '../ui/Media';
import { ROUTES } from '../../routes';
import { mailApi } from '../../api';
import { InboxIcon, SendIcon, TrashIcon, SpamIcon, TagIcon, SettingsIcon, MenuIcon, PlusIcon, ContactsIcon, ChevronUpIcon, ArchiveIcon, ShieldIcon, FeedbackIcon, KeyIcon, EditIcon } from '../icons';

export function Layout({ user, onLogout, children, navigate, currentPath }) {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState({});

  useEffect(() => {
    const handleCounts = (e) => setUnreadCounts(e.detail);
    window.addEventListener('unreadCounts', handleCounts);
    window.addEventListener('wsUnreadCounts', handleCounts);
    return () => {
      window.removeEventListener('unreadCounts', handleCounts);
      window.removeEventListener('wsUnreadCounts', handleCounts);
    };
  }, []);

  const folders = [
    { id: 'inbox', label: 'Inbox', icon: 'inbox' },
    { id: 'sent', label: 'Sent', icon: 'send' },
    { id: 'drafts', label: 'Drafts', icon: 'drafts' },
    { id: 'archive', label: 'Archive', icon: 'archive' },
    { id: 'codes', label: 'Codes', icon: 'codes' },
    { id: 'promotions', label: 'Promotions', icon: 'promotions' },
    { id: 'spam', label: 'Spam', icon: 'spam' },
    { id: 'trash', label: 'Trash', icon: 'trash' },
  ];

  const getIcon = (type) => {
    switch(type) {
      case 'inbox': return <InboxIcon />;
      case 'send': return <SendIcon />;
      case 'archive': return <ArchiveIcon />;
      case 'trash': return <TrashIcon />;
      case 'spam': return <SpamIcon />;
      case 'codes': return <KeyIcon />;
      case 'promotions': return <TagIcon />;
      case 'drafts': return <EditIcon />;
      case 'settings': return <SettingsIcon />;
      default: return null;
    }
  };

  return (
    <div className="h-screen flex flex-col bg-surface-base text-white">
      <header className="h-14 flex items-center justify-between px-4 border-b border-border shrink-0 bg-surface-base">
        <div className="flex items-center gap-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="md:hidden p-2 text-gray-400 hover:text-white">
            <MenuIcon />
          </button>
          <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate(ROUTES.home)}>
            <div className="relative">
              <div className="absolute inset-0 bg-primary rounded-lg blur-md opacity-0 group-hover:opacity-50 transition-opacity"></div>
              <Media src="logo.webp" alt="DroydMail" className="w-8 h-8 rounded-lg object-cover relative z-10" />
            </div>
            <span className="font-semibold hidden sm:block text-white">DroydMail</span>
          </div>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        {sidebarOpen && (
          <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setSidebarOpen(false)} />
        )}
        
        <aside className={`${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:translate-x-0 fixed md:relative z-50 md:z-auto w-64 md:w-56 top-14 md:top-0 h-[calc(100%-3.5rem)] md:h-full border-r border-border flex flex-col bg-surface-base transition-transform duration-200`}>
          <div className="p-3">
            <button onClick={() => { navigate(ROUTES.compose); setSidebarOpen(false); }} className="btn-primary w-full py-2.5 flex items-center justify-center gap-2">
              <PlusIcon />
              Compose
            </button>
          </div>
          
          <nav className="flex-1 px-3 py-2 space-y-1">
            {folders.map((f) => (
              <button
                key={f.id}
                onClick={() => { navigate(ROUTES[f.id]); setSidebarOpen(false); }}
                className={`sidebar-item ${
                  currentPath === ROUTES[f.id] || currentPath.startsWith(ROUTES[f.id] + '/')
                    ? 'sidebar-item-active'
                    : 'sidebar-item-inactive'
                } ${unreadCounts[f.id] > 0 ? 'font-semibold' : ''}`}
              >
                {getIcon(f.icon)}
                <span className="flex-1">{f.label}</span>
                {f.id !== 'spam' && unreadCounts[f.id] > 0 && (
                  <span className="min-w-[20px] h-5 px-1.5 bg-primary text-white text-xs font-medium rounded-full flex items-center justify-center">
                    {unreadCounts[f.id]}
                  </span>
                )}
              </button>
            ))}
            <div className="pt-4 mt-4 border-t border-border">
              <button
                onClick={() => { navigate(ROUTES.contacts); setSidebarOpen(false); }}
                className={`sidebar-item ${
                  currentPath === ROUTES.contacts ? 'sidebar-item-active' : 'sidebar-item-inactive'
                }`}
              >
                <ContactsIcon />
                Contacts
              </button>
              <button
                onClick={() => { navigate(ROUTES.feedback); setSidebarOpen(false); }}
                className={`sidebar-item ${
                  currentPath === ROUTES.feedback ? 'sidebar-item-active' : 'sidebar-item-inactive'
                }`}
              >
                <FeedbackIcon />
                Feedback
              </button>
              <button
                onClick={() => { navigate(ROUTES.settings); setSidebarOpen(false); }}
                className={`sidebar-item ${
                  currentPath.startsWith(ROUTES.settings) ? 'sidebar-item-active' : 'sidebar-item-inactive'
                }`}
              >
                {getIcon('settings')}
                Settings
              </button>
              {user.role === 'admin' && (
                <button
                  onClick={() => { navigate(ROUTES.admin); setSidebarOpen(false); }}
                  className={`sidebar-item ${
                    currentPath.startsWith('/admin') ? 'sidebar-item-active' : 'sidebar-item-inactive'
                  }`}
                >
                  <ShieldIcon className="w-5 h-5" />
                  <span className="flex-1">Admin</span>
                  {unreadCounts.admin > 0 && (
                    <span className="min-w-[20px] h-5 px-1.5 bg-primary text-white text-xs font-medium rounded-full flex items-center justify-center">
                      {unreadCounts.admin}
                    </span>
                  )}
                </button>
              )}
            </div>
          </nav>
          
          <div className="p-3 border-t border-border relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-border transition-colors"
            >
              <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center text-white font-medium">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-sm font-medium text-white truncate">{user.username}</div>
                <div className="text-xs text-gray-500 truncate">{user.email}</div>
              </div>
              <ChevronUpIcon className={`w-4 h-4 text-gray-400 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} />
            </button>
            
            <UserModal
              user={user}
              onLogout={onLogout}
              navigate={navigate}
              isOpen={showUserMenu}
              onClose={() => setShowUserMenu(false)}
            />
          </div>
        </aside>

        <main className="flex-1 overflow-auto bg-surface-base">{children}</main>
      </div>
    </div>
  );
}