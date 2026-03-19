import { useState, useEffect } from 'react';
import { adminApi } from '../../api/admin';
import { useCache } from '../../context/CacheContext';
import { Spinner } from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import { EmailHeader } from '../email/EmailHeader';
import { EmailActions } from '../email/EmailActions';
import { EmailBody } from '../email/EmailBody';
import { EmailAttachments } from '../email/EmailAttachments';
import { LinkWarningModal } from '../modals/LinkWarningModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { ChevronLeftIcon } from '../icons';

export function ReportView({ token, navigate }) {
  const [email, setEmail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showHtml, setShowHtml] = useState(true);
  const [linkWarning, setLinkWarning] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const toast = useToast();
  const { markReportRead } = useCache();

  useEffect(() => {
    loadEmail();
  }, [token]);

  const loadEmail = async () => {
    try {
      const data = await adminApi.getReport(token);
      setEmail(data);
      markReportRead(token);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handlePermanentDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmPermanentDelete = async () => {
    try {
      await adminApi.deleteReport(token);
      toast.success('Report deleted');
      navigate('/admin/reports');
    } catch (err) {
      toast.error(err.message);
    }
    setShowDeleteConfirm(false);
  };

  const handleLinkConfirm = () => {
    window.open(linkWarning.url, '_blank', 'noopener,noreferrer');
    setLinkWarning(null);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  if (error || !email) return (
    <div className="h-full flex items-center justify-center">
      <div className="text-center">
        <p className="text-red-400 mb-4">{error || 'Report not found'}</p>
        <button onClick={() => navigate('/admin/reports')} className="text-primary-light hover:underline">
          Back to reports
        </button>
      </div>
    </div>
  );

  const hasHtml = email.body_html?.trim();

  return (
    <div className="h-full flex flex-col bg-surface-base p-2 sm:p-3 md:p-4 pr-3 sm:pr-4 md:pr-5 pb-3 sm:pb-4 md:pb-5">
      <div className="flex-1 flex flex-col bg-surface-card border border-border rounded-xl overflow-hidden">
        <div className="h-14 flex items-center gap-4 px-4 md:px-6 border-b border-border shrink-0">
          <button onClick={() => navigate('/admin/reports')} className="p-2 text-gray-400 hover:text-white hover:bg-border rounded-lg transition-colors">
            <ChevronLeftIcon />
          </button>
          <h1 className="text-lg md:text-xl font-semibold text-white flex-1 truncate">{email.subject || '(No subject)'}</h1>
        </div>

        <div className="px-4 md:px-6 py-4 border-b border-border shrink-0">
          <EmailHeader email={{
            from: email.from_addr,
            to: email.to_addr,
            time: email.created_at,
          }} />
          <EmailActions
            onPermanentDelete={handlePermanentDelete}
            hasHtml={hasHtml}
            showHtml={showHtml}
            onToggleHtml={() => setShowHtml(!showHtml)}
            isReport={true}
          />
        </div>

        <div className="flex-1 overflow-auto px-4 md:px-6 py-4">
          <EmailBody 
            email={{
              body: email.body,
              bodyHtml: email.body_html,
            }} 
            showHtml={showHtml} 
            onLinkClick={setLinkWarning} 
          />
          <EmailAttachments attachments={email.attachments} emailToken={email.token} />
        </div>
      </div>

      <LinkWarningModal
        linkWarning={linkWarning}
        onClose={() => setLinkWarning(null)}
        onConfirm={handleLinkConfirm}
      />

      <ConfirmModal
        isOpen={showDeleteConfirm}
        onClose={() => setShowDeleteConfirm(false)}
        onConfirm={confirmPermanentDelete}
        title="Delete report?"
        message="This report will be permanently deleted and cannot be recovered."
        confirmText="Delete"
        confirmStyle="danger"
      />
    </div>
  );
}