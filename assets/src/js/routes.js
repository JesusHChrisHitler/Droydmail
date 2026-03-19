export const SETTINGS_TABS = [
  { id: 'account', label: 'Account' },
  { id: 'aliases', label: 'Aliases' },
  { id: 'devices', label: 'Devices' },
  { id: 'about', label: 'About' },
];

export const ADMIN_TABS = [
  { id: 'users', label: 'Users' },
  { id: 'reports', label: 'Reports' },
];

export const ROUTES = {
  home: '/',
  login: '/login',
  register: '/register',
  verify: '/verify',
  downloads: '/downloads',
  inbox: '/inbox',
  sent: '/sent',
  spam: '/spam',
  codes: '/codes',
  promotions: '/promotions',
  trash: '/trash',
  archive: '/archive',
  compose: '/compose',
  drafts: '/drafts',
  contacts: '/contacts',
  feedback: '/feedback',
  settings: '/settings',
  admin: '/admin',
};

export const getFolderFromPath = (path) => {
  const folderRoutes = ['inbox', 'sent', 'spam', 'codes', 'promotions', 'trash', 'archive'];
  for (const f of folderRoutes) {
    if (path === `/${f}` || path.startsWith(`/${f}/`)) return f;
  }
  return 'inbox';
};

export const isSettingsRoute = (path) => {
  if (path === '/settings') return 'account';
  const match = path.match(/^\/settings\/(\w+)$/);
  const tab = match ? SETTINGS_TABS.find(t => t.id === match[1]) : null;
  return tab ? tab.id : null;
};

export const isAdminRoute = (path) => {
  if (path === '/admin') return 'users';
  if (path.startsWith('/admin/reports/')) return 'reports';
  const match = path.match(/^\/admin\/(\w+)$/);
  const tab = match ? ADMIN_TABS.find(t => t.id === match[1]) : null;
  return tab ? tab.id : null;
};

export const getAllSPARoutes = () => {
  const routes = Object.values(ROUTES);
  routes.push('/inbox/:token', '/trash/:token', '/spam/:token', '/codes/:token', '/promotions/:token', '/archive/:token');
  SETTINGS_TABS.forEach(t => routes.push(`/settings/${t.id}`));
  return routes;
};