import { useState, useEffect, useCallback, useRef } from 'react';
import { adminApi } from '../../api/admin';
import { MailIcon, TrashIcon, CloseIcon, CheckIcon } from '../icons';
import { Spinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { EmailRow } from '../email/EmailRow';
import { RefreshButton } from '../ui/RefreshButton';
import { useToast } from '../ui/Toast';
import { useCache } from '../../context/CacheContext';

const CACHE_TTL = 60000;

export function Reports({ navigate }) {
  const { getReports, setReportsList, removeReport, removeReports } = useCache();
  const cached = getReports();
  const [reports, setReports] = useState(cached.data || []);
  const [loading, setLoading] = useState(!cached.data);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState(null);
  const [selectedReports, setSelectedReports] = useState(new Set());
  const fetchingRef = useRef(false);
  const toast = useToast();

  useEffect(() => {
    const c = getReports();
    if (c.data) setReports(c.data);
  }, [getReports]);

  const loadReports = useCallback(async (isRefresh = false) => {
    if (fetchingRef.current) return;
    const c = getReports();
    if (!isRefresh && c.data && Date.now() - c.timestamp < CACHE_TTL) {
      setReports(c.data);
      setLoading(false);
      return;
    }
    fetchingRef.current = true;
    if (isRefresh) setRefreshing(true);
    else if (!c.data) setLoading(true);
    try {
      const data = await adminApi.reports();
      const reportsList = data.reports || [];
      setReportsList(reportsList);
      setReports(reportsList);
      setError(null);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
      fetchingRef.current = false;
    }
  }, [getReports, setReportsList]);

  useEffect(() => { loadReports(); }, [loadReports]);

  const handleDelete = async (token) => {
    removeReport(token);
    setReports(prev => prev.filter(r => r.token !== token));
    try {
      await adminApi.deleteReport(token);
      toast.success('Report deleted');
    } catch (err) {
      loadReports(true);
      toast.error('Failed to delete report');
    }
  };

  const handleBulkDelete = async () => {
    const tokens = [...selectedReports];
    removeReports(tokens);
    setReports(prev => prev.filter(r => !tokens.includes(r.token)));
    setSelectedReports(new Set());
    try {
      await adminApi.bulkDeleteReports(tokens);
      toast.success(`${tokens.length} report${tokens.length !== 1 ? 's' : ''} deleted`);
    } catch (err) {
      loadReports(true);
      toast.error('Failed to delete reports');
    }
  };

  const toggleSelect = (report) => {
    setSelectedReports(prev => {
      const next = new Set(prev);
      if (next.has(report.token)) next.delete(report.token);
      else next.add(report.token);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedReports.size === reports.length) setSelectedReports(new Set());
    else setSelectedReports(new Set(reports.map(r => r.token)));
  };

  const clearSelection = () => setSelectedReports(new Set());

  const normalizeReport = (report) => ({
    token: report.token,
    from: report.from_addr,
    subject: report.subject,
    preview: report.preview,
    time: report.created_at,
    unread: report.unread,
  });

  if (loading) return <div className="flex items-center justify-center h-64"><Spinner /></div>;
  if (error) return <div className="text-center py-12"><p className="text-red-400">{error}</p></div>;

  return (
    <div className="h-full flex flex-col -mx-4 md:-mx-6 -mt-4 md:-mt-6">
      <div className="flex items-center justify-between px-4 md:px-6 py-3 border-b border-border shrink-0">
        <div>
          <h2 className="text-lg font-semibold text-white">Reports</h2>
          <p className="text-xs text-gray-500">Emails sent to admin@georgedroyd.wtf</p>
        </div>
        <div className="flex items-center gap-3">
          <RefreshButton onClick={() => loadReports(true)} disabled={refreshing} refreshing={refreshing} />
          <span className="text-sm text-gray-500">{reports.length} reports</span>
        </div>
      </div>

      {selectedReports.size > 0 && (
        <div className="flex items-center gap-2 px-4 md:px-6 py-2 bg-primary/10 border-b border-primary/30 animate-slide-down">
          <button onClick={selectAll} className="flex items-center gap-1.5 px-2 py-1 text-xs font-medium text-gray-300 hover:text-white hover:bg-border rounded transition-colors">
            <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedReports.size === reports.length ? 'bg-primary border-primary' : 'border-gray-500'}`}>
              {selectedReports.size === reports.length && <CheckIcon className="w-3 h-3 text-white" />}
            </div>
            <span>{selectedReports.size === reports.length ? 'Deselect all' : 'Select all'}</span>
          </button>
          <div className="flex-1 text-sm text-primary-light font-medium">
            {selectedReports.size} report{selectedReports.size !== 1 ? 's' : ''} selected
          </div>
          <button onClick={handleBulkDelete} className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-gray-300 hover:text-white hover:bg-red-600/20 rounded transition-colors">
            <TrashIcon className="w-4 h-4" />
            <span className="hidden sm:inline">Delete Forever</span>
          </button>
          <button onClick={clearSelection} className="flex items-center gap-1.5 px-2 py-1.5 text-xs font-medium text-gray-500 hover:text-white hover:bg-border rounded transition-colors ml-1">
            <CloseIcon className="w-4 h-4" />
          </button>
        </div>
      )}

      {reports.length === 0 ? (
        <EmptyState icon={<MailIcon className="w-12 h-12" />} title="No reports" description="Emails sent to admin@georgedroyd.wtf will appear here" />
      ) : (
        <div className="flex-1 overflow-auto">
          {reports.map(report => (
            <EmailRow
              key={report.token}
              email={normalizeReport(report)}
              onClick={() => navigate(`/admin/reports/${report.token}`)}
              onSwipeLeft={selectedReports.size === 0 ? () => handleDelete(report.token) : undefined}
              swipeLeftLabel="Delete"
              selected={selectedReports.has(report.token)}
              onSelect={() => toggleSelect(report)}
            />
          ))}
        </div>
      )}
    </div>
  );
}