import { useState, useEffect, useCallback } from 'react';
import { Media } from '../ui/Media';
import { mailApi } from '../../api/mail';
import { useSocket } from '../../hooks/useSocket';
import { Devices } from './Devices';
import { Aliases } from './Aliases';
import { SETTINGS_TABS, ROUTES } from '../../routes';
import { UserIcon, DevicesIcon, AboutIcon, MailIcon, ShieldIcon, CheckIcon, PlusIcon, TagIcon } from '../icons';

const TAB_ICONS = {
  account: <UserIcon className="w-5 h-5" />,
  aliases: <TagIcon className="w-5 h-5" />,
  devices: <DevicesIcon className="w-5 h-5" />,
  about: <AboutIcon className="w-5 h-5" />,
};

const tabs = SETTINGS_TABS.map(t => ({ ...t, icon: TAB_ICONS[t.id] }));

export function Settings({ user, tab = 'account', navigate }) {
  const activeTab = tab;
  const setActiveTab = (t) => navigate(`${ROUTES.settings}/${t}`);

  return (
    <div className="h-full flex flex-col">
      <div className="md:hidden border-b border-border shrink-0">
        <div className="flex overflow-x-auto hide-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === tab.id
                  ? 'text-primary-light border-primary'
                  : 'text-gray-500 border-transparent hover:text-white'
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden md:flex flex-col w-56 border-r border-border p-3 shrink-0">
          <div className="text-xs text-gray-500 uppercase tracking-wider font-semibold px-3 py-2">Settings</div>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary/20 text-white'
                  : 'text-gray-400 hover:bg-surface-body hover:text-white'
              }`}
            >
              <span className={activeTab === tab.id ? 'text-primary-light' : ''}>{tab.icon}</span>
              <span className="font-medium">{tab.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="max-w-lg">
            {activeTab === 'account' && <AccountTab user={user} />}
            {activeTab === 'aliases' && <Aliases user={user} />}
            {activeTab === 'devices' && <Devices />}
            {activeTab === 'about' && <AboutTab />}
          </div>
        </div>
      </div>
    </div>
  );
}

function AccountTab({ user }) {
  const [storage, setStorage] = useState(user.storage || null);

  const handleStorageUpdate = useCallback((data) => {
    setStorage(data);
  }, []);

  useSocket(user, { onStorage: handleStorageUpdate });

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 mb-8">
        <div className="relative">
          <div className="absolute inset-0 bg-primary rounded-2xl blur-lg opacity-40"></div>
          <Media 
            src="logo.webp" 
            alt="DroydMail" 
            className="w-16 h-16 rounded-2xl object-cover relative z-10 border border-primary/50"
          />
        </div>
        <div>
          <h1 className="text-xl font-bold text-white">{user.username}</h1>
          <p className="text-primary-light font-mono text-sm">{user.email}</p>
        </div>
      </div>

      <div>
        <h2 className="text-sm font-semibold text-white mb-4">Account Details</h2>
        <div className="bg-surface-base border border-border rounded-xl divide-y divide-[#2d2d44]">
          <SettingRow icon={<UserIcon className="w-5 h-5" />} label="Username" value={user.username} />
          <SettingRow icon={<MailIcon className="w-5 h-5" />} label="DroydMail Address" value={user.email} />
          <SettingRow icon={<ShieldIcon className="w-5 h-5" />} label="Recovery Email" value={user.recovery_email || '—'} />
        </div>
      </div>

      {storage && (
        <div>
          <h2 className="text-sm font-semibold text-white mb-4">Storage</h2>
          <div className="bg-surface-base border border-border rounded-xl p-4">
            <div className="flex justify-between text-sm mb-2">
              <span className="text-gray-400">Used</span>
              <span className="text-white font-medium">{formatBytes(storage.used)} / {formatBytes(storage.limit)}</span>
            </div>
            <div className="h-2 bg-surface-elevated rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-primary to-primary-light transition-all duration-300"
                style={{ width: `${Math.min(storage.percent, 100)}%` }}
              />
            </div>
            <div className="text-xs text-gray-500 mt-2 text-right">{storage.percent.toFixed(1)}% used</div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingRow({ icon, label, value }) {
  return (
    <div className="flex items-center gap-4 px-4 py-4">
      <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shrink-0 text-primary-light">
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs text-gray-500 mb-0.5">{label}</div>
        <div className="text-white font-medium truncate">{value}</div>
      </div>
    </div>
  );
}

function AboutTab() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Media 
          src="george.webp" 
          alt="George Droyd" 
          className="w-16 h-16 rounded-2xl object-cover border border-border"
        />
        <div>
          <h1 className="text-xl font-bold text-white">DroydMail</h1>
          <p className="text-gray-500">v1.0.0 • Negrotech</p>
        </div>
      </div>

      <p className="text-gray-400 leading-relaxed">
        Private email powered by George Droyd — the cyborg resurrected by Microsoft and Negrotech. 
        End-to-end encrypted with AES-256-GCM. Your privacy, protected.
      </p>

      <div className="bg-surface-base border border-border rounded-xl p-4">
        <h3 className="text-sm font-semibold text-white mb-3">Features</h3>
        <ul className="space-y-2 text-sm text-gray-400">
          <li className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-primary-light" />
            AES-256-GCM encryption at rest
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-primary-light" />
            Real-time notifications
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-primary-light" />
            Secure attachments
          </li>
          <li className="flex items-center gap-2">
            <CheckIcon className="w-4 h-4 text-primary-light" />
            Email verification required
          </li>
        </ul>
      </div>
    </div>
  );
}