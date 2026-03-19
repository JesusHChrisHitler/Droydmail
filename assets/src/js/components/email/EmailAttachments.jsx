import { useState } from 'react';
import { formatFileSize } from '../../utils';
import { ImageIcon, PdfIcon, AttachmentIcon, CloseIcon, ZoomIcon, DownloadIcon } from '../icons';

function getFileIcon(contentType) {
  if (contentType.startsWith('image/')) return <ImageIcon className="w-5 h-5" />;
  if (contentType === 'application/pdf') return <PdfIcon className="w-5 h-5" />;
  return <AttachmentIcon className="w-5 h-5" />;
}

function ImagePreview({ src, filename, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4" onClick={onClose}>
      <div className="relative max-w-full max-h-full" onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="absolute -top-10 right-0 text-white hover:text-gray-300 transition-colors"><CloseIcon className="w-8 h-8" /></button>
        <img src={src} alt={filename} className="max-w-full max-h-[80vh] rounded-lg shadow-2xl" />
        <p className="text-center text-white mt-2 text-sm">{filename}</p>
      </div>
    </div>
  );
}

export function EmailAttachments({ attachments, emailToken }) {
  const [previewImage, setPreviewImage] = useState(null);
  if (!attachments || attachments.length === 0) return null;
  const getAttachmentUrl = (attachToken) => `/api/mail/${emailToken}/attachments/${attachToken}`;
  const imageAttachments = attachments.filter(a => a.contentType.startsWith('image/'));
  const otherAttachments = attachments.filter(a => !a.contentType.startsWith('image/'));

  return (
    <div className="border-t border-border pt-4 mt-4">
      <div className="flex items-center gap-2 mb-3"><AttachmentIcon className="w-4 h-4 text-gray-400" /><span className="text-sm text-gray-400">{attachments.length} attachment{attachments.length !== 1 ? 's' : ''}</span></div>
      {imageAttachments.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mb-4">
          {imageAttachments.map(att => (
            <div key={att.token} className="relative group cursor-pointer rounded-lg overflow-hidden bg-surface-body border-border hover:border-purple-500/50 transition-colors" onClick={() => setPreviewImage({ src: getAttachmentUrl(att.token), filename: att.filename })}>
              <div className="aspect-square"><img src={getAttachmentUrl(att.token)} alt={att.filename} className="w-full h-full object-cover" loading="lazy" /></div>
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center"><ZoomIcon className="w-8 h-8 text-white" /></div>
              <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2"><p className="text-xs text-white truncate">{att.filename}</p><p className="text-xs text-gray-400">{formatFileSize(att.size)}</p></div>
            </div>
          ))}
        </div>
      )}
      {otherAttachments.length > 0 && (
        <div className="space-y-2">
          {otherAttachments.map(att => (
            <a key={att.token} href={getAttachmentUrl(att.token)} download={att.filename} className="flex items-center gap-3 p-3 rounded-lg bg-surface-body border border-border hover:border-purple-500/50 hover:bg-surface-card transition-colors group">
              <div className="p-2 rounded-lg bg-border text-purple-400 group-hover:bg-purple-500/20 transition-colors">{getFileIcon(att.contentType)}</div>
              <div className="flex-1 min-w-0"><p className="text-sm text-white truncate">{att.filename}</p><p className="text-xs text-gray-500">{formatFileSize(att.size)} • {att.contentType}</p></div>
              <DownloadIcon className="w-5 h-5 text-gray-400 group-hover:text-purple-400 transition-colors" />
            </a>
          ))}
        </div>
      )}
      {previewImage && <ImagePreview src={previewImage.src} filename={previewImage.filename} onClose={() => setPreviewImage(null)} />}
    </div>
  );
}