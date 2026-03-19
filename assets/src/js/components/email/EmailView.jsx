import { useState, useEffect } from 'react';
import { useEmailView } from '../../hooks/useEmailView';
import { useContactsContext } from '../../context/ContactsContext';
import { useCache } from '../../context/CacheContext';
import { mailApi } from '../../api';
import { Spinner } from '../ui/Spinner';
import { useToast } from '../ui/Toast';
import { EmailHeader } from './EmailHeader';
import { EmailActions } from './EmailActions';
import { EmailBody } from './EmailBody';  
import { EmailAttachments } from './EmailAttachments';
import { LinkWarningModal } from '../modals/LinkWarningModal';
import { ConfirmModal } from '../modals/ConfirmModal';
import { ROUTES } from '../../routes';
import { ChevronLeftIcon } from '../icons';

export function EmailView({ token, navigate, folder }) {
  const { email, loading, error } = useEmailView(token);
  const { getContactByEmail } = useContactsContext();
  const { moveEmail, removeEmail } = useCache();
  const toast = useToast();
  const [showHtml, setShowHtml] = useState(true);
  const [linkWarning, setLinkWarning] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  useEffect(() => {
    if (error) navigate(folder === 'trash' ? ROUTES.trash : ROUTES.inbox);
  }, [error, navigate, folder]);

  useEffect(() => {
    if (window.AndroidBridge?.setCanRefresh) {
      window.AndroidBridge.setCanRefresh(false);
    }
  }, []);

  const handleReply = () => {
    const subj = email.subject?.startsWith('Re:') ? email.subject : `Re: ${email.subject}`;
    const body = `\n\n--- Original Message ---\nFrom: ${email.from}\nDate: ${email.time}\n\n${email.body}`;
    navigate(`${ROUTES.compose}?to=${encodeURIComponent(email.from)}&subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`);
  };

  const handleForward = () => {
    const subj = email.subject?.startsWith('Fwd:') ? email.subject : `Fwd: ${email.subject}`;
    const body = `\n--- Forwarded Message ---\nFrom: ${email.from}\nTo: ${email.to}\nDate: ${email.time}\nSubject: ${email.subject}\n\n${email.body}`;
    navigate(`${ROUTES.compose}?subject=${encodeURIComponent(subj)}&body=${encodeURIComponent(body)}`);
  };

  const handleDelete = async () => {
    moveEmail(token, 'trash', email);
    await mailApi.move(token, 'trash');
    toast.success('Moved to trash');
    navigate(ROUTES[folder] || ROUTES.inbox);
  };

  const handlePermanentDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmPermanentDelete = async () => {
    removeEmail(token);
    await mailApi.delete(token);
    setShowDeleteConfirm(false);
    toast.success('Email deleted');
    navigate(ROUTES.trash);
  };

  const handleRestore = async () => {
    moveEmail(token, 'inbox', email);
    await mailApi.restore(token);
    toast.success('Email restored');
    navigate(folder === 'archive' ? ROUTES.archive : ROUTES.trash);
  };

  const handleArchive = async () => {
    moveEmail(token, 'archive', email);
    await mailApi.move(token, 'archive');
    toast.success('Archived');
    navigate(ROUTES[folder] || ROUTES.inbox);
  };

  const handleLinkConfirm = () => {
    window.open(linkWarning.url, '_blank', 'noopener,noreferrer');
    setLinkWarning(null);
  };

  if (loading) return <div className="h-full flex items-center justify-center"><Spinner /></div>;
  if (!email) return null;

  const hasHtml = email.bodyHtml?.trim();

  return (
    <div className="h-full flex flex-col bg-surface-base p-2 sm:p-3 md:p-4 pr-3 sm:pr-4 md:pr-5 pb-3 sm:pb-4 md:pb-5">
      <div className="flex-1 flex flex-col bg-surface-card border border-border rounded-xl overflow-hidden">
        <div className="h-14 flex items-center gap-4 px-4 md:px-6 border-b border-border shrink-0">
          <button onClick={() => window.history.back()} className="p-2 text-gray-400 hover:text-white hover:bg-border rounded-lg transition-colors">
            <ChevronLeftIcon />
          </button>
          <h1 className="text-lg md:text-xl font-semibold text-white flex-1 truncate">{email.subject || '(No subject)'}</h1>
        </div>

        <div className="px-4 md:px-6 py-4 border-b border-border shrink-0">
          <EmailHeader email={email} contact={getContactByEmail(email.from)} />
          <EmailActions
            onReply={handleReply}
            onForward={handleForward}
            onDelete={handleDelete} 
            onPermanentDelete={handlePermanentDelete}
            onRestore={handleRestore}
            onArchive={handleArchive}
            hasHtml={hasHtml}
            showHtml={showHtml}
            onToggleHtml={() => setShowHtml(!showHtml)}
            isTrash={folder === 'trash'}
            isArchive={folder === 'archive'}
          />
        </div>

        <div className="flex-1 overflow-auto px-4 md:px-6 py-4">
          <EmailBody email={email} showHtml={showHtml} onLinkClick={setLinkWarning} />
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
        title="Delete permanently?"
        message="This email will be permanently deleted and cannot be recovered."
        confirmText="Delete"
        confirmStyle="danger"
      />
    </div>
  );
}