import { ArchiveIcon, TrashIcon, CheckIcon } from '../icons';
import { Timestamp } from '../ui/Timestamp';
import { useSwipe } from '../../hooks/useSwipe';

function highlightMatch(text, query) {
  if (!query || !text) return text;
  const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
  const parts = text.split(regex);
  return parts.map((part, i) => regex.test(part) ? <mark key={i} className="bg-primary/40 text-white rounded px-0.5">{part}</mark> : part);
}

export function EmailRow({ email, onClick, contact, onSwipeLeft, onSwipeRight, swipeLeftLabel = 'Delete', swipeRightLabel = 'Archive', showFolder = false, highlightText = '', selected = false, onSelect }) {
  const { ref, offset, swiping, showLeft, showRight, style, progress } = useSwipe({
    onSwipeLeft: onSwipeLeft ? () => onSwipeLeft(email) : undefined,
    onSwipeRight: onSwipeRight ? () => onSwipeRight(email) : undefined,
  });

  return (
    <div ref={ref} className="relative overflow-hidden touch-pan-y group">
      {showRight && (
        <div 
          className="absolute inset-y-0 left-0 flex items-center gap-2 px-4 bg-emerald-600 text-white font-medium"
          style={{ width: Math.abs(offset), opacity: 0.7 + progress * 0.3 }}
        >
          <ArchiveIcon className="w-5 h-5" />
          <span className="text-sm">{swipeRightLabel}</span>
        </div>
      )}
      {showLeft && (
        <div 
          className="absolute inset-y-0 right-0 flex items-center justify-end gap-2 px-4 bg-red-600 text-white font-medium"
          style={{ width: Math.abs(offset), opacity: 0.7 + progress * 0.3 }}
        >
          <span className="text-sm">{swipeLeftLabel}</span>
          <TrashIcon className="w-5 h-5" />
        </div>
      )}
      <div
        onClick={onClick}
        style={style}
        className={`flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 border-b border-border/50 cursor-pointer transition-colors hover:bg-border/30 bg-surface-body ${
          email.unread ? 'bg-primary/5' : ''
        } ${selected ? 'bg-primary/10' : ''}`}
      >
        <div 
          onClick={(e) => { e.stopPropagation(); onSelect?.(email); }}
          className="relative w-10 h-10 shrink-0 cursor-pointer"
        >
          <div className={`absolute inset-0 rounded-full flex items-center justify-center transition-opacity ${
            selected ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
          }`}>
            <div className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
              selected ? 'bg-primary border-primary' : 'border-gray-400 bg-surface-body/80 hover:border-primary'
            }`}>
              {selected && <CheckIcon className="w-4 h-4 text-white" />}
            </div>
          </div>
          <div className={`transition-opacity ${selected ? 'opacity-0' : 'group-hover:opacity-0'}`}>
            {email.isSystem ? (
              <img src="/media/logo.webp" alt="DroydMail" className="w-10 h-10 rounded-full object-cover" />
            ) : contact?.avatar_url ? (
              <img src={contact.avatar_url} alt={contact.name} className="w-10 h-10 rounded-full object-cover" />
            ) : (
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium ${
                email.unread ? 'bg-primary text-white' : 'bg-border text-gray-400'
              }`}>
                {contact?.name?.charAt(0).toUpperCase() || email.from?.charAt(0).toUpperCase() || '?'}
              </div>
            )}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2 mb-0.5">
            <span className={`text-sm truncate flex items-center gap-2 ${email.unread ? 'text-white font-semibold' : 'text-gray-400'}`}>
              {email.isSystem ? 'DroydMail' : (highlightText ? highlightMatch(contact?.name || email.from, highlightText) : (contact?.name || email.from))}
              {email.isSystem && (
                <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase bg-emerald-600 text-white rounded">System</span>
              )}
              {showFolder && email.folder && (
                <span className="px-1.5 py-0.5 text-[10px] font-medium capitalize bg-border text-gray-400 rounded">{email.folder}</span>
              )}
            </span>
            <Timestamp iso={email.time} className="text-xs text-gray-500 shrink-0" />
          </div>
          <div className={`text-sm truncate ${email.unread ? 'text-gray-300' : 'text-gray-500'}`}>
            {highlightText ? highlightMatch(email.subject || '(No subject)', highlightText) : (email.subject || '(No subject)')}
          </div>
          <div className="text-xs text-gray-600 truncate mt-0.5 hidden sm:block">{highlightText ? highlightMatch(email.preview, highlightText) : email.preview}</div>
        </div>
        {email.unread && (
          <div className="w-2 h-2 rounded-full bg-primary shrink-0"></div>
        )}
      </div>
    </div>
  );
}