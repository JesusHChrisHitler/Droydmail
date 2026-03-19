import { TrashIcon } from '../icons';
import { Timestamp } from '../ui/Timestamp';

export function DraftRow({ draft, onClick, onDelete }) {
  return (
    <div
      onClick={onClick}
      className="flex items-center gap-3 md:gap-4 px-4 md:px-6 py-3 md:py-4 border-b border-border/50 cursor-pointer transition-colors hover:bg-border/30 bg-surface-body group"
    >
      <div className="w-10 h-10 rounded-full bg-border flex items-center justify-center text-sm font-medium text-gray-400 shrink-0">
        {draft.to ? draft.to.charAt(0).toUpperCase() : 'D'}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2 mb-0.5">
          <span className="text-sm text-gray-400 truncate">
            {draft.to || '(No recipient)'}
          </span>
          <Timestamp iso={draft.time} className="text-xs text-gray-500 shrink-0" />
        </div>
        <div className="text-sm text-gray-500 truncate">
          {draft.subject || '(No subject)'}
        </div>
        <div className="text-xs text-gray-600 truncate mt-0.5 hidden sm:block">
          {draft.body ? (draft.body.length > 100 ? draft.body.slice(0, 100) + '...' : draft.body) : '(Empty)'}
        </div>
      </div>
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="p-2 text-gray-600 hover:text-red-400 rounded-lg hover:bg-border transition-colors opacity-0 group-hover:opacity-100"
      >
        <TrashIcon className="w-4 h-4" />
      </button>
    </div>
  );
}