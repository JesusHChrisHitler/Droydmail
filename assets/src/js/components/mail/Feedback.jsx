import { useState } from 'react';
import { useToast } from '../ui/Toast';
import { mailApi } from '../../api';
import { ROUTES } from '../../routes';
import { CloseIcon } from '../icons';

export function Feedback({ user, navigate }) {
  const [type, setType] = useState('bug');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const toast = useToast();

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    try {
      const fullSubject = `[${type === 'bug' ? 'Bug Report' : 'Feedback'}] ${subject}`;
      const fullBody = `Type: ${type === 'bug' ? 'Bug Report' : 'Feedback'}\nFrom: ${user.username} (${user.email})\n${body}`;
      await mailApi.send('admin@georgedroyd.wtf', '', fullSubject, fullBody, []);
      toast.success('Feedback sent! Thank you.');
      navigate(ROUTES.inbox);
    } catch (err) {
      toast.error(err.message || 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="h-full flex-col">
      <div className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border shrink-0">
        <h2 className="text-lg font-semibold text-white">Report Bug / Feedback</h2>
        <button onClick={() => navigate(ROUTES.inbox)} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-border transition-colors">
          <CloseIcon />
        </button>
      </div>

      <form onSubmit={handleSend} className="flex-1 flex flex-col">
        <div className="border-b border-border">
          <div className="flex items-center px-4 md:px-6 py-3 border-b border-border/50">
            <span className="text-gray-500 text-sm w-16 md:w-20">Type</span>
            <div className="flex gap-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="type" value="bug" checked={type === 'bug'} onChange={(e) => setType(e.target.value)} className="w-4 h-4 text-primary bg-surface-body border-border focus:ring-primary" />
                <span className="text-sm text-gray-300">Bug Report</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="type" value="feedback" checked={type === 'feedback'} onChange={(e) => setType(e.target.value)} className="w-4 h-4 text-primary bg-surface-body border-border focus:ring-primary" />
                <span className="text-sm text-gray-300">Feedback</span>
              </label>
            </div>
          </div>
          <div className="flex items-center px-4 md:px-6 py-3">
            <span className="text-gray-500 text-sm w-16 md:w-20">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder={type === 'bug' ? 'Describe the bug briefly' : 'What is your feedback about?'}
              className="form-input-inline"
            />
          </div>
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          placeholder={type === 'bug' ? 'Steps to reproduce, expected behavior, what actually happened..' : 'Share your thoughts, suggestions, or ideas...'}
          className="form-textarea"
        />

        <div className="h-16 flex items-center gap-3 px-4 md:px-6 border-t border-border shrink-0">
          <button type="submit" disabled={sending} className="btn-primary px-6 py-2.5 disabled:opacity-50">
            {sending ? 'Sending...' : 'Send'}
          </button>
          <button type="button" onClick={() => navigate(ROUTES.inbox)} className="text-gray-400 hover:text-white text-sm px-4 py-2 transition-colors">
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}