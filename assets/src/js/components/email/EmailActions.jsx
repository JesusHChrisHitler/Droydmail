import { ReplyIcon, ForwardIcon, TrashIcon, InboxIcon, ArchiveIcon } from '../icons';

export function EmailActions({ onReply, onForward, onDelete, onPermanentDelete, onRestore, onArchive, hasHtml, showHtml, onToggleHtml, isTrash, isArchive, isReport }) {
  return (
    <div className="flex items-center gap-2 md:gap-3 mt-4">
      {!isReport && (
        <>
          <button onClick={onReply} className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 bg-primary hover:bg-primary-hover text-white text-xs md:text-sm font-medium rounded-lg transition-colors">
            <ReplyIcon />
            <span className="hidden sm:inline">Reply</span>
          </button>
          <button onClick={onForward} className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 bg-border hover:bg-border-light text-white text-xs md:text-sm rounded-lg transition-colors">
            <ForwardIcon />
            <span className="hidden sm:inline">Forward</span>
          </button>
        </>
      )}
      {hasHtml && (
        <button onClick={onToggleHtml} className={`px-2 md:px-3 py-2 text-xs md:text-sm rounded-lg transition-colors whitespace-nowrap ${showHtml ? 'bg-primary/20 text-primary-light' : 'text-gray-400 hover:text-white hover:bg-border'}`}>
          {showHtml ? <span className="hidden sm:inline">View </span> : <span className="hidden sm:inline">View </span>}{showHtml ? 'Text' : 'HTML'}
        </button>
      )}
      <div className="flex-1"></div>
      {isReport ? (
        <button onClick={onPermanentDelete} className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors shrink-0" title="Delete permanently">
          <TrashIcon className="w-6 h-6 md:w-5 md:h-5" strokeWidth={2} />
        </button>
      ) : isTrash ? (
        <>
          <button onClick={onRestore} className="p-2 text-gray-400 hover:text-green-400 rounded-lg hover:bg-green-500/10 transition-colors shrink-0" title="Restore to inbox">
            <InboxIcon className="w-6 h-6 md:w-5 md:h-5" strokeWidth={2} />
          </button>
          <button onClick={onPermanentDelete} className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors shrink-0" title="Delete permanently">
            <TrashIcon className="w-6 h-6 md:w-5 md:h-5" strokeWidth={2} />
          </button>
        </>
      ) : (
        <>
          {isArchive ? (
            <button onClick={onRestore} className="p-2 text-gray-400 hover:text-green-400 rounded-lg hover:bg-green-500/10 transition-colors shrink-0" title="Restore to inbox">
              <InboxIcon className="w-6 h-6 md:w-5 md:h-5" strokeWidth={2} />
            </button>
          ) : (
            <button onClick={onArchive} className="p-2 text-gray-400 hover:text-amber-400 rounded-lg hover:bg-amber-500/10 transition-colors shrink-0" title="Archive">
              <ArchiveIcon className="w-6 h-6 md:w-5 md:h-5" strokeWidth={2} />
            </button>
          )}
          <button onClick={onDelete} className="p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-red-500/10 transition-colors shrink-0" title="Move to trash">
            <TrashIcon className="w-6 h-6 md:w-5 md:h-5" strokeWidth={2} />
          </button>
        </>
      )}
    </div>
  );
}