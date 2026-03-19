import { Users } from './Users';
import { Reports } from './Reports';
import { ReportView } from './ReportView';
import { UserIcon, MailIcon, ShieldIcon } from '../icons';

const ADMIN_TABS = [
  { id: 'users', label: 'Users', icon: <UserIcon className="w-5 h-5" /> },
  { id: 'reports', label: 'Reports', icon: <MailIcon className="w-5 h-5" /> },
];

export function Admin({ user, tab = 'users', reportToken, navigate }) {
  const setActiveTab = (t) => navigate(`/admin/${t}`);
  const isViewingReport = tab === 'reports' && reportToken;
  const activeTab = tab === 'reports' ? 'reports' : tab;

  if (user.role !== 'admin') {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-red-500/20 flex items-center justify-center mx-auto mb-4">
            <ShieldIcon className="w-8 h-8 text-red-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Access Denied</h2>
          <p className="text-gray-500">You need admin privileges to access this page</p>
        </div>
      </div>
    );
  }

  if (isViewingReport) {
    return <ReportView token={reportToken} navigate={navigate} />;
  }

  return (
    <div className="h-full flex flex-col">
      <div className="md:hidden border-b border-border shrink-0">
        <div className="flex overflow-x-auto hide-scrollbar">
          {ADMIN_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                activeTab === t.id ? 'text-primary-light border-primary' : 'text-gray-500 border-transparent hover:text-white'
              }`}
            >
              {t.icon}
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 flex overflow-hidden">
        <div className="hidden md:flex flex-col w-44 lg:w-56 border-r border-border p-3 shrink-0">
          <div className="flex items-center gap-2 text-xs text-gray-500 uppercase tracking-wider font-semibold px-3 py-2">
            <ShieldIcon className="w-4 h-4 text-primary-light" />
            Admin Panel
          </div>
          {ADMIN_TABS.map(t => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                activeTab === t.id ? 'bg-primary/20 text-white' : 'text-gray-400 hover:bg-surface-body hover:text-white'
              }`}
            >
              <span className={activeTab === t.id ? 'text-primary-light' : ''}>{t.icon}</span>
              <span className="font-medium">{t.label}</span>
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-auto p-4 md:p-6">
          <div className="w-full">
            {activeTab === 'users' && <Users currentUserId={user.id} />}
            {activeTab === 'reports' && <Reports navigate={navigate} />}
          </div>
        </div>
      </div>
    </div>
  );
}