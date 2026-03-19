import { useState, useEffect, useRef, useCallback } from 'react';
import { useToast } from '../ui/Toast';
import { useCache } from '../../context/CacheContext';
import { mailApi, aliasesApi, draftsApi } from '../../api';
import { DropZone } from '../ui/DropZone';
import { formatFileSize, validateFiles } from '../../utils';
import { ROUTES } from '../../routes';
import { CloseIcon, AttachmentIcon, ChevronUpIcon } from '../icons';
import { ProgressBar } from '../ui/ProgressBar'; 

export function Compose({ user, navigate }) {
  const [fromAddress, setFromAddress] = useState(user.email);
  const [aliases, setAliases] = useState([]);
  const [showFromDropdown, setShowFromDropdown] = useState(false);
  const fromDropdownRef = useRef(null);
  const [to, setTo] = useState('');
  const [cc, setCc] = useState('');
  const [showCc, setShowCc] = useState(false);
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [attachments, setAttachments] = useState([]);
  const [sending, setSending] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [draftToken, setDraftToken] = useState(null);
  const draftRef = useRef(null);
  const draftLoaded = useRef(false);
  const saveTimeout = useRef(null);
  const needsSave = useRef(false);
  const saveDraftRef = useRef(null);
  const { updateCachedData } = useCache();
  const toast = useToast();
  const fileInputRef = useRef(null);

  useEffect(() => {
    aliasesApi.list().then(data => setAliases(data.aliases || [])).catch(() => {});
  }, []);

  useEffect(() => {
    const handleClick = (e) => {
      if (fromDropdownRef.current && !fromDropdownRef.current.contains(e.target)) setShowFromDropdown(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const draft = params.get('draft');
    if (draft) {
      draftsApi.get(draft).then(data => {
        setDraftToken(data.token);
        draftRef.current = data.token;
        if (data.from) setFromAddress(data.from);
        if (data.to) setTo(data.to);
        if (data.cc) { setCc(data.cc); setShowCc(true); }
        if (data.subject) setSubject(data.subject);
        if (data.body) setBody(data.body);
        setTimeout(() => { draftLoaded.current = true; }, 0);
      }).catch(() => { draftLoaded.current = true; });
    } else {
      if (params.get('to')) setTo(decodeURIComponent(params.get('to')));
      if (params.get('subject')) setSubject(decodeURIComponent(params.get('subject')));
      if (params.get('body')) setBody(decodeURIComponent(params.get('body')));
      draftLoaded.current = true;
    }
  }, []);

  const saveDraft = useCallback(async () => {
    if (!subject && !body && !to) return;
    try {
      const from = fromAddress !== user.email ? fromAddress : '';
      const res = await draftsApi.save({ token: draftRef.current || '', from, to, cc, subject, body });
      if (res.token && !draftRef.current) {
        draftRef.current = res.token;
        setDraftToken(res.token);
      }
    } catch {}
  }, [fromAddress, to, cc, subject, body, user.email]);

  saveDraftRef.current = saveDraft;

  useEffect(() => {
    if (!draftLoaded.current) return;
    needsSave.current = true;
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => { saveDraft(); needsSave.current = false; }, 3000);
    return () => { if (saveTimeout.current) clearTimeout(saveTimeout.current); };
  }, [saveDraft]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden' && needsSave.current && saveDraftRef.current) {
        if (saveTimeout.current) clearTimeout(saveTimeout.current);
        saveDraftRef.current();
        needsSave.current = false;
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeout.current) clearTimeout(saveTimeout.current);
      if (needsSave.current && saveDraftRef.current) saveDraftRef.current();
    };
  }, []);

  const MAX_FILE_SIZE = 25 * 1024 * 1024;
  const MAX_ATTACHMENTS = 5;
  const MAX_TOTAL_SIZE = 50 * 1024 * 1024;

  const getTotalSize = (files) => files.reduce((sum, f) => sum + f.size, 0);

  const validateAndAddFiles = async (files) => {
    if (attachments.length + files.length > MAX_ATTACHMENTS) {
      toast.error(`Maximum ${MAX_ATTACHMENTS} attachments allowed`);
      return;
    }
    const oversized = files.filter(f => f.size > MAX_FILE_SIZE);
    if (oversized.length > 0) {
      toast.error(`${oversized.map(f => f.name).join(', ')} exceeded 25MB limit`);
      return;
    }
    const newTotal = getTotalSize(attachments) + getTotalSize(files);
    if (newTotal > MAX_TOTAL_SIZE) {
      toast.error('Total attachment size exceeds 50MB limit');
      return;
    }
    const { valid, errors } = await validateFiles(files);
    if (!valid) {
      toast.error(errors[0]);
      return;
    }
    setAttachments(prev => [...prev, ...files]);
  };

  const handleFileDrop = async (files) => await validateAndAddFiles(files);

  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    await validateAndAddFiles(files);
    e.target.value = '';
  };

  const removeAttachment = (index) => {
    setAttachments(prev => prev.filter((_, i) => i !== index));
  };

  const handleSend = async (e) => {
    e.preventDefault();
    setSending(true);
    setUploadProgress(0);
    try {
      const from = fromAddress !== user.email ? fromAddress : null;
      await mailApi.send(to, cc, subject, body, attachments, (progress) => {
        setUploadProgress(progress);
      }, from);
      if (draftRef.current) {
        draftsApi.delete(draftRef.current).catch(() => {});
        updateCachedData('drafts', prev => prev ? { ...prev, drafts: prev.drafts.filter(d => d.token !== draftRef.current) } : prev);
      }
      needsSave.current = false;
      draftRef.current = null;
      toast.success('Email sent!');
      navigate(ROUTES.inbox);
    } catch (err) {
      toast.error(err.message || 'Failed to send');
    } finally {
      setSending(false);
      setUploadProgress(0);
    }
  };

  const isReply = subject.startsWith('Re:');

  return (
    <DropZone onDrop={handleFileDrop} disabled={attachments.length >= MAX_ATTACHMENTS}>
    <div className="h-full flex flex-col">
      <div className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-border shrink-0">
        <h2 className="text-lg font-semibold text-white">{isReply ? 'Reply' : 'New message'}</h2>
        <button onClick={() => navigate(ROUTES.inbox)} className="p-2 text-gray-400 hover:text-white rounded-lg hover:bg-border transition-colors">
          <CloseIcon />
        </button>
      </div>

      <form onSubmit={handleSend} className="flex-1 flex flex-col">
        <div className="border-b border-border">
          <div className="flex items-center px-4 md:px-6 py-3 border-b border-border/50">
            <span className="text-gray-500 text-sm w-16 md:w-20">From</span>
            {aliases.length > 0 ? (
              <div className="relative flex-1" ref={fromDropdownRef}>
                <button type="button" onClick={() => setShowFromDropdown(!showFromDropdown)} className="flex items-center gap-2 text-sm text-gray-300 hover:text-white transition-colors">
                  <span className="font-mono">{fromAddress}</span>
                  <ChevronUpIcon className={`w-3 h-3 transition-transform ${showFromDropdown ? '' : 'rotate-180'}`} />
                </button>
                {showFromDropdown && (
                  <div className="absolute left-0 top-full mt-1 w-72 bg-surface-card border border-border rounded-xl shadow-2xl z-50 overflow-hidden">
                    <div className="p-2 max-h-48 overflow-y-auto">
                      <button type="button" onClick={() => { setFromAddress(user.email); setShowFromDropdown(false); }} className={`w-full px-3 py-2.5 flex items-center gap-3 text-left text-sm rounded-lg transition-colors ${fromAddress === user.email ? 'bg-primary/10 text-primary-light' : 'text-gray-300 hover:bg-surface-body'}`}>
                        <span className="font-mono truncate">{user.email}</span>
                        <span className="text-xs text-gray-500 ml-auto shrink-0">Main</span>
                      </button>
                      {aliases.map(a => (
                        <button key={a.id} type="button" onClick={() => { setFromAddress(a.email); setShowFromDropdown(false); }} className={`w-full px-3 py-2.5 flex items-center gap-3 text-left text-sm rounded-lg transition-colors ${fromAddress === a.email ? 'bg-primary/10 text-primary-light' : 'text-gray-300 hover:bg-surface-body'}`}>
                          <span className="font-mono truncate">{a.email}</span>
                          <span className="text-xs text-gray-500 ml-auto shrink-0">Alias</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <span className="text-gray-300 text-sm font-mono">{user.email}</span>
            )}
          </div>
          <div className="flex items-center px-4 md:px-6 py-3 border-b border-border/50">
            <span className="text-gray-500 text-sm w-16 md:w-20">To</span>
            <input
              type="email"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              required
              placeholder="recipient@example.com"
              className="form-input-inline flex-1"
            />
            {!showCc && (
              <button type="button" onClick={() => setShowCc(true)} className="px-2 py-1 text-xs font-medium text-purple-400 hover:text-purple-300 hover:bg-purple-500/10 rounded transition-colors ml-2">+ Cc</button>
            )}
          </div>
          {showCc && (
            <div className="flex items-center px-4 md:px-6 py-3 border-b border-border/50">
              <span className="text-gray-500 text-sm w-16 md:w-20">Cc</span>
              <input
                type="text"
                value={cc}
                onChange={(e) => setCc(e.target.value)}
                placeholder="cc@example.com, another@example.com"
                className="form-input-inline"
              />
            </div>
          )}
          <div className="flex items-center px-4 md:px-6 py-3">
            <span className="text-gray-500 text-sm w-16 md:w-20">Subject</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              required
              placeholder="Subject"
              className="form-input-inline"
            />
          </div>
        </div>

        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          required
          placeholder="Write your message..."
          className="form-textarea"
        />

        {attachments.length > 0 && (
          <div className="mx-4 md:mx-6 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-gray-500">{attachments.length}/5 attachments • {formatFileSize(getTotalSize(attachments))}/50MB</span>
            </div>
            <div className="flex flex-wrap gap-2">
            {attachments.map((file, index) => (
              <div key={index} className="flex items-center gap-2 px-3 py-2 bg-surface-body border border-border rounded-lg">
                <AttachmentIcon className="w-4 h-4 text-purple-400" />
                <span className="text-sm text-gray-300 max-w-[150px] truncate">{file.name}</span>
                <span className="text-xs text-gray-500">{formatFileSize(file.size)}</span>
                <button type="button" onClick={() => removeAttachment(index)} className="text-gray-500 hover:text-red-400 transition-colors">
                  <CloseIcon className="w-4 h-4" />
                </button>
              </div>
            ))}
            </div>
          </div>
        )}
        <div className="h-16 flex items-center gap-3 px-4 md:px-6 border-t border-border shrink-0">
          {sending && attachments.length > 0 ? (
            <div className="flex-1 max-w-[200px]">
              <ProgressBar progress={uploadProgress} status="uploading" />
            </div>
          ) : (
            <button type="submit" disabled={sending} className="btn-primary px-6 py-2.5 disabled:opacity-50">
              {sending ? 'Sending...' : 'Send'}
            </button>
          )}
          <input type="file" ref={fileInputRef} onChange={handleFileSelect} multiple className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip" />
          <button type="button" onClick={() => fileInputRef.current?.click()} disabled={attachments.length >= 5} className="p-2 text-gray-400 hover:text-purple-400 hover:bg-border rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed" title={attachments.length >= 5 ? 'Maximum attachments reached' : 'Attach files'}>
            <AttachmentIcon />
          </button>
          <button type="button" onClick={() => { if (saveTimeout.current) clearTimeout(saveTimeout.current); saveDraft().then(() => { needsSave.current = false; toast.success('Draft saved'); }); }} className="text-gray-400 hover:text-purple-400 text-sm px-4 py-2 transition-colors">
            Save draft
          </button>
          <button type="button" onClick={() => navigate(ROUTES.inbox)} className="text-gray-400 hover:text-white text-sm px-4 py-2 transition-colors">
            Discard
          </button>
        </div>
      </form>
    </div>
    </DropZone>
  );
}