import { useState, useEffect } from 'react';
import { authApi } from '../../api';
import { useCache } from '../../context/CacheContext';
import { Spinner } from '../ui/Spinner';
import { formatRelativeTime, formatDate } from '../ui/Timestamp';
import { useToast } from '../ui/Toast';
import { MobileIcon, DesktopIcon, GlobeIcon, ClockIcon, CalendarIcon } from '../icons';

export function Devices() {
  const { getCachedData, setCachedData, updateCachedData } = useCache();
  const cachedSessions = getCachedData('sessions');
  const [sessions, setSessions] = useState(cachedSessions || []);
  const [loading, setLoading] = useState(!cachedSessions);
  const [revoking, setRevoking] = useState(null);
  const toast = useToast();

  const loadSessions = async () => {
    try {
      const data = await authApi.sessions();
      setSessions(data || []);
      setCachedData('sessions', data || []);
    } catch (err) {
      toast.error('Failed to load sessions');
    }
    setLoading(false);
  };

  useEffect(() => { if (!cachedSessions) loadSessions(); }, []);

  const revokeSession = async (id) => {
    setRevoking(id);
    try {
      await authApi.revokeSession(id);
      setSessions(sessions.filter(s => s.id !== id));
      updateCachedData('sessions', prev => prev.filter(s => s.id !== id));
      toast.success('Session revoked');
    } catch (err) {
      toast.error('Failed to revoke session');
    }
    setRevoking(null);
  };

  const parseUA = (ua) => {
    if (!ua) return { browser: 'Unknown', os: 'Unknown', icon: 'desktop' };
    let browser = 'Browser';
    let os = 'Unknown';
    if (ua.includes('Chrome') && !ua.includes('Edg')) browser = 'Chrome';
    else if (ua.includes('Firefox')) browser = 'Firefox';
    else if (ua.includes('Safari') && !ua.includes('Chrome')) browser = 'Safari';
    else if (ua.includes('Edg')) browser = 'Edge';
    if (ua.includes('Windows')) os = 'Windows';
    else if (ua.includes('Mac')) os = 'macOS';
    else if (ua.includes('Linux')) os = 'Linux';
    else if (ua.includes('Android')) os = 'Android';
    else if (ua.includes('iPhone') || ua.includes('iPad')) os = 'iOS';
    const icon = ua.includes('Mobile') || ua.includes('Android') || ua.includes('iPhone') ? 'mobile' : 'desktop';
    return { browser, os, icon };
  };

  const DeviceIcon = ({ type }) => type === 'mobile' ? (
    <MobileIcon className="w-5 h-5" />
  ) : (
    <DesktopIcon className="w-5 h-5" />
  );

  if (loading) return (
    <div className="flex items-center justify-center py-12">
      <Spinner />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-white">Active Devices</h2>
          <span className="text-xs text-gray-500 bg-surface-body px-2 py-1 rounded-full">{sessions.length} active</span>
        </div>
        <div className="space-y-3">
          {sessions.length === 0 ? (
            <div className="bg-surface-base border border-border rounded-xl px-4 py-8 text-center">
              <p className="text-gray-500">No active sessions</p>
            </div>
          ) : sessions.map((session) => {
            const { browser, os, icon } = parseUA(session.user_agent);
            return (
              <div key={session.id} className={`bg-surface-base border rounded-xl p-4 transition-colors ${session.current ? 'border-primary' : 'border-border'}`}>
                <div className="flex items-start gap-4">
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${session.current ? 'bg-primary/30 text-primary-light' : 'bg-surface-body text-gray-400'}`}>
                    <DeviceIcon type={icon} />
                  </div>
                  <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-semibold">{browser}</span>
                      <span className="text-gray-500">on</span>
                      <span className="text-white">{os}</span>
                      {session.current && (
                        <span className="text-xs bg-primary text-white px-2 py-0.5 rounded-full font-medium">This device</span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                      <span className="flex items-center gap-1">
                        <GlobeIcon className="w-3.5 h-3.5" />
                        {session.ip}
                      </span>
                      <span className="flex items-center gap-1">
                <ClockIcon className="w-3.5 h-3.5" />
                        {formatDate(session.created_at)}
                      </span>
                      <span className="flex items-center gap-1">
                        <CalendarIcon className="w-3.5 h-3.5" />
                                Expires {formatDate(session.expires_at)}
                      </span>
                    </div>
                  </div>
                  {!session.current && (
                    <button 
                      onClick={() => revokeSession(session.id)} 
                      disabled={revoking === session.id}
                      className="px-3 py-1.5 text-sm font-medium text-red-400 hover:text-white hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {revoking === session.id ? 'Revoking...' : 'Revoke'}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}