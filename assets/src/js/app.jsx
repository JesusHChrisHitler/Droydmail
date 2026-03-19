import { createRoot } from 'react-dom/client';
import { useEffect, useState } from 'react';
import { useAuth } from './hooks/useAuth';
import { useSocket, setWsRef } from './hooks/useSocket';
import { useRouter } from './router';
import { Loading, Landing, Downloads, Login, Register, Verification, Layout, Inbox, EmailView, Compose, Sent, Settings, Contacts, Feedback, NotFound, ToastProvider, Admin, Drafts } from './components';
import { ContactsProvider } from './context/ContactsContext';
import { CacheProvider } from './context/CacheContext';
import { isSettingsRoute, isAdminRoute, getFolderFromPath, ROUTES } from './routes';

function App() {
  const { user, loading, login, register, verify, logout, updateRole } = useAuth();
  const wsRef = useSocket(user);
  setWsRef(wsRef);
  const { path, navigate, match } = useRouter();

  useEffect(() => {
    const handleRoleChange = (e) => {
      updateRole(e.detail.role);
      if (e.detail.role !== 'admin' && path.startsWith('/admin')) {
        navigate('/inbox');
      }
    };
    window.addEventListener('wsRoleChange', handleRoleChange);
    return () => window.removeEventListener('wsRoleChange', handleRoleChange);
  }, [path, navigate, updateRole]);
  const [pendingUser, setPendingUser] = useState({ username: '', email: '' });

  if (loading) return <Loading />;

  if (path === ROUTES.home) {
    return <Landing navigate={navigate} user={user} />;
  }

  if (path === ROUTES.login) {
    if (user) {
      navigate(ROUTES.inbox);
      return null;
    }
    return <Login onLogin={login} navigate={navigate} />;
  }

  if (path === ROUTES.register) {
    if (user) {
      navigate(ROUTES.inbox);
      return null;
    }
    const handleRegister = async (username, password, email, captcha) => {
      await register(username, password, email, captcha);
      setPendingUser({ username, email });
      navigate(ROUTES.verify);
    };
    return <Register onRegister={handleRegister} navigate={navigate} />;
  }

  if (path === ROUTES.verify) {
    if (user) {
      navigate(ROUTES.inbox);
      return null;
    }
    if (!pendingUser.username) {
      navigate(ROUTES.register);
      return null;
    }
    return <Verification username={pendingUser.username} email={pendingUser.email} onVerify={verify} navigate={navigate} />;
  }

  if (path === ROUTES.downloads) {
    return <Downloads navigate={navigate} user={user} />;
  }

  if (!user) {
    return <Landing navigate={navigate} user={null} />;
  }

  const handleLogout = async () => {
    await logout();
    navigate(ROUTES.home);
  };

  const renderPage = () => {
    const folder = getFolderFromPath(path);
    const folderRoutes = ['inbox', 'sent', 'spam', 'codes', 'promotions', 'archive', 'trash'];
    
    if (folderRoutes.includes(folder) && path === ROUTES[folder]) {
      return <Inbox navigate={navigate} folder={folder} user={user} />;
    }
    if (path === ROUTES.compose || path.startsWith(ROUTES.compose + '?')) return <Compose user={user} navigate={navigate} />;
    if (path === ROUTES.drafts) return <Drafts navigate={navigate} />;
    if (path === ROUTES.feedback) return <Feedback user={user} navigate={navigate} />;
    if (path === ROUTES.contacts) return <Contacts navigate={navigate} />;
    const settingsTab = isSettingsRoute(path);
    if (settingsTab) return <Settings user={user} tab={settingsTab} navigate={navigate} />;
    const adminTab = isAdminRoute(path);
    if (adminTab) {
      const reportMatch = path.match(/^\/admin\/reports\/(.+)$/);
      const reportToken = reportMatch ? reportMatch[1] : null;
      return <Admin user={user} tab={adminTab} reportToken={reportToken} navigate={navigate} />;
    }
    
    const emailMatch = match(`/${folder}/:token`);
    if (emailMatch && folderRoutes.includes(folder)) {
      return <EmailView token={emailMatch.token} navigate={navigate} folder={folder} />;
    }
    
    return null;
  };

  const page = renderPage();
  if (!page) {
    return <NotFound navigate={navigate} />;
  }

  return (
    <CacheProvider>
      <ContactsProvider>
        <Layout user={user} onLogout={handleLogout} navigate={navigate} currentPath={path}>
          {page}
        </Layout>
      </ContactsProvider>
    </CacheProvider>
  );
}

createRoot(document.getElementById('root')).render(<ToastProvider><App /></ToastProvider>);